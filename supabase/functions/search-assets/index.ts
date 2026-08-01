import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

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

    const embedding = await createEmbedding(query);
    const { data, error } = await userClient.rpc("search_assets", {
      query_embedding: embedding,
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

async function createEmbedding(text: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Array(1536).fill(0);
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small",
      input: text
    })
  });

  if (!response.ok) {
    return new Array(1536).fill(0);
  }

  const json = await response.json();
  return json.data[0].embedding;
}

