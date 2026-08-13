import { ingestUrl, type DupRow, type IngestClient } from "./ingestUrlCore";

const BODY = Array.from({ length: 40 }, (_, i) => `<p>Paragraph ${i} about braising and patience in the kitchen.</p>`).join("");

function page(opts: { title?: string; canonical?: string; body?: string } = {}) {
  return `<html><head>
    <meta property="og:title" content="${opts.title ?? "How to Braise Anything"}">
    <meta name="author" content="Jane Cook">
    <meta property="article:published_time" content="2026-03-04T10:00:00Z">
    ${opts.canonical ? `<link rel="canonical" href="${opts.canonical}">` : ""}
  </head><body><article>${opts.body ?? BODY}</article></body></html>`;
}

type Recorded = { table: string; op: string; values?: Record<string, unknown>; filters: Array<[string, unknown]> };

function fakeClient(existing: DupRow[] = [], failures: Record<string, string> = {}) {
  const recorded: Recorded[] = [];
  const client: IngestClient = {
    from(table: string) {
      return {
        select: () => ({
          eq: (column: string, value: unknown) => {
            const entry: Recorded = { table, op: "select", filters: [[column, value]] };
            recorded.push(entry);
            const finish = async () => ({
              data: failures[`${table}:select`] ? null : existing,
              error: failures[`${table}:select`] ? { message: failures[`${table}:select`] } : null
            });
            return {
              eq: (c2: string, v2: unknown) => {
                entry.filters.push([c2, v2]);
                return { limit: finish };
              },
              or: (filter: string) => {
                entry.filters.push(["or", filter]);
                return { limit: finish };
              }
            };
          }
        }),
        insert: (values: Record<string, unknown>) => {
          recorded.push({ table, op: "insert", values, filters: [] });
          return {
            select: () => ({
              single: async () => ({
                data: failures[`${table}:insert`] ? null : { id: "new-item-1" },
                error: failures[`${table}:insert`] ? { message: failures[`${table}:insert`] } : null
              })
            })
          };
        },
        update: (values: Record<string, unknown>) => ({
          eq: async (column: string, value: unknown) => {
            recorded.push({ table, op: "update", values, filters: [[column, value]] });
            return { error: failures[`${table}:update`] ? { message: failures[`${table}:update`] } : null };
          }
        })
      };
    }
  };
  return { client, recorded };
}

const okFetch = (body = page()) =>
  (async () => new Response(body, { status: 200, headers: { "content-type": "text/html" } })) as unknown as typeof fetch;

const inserted = (recorded: Recorded[]) => recorded.find((r) => r.op === "insert")?.values ?? {};

describe("successful ingestion", () => {
  it("persists a source with provenance and extracted text", async () => {
    const { client, recorded } = fakeClient();
    const result = await ingestUrl(client, "user-a", "https://slowkitchen.example/braise?utm_source=nl", null, {
      fetchImpl: okFetch()
    });

    expect(result.ok).toBe(true);
    const row = inserted(recorded);
    expect(row.user_id).toBe("user-a");
    expect(row.content_type).toBe("website");
    expect(row.title).toBe("How to Braise Anything");
    expect(row.creator).toBe("Jane Cook");
    expect(row.published_at).toBe("2026-03-04T10:00:00.000Z");
    expect(String(row.extracted_text)).toContain("Paragraph 0 about braising");
    expect(row.extraction_status).toBe("extracted");
    expect(row.fetched_at).toBeTruthy();
    expect(row.content_hash).toMatch(/^fnv1a64:/);
  });

  it("stores the canonical URL with tracking stripped while keeping the original", async () => {
    const { client, recorded } = fakeClient();
    await ingestUrl(client, "user-a", "https://slowkitchen.example/braise?utm_source=nl", null, { fetchImpl: okFetch() });
    const row = inserted(recorded);
    expect(row.canonical_url).toBe("https://slowkitchen.example/braise");
    // The exact link the person submitted is never lost.
    expect(row.source_url).toBe("https://slowkitchen.example/braise?utm_source=nl");
  });

  it("stores the domain as the source so lexical retrieval can see it", async () => {
    const { client, recorded } = fakeClient();
    await ingestUrl(client, "user-a", "https://www.slowkitchen.example/braise", null, { fetchImpl: okFetch() });
    expect(inserted(recorded).source).toBe("slowkitchen.example");
  });
});

describe("provenance separation", () => {
  it("never writes extracted text into the AI summary field", async () => {
    const { client, recorded } = fakeClient();
    await ingestUrl(client, "user-a", "https://x.example/a", null, { fetchImpl: okFetch() });
    const row = inserted(recorded);
    expect(row.summary).toBe("");
    expect(row.extracted_text).not.toBe(row.summary);
  });

  it("keeps the user's note separate from source text and AI output", async () => {
    const { client, recorded } = fakeClient();
    await ingestUrl(client, "user-a", "https://x.example/a", "I want to try this on Sunday", { fetchImpl: okFetch() });
    const row = inserted(recorded);
    expect(row.user_note).toBe("I want to try this on Sunday");
    expect(String(row.extracted_text)).not.toContain("I want to try this on Sunday");
    expect(row.summary).toBe("");
  });

  it("records source-supplied metadata under its own key, distinct from derived values", async () => {
    const { client, recorded } = fakeClient();
    await ingestUrl(client, "user-a", "https://x.example/a", null, { fetchImpl: okFetch() });
    const meta = inserted(recorded).raw_metadata as Record<string, unknown>;
    const sourceMeta = meta.source_metadata as Record<string, unknown>;
    expect(sourceMeta.title).toBe("How to Braise Anything");
    expect(sourceMeta.author).toBe("Jane Cook");
    expect(meta.provenance).toBe("fetched");
    expect(meta.final_url).toBe("https://x.example/a");
    expect(Array.isArray(meta.redirect_chain)).toBe(true);
  });
});

describe("duplicate handling", () => {
  it("treats an unchanged re-capture as identical and refreshes instead of duplicating", async () => {
    const { client: first, recorded: firstRec } = fakeClient();
    await ingestUrl(first, "user-a", "https://x.example/a", null, { fetchImpl: okFetch() });
    const hash = String(inserted(firstRec).content_hash);

    const { client, recorded } = fakeClient([
      { id: "existing-1", canonical_url: "https://x.example/a", content_hash: hash, title: "How to Braise Anything" }
    ]);
    const result = await ingestUrl(client, "user-a", "https://x.example/a", null, { fetchImpl: okFetch() });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duplicateStatus).toBe("identical");
      expect(result.duplicateOfId).toBe("existing-1");
    }
    // Refreshed, not duplicated — and nothing was discarded.
    expect(recorded.some((r) => r.op === "insert")).toBe(false);
    expect(recorded.some((r) => r.op === "update" && r.filters[0][1] === "existing-1")).toBe(true);
  });

  it("creates a new capture when the same URL now has different content", async () => {
    const { client, recorded } = fakeClient([
      { id: "existing-1", canonical_url: "https://x.example/a", content_hash: "fnv1a64:0000000000000000", title: "Old" }
    ]);
    const result = await ingestUrl(client, "user-a", "https://x.example/a", null, { fetchImpl: okFetch() });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.duplicateStatus).toBe("content_changed");
    // The earlier version is preserved; this is an addition, not an overwrite.
    expect(recorded.some((r) => r.op === "insert")).toBe(true);
    expect((inserted(recorded).raw_metadata as Record<string, unknown>).previous_capture_id).toBe("existing-1");
  });

  it("flags the same content arriving under a different URL, and keeps both", async () => {
    const { client: first, recorded: firstRec } = fakeClient();
    await ingestUrl(first, "user-a", "https://x.example/a", null, { fetchImpl: okFetch() });
    const hash = String(inserted(firstRec).content_hash);

    const { client, recorded } = fakeClient([
      { id: "existing-2", canonical_url: "https://mirror.example/a", content_hash: hash, title: "Mirror" }
    ]);
    const result = await ingestUrl(client, "user-a", "https://x.example/a", null, { fetchImpl: okFetch() });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.duplicateStatus).toBe("same_content_different_url");
    expect(recorded.some((r) => r.op === "insert")).toBe(true);
  });

  it("reports a genuinely new capture as new", async () => {
    const { client } = fakeClient();
    const result = await ingestUrl(client, "user-a", "https://x.example/a", null, { fetchImpl: okFetch() });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.duplicateStatus).toBe("new");
  });

  it("scopes the duplicate lookup to the calling user", async () => {
    const { client, recorded } = fakeClient();
    await ingestUrl(client, "user-a", "https://x.example/a", null, { fetchImpl: okFetch() });
    const lookup = recorded.find((r) => r.op === "select");
    expect(lookup?.filters).toContainEqual(["user_id", "user-a"]);
  });
});

describe("failure behaviour", () => {
  it("still records the attempt when the page is paywalled, and never claims success", async () => {
    const { client, recorded } = fakeClient();
    const result = await ingestUrl(client, "user-a", "https://paywall.example/a", "wanted to read this", {
      fetchImpl: (async () => new Response("nope", { status: 403, headers: { "content-type": "text/html" } })) as unknown as typeof fetch
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("http_error");
      expect(result.itemId).toBe("new-item-1");
    }
    const row = inserted(recorded);
    expect(row.extraction_status).toBe("failed");
    expect(row.extraction_reason).toBe("http_error");
    expect(row.source_url).toBe("https://paywall.example/a");
    // The person's note survives a failed fetch.
    expect(row.user_note).toBe("wanted to read this");
    // No fabricated text.
    expect(row.extracted_text).toBeUndefined();
  });

  it("does not record anything for a blocked private address", async () => {
    const { client, recorded } = fakeClient();
    const result = await ingestUrl(client, "user-a", "http://169.254.169.254/latest/", null, { fetchImpl: okFetch() });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("private_address");
    // Still recorded as an attempt, but with no content and an honest reason.
    expect(inserted(recorded).extraction_status).toBe("failed");
  });

  it("marks a thin page as partial rather than claiming a good capture", async () => {
    const { client, recorded } = fakeClient();
    const result = await ingestUrl(client, "user-a", "https://x.example/a", null, {
      fetchImpl: okFetch("<html><head><title>T</title></head><body><div>Please enable JavaScript.</div></body></html>")
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.extractionStatus).toBe("partial");
    expect(inserted(recorded).extraction_status).toBe("partial");
    expect(inserted(recorded).extraction_reason).toBe("low_text_yield");
  });

  it("reports a persistence failure as retryable rather than losing it quietly", async () => {
    const { client } = fakeClient([], { "library_items:insert": "connection reset" });
    const result = await ingestUrl(client, "user-a", "https://x.example/a", null, { fetchImpl: okFetch() });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("persist_failed");
      expect(result.retryable).toBe(true);
    }
  });

  it("reports a duplicate-lookup failure without writing a possibly-duplicate row", async () => {
    const { client, recorded } = fakeClient([], { "library_items:select": "timeout" });
    const result = await ingestUrl(client, "user-a", "https://x.example/a", null, { fetchImpl: okFetch() });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("lookup_failed");
    expect(recorded.some((r) => r.op === "insert")).toBe(false);
  });
});

describe("user ownership", () => {
  it("writes the calling user's id and never another user's", async () => {
    const { client, recorded } = fakeClient();
    await ingestUrl(client, "user-b", "https://x.example/a", null, { fetchImpl: okFetch() });
    expect(inserted(recorded).user_id).toBe("user-b");
    expect(JSON.stringify(recorded)).not.toContain("user-a");
  });
});
