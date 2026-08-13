import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { backfillLibraryEmbeddings, indexLibraryItem, DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE } from "../_shared/libraryIndexer.ts";

const INDEXABLE_COLUMNS = "id, title, source, content_type, creator, keywords, extracted_text, user_note, summary";

/**
 * Indexes Library items for semantic retrieval.
 *
 * Two modes:
 *   { itemId }  index one item now (used right after a capture or an edit)
 *   { batch }   process one bounded backfill batch of unindexed/stale/failed items
 *
 * Indexing is always a SEPARATE step from saving. Nothing here writes library_items, so a
 * failure can never cost the user their capture.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user, adminClient } = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as { itemId?: string; batch?: boolean; batchSize?: number; force?: boolean };

    const embeddingOptions = {
      apiKey: Deno.env.get("OPENAI_API_KEY"),
      model: Deno.env.get("OPENAI_EMBEDDING_MODEL"),
      force: Boolean(body.force)
    };

    if (body.itemId) {
      const { data, error } = await adminClient
        .from("library_items")
        .select(INDEXABLE_COLUMNS)
        .eq("user_id", user.id) // service-role client, so the user scope is explicit
        .eq("id", body.itemId)
        .maybeSingle();

      if (error) return jsonResponse({ ok: false, reason: "lookup_failed", message: error.message }, 500);
      if (!data) return jsonResponse({ ok: false, reason: "not_found", message: "That saved thing is not in your Library." }, 404);

      const outcome = await indexLibraryItem(adminClient as never, user.id, data as never, embeddingOptions);
      if (!outcome.ok) {
        console.error("index-library failed", user.id, body.itemId, outcome.reason);
        return jsonResponse({ ...outcome, ok: false }, outcome.retryable ? 503 : 500);
      }
      return jsonResponse({ ...outcome, ok: true });
    }

    if (body.batch) {
      const batchSize = Math.min(Math.max(body.batchSize ?? DEFAULT_BATCH_SIZE, 1), MAX_BATCH_SIZE);

      // Candidate query: active items that have no embedding row, or whose row is stale/failed/
      // pending. Fetching one extra row is what lets the report say whether more work remains.
      const { data, error } = await adminClient
        .from("library_items")
        .select(`${INDEXABLE_COLUMNS}, library_item_embeddings(status)`)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("captured_at", { ascending: false })
        .limit(200);

      if (error) return jsonResponse({ ok: false, reason: "lookup_failed", message: error.message }, 500);

      const candidates = ((data ?? []) as Array<Record<string, unknown>>)
        .filter((row) => {
          const embedding = row.library_item_embeddings as Array<{ status?: string }> | { status?: string } | null;
          const status = Array.isArray(embedding) ? embedding[0]?.status : embedding?.status;
          return status === undefined || status === null || status === "pending" || status === "failed" || status === "stale";
        })
        .map(({ library_item_embeddings: _ignored, ...item }) => item);

      const report = await backfillLibraryEmbeddings(adminClient as never, user.id, candidates as never, {
        ...embeddingOptions,
        batchSize
      });

      // Log counts and ids only — never memory contents.
      console.log("index-library backfill", user.id, JSON.stringify({ ...report, failures: report.failures.length }));
      return jsonResponse({ ...report, ok: true, remaining: Math.max(candidates.length - report.examined, 0) });
    }

    return jsonResponse({ ok: false, reason: "invalid_request", message: "Provide itemId or batch." }, 400);
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
