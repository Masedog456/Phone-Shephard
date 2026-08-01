export type ShepherdCategory =
  | "recipe"
  | "travel"
  | "shopping"
  | "bill"
  | "note"
  | "password"
  | "social"
  | "receipt"
  | "memory"
  | "other";

export type ShepherdStatus = "active" | "archived" | "deleted_pending" | "deleted" | "ignored";

export type ShepherdAsset = {
  id: string;
  deviceAssetId: string;
  uri: string;
  filename?: string | null;
  width?: number;
  height?: number;
  fileSize?: number | null;
  capturedAt?: string | null;
  category?: ShepherdCategory;
  summary?: string | null;
  reason?: string | null;
  suggestedAction?: "delete" | "archive" | "save_category" | "keep" | "review_sensitive";
  isSensitive?: boolean;
  status: ShepherdStatus;
};

export type ShepherdTaskSource =
  | "photos"
  | "screenshots"
  | "tabs"
  | "notes"
  | "saved_posts"
  | "documents"
  | "receipts"
  | "links"
  | "reminders"
  | "custom";

export type ShepherdTaskAction =
  | "review"
  | "delete"
  | "archive"
  | "save"
  | "categorize"
  | "summarize"
  | "remind_later";

export type ShepherdTaskStatus = "ready" | "coming_soon" | "custom";

export type ShepherdTask = {
  id: string;
  name: string;
  description: string;
  aiInstruction: string;
  source: ShepherdTaskSource;
  action: ShepherdTaskAction;
  status: ShepherdTaskStatus;
  cadence?: "manual" | "weekly" | "monthly";
  resultCount: number;
  lastRunAt?: string | null;
  createdAt: string;
  isDefault: boolean;
};

export type ShepherdTaskResult = {
  id: string;
  taskId: string;
  title: string;
  sourceLabel: string;
  preview: string;
  suggestedAction: ShepherdTaskAction;
  reason: string;
  isSensitive?: boolean;
  integrationStatus?: "mock" | "connected" | "coming_soon";
};

export type CapturePlatform =
  | "safari"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "reddit"
  | "x"
  | "files"
  | "photos"
  | "videos"
  | "voice_notes"
  | "documents";

export type CaptureContentType =
  | "website"
  | "social_post"
  | "video"
  | "pin"
  | "discussion"
  | "file"
  | "pdf"
  | "photo"
  | "voice_note"
  | "document";

export type CaptureAction =
  | "save_later"
  | "add_to_shepherd"
  | "summarize"
  | "remind_later"
  | "create_action_item"
  | "add_to_collection";

export type CapturedContent = {
  id: string;
  title: string;
  source: CapturePlatform;
  sourceLabel: string;
  creator?: string;
  link?: string;
  capturedAt: string;
  contentType: CaptureContentType;
  summary: string;
  keywords: string[];
  suggestedShepherd: string;
  suggestedShepherdId?: string;
  preview: string;
  recommendedAction: CaptureAction;
};

export type LibraryCategory =
  | "recipes"
  | "business_ideas"
  | "fitness"
  | "travel"
  | "shopping"
  | "wisdom"
  | "finance"
  | "family"
  | "education"
  | "entertainment";

export type LibraryItem = {
  id: string;
  source: string;
  type: string;
  title: string;
  aiSummary: string;
  whySaved: string;
  suggestedAction: string;
  category: LibraryCategory;
  collection: string;
  creator?: string;
  capturedAt: string;
  keywords: string[];
};

export type IntentKind = "forgotten" | "repeated_interest" | "pattern" | "next_step";

export type IntentSuggestion = {
  id: string;
  kind: IntentKind;
  title: string;
  insight: string;
  suggestedAction: string;
  category: LibraryCategory;
  relatedItemIds: string[];
  progress: number;
  reminder?: string;
};

export type DotEvidence = {
  label: string;
  count: number;
};

export type ConnectedPattern = {
  id: string;
  title: string;
  insight: string;
  theme: string;
  interest: string;
  possibleGoal: string;
  unfinishedIdea: string;
  recurringAmbition: string;
  evidence: DotEvidence[];
  totalItems: number;
  suggestedAction: string;
  relatedItemIds: string[];
  confidence: number;
};

export type TimelineMetric = {
  label: string;
  count: number;
};

export type DigitalLifeChapter = {
  id: string;
  month: string;
  year: number;
  title: string;
  narrative: string;
  focusedOn: string[];
  saved: TimelineMetric[];
  created: TimelineMetric[];
  turningPoint: string;
  evolution: string;
};

export type TransformationSource = { label: string; count: number };

export type TransformationSection = { title: string; detail: string; meta?: string };

export type TransformationResult = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  sources: TransformationSource[];
  outputLabel: string;
  outputTitle: string;
  outputDescription: string;
  sections: TransformationSection[];
  nextAction: string;
  nextActionDetail: string;
  libraryDestination: string;
};