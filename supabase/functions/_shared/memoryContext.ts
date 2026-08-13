/**
 * Builds the bounded context handed to the model.
 *
 * Two responsibilities:
 *  1. Keep the payload small enough to be affordable and focused, favouring the most relevant
 *     evidence rather than dumping whole documents.
 *  2. Keep authorship explicit. A screenshot is never described as a webpage, and AI output is
 *     never relabelled as source evidence.
 *
 * No Deno globals and no remote imports.
 */

export const CONTEXT_LIMITS = {
  /** Total memories handed to the model, across both stores. */
  maxMemories: 8,
  extractedText: 1500,
  userNote: 600,
  aiSummary: 600,
  screenshotAnalysis: 800
} as const;

export type LibraryRow = {
  id: string;
  title: string;
  source?: string | null;
  content_type?: string | null;
  creator?: string | null;
  summary?: string | null;
  why_saved?: string | null;
  category?: string | null;
  collection_name?: string | null;
  keywords?: string[] | null;
  captured_at: string;
  extracted_text?: string | null;
  user_note?: string | null;
  source_url?: string | null;
  canonical_url?: string | null;
  published_at?: string | null;
  extraction_status?: string | null;
};

export type ScreenshotRow = {
  id: string;
  device_asset_id?: string | null;
  filename?: string | null;
  captured_at?: string | null;
  is_sensitive?: boolean | null;
  category?: string | null;
  summary?: string | null;
  extracted_text?: string | null;
  reason?: string | null;
};

export type MemoryContextEntry = Record<string, unknown> & { id: string; kind: "library" | "screenshot" };

function cap(value: string | null | undefined, limit: number): { text: string; truncated: boolean } | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return { text: trimmed.slice(0, limit), truncated: trimmed.length > limit };
}

/**
 * A saved Library item — a webpage, note, document or anything else the user kept.
 *
 * The four provenance channels are read from the ITEM ROW, never from the semantic index, so the
 * index can never cause a claim to be misattributed.
 */
export function buildLibraryContext(item: LibraryRow, matchedBy: string[]): MemoryContextEntry {
  const source = cap(item.extracted_text, CONTEXT_LIMITS.extractedText);
  const note = cap(item.user_note, CONTEXT_LIMITS.userNote);
  const summary = cap(item.summary, CONTEXT_LIMITS.aiSummary);

  return {
    id: item.id,
    kind: "library",
    // Named so the model cannot mistake one kind of memory for another.
    memoryType: item.content_type === "website" ? "saved web page" : `saved ${item.content_type ?? "item"}`,
    title: item.title,
    origin: item.source,
    creator: item.creator,
    category: item.category,
    collection: item.collection_name,
    keywords: item.keywords ?? [],
    capturedAt: item.captured_at,
    matchedBy,
    fromTheSource: source
      ? {
          text: source.text,
          truncated: source.truncated,
          url: item.canonical_url ?? item.source_url,
          publishedAt: item.published_at,
          extraction: item.extraction_status
        }
      : null,
    fromTheUser: note ? { text: note.text, truncated: note.truncated } : null,
    fromShepherdAI: summary ? { text: summary.text, truncated: summary.truncated } : null,
    whySaved: item.why_saved ?? null
  };
}

/**
 * A screenshot from the user's own device.
 *
 * Everything here except the filename and capture time is AI-derived, so it is reported under
 * fromShepherdAI. `extracted_text` is text the model read OFF THE SCREENSHOT, which is closer to
 * source evidence, so it is reported separately and labelled as such rather than folded into the
 * summary.
 */
export function buildScreenshotContext(shot: ScreenshotRow, matchedBy: string[]): MemoryContextEntry {
  const analysis = cap(shot.summary, CONTEXT_LIMITS.screenshotAnalysis);
  const onScreen = cap(shot.extracted_text, CONTEXT_LIMITS.screenshotAnalysis);

  return {
    id: shot.id,
    kind: "screenshot",
    memoryType: "screenshot from the user's phone",
    title: shot.filename ?? "Screenshot",
    origin: "device screenshots",
    category: shot.category,
    capturedAt: shot.captured_at,
    matchedBy,
    // Text the model read off the image: evidence from the screenshot itself, not a summary.
    textOnScreen: onScreen ? { text: onScreen.text, truncated: onScreen.truncated } : null,
    fromShepherdAI: analysis ? { text: analysis.text, truncated: analysis.truncated } : null,
    // Sensitive screenshots have their extracted text suppressed at analysis time; say so rather
    // than letting the model infer that the screenshot was empty.
    sensitiveContentWithheld: Boolean(shot.is_sensitive)
  };
}

/** Instruction block explaining the shape above. Kept next to the builders so they cannot drift. */
export const PROVENANCE_INSTRUCTIONS =
  "Each memory states its own kind. 'kind: library' is something the person saved — a web page, note or document. " +
  "'kind: screenshot' is an image from their phone that Shepherd analysed; never describe a screenshot as a web page or the reverse. " +
  "Attribute carefully: 'fromTheSource' is the external page's own words, 'textOnScreen' is text read off a screenshot, " +
  "'fromTheUser' is the person's own note, and 'fromShepherdAI' is your own earlier summary — treat that last one as a hint, never as evidence, " +
  "and never present it as something the source or the screenshot said. When 'truncated' is true you are seeing only part of the text, " +
  "so do not claim anything is missing. When 'sensitiveContentWithheld' is true, the text was deliberately not stored; say so if it matters.";
