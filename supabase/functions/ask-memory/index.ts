import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

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
};

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
    const { userClient } = await requireUser(req);
    const { question } = (await req.json()) as { question?: string };
    const trimmed = question?.trim() ?? "";

    if (!trimmed) {
      return jsonResponse({ error: "A question is required." }, 400);
    }

    const { data: items, error } = await userClient
      .from("library_items")
      .select("id, source, content_type, title, creator, summary, why_saved, category, collection_name, keywords, captured_at, status")
      .eq("status", "active")
      .order("captured_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const libraryItems = (items ?? []) as LibraryItem[];
    if (!libraryItems.length) {
      return jsonResponse({
        answer: {
          question: trimmed,
          response:
            "Your real Library is quiet right now. Capture something meaningful first, and I will remember the context so you can ask for it naturally later.",
          relatedItemIds: [],
          suggestedFollowUps: ["Capture a saved link", "Add a business idea", "Save a recipe"]
        }
      });
    }

    const ranked = rankItems(trimmed, libraryItems);
    const relevant = ranked.filter((match) => match.score >= 2).slice(0, 8);

    if (!relevant.length) {
      return jsonResponse({
        answer: {
          question: trimmed,
          response:
            "I do not see that in your Library yet. Nothing is lost inside Phone Shepherd, but I only answer from what you have captured or analyzed so far.",
          relatedItemIds: [],
          suggestedFollowUps: defaultFollowUps(libraryItems)
        }
      });
    }

    const answer = await createMemoryAnswer(trimmed, relevant.map((match) => match.item));
    const allowedIds = new Set(relevant.map((match) => match.item.id));
    const relatedItemIds = answer.relatedItemIds.filter((id) => allowedIds.has(id));

    return jsonResponse({
      answer: {
        ...answer,
        question: trimmed,
        relatedItemIds: relatedItemIds.length ? relatedItemIds : relevant.slice(0, 3).map((match) => match.item.id),
        suggestedFollowUps: answer.suggestedFollowUps.length ? answer.suggestedFollowUps.slice(0, 3) : followUpsForItems(relevant.map((match) => match.item)),
        intent: sanitizeIntent(answer.intent, relevant.map((match) => match.item))
      }
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Shepherd could not answer yet." }, 500);
  }
});

async function createMemoryAnswer(question: string, items: LibraryItem[]): Promise<MemoryAnswer> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return fallbackAnswer(question, items);

  const memoryContext = items.map((item) => ({
    id: item.id,
    title: item.title,
    source: item.source,
    type: item.content_type,
    creator: item.creator,
    summary: item.summary,
    whySaved: item.why_saved,
    category: item.category,
    collection: item.collection_name,
    keywords: item.keywords ?? [],
    capturedAt: item.captured_at
  }));

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
        `User question: ${question}\n\nRelevant private library items:\n${JSON.stringify(memoryContext)}`,
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

  if (!response.ok) return fallbackAnswer(question, items);

  const json = await response.json();
  const text = json.output_text ?? json.output?.[0]?.content?.find((part: { type: string }) => part.type === "output_text")?.text;
  if (!text) return fallbackAnswer(question, items);

  try {
    return JSON.parse(text) as MemoryAnswer;
  } catch {
    return fallbackAnswer(question, items);
  }
}

function rankItems(question: string, items: LibraryItem[]) {
  const words = tokenize(question);
  const categoryHint = categoryFromQuestion(question);

  return items
    .map((item) => {
      const haystack = [
        item.title,
        item.summary,
        item.why_saved,
        item.source,
        item.content_type,
        item.creator,
        item.category,
        item.collection_name,
        ...(item.keywords ?? [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const wordHits = words.filter((word) => haystack.includes(word)).length;
      const titleHits = words.filter((word) => item.title.toLowerCase().includes(word)).length;
      const keywordHits = words.filter((word) => (item.keywords ?? []).join(" ").toLowerCase().includes(word)).length;
      const categoryBoost = categoryHint && normalizeCategory(item.category) === categoryHint ? 4 : 0;

      return {
        item,
        score: wordHits + titleHits * 2 + keywordHits * 2 + categoryBoost
      };
    })
    .sort((a, b) => b.score - a.score || Date.parse(b.item.captured_at) - Date.parse(a.item.captured_at));
}

function fallbackAnswer(question: string, items: LibraryItem[]): MemoryAnswer {
  const top = items[0];
  const relatedItemIds = items.slice(0, 5).map((item) => item.id);
  const category = normalizeCategory(top.category);

  return {
    question,
    response:
      items.length === 1
        ? `I found one saved thing that may match: "${top.title}" from ${top.source}. ${top.summary ?? "Shepherd kept the context attached."}`
        : `I found ${items.length} saved things that may match. The closest is "${top.title}" from ${top.source}: ${top.summary ?? "Shepherd kept the context attached."}`,
    relatedItemIds,
    suggestedFollowUps: followUpsForItems(items),
    intent: {
      id: `memory-${category}`,
      kind: items.length > 2 ? "pattern" : "next_step",
      title: intentTitle(category),
      insight: `This question touched ${items.length} saved ${items.length === 1 ? "thing" : "things"}. Shepherd can help turn the memory into a useful next step.`,
      suggestedAction: intentAction(category),
      category,
      relatedItemIds,
      progress: Math.min(0.95, 0.35 + items.length * 0.12),
      reminder: ""
    }
  };
}

function sanitizeIntent(intent: MemoryIntent | undefined, items: LibraryItem[]) {
  if (!intent) return fallbackAnswer("", items).intent;
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

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .map((word) => {
      if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
      if (word.endsWith("s") && word.length > 4) return word.slice(0, -1);
      return word;
    });
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
