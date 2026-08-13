import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createEmbedding } from "../_shared/embedding.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, userClient, adminClient } = await requireUser(req);
    const { query } = (await req.json()) as { query: string };

    if (!query?.trim()) {
      return jsonResponse({ assets: [] });
    }

    // Searching with a fabricated vector returns arbitrary rows that look like real matches.
    // Fail explicitly instead, so the caller can retry rather than trust a meaningless result.
    const embeddingResult = await createEmbedding(query, {
      apiKey: Deno.env.get("OPENAI_API_KEY"),
      model: Deno.env.get("OPENAI_EMBEDDING_MODEL")
    });

    if (!embeddingResult.ok) {
      console.error("Search embedding failed", embeddingResult.reason, embeddingResult.message);
      return jsonResponse(
        {
          error: "Semantic search is unavailable right now. Your saved things are safe — please try again.",
          reason: embeddingResult.reason,
          retryable: true
        },
        503
      );
    }

    const { data, error } = await userClient.rpc("search_assets", {
      query_embedding: embeddingResult.embedding,
      match_count: 20,
      filter_category: null
    });

    if (error) {
      throw error;
    }

    const assetIds = (data ?? []).map((row: { asset_id: string }) => row.asset_id);
    if (!assetIds.length) {
      return jsonResponse({ assets: [] });
    }

    const { data: rows, error: rowsError } = await adminClient
      .from("media_assets")
      .select("id, device_asset_id, filename, width, height, captured_at, status, is_sensitive, asset_ai_analysis(category, summary, reason, suggested_action)")
      .eq("user_id", user.id)
      .in("id", assetIds);

    if (rowsError) {
      throw rowsError;
    }

    const assets = (rows ?? []).map((row) => {
      const analysis = Array.isArray(row.asset_ai_analysis) ? row.asset_ai_analysis[0] : row.asset_ai_analysis;
      return {
        id: row.device_asset_id,
        deviceAssetId: row.device_asset_id,
        uri: "",
        filename: row.filename,
        width: row.width,
        height: row.height,
        capturedAt: row.captured_at,
        status: row.status,
        isSensitive: row.is_sensitive,
        category: analysis?.category ?? "other",
        summary: analysis?.summary ?? null,
        reason: analysis?.reason ?? null,
        suggestedAction: analysis?.suggested_action ?? "keep"
      };
    });

    return jsonResponse({ assets });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

