import { ShepherdTaskAction, ShepherdTaskSource } from "@/types/domain";

export type ShepherdSessionStep = "greeting" | "recommendations" | "review" | "complete";

export type ShepherdRecommendation = {
  id: string;
  source: ShepherdTaskSource;
  title: string;
  message: string;
  gentleAction: string;
  action: ShepherdTaskAction;
  detail: string;
  timeEstimate: string;
  accent: "sage" | "blue" | "clay" | "lavender";
};

export const shepherdGreeting = {
  salutation: "Good evening.",
  message: "I found a few things that might deserve your attention.",
  reassurance: "We will take this gently. Nothing changes unless you choose it.",
  duration: "3-minute reset"
};

export const shepherdRecommendations: ShepherdRecommendation[] = [
  {
    id: "recipes-six-months",
    source: "screenshots",
    title: "Three recipes from six months ago",
    message: "You saved them quietly and never came back. Want to place them somewhere easy to find?",
    gentleAction: "Keep recipes together",
    action: "categorize",
    detail: "Pizza dough, weeknight pasta, and a soup recipe are waiting in screenshots.",
    timeEstimate: "45 sec",
    accent: "sage"
  },
  {
    id: "business-ideas",
    source: "notes",
    title: "Two business ideas hidden in notes",
    message: "They look like early product thoughts. I can bring them forward without changing the original notes.",
    gentleAction: "Bring ideas forward",
    action: "summarize",
    detail: "One mentions a local services marketplace. One looks like an AI workflow idea.",
    timeEstimate: "60 sec",
    accent: "clay"
  },
  {
    id: "old-tabs",
    source: "tabs",
    title: "Thirty-nine research paths waiting to be revisited",
    message: "Some look like research you meant to return to. We can keep the meaningful ones and release the rest later.",
    gentleAction: "Review tabs gently",
    action: "review",
    detail: "Browser tab access is coming soon. This preview shows how Shepherd will guide the ritual.",
    timeEstimate: "90 sec",
    accent: "blue"
  },
  {
    id: "saved-posts",
    source: "saved_posts",
    title: "Twenty-four saved posts you may have forgotten",
    message: "A few look like fitness, philosophy, and product inspiration. I can group them when the integration is connected.",
    gentleAction: "Preview saved-post care",
    action: "summarize",
    detail: "Saved social connections are not ready yet, so this session previews the gentle guidance Shepherd will provide.",
    timeEstimate: "30 sec",
    accent: "lavender"
  }
];

export function getSessionProgress(step: ShepherdSessionStep) {
  switch (step) {
    case "greeting":
      return 0.18;
    case "recommendations":
      return 0.42;
    case "review":
      return 0.74;
    case "complete":
      return 1;
  }
}

export function getCompletionMessage(reviewedCount: number) {
  if (reviewedCount === 0) {
    return "You gave your digital life a quiet check-in. That counts.";
  }

  return `You cared for ${reviewedCount} saved ${reviewedCount === 1 ? "thing" : "things"} today. A little more peace, without a big chore.`;
}
