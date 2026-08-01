import { supabase } from "@/lib/supabase";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { CaptureAction, CapturedContent, LibraryCategory, LibraryItem, ShepherdAsset, TransformationResult } from "@/types/domain";
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

export async function deleteAnalysis() {
  if (isDemoMode && !isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.functions.invoke("delete-analysis", {
    body: {}
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createTransformation(capture: CapturedContent, action: CaptureAction) {
  const { data, error } = await supabase.functions.invoke<{ transformation: TransformationResult }>("transform-capture", { body: { capture, action } });
  if (error || !data?.transformation) throw new Error(error?.message ?? "Shepherd could not create this yet.");
  return data.transformation;
}

export async function fetchLibraryItems(): Promise<LibraryItem[]> {
  if (isDemoMode && !isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("library_items")
    .select("id, source, content_type, title, creator, summary, why_saved, category, collection_name, keywords, captured_at")
    .order("captured_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    source: item.source,
    type: humanizeContentType(item.content_type),
    title: item.title,
    aiSummary: item.summary || "Shepherd saved this with its context intact.",
    whySaved: item.why_saved || "Something you wanted to remember",
    suggestedAction: suggestedActionForCategory(item.category),
    category: normalizeLibraryCategory(item.category),
    collection: item.collection_name || "Captured by Shepherd",
    creator: item.creator ?? undefined,
    capturedAt: item.captured_at,
    keywords: item.keywords ?? []
  }));
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

