/**
 * URL ingestion pipeline.
 *
 * Kept separate from the Edge Function handler so the whole flow — fetch, extract, canonicalize,
 * hash, classify duplicates, persist — is testable without a server or a database.
 *
 * Ordering rule that drives the design: the SOURCE IS PERSISTED BEFORE any AI work happens.
 * Understanding is a separate, optional step. A capture must never be lost because a summary
 * could not be produced.
 */

import { safeFetchHtml, type SafeFetchOptions } from "./safeFetch.ts";
import { extractFromHtml } from "./htmlExtract.ts";
import { canonicalizeUrl, contentHash, domainOf } from "./urlCanonical.ts";

/** Below this, we do not claim to have captured a readable page. */
export const MIN_READABLE_WORDS = 60;
/** Upper bound on stored text. Generous for an article, bounded for retrieval and cost. */
export const MAX_STORED_TEXT = 40_000;

export type DuplicateStatus = "new" | "identical" | "content_changed" | "same_content_different_url";

export type IngestSuccess = {
  ok: true;
  item: Record<string, unknown>;
  duplicateStatus: DuplicateStatus;
  duplicateOfId: string | null;
  extractionStatus: "extracted" | "partial";
  wordCount: number;
};

export type IngestFailure = {
  ok: false;
  reason: string;
  message: string;
  retryable: boolean;
  /** Present when the failure still produced a record (blocked/paywalled pages are recorded). */
  itemId?: string;
};

export type IngestOutcome = IngestSuccess | IngestFailure;

/** Minimal structural view of the DB client, so tests can supply a fake. */
export type IngestClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => { limit: (n: number) => Promise<{ data: DupRow[] | null; error: { message: string } | null }> };
        or: (filter: string) => { limit: (n: number) => Promise<{ data: DupRow[] | null; error: { message: string } | null }> };
      };
    };
    insert: (values: Record<string, unknown>) => {
      select: (columns: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
    };
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: unknown) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export type DupRow = { id: string; canonical_url: string | null; content_hash: string | null; title: string | null };

export type IngestOptions = SafeFetchOptions & { now?: () => Date };

export async function ingestUrl(
  client: IngestClient,
  userId: string,
  submittedUrl: string,
  userNote: string | null,
  options: IngestOptions = {}
): Promise<IngestOutcome> {
  const now = options.now ?? (() => new Date());

  const fetched = await safeFetchHtml(submittedUrl, options);
  if (!fetched.ok) {
    // A blocked, paywalled or unreachable page is still a real thing the user tried to save.
    // Record it honestly so it is visible in the Library rather than vanishing.
    const canonical = canonicalizeUrl(submittedUrl);
    const recorded = await insertItem(client, {
      user_id: userId,
      client_id: `url:${canonical}:${now().getTime()}`,
      source: domainOf(canonical) || "web",
      content_type: "website",
      title: titleFromUrl(canonical),
      source_url: submittedUrl,
      canonical_url: canonical,
      summary: "",
      user_note: userNote,
      why_saved: null,
      category: "education",
      collection_name: "Saved links",
      keywords: [],
      extraction_status: "failed",
      extraction_reason: fetched.reason,
      fetched_at: now().toISOString(),
      captured_at: now().toISOString(),
      raw_metadata: {
        provenance: "fetch_failed",
        http_status: fetched.status ?? null,
        retryable: fetched.retryable
      }
    });

    return {
      ok: false,
      reason: fetched.reason,
      message: fetched.message,
      retryable: fetched.retryable,
      itemId: recorded.id ?? undefined
    };
  }

  const extraction = extractFromHtml(fetched.html, fetched.finalUrl);
  const canonical = canonicalizeUrl(fetched.finalUrl, extraction.metadata.canonicalUrl);
  const text = extraction.text.slice(0, MAX_STORED_TEXT);
  const hash = contentHash(text);
  const domain = domainOf(canonical) || domainOf(fetched.finalUrl) || "web";

  // Honest about extraction quality rather than claiming support for every site.
  const extractionStatus: "extracted" | "partial" = extraction.wordCount >= MIN_READABLE_WORDS ? "extracted" : "partial";

  const duplicates = await findDuplicates(client, userId, canonical, hash);
  if (duplicates.error) {
    return { ok: false, reason: "lookup_failed", message: duplicates.error, retryable: true };
  }

  const sameUrl = duplicates.rows.find((row) => row.canonical_url === canonical);
  const sameContent = duplicates.rows.find((row) => hash !== "" && row.content_hash === hash);

  let duplicateStatus: DuplicateStatus = "new";
  let duplicateOfId: string | null = null;

  if (sameUrl && sameUrl.content_hash === hash && hash !== "") {
    duplicateStatus = "identical";
    duplicateOfId = sameUrl.id;
  } else if (sameUrl) {
    duplicateStatus = "content_changed";
    duplicateOfId = sameUrl.id;
  } else if (sameContent) {
    duplicateStatus = "same_content_different_url";
    duplicateOfId = sameContent.id;
  }

  const provenance = {
    provenance: "fetched",
    submitted_url: submittedUrl,
    final_url: fetched.finalUrl,
    redirect_chain: fetched.redirectChain,
    http_status: fetched.status,
    content_type: fetched.contentType,
    bytes: fetched.bytes,
    word_count: extraction.wordCount,
    // Metadata SUPPLIED BY THE SOURCE, kept distinct from anything derived or generated.
    source_metadata: {
      title: extraction.metadata.title,
      author: extraction.metadata.author,
      site_name: extraction.metadata.siteName,
      description: extraction.metadata.description,
      published_at: extraction.metadata.publishedAt,
      declared_canonical: extraction.metadata.canonicalUrl
    },
    duplicate_status: duplicateStatus,
    duplicate_of: duplicateOfId
  };

  // An identical re-capture updates the existing row's fetch time instead of creating a second
  // copy. The user is told this happened; nothing is discarded silently.
  if (duplicateStatus === "identical" && duplicateOfId) {
    const updateError = await updateItem(client, duplicateOfId, {
      fetched_at: now().toISOString(),
      extraction_status: extractionStatus,
      raw_metadata: provenance,
      ...(userNote ? { user_note: userNote } : {})
    });
    if (updateError) {
      return { ok: false, reason: "persist_failed", message: updateError, retryable: true };
    }
    return {
      ok: true,
      item: { id: duplicateOfId, canonical_url: canonical, title: extraction.metadata.title ?? titleFromUrl(canonical) },
      duplicateStatus,
      duplicateOfId,
      extractionStatus,
      wordCount: extraction.wordCount
    };
  }

  const row: Record<string, unknown> = {
    user_id: userId,
    client_id: `url:${canonical}:${hash || now().getTime()}`,
    source: domain,
    content_type: "website",
    title: extraction.metadata.title ?? titleFromUrl(canonical),
    creator: extraction.metadata.author,
    source_url: submittedUrl,
    canonical_url: canonical,
    content_hash: hash || null,
    extracted_text: text || null,
    extraction_status: extractionStatus,
    extraction_reason: extractionStatus === "partial" ? "low_text_yield" : null,
    fetched_at: now().toISOString(),
    published_at: extraction.metadata.publishedAt,
    captured_at: now().toISOString(),
    // summary stays empty until the user asks for understanding. It must never be pre-filled
    // with source text, and source text must never be presented as a summary.
    summary: "",
    user_note: userNote,
    why_saved: null,
    category: "education",
    collection_name: "Saved links",
    keywords: keywordsFrom(extraction.metadata.title, domain),
    raw_metadata: {
      ...provenance,
      ...(duplicateOfId ? { previous_capture_id: duplicateOfId } : {})
    }
  };

  const inserted = await insertItem(client, row);
  if (inserted.error) {
    return { ok: false, reason: "persist_failed", message: inserted.error, retryable: true };
  }

  return {
    ok: true,
    item: { ...row, id: inserted.id },
    duplicateStatus,
    duplicateOfId,
    extractionStatus,
    wordCount: extraction.wordCount
  };
}

/* ────────────────────────────── persistence ────────────────────────────── */

async function findDuplicates(
  client: IngestClient,
  userId: string,
  canonical: string,
  hash: string
): Promise<{ rows: DupRow[]; error: string | null }> {
  const filter = hash
    ? `canonical_url.eq.${canonical},content_hash.eq.${hash}`
    : `canonical_url.eq.${canonical}`;
  const { data, error } = await client
    .from("library_items")
    .select("id, canonical_url, content_hash, title")
    .eq("user_id", userId)
    .or(filter)
    .limit(10);
  return { rows: data ?? [], error: error?.message ?? null };
}

async function insertItem(client: IngestClient, row: Record<string, unknown>): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await client.from("library_items").insert(row).select("id").single();
  return { id: data?.id ?? null, error: error?.message ?? null };
}

async function updateItem(client: IngestClient, id: string, values: Record<string, unknown>): Promise<string | null> {
  const { error } = await client.from("library_items").update(values).eq("id", id);
  return error?.message ?? null;
}

/* ────────────────────────────── helpers ────────────────────────────── */

export function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    if (!last) return parsed.hostname.replace(/^www\./, "");
    return decodeURIComponent(last)
      .replace(/\.(html?|php|aspx?)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200) || parsed.hostname;
  } catch {
    return url.slice(0, 200);
  }
}

function keywordsFrom(title: string | null, domain: string): string[] {
  const stop = new Set(["the", "and", "for", "with", "from", "that", "this", "your", "how", "why", "what", "are", "was"]);
  const words = (title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stop.has(word))
    .slice(0, 6);
  return Array.from(new Set([...words, domain].filter(Boolean)));
}
