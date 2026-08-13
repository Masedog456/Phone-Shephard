import { buildHaystack, rankItems, tokenize, type RankableItem } from "./memoryRanking";

const identity = (value?: string | null) => value ?? "education";

/** A saved web page, as ingest-url would have written it. */
const webSource: RankableItem = {
  id: "src-1",
  title: "How to Braise Anything",
  source: "slowkitchen.example",
  content_type: "website",
  creator: "Jane Cook",
  summary: "", // no AI summary yet — retrieval must not depend on one
  category: "education",
  collection_name: "Saved links",
  keywords: ["braise", "slowkitchen.example"],
  captured_at: "2026-08-01T10:00:00.000Z",
  extracted_text:
    "Braising works because collagen melts into gelatin over low heat. Use a heavy pot, brown the meat first, then add just enough stock to come halfway up.",
  user_note: "Try this with short ribs for Sunday dinner."
};

const unrelated: RankableItem = {
  id: "other-1",
  title: "Tax deadlines",
  source: "notes",
  content_type: "document",
  category: "finance",
  keywords: [],
  captured_at: "2026-08-02T10:00:00.000Z"
};

describe("haystack composition", () => {
  it("includes the source's own words", () => {
    expect(buildHaystack(webSource)).toContain("collagen melts into gelatin");
  });

  it("includes the person's note", () => {
    expect(buildHaystack(webSource)).toContain("short ribs");
  });

  it("bounds how much source text participates so one long page cannot dominate", () => {
    const huge = { ...webSource, extracted_text: `${"a".repeat(10000)} needle` };
    expect(buildHaystack(huge)).not.toContain("needle");
  });

  it("survives an item with no extracted text or note", () => {
    expect(() => buildHaystack(unrelated)).not.toThrow();
  });
});

describe("Ask Your Memory retrieval of a saved URL source", () => {
  // The core of the retrieval bridge: a fetched page is findable by words that appear ONLY in
  // its body, with no vector store and no AI summary involved.
  it("finds a web page by a phrase that appears only in the source text", () => {
    const ranked = rankItems("what did that page say about collagen", [webSource, unrelated], null, identity);
    expect(ranked[0].item.id).toBe("src-1");
    expect(ranked[0].score).toBeGreaterThanOrEqual(2);
  });

  it("finds it by the user's own note", () => {
    const ranked = rankItems("short ribs sunday", [webSource, unrelated], null, identity);
    expect(ranked[0].item.id).toBe("src-1");
    expect(ranked[0].score).toBeGreaterThanOrEqual(2);
  });

  it("finds it by domain", () => {
    const ranked = rankItems("what did I save from slowkitchen", [webSource, unrelated], null, identity);
    expect(ranked[0].item.id).toBe("src-1");
  });

  it("finds it by title", () => {
    const ranked = rankItems("braise anything", [webSource, unrelated], null, identity);
    expect(ranked[0].item.id).toBe("src-1");
  });

  // Without the extracted text in the haystack, this is the case that used to fail.
  it("would not be retrievable on body words if extracted text were excluded", () => {
    const withoutText = { ...webSource, extracted_text: null, user_note: null };
    const ranked = rankItems("collagen gelatin heavy pot", [withoutText, unrelated], null, identity);
    expect(ranked[0].score).toBeLessThan(2);
  });

  it("does not surface unrelated items above the relevance floor", () => {
    const ranked = rankItems("collagen gelatin", [webSource, unrelated], null, identity);
    const other = ranked.find((entry) => entry.item.id === "other-1");
    expect(other?.score).toBeLessThan(2);
  });

  it("breaks ties by recency", () => {
    const older = { ...unrelated, id: "old", title: "Braise notes", captured_at: "2020-01-01T00:00:00.000Z" };
    const newer = { ...unrelated, id: "new", title: "Braise notes", captured_at: "2026-08-05T00:00:00.000Z" };
    const ranked = rankItems("braise notes", [older, newer], null, identity);
    expect(ranked[0].item.id).toBe("new");
  });
});

describe("tokenize", () => {
  it("drops short words and normalizes simple plurals", () => {
    expect(tokenize("The recipes and a pot")).toEqual(["the", "recipe", "and", "pot"]);
  });

  it("strips punctuation", () => {
    expect(tokenize("what's that, really?")).toContain("that");
  });
});
