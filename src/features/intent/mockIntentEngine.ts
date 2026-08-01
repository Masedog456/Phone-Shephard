import { IntentSuggestion } from "@/types/domain";

export const intentSuggestions: IntentSuggestion[] = [
  {
    id: "intent-recipes-meal-plan",
    kind: "repeated_interest",
    title: "Pasta recipes are becoming a pattern.",
    insight: "You saved 27 pasta and weeknight dinner ideas. Would you like Shepherd to turn them into a gentle weekly meal plan?",
    suggestedAction: "Create a Sunday meal plan",
    category: "recipes",
    relatedItemIds: ["lib-pizza"],
    progress: 0.72,
    reminder: "Sunday morning"
  },
  {
    id: "intent-workout-forgotten",
    kind: "forgotten",
    title: "This workout has been waiting quietly.",
    insight: "You saved a five-minute core workout 3 months ago and never tried it. It still matches your fitness goals.",
    suggestedAction: "Schedule a 5-minute workout",
    category: "fitness",
    relatedItemIds: ["lib-ab-workout"],
    progress: 0.35,
    reminder: "Tomorrow at 8 AM"
  },
  {
    id: "intent-ai-ideas-theme",
    kind: "pattern",
    title: "Your AI ideas share a common thread.",
    insight: "You have 42 ideas about AI, local services, and follow-up workflows. The common theme is helping people remember what matters next.",
    suggestedAction: "Summarize the strongest themes",
    category: "business_ideas",
    relatedItemIds: ["lib-startup-note"],
    progress: 0.58
  },
  {
    id: "intent-italy-itinerary",
    kind: "next_step",
    title: "Your travel saves are ready to become a plan.",
    insight: "You have saved 18 places in Italy and one active flight confirmation. Shepherd can shape them into a calm itinerary.",
    suggestedAction: "Draft a 4-day itinerary",
    category: "travel",
    relatedItemIds: ["lib-flight"],
    progress: 0.46,
    reminder: "Two weeks before travel"
  }
];

export const intentProgress = {
  saved: 64,
  understood: 38,
  inMotion: 11,
  completion: 0.62
};
