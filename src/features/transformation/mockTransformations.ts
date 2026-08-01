import { TransformationResult } from "@/types/domain";

export const transformationResults: Record<string, TransformationResult> = {
  fitness: {
    id: "fitness",
    eyebrow: "Fitness Shepherd created this",
    title: "Your saved inspiration became a plan.",
    summary: "I found 12 saved fitness posts, 4 workout screenshots, and 3 nutrition notes. I organized them into a gentle 7-day starter plan.",
    sources: [{ label: "Saved posts", count: 12 }, { label: "Screenshots", count: 4 }, { label: "Notes", count: 3 }],
    outputLabel: "Your new plan",
    outputTitle: "Seven days of steady movement",
    outputDescription: "A realistic first week built around short workouts, simple meals, and recovery.",
    sections: [
      { title: "Days 1-2 · Begin gently", detail: "Two 15-minute full-body sessions and the five-minute mobility reset you saved.", meta: "30 minutes total" },
      { title: "Days 3-5 · Build rhythm", detail: "A walk, one strength circuit, and the high-protein dinner notes you wanted to try.", meta: "3 small commitments" },
      { title: "Days 6-7 · Recover and notice", detail: "Light mobility, one favorite meal, and a short check-in on what felt sustainable.", meta: "No perfection required" }
    ],
    nextAction: "Schedule the first workout",
    nextActionDetail: "Tomorrow at 7:30 AM · 15 minutes",
    libraryDestination: "Fitness · Starter Plans"
  },
  business: {
    id: "business",
    eyebrow: "Idea Shepherd created this",
    title: "Your scattered ideas found their shape.",
    summary: "I found 18 business ideas across notes, screenshots, and saved posts. I grouped them into three themes that keep returning.",
    sources: [{ label: "Notes", count: 9 }, { label: "Screenshots", count: 5 }, { label: "Saved posts", count: 4 }],
    outputLabel: "Three emerging themes",
    outputTitle: "The business ideas you keep returning to",
    outputDescription: "Your strongest pattern is using practical AI to remove repetitive work for small teams.",
    sections: [
      { title: "AI services", detail: "Productized research, customer follow-up, and workflow setup for teams without technical staff.", meta: "8 related ideas" },
      { title: "Local business automation", detail: "Missed-call follow-up, review requests, appointment reminders, and recurring customer care.", meta: "6 related ideas" },
      { title: "Content tools", detail: "Systems that turn one useful thought into drafts, clips, and a reusable knowledge library.", meta: "4 related ideas" }
    ],
    nextAction: "Create a one-page concept",
    nextActionDetail: "Start with local business automation, your most repeated theme.",
    libraryDestination: "Business Ideas · Emerging Themes"
  },
  recipes: {
    id: "recipes",
    eyebrow: "Recipe Shepherd created this",
    title: "Nine saved recipes became this week's dinners.",
    summary: "I found 9 recipes across screenshots, websites, and saved posts. I chose five with overlapping ingredients and made a simple dinner list.",
    sources: [{ label: "Screenshots", count: 4 }, { label: "Websites", count: 3 }, { label: "Saved posts", count: 2 }],
    outputLabel: "Dinner list",
    outputTitle: "A low-effort week of meals",
    outputDescription: "Five dinners that reuse ingredients, with the more ambitious recipes saved for the weekend.",
    sections: [
      { title: "Monday · Lemony chickpea pasta", detail: "Uses pantry staples and the spinach already on your shopping list.", meta: "20 minutes" },
      { title: "Wednesday · Sheet-pan chicken", detail: "The saved recipe with potatoes, peppers, and one easy cleanup.", meta: "35 minutes" },
      { title: "Friday · Homemade pizza", detail: "Your most-saved recipe, paired with the quick dough screenshot.", meta: "Weekend favorite" }
    ],
    nextAction: "Build the grocery list",
    nextActionDetail: "I can combine ingredients and remove what you already have.",
    libraryDestination: "Recipes · This Week"
  },
  travel: {
    id: "travel",
    eyebrow: "Travel Shepherd created this",
    title: "Your saved places became a possible weekend.",
    summary: "I found 14 saved places and 3 hotel links. I grouped nearby favorites into a relaxed two-day itinerary.",
    sources: [{ label: "Saved places", count: 14 }, { label: "Hotel links", count: 3 }, { label: "Travel notes", count: 2 }],
    outputLabel: "Possible itinerary",
    outputTitle: "A slow weekend in Kyoto",
    outputDescription: "A walkable route shaped around the quiet gardens, food stops, and design shops you saved.",
    sections: [
      { title: "Saturday · East Kyoto", detail: "Early temple walk, the small coffee shop you saved, and an unhurried afternoon in Gion.", meta: "5 saved places" },
      { title: "Sunday · Arashiyama", detail: "Morning bamboo grove, riverside lunch, and the garden from your travel notes.", meta: "4 saved places" },
      { title: "Still open", detail: "Five places are farther away. I kept them nearby without crowding this weekend.", meta: "Saved for later" }
    ],
    nextAction: "Compare the three hotels",
    nextActionDetail: "I can summarize location, price, and cancellation details.",
    libraryDestination: "Travel · Kyoto Weekend"
  }
};

transformationResults.reset = {
  ...transformationResults.business,
  id: "reset",
  eyebrow: "Your Weekly Reset created this",
  title: "Your saved world feels a little more cared for.",
  summary: "I brought together 12 memories, 3 ideas, and 7 pieces of saved inspiration. I protected what mattered and created a small care plan for the week ahead.",
  outputLabel: "This week's care plan",
  outputTitle: "What deserves to stay close",
  outputDescription: "A gentle record of what you protected, rediscovered, and may want to act on next.",
  nextAction: "Revisit one idea on Sunday",
  nextActionDetail: "I can bring it back during your next quiet reset.",
  libraryDestination: "Weekly Reset · June 18"
};

export function transformationForTask(taskId?: string) {
  if (taskId?.includes("recipe")) return "recipes";
  if (taskId?.includes("fitness") || taskId?.includes("photo")) return "fitness";
  if (taskId?.includes("idea") || taskId?.includes("note")) return "business";
  return "travel";
}
