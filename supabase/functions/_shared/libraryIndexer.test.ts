import { backfillLibraryEmbeddings, indexLibraryItem, type EmbeddingRow, type IndexerClient } from "./libraryIndexer";
import { EMBEDDING_DIMENSIONS } from "./embedding";

const item = {
  id: "lib-1",
  title: "How to Braise Anything",
  source: "slowkitchen.example",
  extracted_text: "Braising works because collagen melts into gelatin over low heat.",
  user_note: "Try with short ribs.",
  summary: ""
};

function vector() {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (i % 7) + 0.5);
}

const okFetch = (async () =>
  ({ ok: true, status: 200, json: async () => ({ data: [{ embedding: vector() }] }) }) as unknown as Response) as unknown as typeof fetch;

const failFetch = (async () =>
  ({ ok: false, status: 429, text: async () => "rate limited" }) as unknown as Response) as unknown as typeof fetch;

type Written = { table: string; values: Record<string, unknown> };

function fakeClient(existing: EmbeddingRow | null = null, failures: Record<string, string> = {}) {
  const written: Written[] = [];
  const reads: Array<[string, unknown]> = [];
  const client: IndexerClient = {
    from(table: string) {
      return {
        select: () => ({
          eq: (column: string, value: unknown) => {
            reads.push([column, value]);
            const api = {
              eq: (c2: string, v2: unknown) => {
                reads.push([c2, v2]);
                return api;
              },
              maybeSingle: async () => ({
                data: failures.select ? null : existing,
                error: failures.select ? { message: failures.select } : null
              }),
              in: async () => ({ data: [], error: null }),
              order: () => ({ limit: async () => ({ data: [], error: null }) })
            };
            return api as never;
          }
        }),
        upsert: async (values: Record<string, unknown>) => {
          written.push({ table, values });
          return { error: failures.upsert ? { message: failures.upsert } : null };
        }
      };
    }
  };
  return { client, written, reads };
}

describe("successful indexing", () => {
  it("writes a real vector and marks the row indexed", async () => {
    const { client, written } = fakeClient();
    const outcome = await indexLibraryItem(client, "user-a", item, { apiKey: "sk-test", fetchImpl: okFetch });

    expect(outcome).toMatchObject({ ok: true, status: "indexed" });
    expect(written).toHaveLength(1);
    const row = written[0].values;
    expect(written[0].table).toBe("library_item_embeddings");
    expect((row.embedding as number[]).length).toBe(EMBEDDING_DIMENSIONS);
    expect(row.status).toBe("indexed");
    expect(row.user_id).toBe("user-a");
    expect(row.library_item_id).toBe("lib-1");
    expect(row.source_fingerprint).toMatch(/^fnv1a64:/);
    expect(row.failure_reason).toBeNull();
  });

  it("stores the labelled search text so the index can be audited", async () => {
    const { client, written } = fakeClient();
    await indexLibraryItem(client, "user-a", item, { apiKey: "sk-test", fetchImpl: okFetch });
    expect(String(written[0].values.search_text)).toContain("From the source:");
    expect(String(written[0].values.search_text)).toContain("From the user:");
  });

  it("skips an item with nothing worth embedding", async () => {
    const { client, written } = fakeClient();
    const outcome = await indexLibraryItem(client, "user-a", { id: "x", title: "Only a title" }, { apiKey: "sk-test", fetchImpl: okFetch });
    expect(outcome).toMatchObject({ ok: true, status: "skipped", reason: "not_indexable" });
    expect(written).toHaveLength(0);
  });

  it("skips re-embedding when the fingerprint has not changed", async () => {
    const { client: first, written: firstWritten } = fakeClient();
    await indexLibraryItem(first, "user-a", item, { apiKey: "sk-test", fetchImpl: okFetch });
    const fingerprint = String(firstWritten[0].values.source_fingerprint);

    const { client, written } = fakeClient({ library_item_id: "lib-1", status: "indexed", source_fingerprint: fingerprint });
    const outcome = await indexLibraryItem(client, "user-a", item, { apiKey: "sk-test", fetchImpl: okFetch });

    expect(outcome).toMatchObject({ ok: true, status: "skipped", reason: "already_current" });
    expect(written).toHaveLength(0);
  });

  it("re-embeds when forced even if the fingerprint matches", async () => {
    const { client: first, written: firstWritten } = fakeClient();
    await indexLibraryItem(first, "user-a", item, { apiKey: "sk-test", fetchImpl: okFetch });
    const fingerprint = String(firstWritten[0].values.source_fingerprint);

    const { client, written } = fakeClient({ library_item_id: "lib-1", status: "indexed", source_fingerprint: fingerprint });
    await indexLibraryItem(client, "user-a", item, { apiKey: "sk-test", fetchImpl: okFetch, force: true });
    expect(written).toHaveLength(1);
  });

  // Content changed → fingerprint differs → the old vector is replaced rather than served stale.
  it("re-indexes when the content has changed", async () => {
    const { client, written } = fakeClient({
      library_item_id: "lib-1",
      status: "indexed",
      source_fingerprint: "fnv1a64:staleoldvalue0"
    });
    const outcome = await indexLibraryItem(client, "user-a", item, { apiKey: "sk-test", fetchImpl: okFetch });
    expect(outcome).toMatchObject({ ok: true, status: "indexed" });
    expect(written[0].values.status).toBe("indexed");
  });
});

describe("failure behaviour", () => {
  it("never persists a fake vector when the provider fails", async () => {
    const { client, written } = fakeClient();
    const outcome = await indexLibraryItem(client, "user-a", item, { apiKey: "sk-test", fetchImpl: failFetch });

    expect(outcome.ok).toBe(false);
    expect(written).toHaveLength(1);
    // Status is recorded, but no embedding key is written at all.
    expect(written[0].values.status).toBe("failed");
    expect(written[0].values).not.toHaveProperty("embedding");
    expect(String(written[0].values.failure_reason)).toContain("provider_error");
  });

  // The most important guarantee: an outage must not destroy an existing good vector.
  it("does not overwrite a valid vector after a provider failure", async () => {
    const { client, written } = fakeClient({
      library_item_id: "lib-1",
      status: "indexed",
      source_fingerprint: "fnv1a64:somethingelse"
    });
    await indexLibraryItem(client, "user-a", item, { apiKey: "sk-test", fetchImpl: failFetch });

    expect(written[0].values).not.toHaveProperty("embedding");
    expect(written[0].values).not.toHaveProperty("search_text");
  });

  it("counts attempts so repeated failures are visible", async () => {
    const { client, written } = fakeClient({
      library_item_id: "lib-1",
      status: "failed",
      source_fingerprint: null,
      attempts: 2
    });
    await indexLibraryItem(client, "user-a", item, { apiKey: "sk-test", fetchImpl: failFetch });
    expect(written[0].values.attempts).toBe(3);
  });

  it("treats a missing API key as non-retryable", async () => {
    const { client } = fakeClient();
    const outcome = await indexLibraryItem(client, "user-a", item, { apiKey: undefined });
    expect(outcome).toMatchObject({ ok: false, reason: "not_configured", retryable: false });
  });

  it("never claims indexed when the write itself failed", async () => {
    const { client } = fakeClient(null, { upsert: "connection reset" });
    const outcome = await indexLibraryItem(client, "user-a", item, { apiKey: "sk-test", fetchImpl: okFetch });
    expect(outcome).toMatchObject({ ok: false, reason: "persist_failed", retryable: true });
  });

  it("reports a lookup failure as retryable without embedding anything", async () => {
    const { client, written } = fakeClient(null, { select: "timeout" });
    const outcome = await indexLibraryItem(client, "user-a", item, { apiKey: "sk-test", fetchImpl: okFetch });
    expect(outcome).toMatchObject({ ok: false, reason: "lookup_failed" });
    expect(written).toHaveLength(0);
  });

  it("succeeds on retry after an earlier failure", async () => {
    const { client: failing, written: failedWrites } = fakeClient();
    await indexLibraryItem(failing, "user-a", item, { apiKey: "sk-test", fetchImpl: failFetch });
    expect(failedWrites[0].values.status).toBe("failed");

    const { client, written } = fakeClient({ library_item_id: "lib-1", status: "failed", source_fingerprint: null, attempts: 1 });
    const outcome = await indexLibraryItem(client, "user-a", item, { apiKey: "sk-test", fetchImpl: okFetch });

    expect(outcome).toMatchObject({ ok: true, status: "indexed" });
    expect(written[0].values.status).toBe("indexed");
    expect(written[0].values.failure_reason).toBeNull();
  });
});

describe("user ownership", () => {
  it("scopes the lookup and the write to the calling user", async () => {
    const { client, written, reads } = fakeClient();
    await indexLibraryItem(client, "user-b", item, { apiKey: "sk-test", fetchImpl: okFetch });
    expect(reads).toContainEqual(["user_id", "user-b"]);
    expect(written[0].values.user_id).toBe("user-b");
    expect(JSON.stringify(written)).not.toContain("user-a");
  });
});

describe("backfill", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ ...item, id: `lib-${i}` }));

  it("processes a bounded batch and reports that more remains", async () => {
    const { client } = fakeClient();
    const report = await backfillLibraryEmbeddings(client, "user-a", many, {
      apiKey: "sk-test",
      fetchImpl: okFetch,
      batchSize: 5
    });

    expect(report.examined).toBe(5);
    expect(report.indexed).toBe(5);
    expect(report.hasMore).toBe(true);
  });

  it("caps the batch size so a caller cannot request an unbounded run", async () => {
    const { client } = fakeClient();
    const report = await backfillLibraryEmbeddings(client, "user-a", many, {
      apiKey: "sk-test",
      fetchImpl: okFetch,
      batchSize: 5000
    });
    expect(report.examined).toBeLessThanOrEqual(25);
  });

  it("reports completion when nothing remains", async () => {
    const { client } = fakeClient();
    const report = await backfillLibraryEmbeddings(client, "user-a", many.slice(0, 3), {
      apiKey: "sk-test",
      fetchImpl: okFetch,
      batchSize: 10
    });
    expect(report.hasMore).toBe(false);
    expect(report.indexed).toBe(3);
  });

  // A provider that is rate-limiting will fail every item; burning the whole batch wastes quota.
  it("stops early on a provider outage and leaves the rest for a later run", async () => {
    const { client } = fakeClient();
    const report = await backfillLibraryEmbeddings(client, "user-a", many, {
      apiKey: "sk-test",
      fetchImpl: failFetch,
      batchSize: 10
    });

    expect(report.failed).toBe(1);
    expect(report.hasMore).toBe(true);
    expect(report.failures[0]).toMatchObject({ id: "lib-0", reason: "provider_error" });
  });

  it("counts unindexable items as skipped rather than failed", async () => {
    const { client } = fakeClient();
    const report = await backfillLibraryEmbeddings(
      client,
      "user-a",
      [{ id: "a", title: "Only a title" }, { ...item, id: "b" }],
      { apiKey: "sk-test", fetchImpl: okFetch }
    );
    expect(report.skipped).toBe(1);
    expect(report.indexed).toBe(1);
    expect(report.failed).toBe(0);
  });
});
