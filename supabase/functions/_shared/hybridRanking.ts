/**
 * Deterministic hybrid merge of lexical and semantic retrieval, across both memory stores.
 *
 * Lexical is not replaced. Names, exact phrases, URLs and rare identifiers match lexically far
 * better than they do semantically — "what did that Stripe invoice say" wants the literal token.
 * Semantic retrieval covers the opposite case, where the user remembers the meaning and not the
 * words. Neither alone is sufficient, so both run and the results are fused.
 *
 * There is no model call and no randomness here: the same inputs always produce the same order.
 *
 * No Deno globals and no remote imports.
 */

export type MemoryKind = "library" | "screenshot";

export type Candidate = {
  kind: MemoryKind;
  id: string;
  /** Raw lexical score, or 0 when this path did not find it. */
  lexicalScore?: number;
  /** Cosine similarity in 0..1, or undefined when this path did not find it. */
  semanticScore?: number;
  /** ISO timestamp used only as a deterministic tie-breaker. */
  capturedAt?: string | null;
};

export type FusedResult = Candidate & {
  score: number;
  /** Which retrieval paths found this memory. Surfaced for diagnostics and honest reporting. */
  matchedBy: Array<"lexical" | "semantic">;
};

/**
 * Weights. Lexical leads slightly because it is precise when it fires; semantic is close behind
 * because it is what makes meaning-oriented questions work at all.
 */
export const LEXICAL_WEIGHT = 0.55;
export const SEMANTIC_WEIGHT = 0.45;
/** Agreement between two independent methods is the strongest evidence available. */
export const AGREEMENT_BONUS = 0.1;

/**
 * Normalizes a set of raw scores to 0..1 within that set.
 *
 * Per-set normalization matters because lexical scores are unbounded integers while cosine
 * similarity is already 0..1; comparing them raw would let one path dominate purely by scale.
 * A set where every score is equal normalizes to 1, not 0, so a single result is not discarded.
 */
export function normalize(values: number[]): number[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => (max > 0 ? 1 : 0));
  return values.map((value) => (value - min) / (max - min));
}

/**
 * Fuses lexical and semantic candidates into one ranked, de-duplicated list.
 *
 * Identity is `kind:id`, so the same memory found by both paths appears exactly once — and gains
 * the agreement bonus rather than being counted twice.
 */
export function fuseResults(lexical: Candidate[], semantic: Candidate[], limit = 8): FusedResult[] {
  const lexicalNormalized = normalize(lexical.map((c) => c.lexicalScore ?? 0));
  const semanticNormalized = normalize(semantic.map((c) => c.semanticScore ?? 0));

  const merged = new Map<string, FusedResult>();

  lexical.forEach((candidate, index) => {
    const key = `${candidate.kind}:${candidate.id}`;
    merged.set(key, {
      ...candidate,
      score: lexicalNormalized[index] * LEXICAL_WEIGHT,
      matchedBy: ["lexical"]
    });
  });

  semantic.forEach((candidate, index) => {
    const key = `${candidate.kind}:${candidate.id}`;
    const contribution = semanticNormalized[index] * SEMANTIC_WEIGHT;
    const existing = merged.get(key);

    if (existing) {
      existing.score += contribution + AGREEMENT_BONUS;
      existing.semanticScore = candidate.semanticScore;
      existing.matchedBy = ["lexical", "semantic"];
      existing.capturedAt = existing.capturedAt ?? candidate.capturedAt;
    } else {
      merged.set(key, { ...candidate, score: contribution, matchedBy: ["semantic"] });
    }
  });

  return [...merged.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Deterministic tie-breakers: newer first, then id, so ordering never depends on Map order.
      const aTime = a.capturedAt ? Date.parse(a.capturedAt) : 0;
      const bTime = b.capturedAt ? Date.parse(b.capturedAt) : 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}
