/**
 * Composes the document that gets embedded for a Library item.
 *
 * The embedding may represent combined meaning, but the composition is LABELLED rather than
 * blindly concatenated. Two reasons:
 *
 *  1. The stored `search_text` stays auditable — you can see what was indexed and who wrote it.
 *  2. Retrieval never reads provenance from the index. Ask Your Memory reads fromTheSource /
 *     fromTheUser / fromShepherdAI from the item row itself, so authorship cannot be lost or
 *     confused even though one vector covers all four channels.
 *
 * No Deno globals and no remote imports.
 */

import { contentHash } from "./urlCanonical.ts";

/**
 * Per-channel caps. These stop one long web page from crowding out the person's own note, which
 * is usually the most intentional signal on the item.
 */
export const INDEX_LIMITS = {
  title: 300,
  keywords: 300,
  source: 120,
  extractedText: 6000,
  userNote: 1500,
  summary: 1500,
  /** Hard ceiling on the composed document handed to the embedding provider. */
  total: 9000
} as const;

export type IndexableItem = {
  id?: string;
  title?: string | null;
  source?: string | null;
  content_type?: string | null;
  creator?: string | null;
  keywords?: string[] | null;
  extracted_text?: string | null;
  user_note?: string | null;
  summary?: string | null;
};

export type IndexText = {
  /** The labelled document to embed. Empty when the item carries no indexable content. */
  text: string;
  /** Stable identity of that document, used to detect staleness without re-embedding. */
  fingerprint: string;
  /** Which provenance channels actually contributed. Useful for diagnostics and tests. */
  channels: Array<"title" | "source" | "keywords" | "extracted_text" | "user_note" | "summary">;
};

function clean(value: string | null | undefined, limit: number): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

/**
 * Builds the labelled index document.
 *
 * Order is deliberate: identity first (title, source, keywords), then evidence in order of how
 * directly it represents the item — the source's own words, then the person's note, then AI
 * output last, because a summary is derived and should never dominate the vector.
 */
export function buildIndexText(item: IndexableItem): IndexText {
  const channels: IndexText["channels"] = [];
  const parts: string[] = [];

  const title = clean(item.title, INDEX_LIMITS.title);
  if (title) {
    parts.push(`Title: ${title}`);
    channels.push("title");
  }

  const source = clean([item.source, item.creator].filter(Boolean).join(" · "), INDEX_LIMITS.source);
  if (source) {
    parts.push(`Source: ${source}`);
    channels.push("source");
  }

  const keywords = clean((item.keywords ?? []).join(", "), INDEX_LIMITS.keywords);
  if (keywords) {
    parts.push(`Keywords: ${keywords}`);
    channels.push("keywords");
  }

  const extracted = clean(item.extracted_text, INDEX_LIMITS.extractedText);
  if (extracted) {
    parts.push(`From the source: ${extracted}`);
    channels.push("extracted_text");
  }

  const note = clean(item.user_note, INDEX_LIMITS.userNote);
  if (note) {
    parts.push(`From the user: ${note}`);
    channels.push("user_note");
  }

  const summary = clean(item.summary, INDEX_LIMITS.summary);
  if (summary) {
    parts.push(`Shepherd's summary: ${summary}`);
    channels.push("summary");
  }

  const text = parts.join("\n\n").slice(0, INDEX_LIMITS.total);

  return {
    text,
    // Fingerprint the composed document, so any change to any contributing channel changes it.
    fingerprint: text ? contentHash(text) : "",
    channels
  };
}

/** True when an item has nothing worth embedding beyond bare identity. */
export function isIndexable(indexText: IndexText): boolean {
  // A title alone is already covered well by lexical matching; embedding it adds cost without
  // adding reach, so only index when there is real content behind it.
  return indexText.channels.some((channel) => channel === "extracted_text" || channel === "user_note" || channel === "summary");
}
