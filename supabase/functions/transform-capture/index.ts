import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

type Capture = { id: string; title: string; source: string; sourceLabel: string; contentType: string; creator?: string; link?: string; capturedAt: string; summary: string; keywords: string[]; suggestedShepherd: string };
type Section = { title: string; detail: string; meta?: string };
type Output = { eyebrow: string; title: string; summary: string; outputLabel: string; outputTitle: string; outputDescription: string; sections: Section[]; nextAction: string; nextActionDetail: string; libraryDestination: string; category: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user, adminClient } = await requireUser(req);
    const { capture, action } = (await req.json()) as { capture: Capture; action: string };
    if (!capture?.id || !capture.title || !capture.summary) return jsonResponse({ error: "A valid capture is required." }, 400);

    const output = await createOutput(capture, action);
    const { data: item, error: itemError } = await adminClient.from("library_items").upsert({
      user_id: user.id, client_id: capture.id, source: capture.sourceLabel, content_type: capture.contentType,
      title: capture.title, creator: capture.creator, source_url: capture.link, summary: capture.summary,
      why_saved: action.replaceAll("_", " "), category: output.category, collection_name: output.libraryDestination,
      keywords: capture.keywords, raw_metadata: { suggested_shepherd: capture.suggestedShepherd, selected_action: action }, captured_at: capture.capturedAt
    }, { onConflict: "user_id,client_id" }).select("id").single();
    if (itemError) throw itemError;

    const result = { id: crypto.randomUUID(), ...output, sources: [{ label: capture.sourceLabel, count: 1 }] };
    const { data: transformation, error: transformationError } = await adminClient.from("transformations").insert({
      id: result.id, user_id: user.id, library_item_id: item.id, transformation_type: action,
      title: result.outputTitle, summary: result.summary, output_json: result,
      model: Deno.env.get("OPENAI_TRANSFORMATION_MODEL") ?? "gpt-4.1-mini"
    }).select("id").single();
    if (transformationError) throw transformationError;
    return jsonResponse({ transformation: { ...result, id: transformation.id } });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

async function createOutput(capture: Capture, action: string): Promise<Output> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return fallbackOutput(capture);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_TRANSFORMATION_MODEL") ?? "gpt-4.1-mini",
      input: `You are Phone Shepherd, a calm private digital caretaker. Turn this captured item into a useful, specific output. Never invent facts. Preserve what matters and suggest one gentle next step. Capture: ${JSON.stringify(capture)}. User intent: ${action}.`,
      text: { format: { type: "json_schema", name: "transformation", strict: true, schema: {
        type: "object", additionalProperties: false,
        properties: {
          eyebrow: { type: "string" }, title: { type: "string" }, summary: { type: "string" }, outputLabel: { type: "string" },
          outputTitle: { type: "string" }, outputDescription: { type: "string" },
          sections: { type: "array", minItems: 1, maxItems: 4, items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, detail: { type: "string" }, meta: { type: "string" } }, required: ["title", "detail", "meta"] } },
          nextAction: { type: "string" }, nextActionDetail: { type: "string" }, libraryDestination: { type: "string" }, category: { type: "string" }
        }, required: ["eyebrow", "title", "summary", "outputLabel", "outputTitle", "outputDescription", "sections", "nextAction", "nextActionDetail", "libraryDestination", "category"]
      } } }
    })
  });
  if (!response.ok) return fallbackOutput(capture);
  const json = await response.json();
  const text = json.output_text ?? json.output?.[0]?.content?.find((part: { type: string }) => part.type === "output_text")?.text;
  return JSON.parse(text) as Output;
}

function fallbackOutput(capture: Capture): Output {
  return {
    eyebrow: `${capture.suggestedShepherd} created this`, title: "This saved thing now has a place and a next step.",
    summary: `I understood ${capture.title} and turned it into a useful note instead of another forgotten save.`,
    outputLabel: "A useful beginning", outputTitle: capture.title, outputDescription: capture.summary,
    sections: [{ title: "What matters", detail: capture.summary, meta: capture.keywords.slice(0, 3).join(" · ") || "Saved with context" }],
    nextAction: "Return when it becomes useful", nextActionDetail: "Shepherd will keep the context attached.",
    libraryDestination: `${capture.suggestedShepherd} · Captured`, category: capture.keywords[0] ?? "other"
  };
}
