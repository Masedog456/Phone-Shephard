import { ConnectedPattern } from "@/types/domain";

export const connectedPatterns: ConnectedPattern[] = [
  {
    id: "dots-business-builder",
    title: "You may be circling a business idea.",
    insight: "You have saved 37 items related to starting a business. They point toward AI tools, local services, and customer follow-up systems.",
    theme: "Starting a business",
    interest: "AI-powered customer care",
    possibleGoal: "Build a service that helps small businesses remember what to do next.",
    unfinishedIdea: "A neighborhood services app that manages recurring clients and follow-ups.",
    recurringAmbition: "Turning scattered product thoughts into a real business plan.",
    evidence: [
      { label: "Videos", count: 12 },
      { label: "Notes", count: 9 },
      { label: "Articles", count: 8 },
      { label: "Screenshots", count: 5 },
      { label: "Voice memos", count: 3 }
    ],
    totalItems: 37,
    suggestedAction: "Would you like me to create a business plan?",
    relatedItemIds: ["lib-startup-note"],
    confidence: 0.86
  },
  {
    id: "dots-fitness-plan",
    title: "Your fitness saves are asking to become a routine.",
    insight: "You have saved 45 fitness resources across short workouts, mobility videos, and recovery advice.",
    theme: "Fitness consistency",
    interest: "Short workouts and mobility",
    possibleGoal: "Build a sustainable weekly training habit without needing a gym.",
    unfinishedIdea: "A simple plan that turns saved inspiration into workouts you actually try.",
    recurringAmbition: "Feeling stronger with less friction.",
    evidence: [
      { label: "Videos", count: 21 },
      { label: "Social posts", count: 11 },
      { label: "Screenshots", count: 6 },
      { label: "Articles", count: 5 },
      { label: "Notes", count: 2 }
    ],
    totalItems: 45,
    suggestedAction: "Would you like me to build a personalized training plan?",
    relatedItemIds: ["lib-ab-workout"],
    confidence: 0.82
  },
  {
    id: "dots-quiet-travel",
    title: "A quiet travel dream is taking shape.",
    insight: "Your travel saves cluster around calm cities, food markets, walking routes, and small hotels.",
    theme: "Slow travel",
    interest: "Italy and Japan trip planning",
    possibleGoal: "Create an itinerary that feels spacious instead of overpacked.",
    unfinishedIdea: "A saved set of places that has not become a real plan yet.",
    recurringAmbition: "Travel that feels restorative and memorable.",
    evidence: [
      { label: "Saved places", count: 18 },
      { label: "Videos", count: 9 },
      { label: "Articles", count: 7 },
      { label: "Screenshots", count: 5 },
      { label: "Maps", count: 3 }
    ],
    totalItems: 42,
    suggestedAction: "Would you like me to draft a calm itinerary?",
    relatedItemIds: ["lib-flight"],
    confidence: 0.74
  }
];
