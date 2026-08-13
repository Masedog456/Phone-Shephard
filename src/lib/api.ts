import { supabase } from "@/lib/supabase";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import type { MemoryAnswer } from "@/features/memory/askMemory";
import { transformationForTask, transformationResults } from "@/features/transformation/mockTransformations";
import {
  CaptureAction,
  CapturedContent,
  DuplicateStatus,
  LibraryCategory,
  LibraryItem,
  LibraryItemUpdate,
  ShepherdAsset,
  TransformationResult,
  UrlIngestResult
} from "@/types/domain";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

const MAX_ANALYSIS_ASSETS = 10;
const ANALYSIS_IMAGE_WIDTH = 900;
const ANALYSIS_IMAGE_QUALITY = 0.72;

export async function analyzeAssets(assets: ShepherdAsset[]): Promise<ShepherdAsset[]> {
  if (isDemoMode && !isSupabaseConfigured) {
    return assets.map((asset) => (asset.summary ? asset : localAnalyzeAsset(asset)));
  }

  const payload = await Promise.all(
    assets.slice(0, MAX_ANALYSIS_ASSETS).map(async (asset) => ({
      ...asset,
      dataUrl: await toAnalysisDataUrl(asset)
    }))
  );

  const { data, error } = await supabase.functions.invoke<{ assets: ShepherdAsset[] }>("analyze-assets", {
    body: { assets: payload }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.assets ?? assets;
}

export async function searchAssets(query: string): Promise<ShepherdAsset[]> {
  if (isDemoMode && !isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase.functions.invoke<{ assets: ShepherdAsset[] }>("search-assets", {
    body: { query }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.assets ?? [];
}

export async function applyAction(assetId: string, action: string) {
  if (isDemoMode && !isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.functions.invoke("apply-action", {
    body: { assetId, action }
  });

  if (error) {
    throw new Error(error.message);
  }
}

export type DeleteAnalysisOutcome = { steps: { table: string; status: string }[]; retained: string[] };

export async function deleteAnalysis(): Promise<DeleteAnalysisOutcome | undefined> {
  if (isDemoMode && !isSupabaseConfigured) {
    return;
  }

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    error?: string;
    steps?: { table: string; status: string }[];
    retained?: string[];
  }>("delete-analysis", { body: {} });

  if (error) {
    // A non-2xx response carries the real reason in the response body, not in error.message.
    // Surface it so a partial deletion is never presented to the user as a clean success.
    throw new Error(await readFunctionError(error, "Shepherd could not delete the analysis data."));
  }

  if (data && data.ok === false) {
    throw new Error(data.error ?? "Shepherd could not delete all of the analysis data.");
  }

  return { steps: data?.steps ?? [], retained: data?.retained ?? [] };
}

export async function createTransformation(capture: CapturedContent, action: CaptureAction) {
  // Demo mode has no reachable backend, so this guard belongs here alongside every other
  // function in this module. Without it, callers that skip the store hit the Edge Function
  // with a fabricated demo token and fail.
  if (isDemoMode && !isSupabaseConfigured) {
    return createDemoTransformation(capture);
  }

  const { data, error } = await supabase.functions.invoke<{ transformation: TransformationResult }>("transform-capture", { body: { capture, action } });
  if (error || !data?.transformation) throw new Error(error?.message ?? "Shepherd could not create this yet.");
  return data.transformation;
}

export function createDemoTransformation(capture: CapturedContent): TransformationResult {
  return {
    ...transformationResults[transformationForTask(capture.suggestedShepherdId)],
    id: `demo-${capture.id}`
  };
}

/** Reads the JSON body of a failed Edge Function response so the real cause reaches the user. */
async function readFunctionError(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown }).context;
  if (context && typeof (context as Response).json === "function") {
    try {
      const body = await (context as Response).json();
      if (body?.error) return String(body.error);
    } catch {
      // Body was not JSON; fall through to the generic message below.
    }
  }
  const message = (error as { message?: string }).message;
  return message || fallback;
}

export async function createTransformationFromLibraryItem(item: LibraryItem, action: CaptureAction = "create_action_item") {
  return createTransformation(libraryItemToCapture(item), action);
}

export async function fetchTransformation(id: string): Promise<TransformationResult | null> {
  if (isDemoMode && !isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase
    .from("transformations")
    .select("id, title, summary, output_json, saved_to_library, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapTransformation(data) : null;
}

/**
 * Submits a URL for server-side fetch and extraction.
 *
 * Throws a UrlIngestError-shaped error on failure so callers can distinguish a page that
 * refused to be read (paywall, block, timeout) from a genuine server fault, and can offer a
 * retry where the server says one is worthwhile.
 */
export async function ingestUrl(url: string, note?: string): Promise<UrlIngestResult> {
  if (isDemoMode && !isSupabaseConfigured) {
    throw Object.assign(new Error("Saving real links needs Phone Shepherd connected to your private account."), {
      reason: "demo_mode",
      retryable: false,
      itemId: null
    });
  }

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    item?: Record<string, unknown>;
    duplicateStatus?: DuplicateStatus;
    duplicateOfId?: string | null;
    extractionStatus?: "extracted" | "partial";
    wordCount?: number;
    reason?: string;
    message?: string;
    retryable?: boolean;
    itemId?: string | null;
  }>("ingest-url", { body: { url, note } });

  if (error) {
    const body = await readFunctionErrorBody(error);
    throw Object.assign(new Error(body?.message ?? "Shepherd could not open that link."), {
      reason: body?.reason ?? "network_error",
      retryable: body?.retryable ?? true,
      itemId: body?.itemId ?? null
    });
  }

  if (!data?.ok || !data.item) {
    throw Object.assign(new Error(data?.message ?? "Shepherd could not open that link."), {
      reason: data?.reason ?? "unknown",
      retryable: data?.retryable ?? false,
      itemId: data?.itemId ?? null
    });
  }

  return {
    item: mapLibraryRow(data.item),
    duplicateStatus: data.duplicateStatus ?? "new",
    duplicateOfId: data.duplicateOfId ?? null,
    extractionStatus: data.extractionStatus ?? "extracted",
    wordCount: data.wordCount ?? 0
  };
}

/** Saves the person's own note. Deliberately separate from anything AI writes. */
export async function saveUserNote(id: string, note: string): Promise<void> {
  if (isDemoMode && !isSupabaseConfigured) return;
  const { error } = await supabase.from("library_items").update({ user_note: note }).eq("id", id);
  if (error) throw new Error(error.message);
}

const LIBRARY_COLUMNS =
  "id, source, content_type, title, creator, source_url, canonical_url, summary, why_saved, category, collection_name, keywords, captured_at, status, extracted_text, user_note, extraction_status, extraction_reason, published_at, fetched_at";

export async function fetchLibraryItem(id: string): Promise<LibraryItem | null> {
  if (isDemoMode && !isSupabaseConfigured) return null;
  const { data, error } = await supabase.from("library_items").select(LIBRARY_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapLibraryRow(data as Record<string, unknown>) : null;
}

export async function fetchLibraryItems(): Promise<LibraryItem[]> {
  if (isDemoMode && !isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("library_items")
    .select(LIBRARY_COLUMNS)
    .order("captured_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => mapLibraryRow(item as Record<string, unknown>));
}

/**
 * Maps a library_items row into the domain model, keeping the four provenance channels apart:
 * extracted_text (the source), summary (AI), user_note (the person), and the rest (metadata).
 */
function mapLibraryRow(item: Record<string, unknown>): LibraryItem {
  const str = (key: string) => (typeof item[key] === "string" && item[key] ? (item[key] as string) : undefined);
  const extractionStatus = str("extraction_status") as LibraryItem["extractionStatus"];

  return {
    id: String(item.id ?? ""),
    source: str("source") ?? "Shepherd",
    contentType: str("content_type"),
    type: humanizeContentType(str("content_type") ?? "document"),
    title: str("title") ?? "Untitled",
    // Never fall back to source text here: an empty AI summary must read as "not summarised yet".
    aiSummary: str("summary") ?? "",
    whySaved: str("why_saved") ?? "",
    suggestedAction: suggestedActionForCategory(str("category")),
    category: normalizeLibraryCategory(str("category")),
    collection: str("collection_name") ?? "Captured by Shepherd",
    creator: str("creator"),
    sourceUrl: str("source_url"),
    canonicalUrl: str("canonical_url"),
    capturedAt: str("captured_at") ?? new Date().toISOString(),
    keywords: Array.isArray(item.keywords) ? (item.keywords as string[]) : [],
    status: item.status === "archived" ? "archived" : "active",
    extractedText: str("extracted_text"),
    userNote: str("user_note"),
    publishedAt: str("published_at"),
    fetchedAt: str("fetched_at"),
    extractionStatus,
    extractionReason: str("extraction_reason")
  };
}

/** Reads the JSON body of a failed Edge Function response. */
async function readFunctionErrorBody(
  error: unknown
): Promise<{ reason?: string; message?: string; retryable?: boolean; itemId?: string | null } | null> {
  const context = (error as { context?: unknown }).context;
  if (context && typeof (context as Response).json === "function") {
    try {
      return await (context as Response).json();
    } catch {
      return null;
    }
  }
  return null;
}

export async function updateLibraryItem(id: string, update: LibraryItemUpdate): Promise<void> {
  if (isDemoMode && !isSupabaseConfigured) return;
  const { error } = await supabase
    .from("library_items")
    .update({
      title: update.title,
      summary: update.aiSummary,
      why_saved: update.whySaved,
      category: update.category,
      collection_name: update.collection,
      keywords: update.keywords
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function archiveLibraryItem(id: string, archived: boolean): Promise<void> {
  if (isDemoMode && !isSupabaseConfigured) return;
  const { error } = await supabase
    .from("library_items")
    .update({ status: archived ? "archived" : "active" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function askMemoryRemote(question: string): Promise<MemoryAnswer> {
  if (isDemoMode && !isSupabaseConfigured) {
    throw new Error("Remote memory is not available in demo mode.");
  }

  const { data, error } = await supabase.functions.invoke<{ answer: MemoryAnswer }>("ask-memory", {
    body: { question }
  });

  if (error || !data?.answer) {
    throw new Error(error?.message ?? "Shepherd could not ask your memory yet.");
  }

  return data.answer;
}

export async function saveTransformation(id: string) {
  if (isDemoMode && !isSupabaseConfigured) return;
  const { error } = await supabase.from("transformations").update({ saved_to_library: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function scheduleTransformationReminder(id: string, message: string) {
  if (isDemoMode && !isSupabaseConfigured) return;
  const remindAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("shepherd_reminders").insert({ transformation_id: id, remind_at: remindAt, message });
  if (error) throw new Error(error.message);
}

export async function submitTransformationFeedback(id: string, rating: "useful" | "not_useful" | "wrong_category") {
  if (isDemoMode && !isSupabaseConfigured) return;
  const { error } = await supabase.from("transformation_feedback").upsert({ transformation_id: id, rating }, { onConflict: "user_id,transformation_id" });
  if (error) throw new Error(error.message);
}

type TransformationRow = {
  id: string;
  title: string;
  summary: string;
  output_json: Partial<TransformationResult> | null;
  saved_to_library: boolean;
  created_at: string;
};

function mapTransformation(row: TransformationRow): TransformationResult {
  const output = row.output_json ?? {};
  return {
    id: row.id,
    eyebrow: output.eyebrow ?? "Shepherd created",
    title: output.title ?? row.title,
    summary: output.summary ?? row.summary,
    sources: Array.isArray(output.sources) ? output.sources : [],
    outputLabel: output.outputLabel ?? "Created for you",
    outputTitle: output.outputTitle ?? row.title,
    outputDescription: output.outputDescription ?? row.summary,
    sections: Array.isArray(output.sections) ? output.sections : [],
    nextAction: output.nextAction ?? "Save this so it is easy to find later.",
    nextActionDetail: output.nextActionDetail ?? "Shepherd will keep the context attached in your Library.",
    libraryDestination: output.libraryDestination ?? "Library",
    savedToLibrary: row.saved_to_library,
    createdAt: row.created_at
  };
}

function libraryItemToCapture(item: LibraryItem): CapturedContent {
  return {
    id: `library-${item.id}-${Date.now()}`,
    title: item.title,
    source: "documents",
    sourceLabel: item.source,
    creator: item.creator,
    link: item.sourceUrl,
    capturedAt: item.capturedAt,
    contentType: captureContentTypeFromLibraryItem(item),
    summary: item.aiSummary,
    keywords: item.keywords.length ? item.keywords : [item.category.replace("_", " ")],
    suggestedShepherd: shepherdNameForCategory(item.category),
    suggestedShepherdId: shepherdIdForCategory(item.category),
    preview: `I found "${item.title}" in your Library and can turn it into a calmer next step.`,
    recommendedAction: "create_action_item"
  };
}

function captureContentTypeFromLibraryItem(item: LibraryItem): CapturedContent["contentType"] {
  const type = (item.contentType ?? item.type).toLowerCase();
  if (type.includes("video")) return "video";
  if (type.includes("pdf")) return "pdf";
  if (type.includes("photo") || type.includes("screenshot")) return "photo";
  if (type.includes("voice")) return "voice_note";
  if (type.includes("post")) return "social_post";
  if (type.includes("pin")) return "pin";
  if (type.includes("website")) return "website";
  return "document";
}

function shepherdNameForCategory(category: LibraryCategory) {
  switch (category) {
    case "recipes":
      return "Recipe Shepherd";
    case "business_ideas":
      return "Idea Shepherd";
    case "fitness":
      return "Fitness Shepherd";
    case "travel":
      return "Travel Shepherd";
    case "wisdom":
      return "Wisdom Shepherd";
    case "finance":
      return "Receipt Shepherd";
    case "family":
      return "Memory Shepherd";
    default:
      return "Research Shepherd";
  }
}

function shepherdIdForCategory(category: LibraryCategory) {
  switch (category) {
    case "recipes":
      return "task-screenshots-recipes";
    case "business_ideas":
      return "task-notes-ideas";
    case "fitness":
      return "task-posts-fitness";
    case "finance":
      return "task-receipts-month";
    default:
      return "task-links-unopened";
  }
}

function localAnalyzeAsset(asset: ShepherdAsset): ShepherdAsset {
  const haystack = [asset.filename, asset.summary].join(" ").toLowerCase();
  const category = haystack.includes("flight") || haystack.includes("hotel") || haystack.includes("travel")
    ? "travel"
    : haystack.includes("recipe") || haystack.includes("pizza") || haystack.includes("food")
      ? "recipe"
      : haystack.includes("receipt") || haystack.includes("invoice")
        ? "receipt"
        : haystack.includes("password") || haystack.includes("login")
          ? "password"
          : haystack.includes("shop") || haystack.includes("cart")
            ? "shopping"
            : "other";

  const isSensitive = category === "password";

  return {
    ...asset,
    category,
    summary: category === "other" ? "Screenshot ready for review." : `Likely ${category} screenshot.`,
    reason: isSensitive
      ? "This may include login or credential information. Review privately."
      : "Demo analysis used filename and device metadata. Connect OpenAI for visual understanding.",
    suggestedAction: isSensitive ? "review_sensitive" : category === "other" ? "keep" : "archive",
    isSensitive
  };
}

function normalizeLibraryCategory(category?: string | null): LibraryCategory {
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
    case "education":
    case "learning":
      return "education";
    case "entertainment":
      return "entertainment";
    default:
      return "education";
  }
}

function humanizeContentType(contentType: string) {
  return contentType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function suggestedActionForCategory(category?: string | null) {
  switch (normalizeLibraryCategory(category)) {
    case "recipes":
      return "Would you like to add this to a meal plan?";
    case "business_ideas":
      return "Would you like to turn this into a next step?";
    case "fitness":
      return "Would you like a reminder to try this?";
    case "travel":
      return "Would you like to build an itinerary?";
    case "finance":
      return "Would you like to keep this with records?";
    default:
      return "Would you like Shepherd to keep watching this thread?";
  }
}

async function toAnalysisDataUrl(asset: ShepherdAsset) {
  if (!asset.uri || asset.uri.startsWith("http")) {
    return undefined;
  }

  const resized = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: Math.min(asset.width ?? ANALYSIS_IMAGE_WIDTH, ANALYSIS_IMAGE_WIDTH) } }],
    {
      compress: ANALYSIS_IMAGE_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false
    }
  );

  const base64 = await FileSystem.readAsStringAsync(resized.uri, {
    encoding: FileSystem.EncodingType.Base64
  });

  return `data:image/jpeg;base64,${base64}`;
}

