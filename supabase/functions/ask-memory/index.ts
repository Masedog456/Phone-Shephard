import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { rankItems as rankItemsShared, tokenize } from "../_shared/memoryRanking.ts";
import { createEmbedding } from "../_shared/embedding.ts";
import { fuseResults, type Candidate } from "../_shared/hybridRanking.ts";
import {
  buildLibraryContext,
  buildScreenshotContext,
  CONTEXT_LIMITS,
  PROVENANCE_INSTRUCTIONS,
  type LibraryRow,
  type MemoryContextEntry,
  type ScreenshotRow
} from "../_shared/memoryContext.ts";

type LibraryItem = {
  id: string;
  source: string;
  content_type: string;
  title: string;
  creator?: string | null;
  summary?: string | null;
  why_saved?: string | null;
  category: string;
  collection_name?: string | null;
  keywords?: string[] | null;
  captured_at: string;
  status?: string | null;
  // Source Intake V1: provenance-bearing fields. Each has a different author and must stay
  // distinguishable all the way through retrieval and into the answer.
  extracted_text?: string | null; // authored by the external source
  user_note?: string | null; // authored by the person
  source_url?: string | null;
  canonical_url?: string | null;
  published_at?: string | null;
  extraction_status?: string | null;
};

/** How much source text is handed to the model per item, to bound context cost. */
const CONTEXT_TEXT_LIMIT = 1500;

type MemoryIntent = {
  id: string;
  kind: "forgotten" | "repeated_interest" | "pattern" | "next_step";
  title: string;
  insight: string;
  suggestedAction: string;
  category: string;
  relatedItemIds: string[];
  progress: number;
  reminder?: string;
};

type MemoryAnswer = {
  question: string;
  response: string;
  relatedItemIds: string[];
  suggestedFollowUps: string[];
  intent?: MemoryIntent;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user, userClient, adminClient } = await requireUser(req);
    const { question } = (await req.json()) as { question?: string };
    const trimmed = question?.trim() ?? "";

    if (!trimmed) {
      return jsonResponse({ error: "A question is required." }, 400);
    }

    const { data: items, error } = await userClient
      .from("library_items")
      .select(
        "id, source, content_type, title, creator, summary, why_saved, category, collection_name, keywords, captured_at, status, extracted_text, user_note, source_url, canonical_url, published_at, extraction_status"
      )
      // RLS on library_items is the primary control here (this is the user client). The explicit
      // user filter is defence-in-depth: it makes the guarantee visible in code and verifiable
      // without a live database, and costs nothing.
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("captured_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const libraryItems = (items ?? []) as LibraryItem[];

    // ── Lexical path (unchanged behaviour, still the precision path) ──
    const lexicalCandidates: Candidate[] = rankItems(trimmed, libraryItems)
      .filter((match) => match.score >= 2)
      .slice(0, 10)
      .map((match) => ({
        kind: "library" as const,
        id: match.item.id,
        lexicalScore: match.score,
        capturedAt: match.item.captured_at
      }));

    // ── Semantic path across BOTH stores ──
    const semantic = await semanticCandidates(trimmed, userClient);

    const fused = fuseResults(lexicalCandidates, semantic.candidates, CONTEXT_LIMITS.maxMemories);

    if (!fused.length) {
      return jsonResponse({
        answer: {
          question: trimmed,
          response: libraryItems.length
            ? "I do not see that in your Library yet. Nothing is lost inside Phone Shepherd, but I only answer from what you have captured or analyzed so far."
            : "Your real Library is quiet right now. Capture something meaningful first, and I will remember the context so you can ask for it naturally later.",
          relatedItemIds: [],
          suggestedFollowUps: libraryItems.length ? defaultFollowUps(libraryItems) : ["Capture a saved link", "Add a business idea", "Save a recipe"]
        },
        retrieval: { lexical: true, semantic: semantic.ran, semanticError: semantic.error }
      });
    }

    // Resolve the fused ids back into full rows, each scoped to this user.
    const libraryById = new Map(libraryItems.map((item) => [item.id, item]));
    const screenshotIds = fused.filter((entry) => entry.kind === "screenshot").map((entry) => entry.id);
    const screenshots = await loadScreenshots(adminClient, user.id, screenshotIds);

    const context = fused
      .map((entry) => {
        if (entry.kind === "library") {
          const row = libraryById.get(entry.id);
          return row ? buildLibraryContext(row as LibraryRow, entry.matchedBy) : null;
        }
        const shot = screenshots.get(entry.id);
        return shot ? buildScreenshotContext(shot, entry.matchedBy) : null;
      })
      .filter(Boolean) as Array<ReturnType<typeof buildLibraryContext>>;

    if (!context.length) {
      return jsonResponse({
        answer: {
          question: trimmed,
          response: "I found something related but could not open it just now. Please try again in a moment.",
          relatedItemIds: [],
          suggestedFollowUps: defaultFollowUps(libraryItems)
        },
        retrieval: { lexical: true, semantic: semantic.ran, semanticError: semantic.error }
      });
    }

    const contextLibraryItems = context
      .filter((entry) => entry.kind === "library")
      .map((entry) => libraryById.get(entry.id))
      .filter(Boolean) as LibraryItem[];

    const answer = await createMemoryAnswer(trimmed, context);
    const allowedIds = new Set(context.map((entry) => entry.id));
    const relatedItemIds = answer.relatedItemIds.filter((id) => allowedIds.has(id));

    return jsonResponse({
      answer: {
        ...answer,
        question: trimmed,
        relatedItemIds: relatedItemIds.length ? relatedItemIds : context.slice(0, 3).map((entry) => entry.id),
        suggestedFollowUps: answer.suggestedFollowUps.length
          ? answer.suggestedFollowUps.slice(0, 3)
          : followUpsForItems(contextLibraryItems.length ? contextLibraryItems : libraryItems),
        intent: sanitizeIntent(answer.intent, contextLibraryItems.length ? contextLibraryItems : libraryItems)
      },
      // Honest reporting of which paths actually ran, so a degraded semantic path is visible.
      retrieval: {
        lexical: true,
        semantic: semantic.ran,
        semanticError: semantic.error,
        sources: context.map((entry) => ({ id: entry.id, kind: entry.kind, matchedBy: entry.matchedBy }))
      }
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Shepherd could not answer yet." }, 500);
  }
});

async function createMemoryAnswer(question: string, memoryContext: MemoryContextEntry[]): Promise<MemoryAnswer> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return fallbackAnswer(question, memoryContext);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MEMORY_MODEL") ?? Deno.env.get("OPENAI_TRANSFORMATION_MODEL") ?? "gpt-4.1-mini",
      input:
        "You are Phone Shepherd, a calm private digital caretaker. Answer only from the provided library items. Do not invent saved items, links, dates, sources, or creators. If the items do not answer the question directly, say so gently and mention the closest relevant saved things. Keep the tone warm, concise, and useful.\n\n" +
        PROVENANCE_INSTRUCTIONS + "\n\n" +
        `User question: ${question}\n\nRelevant private memories:\n${JSON.stringify(memoryContext)}`,
      text: {
        format: {
          type: "json_schema",
          name: "memory_answer",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              question: { type: "string" },
              response: { type: "string" },
              relatedItemIds: { type: "array", items: { type: "string" }, maxItems: 5 },
              suggestedFollowUps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
              intent: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  kind: { type: "string", enum: ["forgotten", "repeated_interest", "pattern", "next_step"] },
                  title: { type: "string" },
                  insight: { type: "string" },
                  suggestedAction: { type: "string" },
                  category: { type: "string" },
                  relatedItemIds: { type: "array", items: { type: "string" }, maxItems: 5 },
                  progress: { type: "number" },
                  reminder: { type: "string" }
                },
                required: ["id", "kind", "title", "insight", "suggestedAction", "category", "relatedItemIds", "progress", "reminder"]
              }
            },
            required: ["question", "response", "relatedItemIds", "suggestedFollowUps", "intent"]
          }
        }
      }
    })
  });

  if (!response.ok) return fallbackAnswer(question, memoryContext);

  const json = await response.json();
  const text = json.output_text ?? json.output?.[0]?.content?.find((part: { type: string }) => part.type === "output_text")?.text;
  if (!text) return fallbackAnswer(question, memoryContext);

  try {
    return JSON.parse(text) as MemoryAnswer;
  } catch {
    return fallbackAnswer(question, memoryContext);
  }
}

function rankItems(question: string, items: LibraryItem[]) {
  return rankItemsShared(question, items, categoryFromQuestion(question), normalizeCategory);
}

function fallbackAnswer(question: string, memories: MemoryContextEntry[]): MemoryAnswer {
  const top = memories[0];
  const relatedItemIds = memories.slice(0, 5).map((entry) => entry.id);
  const category = normalizeCategory(typeof top?.category === "string" ? top.category : null);
  const describe = (entry: MemoryContextEntry) =>
    entry.kind === "screenshot" ? `a screenshot (${String(entry.title ?? "untitled")})` : `"${String(entry.title ?? "untitled")}"`;

  return {
    question,
    response: !top
      ? "I do not have anything saved that matches that yet."
      : memories.length === 1
        ? `I found one saved thing that may match: ${describe(top)}.`
        : `I found ${memories.length} saved things that may match. The closest is ${describe(top)}.`,
    relatedItemIds,
    suggestedFollowUps: ["Show recent saves", "What did I save this week?", "Create a next step"],
    intent: {
      id: `memory-${category}`,
      kind: memories.length > 2 ? "pattern" : "next_step",
      title: intentTitle(category),
      insight: `This question touched ${memories.length} saved ${memories.length === 1 ? "memory" : "memories"}.`,
      suggestedAction: intentAction(category),
      category,
      relatedItemIds,
      progress: Math.min(0.95, 0.35 + memories.length * 0.12),
      reminder: ""
    }
  };
}

function sanitizeIntent(intent: MemoryIntent | undefined, items: LibraryItem[]) {
  if (!intent) return fallbackAnswer("", items.map((item) => ({ id: item.id, kind: "library" as const, category: item.category }))).intent;
  const allowedIds = new Set(items.map((item) => item.id));
  const relatedItemIds = intent.relatedItemIds.filter((id) => allowedIds.has(id));
  const category = normalizeCategory(intent.category || items[0]?.category);

  return {
    ...intent,
    category,
    relatedItemIds: relatedItemIds.length ? relatedItemIds : items.slice(0, 3).map((item) => item.id),
    progress: Math.max(0.05, Math.min(1, intent.progress))
  };
}

function followUpsForItems(items: LibraryItem[]) {
  const category = normalizeCategory(items[0]?.category);
  const source = items[0]?.source;
  return [
    `Show only ${labelForCategory(category)}`,
    source ? `What did I save from ${source}?` : "Show recent saves",
    intentAction(category)
  ];
}

function defaultFollowUps(items: LibraryItem[]) {
  const categories = Array.from(new Set(items.map((item) => normalizeCategory(item.category)))).slice(0, 3);
  return categories.length ? categories.map((category) => `Show my ${labelForCategory(category)}`) : ["Show recent saves", "Find recipes", "Find business ideas"];
}

function categoryFromQuestion(question: string) {
  const normalized = question.toLowerCase();
  if (includesAny(normalized, ["recipe", "chicken", "pasta", "dinner", "meal"])) return "recipes";
  if (includesAny(normalized, ["business", "startup", "idea", "ai"])) return "business_ideas";
  if (includesAny(normalized, ["workout", "fitness", "exercise", "health"])) return "fitness";
  if (includesAny(normalized, ["travel", "trip", "hotel", "flight", "japan", "italy", "places"])) return "travel";
  if (includesAny(normalized, ["quote", "wisdom", "courage", "philosophy"])) return "wisdom";
  if (includesAny(normalized, ["receipt", "bill", "finance", "invoice", "tax"])) return "finance";
  if (includesAny(normalized, ["family", "birthday", "daughter", "memory"])) return "family";
  if (includesAny(normalized, ["movie", "video", "watch", "music"])) return "entertainment";
  return null;
}

function normalizeCategory(category?: string | null) {
  switch (category) {
    case "recipe":
    case "recipes":
      return "recipes";
    case "business_ideas":
    case "business":
    case "idea":
    case "ideas":
      return "business_ideas";
    case "fitness":
    case "health":
    case "workout":
      return "fitness";
    case "travel":
      return "travel";
    case "shopping":
    case "receipt":
    case "receipts":
      return "shopping";
    case "wisdom":
    case "quote":
    case "quotes":
      return "wisdom";
    case "finance":
    case "bill":
    case "bills":
      return "finance";
    case "family":
    case "memory":
    case "memories":
      return "family";
    case "entertainment":
      return "entertainment";
    default:
      return "education";
  }
}

function labelForCategory(category: string) {
  switch (category) {
    case "recipes":
      return "Recipes";
    case "business_ideas":
      return "Business Ideas";
    case "fitness":
      return "Fitness";
    case "travel":
      return "Travel";
    case "shopping":
      return "Shopping";
    case "wisdom":
      return "Wisdom";
    case "finance":
      return "Finance";
    case "family":
      return "Family";
    case "entertainment":
      return "Entertainment";
    default:
      return "Education";
  }
}

function intentTitle(category: string) {
  switch (category) {
    case "recipes":
      return "Recipe Shepherd can turn this into a meal plan.";
    case "business_ideas":
      return "Idea Shepherd can shape this into an action plan.";
    case "fitness":
      return "Fitness Shepherd can turn this into a routine.";
    case "travel":
      return "Travel Shepherd can build a simple itinerary.";
    default:
      return `${labelForCategory(category)} can become easier to use.`;
  }
}

function intentAction(category: string) {
  switch (category) {
    case "recipes":
      return "Create a dinner list";
    case "business_ideas":
      return "Find the strongest theme";
    case "fitness":
      return "Schedule one small session";
    case "travel":
      return "Draft a gentle itinerary";
    default:
      return "Create a next step";
  }
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}


/**
 * Runs semantic retrieval across both memory stores.
 *
 * Both RPCs are SECURITY INVOKER and filter on auth.uid(), so they are called with the USER
 * client. A failure here degrades the answer to lexical-only rather than failing the request:
 * losing semantic reach is worse than nothing, but far better than losing the answer entirely.
 */
async function semanticCandidates(
  question: string,
  userClient: { rpc: (name: string, params: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> }
): Promise<{ candidates: Candidate[]; ran: boolean; error: string | null }> {
  const embedding = await createEmbedding(question, {
    apiKey: Deno.env.get("OPENAI_API_KEY"),
    model: Deno.env.get("OPENAI_EMBEDDING_MODEL")
  });

  if (!embedding.ok) {
    console.error("ask-memory semantic path unavailable", embedding.reason);
    return { candidates: [], ran: false, error: embedding.reason };
  }

  const [libraryResult, assetResult] = await Promise.all([
    userClient.rpc("search_library_items", { query_embedding: embedding.embedding, match_count: 20 }),
    userClient.rpc("search_assets", { query_embedding: embedding.embedding, match_count: 20, filter_category: null })
  ]);

  const candidates: Candidate[] = [];
  let failure: string | null = null;

  if (libraryResult.error) {
    console.error("ask-memory library vector search failed", libraryResult.error.message);
    failure = "library_search_failed";
  } else {
    for (const row of (libraryResult.data ?? []) as Array<{ library_item_id: string; similarity: number }>) {
      candidates.push({ kind: "library", id: row.library_item_id, semanticScore: row.similarity });
    }
  }

  if (assetResult.error) {
    console.error("ask-memory screenshot vector search failed", assetResult.error.message);
    failure = failure ? "both_searches_failed" : "screenshot_search_failed";
  } else {
    for (const row of (assetResult.data ?? []) as Array<{ asset_id: string; similarity: number }>) {
      candidates.push({ kind: "screenshot", id: row.asset_id, semanticScore: row.similarity });
    }
  }

  return { candidates, ran: failure !== "both_searches_failed", error: failure };
}

/** Loads screenshot rows for the fused ids, scoped to the caller. */
async function loadScreenshots(
  adminClient: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: unknown) => { in: (column: string, values: unknown[]) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> };
      };
    };
  },
  userId: string,
  ids: string[]
): Promise<Map<string, ScreenshotRow>> {
  const map = new Map<string, ScreenshotRow>();
  if (!ids.length) return map;

  // Service-role client, so the user scope is applied explicitly and is not optional.
  const { data, error } = await adminClient
    .from("media_assets")
    .select("id, device_asset_id, filename, captured_at, is_sensitive, status, asset_ai_analysis(category, summary, extracted_text, reason)")
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    console.error("ask-memory could not load screenshots", error.message);
    return map;
  }

  for (const raw of (data ?? []) as Array<Record<string, unknown>>) {
    // Deleted or archived screenshots must not resurface through memory.
    if (raw.status === "deleted" || raw.status === "deleted_pending" || raw.status === "archived") continue;
    const analysisRaw = raw.asset_ai_analysis;
    const analysis = (Array.isArray(analysisRaw) ? analysisRaw[0] : analysisRaw) as Record<string, unknown> | undefined;
    map.set(String(raw.id), {
      id: String(raw.id),
      device_asset_id: raw.device_asset_id as string | null,
      filename: raw.filename as string | null,
      captured_at: raw.captured_at as string | null,
      is_sensitive: Boolean(raw.is_sensitive),
      category: analysis?.category as string | undefined,
      summary: analysis?.summary as string | undefined,
      extracted_text: analysis?.extracted_text as string | undefined,
      reason: analysis?.reason as string | undefined
    });
  }

  return map;
}
