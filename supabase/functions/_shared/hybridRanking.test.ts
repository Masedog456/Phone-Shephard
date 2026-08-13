import { AGREEMENT_BONUS, fuseResults, normalize, type Candidate } from "./hybridRanking";

describe("normalize", () => {
  it("scales a set to 0..1", () => {
    expect(normalize([0, 5, 10])).toEqual([0, 0.5, 1]);
  });

  it("treats an all-equal set as fully relevant rather than discarding it", () => {
    expect(normalize([4, 4, 4])).toEqual([1, 1, 1]);
  });

  it("handles a single result", () => {
    expect(normalize([7])).toEqual([1]);
  });

  it("handles an empty set", () => {
    expect(normalize([])).toEqual([]);
  });
});

describe("fusion", () => {
  it("merges a memory found by both paths into one result", () => {
    const lexical: Candidate[] = [{ kind: "library", id: "a", lexicalScore: 10 }];
    const semantic: Candidate[] = [{ kind: "library", id: "a", semanticScore: 0.9 }];

    const fused = fuseResults(lexical, semantic);

    expect(fused).toHaveLength(1);
    expect(fused[0].matchedBy).toEqual(["lexical", "semantic"]);
  });

  it("rewards agreement between the two paths", () => {
    const both = fuseResults(
      [{ kind: "library", id: "a", lexicalScore: 10 }],
      [{ kind: "library", id: "a", semanticScore: 1 }]
    );
    const lexicalOnly = fuseResults([{ kind: "library", id: "b", lexicalScore: 10 }], []);

    expect(both[0].score).toBeGreaterThan(lexicalOnly[0].score + AGREEMENT_BONUS - 0.01);
  });

  it("keeps distinct memories separate even with the same id across stores", () => {
    const fused = fuseResults(
      [{ kind: "library", id: "same", lexicalScore: 5 }],
      [{ kind: "screenshot", id: "same", semanticScore: 0.8 }]
    );
    expect(fused).toHaveLength(2);
    expect(fused.map((entry) => entry.kind).sort()).toEqual(["library", "screenshot"]);
  });

  it("never returns the same memory twice", () => {
    const fused = fuseResults(
      [
        { kind: "library", id: "a", lexicalScore: 5 },
        { kind: "library", id: "b", lexicalScore: 3 }
      ],
      [
        { kind: "library", id: "a", semanticScore: 0.9 },
        { kind: "library", id: "b", semanticScore: 0.8 }
      ]
    );
    expect(fused.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(new Set(fused.map((entry) => `${entry.kind}:${entry.id}`)).size).toBe(2);
  });

  // The screenshot bridge: results from both stores compete in one ranked list.
  it("lets screenshots and Library items participate in one query", () => {
    const fused = fuseResults(
      [{ kind: "library", id: "lib-1", lexicalScore: 4 }],
      [
        { kind: "screenshot", id: "shot-1", semanticScore: 0.95 },
        { kind: "library", id: "lib-2", semanticScore: 0.6 }
      ]
    );

    expect(fused.map((entry) => entry.kind)).toContain("screenshot");
    expect(fused.map((entry) => entry.kind)).toContain("library");
    expect(fused).toHaveLength(3);
  });

  it("surfaces a semantic-only memory that lexical missed entirely", () => {
    const fused = fuseResults([], [{ kind: "screenshot", id: "shot-1", semanticScore: 0.9 }]);
    expect(fused[0].id).toBe("shot-1");
    expect(fused[0].matchedBy).toEqual(["semantic"]);
  });

  it("still returns lexical results when the semantic path produced nothing", () => {
    const fused = fuseResults([{ kind: "library", id: "a", lexicalScore: 6 }], []);
    expect(fused).toHaveLength(1);
    expect(fused[0].matchedBy).toEqual(["lexical"]);
  });

  it("honours the limit", () => {
    const many: Candidate[] = Array.from({ length: 20 }, (_, i) => ({
      kind: "library" as const,
      id: `i-${i}`,
      lexicalScore: 20 - i
    }));
    expect(fuseResults(many, [], 5)).toHaveLength(5);
  });

  it("is deterministic for identical inputs", () => {
    const lexical: Candidate[] = [
      { kind: "library", id: "a", lexicalScore: 5, capturedAt: "2026-01-01T00:00:00Z" },
      { kind: "library", id: "b", lexicalScore: 5, capturedAt: "2026-01-01T00:00:00Z" }
    ];
    const first = fuseResults(lexical, []).map((entry) => entry.id);
    const second = fuseResults(lexical, []).map((entry) => entry.id);
    expect(first).toEqual(second);
  });

  it("breaks ties by recency, then id", () => {
    const fused = fuseResults(
      [
        { kind: "library", id: "old", lexicalScore: 5, capturedAt: "2020-01-01T00:00:00Z" },
        { kind: "library", id: "new", lexicalScore: 5, capturedAt: "2026-01-01T00:00:00Z" }
      ],
      []
    );
    expect(fused[0].id).toBe("new");
  });

  it("returns nothing when neither path found anything", () => {
    expect(fuseResults([], [])).toEqual([]);
  });
});
