import { buildLibraryContext, buildScreenshotContext, CONTEXT_LIMITS, PROVENANCE_INSTRUCTIONS } from "./memoryContext";

const libraryRow = {
  id: "lib-1",
  title: "How to Braise Anything",
  source: "slowkitchen.example",
  content_type: "website",
  creator: "Jane Cook",
  summary: "Shepherd thinks this is about slow cooking.",
  category: "education",
  captured_at: "2026-08-01T10:00:00.000Z",
  extracted_text: "Braising works because collagen melts into gelatin.",
  user_note: "Try with short ribs.",
  canonical_url: "https://slowkitchen.example/braise",
  published_at: "2026-03-04T10:00:00.000Z",
  extraction_status: "extracted"
};

const screenshotRow = {
  id: "shot-1",
  filename: "IMG_2231.png",
  captured_at: "2026-07-30T08:00:00.000Z",
  category: "note",
  summary: "A breathing exercise with a 4-7-8 pattern.",
  extracted_text: "Inhale 4, hold 7, exhale 8",
  is_sensitive: false
};

describe("library context", () => {
  const entry = buildLibraryContext(libraryRow, ["lexical", "semantic"]);

  it("keeps the four provenance channels separate", () => {
    expect((entry.fromTheSource as { text: string }).text).toContain("collagen melts");
    expect((entry.fromTheUser as { text: string }).text).toBe("Try with short ribs.");
    expect((entry.fromShepherdAI as { text: string }).text).toContain("Shepherd thinks");
  });

  // The exact misattribution the contract forbids.
  it("never puts AI output into the source channel", () => {
    expect((entry.fromTheSource as { text: string }).text).not.toContain("Shepherd thinks");
  });

  it("names the memory kind so it cannot be mistaken for a screenshot", () => {
    expect(entry.kind).toBe("library");
    expect(entry.memoryType).toBe("saved web page");
  });

  it("carries the source URL and published date as source metadata", () => {
    expect((entry.fromTheSource as { url: string }).url).toBe("https://slowkitchen.example/braise");
    expect((entry.fromTheSource as { publishedAt: string }).publishedAt).toBe("2026-03-04T10:00:00.000Z");
  });

  it("records which retrieval paths matched", () => {
    expect(entry.matchedBy).toEqual(["lexical", "semantic"]);
  });

  it("caps long source text and flags the truncation", () => {
    const long = buildLibraryContext({ ...libraryRow, extracted_text: "x".repeat(10_000) }, ["semantic"]);
    const source = long.fromTheSource as { text: string; truncated: boolean };
    expect(source.text.length).toBe(CONTEXT_LIMITS.extractedText);
    expect(source.truncated).toBe(true);
  });

  it("emits null rather than an empty channel when content is absent", () => {
    const sparse = buildLibraryContext({ ...libraryRow, extracted_text: null, user_note: "", summary: null }, ["lexical"]);
    expect(sparse.fromTheSource).toBeNull();
    expect(sparse.fromTheUser).toBeNull();
    expect(sparse.fromShepherdAI).toBeNull();
  });
});

describe("screenshot context", () => {
  const entry = buildScreenshotContext(screenshotRow, ["semantic"]);

  it("names the memory kind so it is never described as a webpage", () => {
    expect(entry.kind).toBe("screenshot");
    expect(String(entry.memoryType)).toContain("screenshot");
  });

  // Text read off the image is closer to evidence than a summary, so it is reported separately.
  it("separates text read off the screen from the AI summary", () => {
    expect((entry.textOnScreen as { text: string }).text).toBe("Inhale 4, hold 7, exhale 8");
    expect((entry.fromShepherdAI as { text: string }).text).toContain("breathing exercise");
  });

  it("has no source or user channel, because a screenshot has neither", () => {
    expect(entry.fromTheSource).toBeUndefined();
    expect(entry.fromTheUser).toBeUndefined();
  });

  it("says when sensitive content was deliberately withheld", () => {
    const sensitive = buildScreenshotContext({ ...screenshotRow, is_sensitive: true, extracted_text: null }, ["semantic"]);
    expect(sensitive.sensitiveContentWithheld).toBe(true);
    expect(sensitive.textOnScreen).toBeNull();
  });

  it("caps screenshot analysis length", () => {
    const long = buildScreenshotContext({ ...screenshotRow, summary: "y".repeat(5000) }, ["semantic"]);
    expect((long.fromShepherdAI as { text: string }).text.length).toBe(CONTEXT_LIMITS.screenshotAnalysis);
  });
});

describe("provenance instructions", () => {
  it("tell the model not to confuse the two memory kinds", () => {
    expect(PROVENANCE_INSTRUCTIONS).toMatch(/never describe a screenshot as a web page/i);
  });

  it("tell the model not to treat its own summary as evidence", () => {
    expect(PROVENANCE_INSTRUCTIONS).toMatch(/never as evidence/i);
  });
});
