/**
 * Library indexing pipeline.
 *
 * Two hard rules, both enforced here and covered by tests:
 *
 *  1. PERSISTENCE FIRST. Saving a Library item never depends on indexing succeeding. This module
 *     only ever touches library_item_embeddings; it never writes library_items.
 *  2. A FAILURE NEVER DESTROYS A GOOD VECTOR. On failure only status / failure_reason / attempts
 *     change. The `embedding` column is left exactly as it was, so a transient provider outage
 *     downgrades an item to "stale-ish" at worst, never to unsearchable-and-empty.
 *
 * No Deno globals and no remote imports.
 */

import { createEmbedding, type CreateEmbeddingOptions } from "./embedding.ts";
import { buildIndexText, isIndexable, type IndexableItem } from "./libraryIndexText.ts";

export type IndexStatus = "pending" | "indexed" | "failed" | "stale";

export type IndexOutcome =
  | { ok: true; status: "indexed"; fingerprint: string; skipped?: false }
  | { ok: true; status: "skipped"; reason: "not_indexable" | "already_current"; skipped: true }
  | { ok: false; status: "failed"; reason: string; message: string; retryable: boolean };

export type EmbeddingRow = {
  library_item_id: string;
  status: IndexStatus;
  source_fingerprint: string | null;
  attempts?: number | null;
};

/** Minimal structural view of the DB client so tests can supply a fake. */
export type IndexerClient = {
  from: (table: string) => {
    select: (columns: string, options?: unknown) => {
      eq: (column: string, value: unknown) => {
        eq?: (column: string, value: unknown) => unknown;
        maybeSingle: () => Promise<{ data: EmbeddingRow | null; error: { message: string } | null }>;
        in: (column: string, values: unknown[]) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
        order: (column: string, options?: unknown) => {
          limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
        };
      };
    };
    upsert: (values: Record<string, unknown>, options?: unknown) => Promise<{ error: { message: string } | null }>;
  };
};

export type IndexOptions = CreateEmbeddingOptions & { now?: () => Date; force?: boolean };

/**
 * Indexes a single Library item.
 *
 * `item` must already be persisted. The caller owns the item row; this function only reads it.
 */
export async function indexLibraryItem(
  client: IndexerClient,
  userId: string,
  item: IndexableItem & { id: string },
  options: IndexOptions = {}
): Promise<IndexOutcome> {
  const now = options.now ?? (() => new Date());
  const composed = buildIndexText(item);

  if (!isIndexable(composed)) {
    return { ok: true, status: "skipped", reason: "not_indexable", skipped: true };
  }

  const existing = await readRow(client, userId, item.id);
  if (existing.error) {
    return { ok: false, status: "failed", reason: "lookup_failed", message: existing.error, retryable: true };
  }

  // Nothing changed since the last successful index, so re-embedding would spend money to produce
  // the same vector.
  if (
    !options.force &&
    existing.row?.status === "indexed" &&
    existing.row.source_fingerprint === composed.fingerprint
  ) {
    return { ok: true, status: "skipped", reason: "already_current", skipped: true };
  }

  const attempts = (existing.row?.attempts ?? 0) + 1;
  const result = await createEmbedding(composed.text, options);

  if (!result.ok) {
    // Status/diagnostics only. `embedding` is deliberately absent from this payload so a previous
    // valid vector survives the failure untouched.
    const { error } = await client.from("library_item_embeddings").upsert(
      {
        library_item_id: item.id,
        user_id: userId,
        status: "failed",
        failure_reason: `${result.reason}: ${result.message}`.slice(0, 500),
        attempts,
        source_fingerprint: composed.fingerprint,
        updated_at: now().toISOString()
      },
      { onConflict: "library_item_id" }
    );

    return {
      ok: false,
      status: "failed",
      reason: result.reason,
      message: error ? `${result.message} (and the failure could not be recorded: ${error.message})` : result.message,
      // not_configured is not worth retrying until the deployment changes.
      retryable: result.reason !== "not_configured"
    };
  }

  const { error } = await client.from("library_item_embeddings").upsert(
    {
      library_item_id: item.id,
      user_id: userId,
      embedding: result.embedding,
      search_text: composed.text,
      status: "indexed",
      failure_reason: null,
      attempts,
      source_fingerprint: composed.fingerprint,
      model: options.model ?? "text-embedding-3-small",
      indexed_at: now().toISOString(),
      updated_at: now().toISOString()
    },
    { onConflict: "library_item_id" }
  );

  if (error) {
    // A vector was produced but not stored. Reporting "indexed" here would be the exact lie the
    // contract forbids.
    return { ok: false, status: "failed", reason: "persist_failed", message: error.message, retryable: true };
  }

  return { ok: true, status: "indexed", fingerprint: composed.fingerprint };
}

async function readRow(
  client: IndexerClient,
  userId: string,
  itemId: string
): Promise<{ row: EmbeddingRow | null; error: string | null }> {
  const query = client.from("library_item_embeddings").select("library_item_id, status, source_fingerprint, attempts").eq("user_id", userId);
  const scoped = (query as { eq?: (c: string, v: unknown) => unknown }).eq?.("library_item_id", itemId) ?? query;
  const { data, error } = await (scoped as { maybeSingle: () => Promise<{ data: EmbeddingRow | null; error: { message: string } | null }> }).maybeSingle();
  return { row: data ?? null, error: error?.message ?? null };
}

/* ────────────────────────────── backfill ────────────────────────────── */

export const DEFAULT_BATCH_SIZE = 10;
export const MAX_BATCH_SIZE = 25;

export type BackfillReport = {
  examined: number;
  indexed: number;
  skipped: number;
  failed: number;
  /** True when more work remains, so the caller can run another bounded batch. */
  hasMore: boolean;
  failures: Array<{ id: string; reason: string }>;
};

/**
 * Processes one bounded batch of unindexed or stale items.
 *
 * Deliberately not a job platform. It is a resumable, idempotent, size-capped pass that the
 * caller invokes repeatedly. Resumability comes from the status column itself: an item is only
 * "done" once it is `indexed` with a matching fingerprint, so a crashed run simply leaves work
 * for the next call rather than corrupting state.
 */
export async function backfillLibraryEmbeddings(
  client: IndexerClient,
  userId: string,
  candidates: Array<IndexableItem & { id: string }>,
  options: IndexOptions & { batchSize?: number } = {}
): Promise<BackfillReport> {
  const batchSize = Math.min(Math.max(options.batchSize ?? DEFAULT_BATCH_SIZE, 1), MAX_BATCH_SIZE);
  const batch = candidates.slice(0, batchSize);

  const report: BackfillReport = {
    examined: batch.length,
    indexed: 0,
    skipped: 0,
    failed: 0,
    hasMore: candidates.length > batch.length,
    failures: []
  };

  for (const item of batch) {
    const outcome = await indexLibraryItem(client, userId, item, options);
    if (outcome.ok && outcome.status === "indexed") report.indexed += 1;
    else if (outcome.ok) report.skipped += 1;
    else {
      report.failed += 1;
      report.failures.push({ id: item.id, reason: outcome.reason });
      // A provider that is down or rate-limiting will fail every remaining item in this batch.
      // Stopping early avoids burning the quota and lets the caller back off.
      if (outcome.reason === "not_configured" || outcome.reason === "provider_error") {
        report.hasMore = true;
        break;
      }
    }
  }

  return report;
}
