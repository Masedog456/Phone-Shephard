/**
 * Lexical ranking for Ask Your Memory.
 *
 * Extracted from the ask-memory function so the retrieval bridge for fetched sources is unit
 * testable: a saved web page becomes findable precisely because its extracted text participates
 * in the haystack below, and that is the behaviour worth pinning down in CI.
 *
 * No Deno globals and no remote imports.
 */

export type RankableItem = {
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
};

/** How much source text participates in lexical matching per item. */
export const HAYSTACK_TEXT_LIMIT = 4000;

export function buildHaystack(item: RankableItem): string {
  return [
    item.title,
    item.summary,
    item.why_saved,
    item.source,
    item.content_type,
    item.creator,
    item.category,
    item.collection_name,
    // The source's own words. Without this, a fetched web page is only findable by its title.
    item.extracted_text?.slice(0, HAYSTACK_TEXT_LIMIT),
    // The person's own words are a first-class retrieval signal too.
    item.user_note,
    ...(item.keywords ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .map((word) => {
      if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
      if (word.endsWith("s") && word.length > 4) return word.slice(0, -1);
      return word;
    });
}

export function rankItems<T extends RankableItem>(
  question: string,
  items: T[],
  categoryHint: string | null,
  normalizeCategory: (value?: string | null) => string
): Array<{ item: T; score: number }> {
  const words = tokenize(question);

  return items
    .map((item) => {
      const haystack = buildHaystack(item);
      const sourceText = (item.extracted_text ?? "").slice(0, HAYSTACK_TEXT_LIMIT).toLowerCase();
      const note = (item.user_note ?? "").toLowerCase();

      const wordHits = words.filter((word) => haystack.includes(word)).length;
      const titleHits = words.filter((word) => item.title.toLowerCase().includes(word)).length;
      const keywordHits = words.filter((word) => (item.keywords ?? []).join(" ").toLowerCase().includes(word)).length;

      // A word found in the page's own text is real evidence, not incidental overlap. Without
      // this weighting a fetched source whose only match is in its body scores 1 and falls under
      // the caller's relevance floor, which would make saved web pages effectively unfindable by
      // what they actually say.
      const sourceTextHits = sourceText ? words.filter((word) => sourceText.includes(word)).length : 0;
      // The person's own note is the most intentional signal they can leave.
      const noteHits = note ? words.filter((word) => note.includes(word)).length : 0;

      const categoryBoost = categoryHint && normalizeCategory(item.category) === categoryHint ? 4 : 0;

      return {
        item,
        score: wordHits + titleHits * 2 + keywordHits * 2 + sourceTextHits + noteHits * 2 + categoryBoost
      };
    })
    .sort((a, b) => b.score - a.score || Date.parse(b.item.captured_at) - Date.parse(a.item.captured_at));
}
