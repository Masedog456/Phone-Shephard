import { create } from "zustand";
import { CaptureAction, CapturedContent, CaptureContentType, CapturePlatform } from "@/types/domain";
import { captureSourceLabels, mockCaptures } from "@/features/capture/mockCaptures";

type CaptureStore = {
  captures: CapturedContent[];
  latestCaptureId: string;
  selectedActionById: Record<string, CaptureAction>;
  captureFromSource: (source: CapturePlatform) => CapturedContent;
  captureManually: (input: { title: string; link?: string; note: string }) => CapturedContent;
  chooseAction: (captureId: string, action: CaptureAction) => void;
};

export const useCaptureInbox = create<CaptureStore>((set, get) => ({
  captures: mockCaptures,
  latestCaptureId: mockCaptures[0].id,
  selectedActionById: {},
  captureFromSource: (source) => {
    const existing = mockCaptures.find((capture) => capture.source === source) ?? createSyntheticCapture(source);
    const capture: CapturedContent = {
      ...existing,
      id: `capture-${source}-${Date.now()}`,
      source,
      sourceLabel: captureSourceLabels[source],
      capturedAt: new Date().toISOString()
    };

    // Future native share extension, deep links, and platform API imports should enter here.
    // Replace this mock analysis with a server-side multimodal extraction pipeline.
    set((state) => ({
      captures: [capture, ...state.captures],
      latestCaptureId: capture.id
    }));
    return capture;
  },
  captureManually: (input) => {
    const capture: CapturedContent = {
      id: `capture-manual-${Date.now()}`,
      title: input.title.trim(),
      source: "safari",
      sourceLabel: input.link ? "Web" : "Phone Shepherd",
      creator: "You",
      link: input.link?.trim() || undefined,
      capturedAt: new Date().toISOString(),
      contentType: input.link ? "website" : "document",
      summary: input.note.trim(),
      keywords: inferKeywords(input.title, input.note),
      suggestedShepherd: inferShepherd(input.title, input.note),
      suggestedShepherdId: inferShepherdId(input.title, input.note),
      preview: "I found something you may want to remember. I can turn it into a calmer next step now.",
      recommendedAction: "add_to_shepherd"
    };

    set((state) => ({
      captures: [capture, ...state.captures],
      latestCaptureId: capture.id
    }));
    return capture;
  },
  chooseAction: (captureId, action) => {
    set((state) => ({
      selectedActionById: {
        ...state.selectedActionById,
        [captureId]: action
      }
    }));
  }
}));

export function useLatestCapture() {
  return useCaptureInbox((state) => state.captures.find((capture) => capture.id === state.latestCaptureId) ?? state.captures[0]);
}

function inferKeywords(title: string, note: string) {
  const text = `${title} ${note}`.toLowerCase();
  if (text.includes("recipe") || text.includes("dinner") || text.includes("meal")) return ["recipe", "dinner", "plan"];
  if (text.includes("workout") || text.includes("fitness") || text.includes("health")) return ["fitness", "routine", "health"];
  if (text.includes("business") || text.includes("startup") || text.includes("idea")) return ["business", "idea", "next step"];
  if (text.includes("trip") || text.includes("travel") || text.includes("hotel")) return ["travel", "itinerary", "saved"];
  if (text.includes("quote") || text.includes("philosophy") || text.includes("wisdom")) return ["wisdom", "quote", "reflection"];
  return ["saved", "remember", "review"];
}

function inferShepherd(title: string, note: string) {
  const keywords = inferKeywords(title, note);
  if (keywords.includes("fitness")) return "Fitness Shepherd";
  if (keywords.includes("business")) return "Idea Shepherd";
  if (keywords.includes("travel")) return "Travel Shepherd";
  if (keywords.includes("recipe")) return "Recipe Shepherd";
  if (keywords.includes("wisdom")) return "Wisdom Shepherd";
  return "Research Shepherd";
}

function inferShepherdId(title: string, note: string) {
  const keywords = inferKeywords(title, note);
  if (keywords.includes("fitness")) return "task-posts-fitness";
  if (keywords.includes("business")) return "task-notes-ideas";
  if (keywords.includes("travel")) return "task-tabs-research";
  if (keywords.includes("recipe")) return "task-screenshots-recipes";
  return "task-tabs-research";
}

function createSyntheticCapture(source: CapturePlatform): CapturedContent {
  return {
    id: `capture-${source}`,
    title: syntheticTitle(source),
    source,
    sourceLabel: captureSourceLabels[source],
    creator: syntheticCreator(source),
    link: `phone-shepherd://${source}`,
    capturedAt: new Date().toISOString(),
    contentType: contentTypeForSource(source),
    summary: "A captured saved thing ready for Shepherd to understand, summarize, and place when the real integration is connected.",
    keywords: keywordsForSource(source),
    suggestedShepherd: shepherdForSource(source),
    preview: "I found something you may want to remember. Shepherd can place it with almost no manual organization.",
    recommendedAction: source === "voice_notes" ? "create_action_item" : "add_to_shepherd"
  };
}

function contentTypeForSource(source: CapturePlatform): CaptureContentType {
  switch (source) {
    case "youtube":
    case "tiktok":
    case "videos":
      return "video";
    case "pinterest":
      return "pin";
    case "reddit":
    case "x":
    case "instagram":
      return "social_post";
    case "files":
      return "pdf";
    case "photos":
      return "photo";
    case "voice_notes":
      return "voice_note";
    case "documents":
      return "document";
    default:
      return "website";
  }
}

function shepherdForSource(source: CapturePlatform) {
  switch (source) {
    case "files":
    case "documents":
      return "Receipt Shepherd";
    case "voice_notes":
      return "Idea Shepherd";
    case "photos":
    case "videos":
      return "Memory Shepherd";
    case "youtube":
    case "tiktok":
    case "instagram":
    case "pinterest":
    case "reddit":
    case "x":
      return "Inspiration Shepherd";
    default:
      return "Research Shepherd";
  }
}

function syntheticTitle(source: CapturePlatform) {
  return `${captureSourceLabels[source]} capture waiting for Shepherd`;
}

function syntheticCreator(source: CapturePlatform) {
  return source === "files" || source === "documents" || source === "photos" || source === "videos" ? "You" : "Shared source";
}

function keywordsForSource(source: CapturePlatform) {
  switch (source) {
    case "voice_notes":
      return ["idea", "thought", "follow-up"];
    case "files":
    case "documents":
      return ["document", "record", "review"];
    case "photos":
    case "videos":
      return ["memory", "visual", "saved"];
    default:
      return ["inspiration", "saved", "revisit"];
  }
}
