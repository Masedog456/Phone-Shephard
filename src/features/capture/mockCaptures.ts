import { CaptureAction, CapturedContent, CapturePlatform } from "@/types/domain";

export const captureActionLabels: Record<CaptureAction, string> = {
  save_later: "Save for later",
  add_to_shepherd: "Add to a Shepherd",
  summarize: "Summarize it",
  remind_later: "Remind me later",
  create_action_item: "Create an action item",
  add_to_collection: "Add to a collection"
};

export const captureSourceLabels: Record<CapturePlatform, string> = {
  safari: "Safari",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  pinterest: "Pinterest",
  reddit: "Reddit",
  x: "X",
  files: "Files",
  photos: "Photos",
  videos: "Videos",
  voice_notes: "Voice Notes",
  documents: "Documents"
};

export const captureSourcePrompts: Array<{ source: CapturePlatform; title: string; body: string }> = [
  {
    source: "safari",
    title: "Share a website",
    body: "Capture an article, recipe, travel plan, or product page the moment it feels useful."
  },
  {
    source: "instagram",
    title: "Save a post",
    body: "Turn inspiration from saved posts into themes Shepherd can bring back later."
  },
  {
    source: "tiktok",
    title: "Remember a video",
    body: "Capture a routine, recipe, idea, or tutorial without needing to organize it now."
  },
  {
    source: "youtube",
    title: "Keep a video",
    body: "Let Shepherd summarize the lesson and suggest where it belongs."
  },
  {
    source: "pinterest",
    title: "Place a pin",
    body: "Save design ideas, recipes, and references without building folders first."
  },
  {
    source: "reddit",
    title: "Remember a thread",
    body: "Capture a discussion, recommendation, or explanation worth returning to."
  },
  {
    source: "x",
    title: "Save a post from X",
    body: "Keep a thought, link, or quote without losing it in the feed."
  },
  {
    source: "files",
    title: "Place a file",
    body: "Bring PDFs, receipts, and documents into a calmer review flow."
  },
  {
    source: "photos",
    title: "Capture a photo",
    body: "Let Shepherd notice whether it is a memory, receipt, idea, or reference."
  },
  {
    source: "videos",
    title: "Capture a video",
    body: "Save the meaning of a video before the details fade."
  },
  {
    source: "voice_notes",
    title: "Catch a thought",
    body: "Save a voice note and let Shepherd listen for ideas worth growing."
  },
  {
    source: "documents",
    title: "Save a document",
    body: "Capture the important parts of a document and choose where it belongs."
  }
];

export const mockCaptures: CapturedContent[] = [
  {
    id: "capture-safari-habits",
    title: "How to build a better morning routine",
    source: "safari",
    sourceLabel: "Safari",
    creator: "Field Notes Weekly",
    link: "https://example.com/morning-routine",
    capturedAt: new Date().toISOString(),
    contentType: "website",
    summary: "A practical article about designing a morning routine around light, movement, and fewer decisions.",
    keywords: ["habits", "morning", "attention", "wellness"],
    suggestedShepherd: "Inspiration Shepherd",
    suggestedShepherdId: "task-posts-fitness",
    preview: "I found something you may want to remember: a gentle habit system that could become a routine.",
    recommendedAction: "add_to_shepherd"
  },
  {
    id: "capture-tiktok-fitness",
    title: "Five-minute mobility reset",
    source: "tiktok",
    sourceLabel: "TikTok",
    creator: "@daily_mobility",
    link: "https://example.com/tiktok-mobility",
    capturedAt: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
    contentType: "video",
    summary: "A short mobility sequence for hips, back, and shoulders that could be repeated between work sessions.",
    keywords: ["fitness", "mobility", "routine", "recovery"],
    suggestedShepherd: "Inspiration Shepherd",
    suggestedShepherdId: "task-posts-fitness",
    preview: "This looks like inspiration you saved for a reason. Shepherd can turn it into a repeatable routine.",
    recommendedAction: "summarize"
  },
  {
    id: "capture-pdf-receipt",
    title: "June hardware receipt",
    source: "files",
    sourceLabel: "Files",
    creator: "Hardware Market",
    link: "file://receipt-june.pdf",
    capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    contentType: "pdf",
    summary: "A receipt for home project supplies that may matter for returns, expense tracking, or warranty records.",
    keywords: ["receipt", "hardware", "expense", "warranty"],
    suggestedShepherd: "Receipt Shepherd",
    suggestedShepherdId: "task-receipts-month",
    preview: "I found a useful record. Shepherd can keep it safe without turning it into another chore.",
    recommendedAction: "save_later"
  },
  {
    id: "capture-voice-idea",
    title: "Voice note about a neighborhood services app",
    source: "voice_notes",
    sourceLabel: "Voice Notes",
    capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    contentType: "voice_note",
    summary: "A rough business idea about helping local service providers manage follow-ups and recurring clients.",
    keywords: ["startup", "local services", "customers", "follow-up"],
    suggestedShepherd: "Idea Shepherd",
    suggestedShepherdId: "task-notes-ideas",
    preview: "This sounds like a thought worth growing. Shepherd can bring it forward gently.",
    recommendedAction: "create_action_item"
  }
];
