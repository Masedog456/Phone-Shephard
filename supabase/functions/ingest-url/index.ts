import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { ingestUrl } from "../_shared/ingestUrlCore.ts";
import { indexLibraryItem } from "../_shared/libraryIndexer.ts";

const MAX_NOTE_LENGTH = 2000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, adminClient } = await requireUser(req);
    const { url, note } = (await req.json()) as { url?: string; note?: string };

    if (!url || typeof url !== "string" || !url.trim()) {
      return jsonResponse({ ok: false, reason: "invalid_url", message: "Paste a web address to save." }, 400);
    }

    const userNote = typeof note === "string" && note.trim() ? note.trim().slice(0, MAX_NOTE_LENGTH) : null;

    const outcome = await ingestUrl(adminClient as never, user.id, url.trim(), userNote, {
      // Deno.resolveDns is unavailable on the hosted Edge runtime; the literal-address checks in
      // urlSafety.ts remain the primary control and run on every redirect hop regardless.
      resolveDns: typeof Deno.resolveDns === "function"
        ? async (host: string) => {
            const [v4, v6] = await Promise.allSettled([Deno.resolveDns(host, "A"), Deno.resolveDns(host, "AAAA")]);
            return [
              ...(v4.status === "fulfilled" ? v4.value : []),
              ...(v6.status === "fulfilled" ? v6.value : [])
            ];
          }
        : undefined
    });

    if (!outcome.ok) {
      console.error("ingest-url failed", user.id, outcome.reason, outcome.message);
      return jsonResponse(
        {
          ok: false,
          reason: outcome.reason,
          message: outcome.message,
          retryable: outcome.retryable,
          // The attempt is still recorded when we got far enough to write it.
          itemId: outcome.itemId ?? null
        },
        // 422 means "we understood you, the page did not cooperate" — distinct from a 500.
        outcome.reason === "persist_failed" || outcome.reason === "lookup_failed" ? 500 : 422
      );
    }

    // Persistence already succeeded. Indexing is a separate, best-effort step: a failure here is
    // reported but never turns a successful capture into a failed one.
    let indexed = false;
    const itemId = typeof outcome.item.id === "string" ? outcome.item.id : null;
    if (itemId) {
      const item = outcome.item as Record<string, unknown>;
      const indexOutcome = await indexLibraryItem(
        adminClient as never,
        user.id,
        {
          id: itemId,
          title: item.title as string | null,
          source: item.source as string | null,
          content_type: item.content_type as string | null,
          creator: item.creator as string | null,
          keywords: item.keywords as string[] | null,
          extracted_text: item.extracted_text as string | null,
          user_note: item.user_note as string | null,
          summary: item.summary as string | null
        },
        {
          apiKey: Deno.env.get("OPENAI_API_KEY"),
          model: Deno.env.get("OPENAI_EMBEDDING_MODEL")
        }
      );
      indexed = indexOutcome.ok && indexOutcome.status === "indexed";
      if (!indexOutcome.ok) {
        console.error("ingest-url indexing failed", user.id, itemId, indexOutcome.reason);
      }
    }

    return jsonResponse({
      ok: true,
      item: outcome.item,
      semanticallyIndexed: indexed,
      duplicateStatus: outcome.duplicateStatus,
      duplicateOfId: outcome.duplicateOfId,
      extractionStatus: outcome.extractionStatus,
      wordCount: outcome.wordCount
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
