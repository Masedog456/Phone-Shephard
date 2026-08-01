import { IntentSuggestion, LibraryCategory, LibraryItem } from "@/types/domain";
import { categoryLabels } from "@/features/library/mockLibrary";

export type MemoryAnswer = {
  question: string;
  response: string;
  relatedItemIds: string[];
  suggestedFollowUps: string[];
  intent?: IntentSuggestion;
};

export const memoryPrompts = [
  "Where is that chicken recipe I saved?",
  "What were my business ideas about AI?",
  "Show me all my saved places in Japan.",
  "What quotes have I collected about courage?"
];

type ScoredItem = {
  item: LibraryItem;
  score: number;
  matchedWords: string[];
};

export function askMemory(question: string, items: LibraryItem[]): MemoryAnswer {
  const trimmed = question.trim();

  if (!items.length) {
    return {
      question: trimmed || "What can I ask?",
      response:
        "Your real Library is quiet right now. Capture something meaningful first, and I will remember the context so you can ask for it naturally later.",
      relatedItemIds: [],
      suggestedFollowUps: ["Capture a saved link", "Add a business idea", "Save a recipe"]
    };
  }

  if (!trimmed) {
    return {
      question: "What can I ask?",
      response: `I can search across ${items.length} saved ${items.length === 1 ? "thing" : "things"} in your private Library by meaning, not just filename or source.`,
      relatedItemIds: items.slice(0, 3).map((item) => item.id),
      suggestedFollowUps: buildDefaultFollowUps(items)
    };
  }

  const matches = rankLibraryItems(trimmed, items);
  const strongMatches = matches.filter((match) => match.score >= 2).slice(0, 5);
  const fallbackMatches = matches.slice(0, 3);
  const selected = strongMatches.length ? strongMatches : fallbackMatches.filter((match) => match.score > 0);

  if (!selected.length) {
    return {
      question: trimmed,
      response:
        "I do not see that in your Library yet. Nothing is lost inside Phone Shepherd, but I only answer from what you have captured or analyzed so far.",
      relatedItemIds: [],
      suggestedFollowUps: buildDefaultFollowUps(items)
    };
  }

  const categories = summarizeCategories(selected.map((match) => match.item));
  const top = selected[0].item;
  const repeatedCategory = mostCommonCategory(selected.map((match) => match.item));
  const response =
    selected.length === 1
      ? `I found it. The closest saved thing is "${top.title}" from ${top.source}. ${top.aiSummary} I kept it under ${categoryLabels[top.category]} because it seems connected to ${top.whySaved.toLowerCase()}.`
      : `I found ${selected.length} saved things that match what you meant. They cluster around ${categories}. The closest is "${top.title}" from ${top.source}: ${top.aiSummary}`;

  return {
    question: trimmed,
    response,
    relatedItemIds: selected.map((match) => match.item.id),
    intent: buildIntent(trimmed, selected.map((match) => match.item), repeatedCategory),
    suggestedFollowUps: buildFollowUps(trimmed, selected.map((match) => match.item), repeatedCategory)
  };
}

function rankLibraryItems(question: string, items: LibraryItem[]): ScoredItem[] {
  const words = tokenize(question);
  const categoryHint = categoryFromQuestion(question);

  return items
    .map((item) => {
      const fields = [
        item.title,
        item.aiSummary,
        item.whySaved,
        item.suggestedAction,
        item.source,
        item.type,
        item.collection,
        item.creator,
        categoryLabels[item.category],
        ...item.keywords
      ];
      const haystack = fields.filter(Boolean).join(" ").toLowerCase();
      const matchedWords = words.filter((word) => haystack.includes(word));
      const titleHits = words.filter((word) => item.title.toLowerCase().includes(word)).length;
      const keywordHits = words.filter((word) => item.keywords.join(" ").toLowerCase().includes(word)).length;
      const categoryBoost = categoryHint && item.category === categoryHint ? 4 : 0;
      const score = matchedWords.length + titleHits * 2 + keywordHits * 2 + categoryBoost;

      return { item, score, matchedWords };
    })
    .sort((a, b) => b.score - a.score || Date.parse(b.item.capturedAt) - Date.parse(a.item.capturedAt));
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .map(normalizeWord);
}

function normalizeWord(word: string) {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s") && word.length > 4) return word.slice(0, -1);
  return word;
}

function categoryFromQuestion(question: string): LibraryCategory | null {
  const normalized = question.toLowerCase();
  if (includesAny(normalized, ["recipe", "recipes", "chicken", "pasta", "dinner", "meal"])) return "recipes";
  if (includesAny(normalized, ["business", "startup", "idea", "ideas", "ai"])) return "business_ideas";
  if (includesAny(normalized, ["workout", "fitness", "exercise", "health"])) return "fitness";
  if (includesAny(normalized, ["travel", "trip", "hotel", "flight", "japan", "italy", "places"])) return "travel";
  if (includesAny(normalized, ["quote", "quotes", "wisdom", "courage", "philosophy"])) return "wisdom";
  if (includesAny(normalized, ["receipt", "bill", "finance", "invoice", "tax"])) return "finance";
  if (includesAny(normalized, ["family", "birthday", "daughter", "memory"])) return "family";
  if (includesAny(normalized, ["movie", "video", "watch", "music"])) return "entertainment";
  return null;
}

function summarizeCategories(items: LibraryItem[]) {
  const labels = Array.from(new Set(items.map((item) => categoryLabels[item.category]))).slice(0, 3);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function mostCommonCategory(items: LibraryItem[]): LibraryCategory {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as LibraryCategory;
}

function buildIntent(question: string, items: LibraryItem[], category: LibraryCategory): IntentSuggestion | undefined {
  if (!items.length) return undefined;

  return {
    id: `memory-${category}`,
    kind: items.length > 2 ? "pattern" : "next_step",
    title: intentTitle(category),
    insight: `This question touched ${items.length} saved ${items.length === 1 ? "thing" : "things"} in ${categoryLabels[category]}. Shepherd can turn the memory into a useful next step instead of another list.`,
    suggestedAction: intentAction(category),
    category,
    relatedItemIds: items.map((item) => item.id),
    progress: Math.min(0.95, 0.35 + items.length * 0.15),
    reminder: question.toLowerCase().includes("remind") ? "Reminder-ready" : undefined
  };
}

function buildFollowUps(question: string, items: LibraryItem[], category: LibraryCategory) {
  const label = categoryLabels[category];
  const source = items[0]?.source;
  return [
    `Show only ${label}`,
    source ? `What did I save from ${source}?` : "Show recent saves",
    followUpForCategory(category, question)
  ];
}

function buildDefaultFollowUps(items: LibraryItem[]) {
  const categories = Array.from(new Set(items.map((item) => item.category))).slice(0, 3);
  return categories.length
    ? categories.map((category) => `Show my ${categoryLabels[category]}`)
    : ["Show recent saves", "Find recipes", "Find business ideas"];
}

function intentTitle(category: LibraryCategory) {
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
      return `${categoryLabels[category]} can become easier to use.`;
  }
}

function intentAction(category: LibraryCategory) {
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

function followUpForCategory(category: LibraryCategory, question: string) {
  switch (category) {
    case "recipes":
      return "Make a weekly meal plan";
    case "business_ideas":
      return question.toLowerCase().includes("ai") ? "Group my AI ideas" : "Summarize the themes";
    case "fitness":
      return "Build a starter routine";
    case "travel":
      return "Draft an itinerary";
    case "wisdom":
      return "Create a quote collection";
    default:
      return "Turn this into an action item";
  }
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}
