import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createEmbedding } from "../_shared/embedding.ts";

type InputAsset = {
  id: string;
  deviceAssetId: string;
  dataUrl?: string;
  filename?: string | null;
  width?: number;
  height?: number;
  capturedAt?: string | null;
  uri?: string;
};

const MAX_ASSETS_PER_REQUEST = 10;
const MAX_DATA_URL_LENGTH = 5_000_000;

type Analysis = {
  category: "recipe" | "travel" | "shopping" | "bill" | "note" | "password" | "social" | "receipt" | "memory" | "other";
  confidence: number;
  summary: string;
  extracted_text: string;
  suggested_action: "delete" | "archive" | "save_category" | "keep" | "review_sensitive";
  reason: string;
  contains_credentials: boolean;
  contains_financial_info: boolean;
  contains_personal_info: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, adminClient } = await requireUser(req);
    const { assets } = (await req.json()) as { assets: InputAsset[] };

    if (!Array.isArray(assets)) {
      return jsonResponse({ error: "assets must be an array" }, 400);
    }

    const analyzed = [];
    let embeddingFailures = 0;

    for (const asset of assets.slice(0, MAX_ASSETS_PER_REQUEST)) {
      if (asset.dataUrl && asset.dataUrl.length > MAX_DATA_URL_LENGTH) {
        return jsonResponse({ error: "One image is too large for analysis. Try a smaller batch." }, 413);
      }

      const analysis = await analyzeImage(asset);

      const { data: mediaAsset, error: mediaError } = await adminClient
        .from("media_assets")
        .upsert(
          {
            user_id: user.id,
            device_asset_id: asset.deviceAssetId,
            asset_type: "screenshot",
            filename: asset.filename,
            width: asset.width,
            height: asset.height,
            captured_at: asset.capturedAt,
            is_sensitive: analysis.contains_credentials || analysis.contains_financial_info
          },
          { onConflict: "user_id,device_asset_id" }
        )
        .select("id")
        .single();

      if (mediaError) {
        throw mediaError;
      }

      await adminClient.from("asset_ai_analysis").upsert({
        asset_id: mediaAsset.id,
        user_id: user.id,
        category: analysis.category,
        confidence: analysis.confidence,
        summary: analysis.summary,
        extracted_text: analysis.contains_credentials ? null : analysis.extracted_text,
        suggested_action: analysis.suggested_action,
        reason: analysis.reason,
        contains_credentials: analysis.contains_credentials,
        contains_financial_info: analysis.contains_financial_info,
        contains_personal_info: analysis.contains_personal_info,
        model: Deno.env.get("OPENAI_VISION_MODEL") ?? "gpt-4.1-mini",
        raw_json: analysis
      }, { onConflict: "asset_id" });

      const searchText = [
        analysis.category,
        analysis.summary,
        analysis.contains_credentials ? "" : analysis.extracted_text,
        analysis.reason,
        asset.filename ?? ""
      ].join("\n");

      // Semantic indexing is optional. The asset and its analysis are already persisted above,
      // so an embedding failure must not lose the capture and must not write a placeholder
      // vector. Leaving the asset_embeddings row absent is what makes a later retry possible.
      const embeddingResult = await createEmbedding(searchText, {
        apiKey: Deno.env.get("OPENAI_API_KEY"),
        model: Deno.env.get("OPENAI_EMBEDDING_MODEL")
      });

      let embeddingIndexed = false;
      if (embeddingResult.ok) {
        const { error: embeddingError } = await adminClient.from("asset_embeddings").upsert({
          asset_id: mediaAsset.id,
          user_id: user.id,
          embedding: embeddingResult.embedding,
          search_text: searchText
        });

        if (embeddingError) {
          console.error("Embedding persistence failed", mediaAsset.id, embeddingError.message);
        } else {
          embeddingIndexed = true;
        }
      } else {
        console.error("Embedding generation failed", mediaAsset.id, embeddingResult.reason, embeddingResult.message);
      }

      if (!embeddingIndexed) {
        embeddingFailures += 1;
      }

      analyzed.push({
        ...asset,
        id: asset.id,
        category: analysis.category,
        summary: analysis.summary,
        reason: analysis.reason,
        suggestedAction: analysis.suggested_action,
        isSensitive: analysis.contains_credentials || analysis.contains_financial_info,
        status: analysis.suggested_action === "delete" ? "active" : "active",
        // Lets the client tell "not searchable yet" apart from "analysed and indexed".
        embeddingIndexed
      });
    }

    return jsonResponse({
      assets: analyzed,
      embeddingFailures,
      // Analysis succeeded even when indexing did not; the client should not treat this as a
      // failed scan, but the flag makes the degraded state diagnosable instead of invisible.
      semanticIndexComplete: embeddingFailures === 0
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

async function analyzeImage(asset: InputAsset): Promise<Analysis> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey || !asset.dataUrl) {
    return heuristicAnalysis(asset);
  }

  const model = Deno.env.get("OPENAI_VISION_MODEL") ?? "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Classify this screenshot for a privacy-first camera roll cleanup app. Return only structured JSON. Do not transcribe passwords, seed phrases, API keys, recovery codes, or credential values. Prefer keep over delete when uncertain."
            },
            {
              type: "input_image",
              image_url: asset.dataUrl
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "phone_shepherd_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              category: {
                type: "string",
                enum: ["recipe", "travel", "shopping", "bill", "note", "password", "social", "receipt", "memory", "other"]
              },
              confidence: { type: "number" },
              summary: { type: "string" },
              extracted_text: { type: "string" },
              suggested_action: {
                type: "string",
                enum: ["delete", "archive", "save_category", "keep", "review_sensitive"]
              },
              reason: { type: "string" },
              contains_credentials: { type: "boolean" },
              contains_financial_info: { type: "boolean" },
              contains_personal_info: { type: "boolean" }
            },
            required: [
              "category",
              "confidence",
              "summary",
              "extracted_text",
              "suggested_action",
              "reason",
              "contains_credentials",
              "contains_financial_info",
              "contains_personal_info"
            ]
          }
        }
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    console.error("OpenAI analysis failed", response.status, message);
    return heuristicAnalysis(asset);
  }

  const json = await response.json();
  const outputText = json.output_text ?? json.output?.[0]?.content?.find((item: { type: string }) => item.type === "output_text")?.text;
  return normalizeAnalysis(JSON.parse(outputText) as Partial<Analysis>);
}

function normalizeAnalysis(analysis: Partial<Analysis>): Analysis {
  const categoryValues = ["recipe", "travel", "shopping", "bill", "note", "password", "social", "receipt", "memory", "other"];
  const actionValues = ["delete", "archive", "save_category", "keep", "review_sensitive"];

  const category = categoryValues.includes(analysis.category ?? "") ? analysis.category : "other";
  const suggestedAction = actionValues.includes(analysis.suggested_action ?? "") ? analysis.suggested_action : "keep";
  const containsCredentials = Boolean(analysis.contains_credentials);
  const containsFinancialInfo = Boolean(analysis.contains_financial_info);

  return {
    category: category as Analysis["category"],
    confidence: typeof analysis.confidence === "number" ? Math.max(0, Math.min(1, analysis.confidence)) : 0,
    summary: analysis.summary || "Screenshot ready for review.",
    extracted_text: containsCredentials ? "" : analysis.extracted_text || "",
    suggested_action: containsCredentials || containsFinancialInfo ? "review_sensitive" : (suggestedAction as Analysis["suggested_action"]),
    reason: analysis.reason || "Review before taking action.",
    contains_credentials: containsCredentials,
    contains_financial_info: containsFinancialInfo,
    contains_personal_info: Boolean(analysis.contains_personal_info)
  };
}

function heuristicAnalysis(asset: InputAsset): Analysis {
  const filename = (asset.filename ?? "").toLowerCase();
  const category = filename.includes("receipt")
    ? "receipt"
    : filename.includes("flight") || filename.includes("travel")
      ? "travel"
      : filename.includes("recipe")
        ? "recipe"
        : "other";

  return {
    category,
    confidence: 0.45,
    summary: category === "other" ? "Screenshot ready for review." : `Likely ${category} screenshot.`,
    extracted_text: "",
    suggested_action: category === "other" ? "keep" : "archive",
    reason: "Using local metadata because image analysis is not configured yet.",
    contains_credentials: false,
    contains_financial_info: category === "receipt",
    contains_personal_info: false
  };
}


