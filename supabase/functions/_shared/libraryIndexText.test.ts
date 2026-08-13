import { buildIndexText, isIndexable, INDEX_LIMITS } from "./libraryIndexText";

const fullItem = {
  id: "lib-1",
  title: "How to Braise Anything",
  source: "slowkitchen.example",
  creator: "Jane Cook",
  keywords: ["braise", "collagen"],
  extracted_text: "Braising works because collagen melts into gelatin over low heat.",
  user_note: "Try this with short ribs for Sunday dinner.",
  summary: "A guide to low and slow cooking."
};

describe("composition", () => {
  it("labels every provenance channel", () => {
    const { text } = buildIndexText(fullItem);
    expect(text).toContain("Title: How to Braise Anything");
    expect(text).toContain("Source: slowkitchen.example · Jane Cook");
    expect(text).toContain("Keywords: braise, collagen");
    expect(text).toContain("From the source: Braising works because collagen");
    expect(text).toContain("From the user: Try this with short ribs");
    expect(text).toContain("Shepherd's summary: A guide to low and slow");
  });

  // The labels are what let a reviewer see who wrote what inside the indexed document.
  it("never merges the user's words into the source channel", () => {
    const { text } = buildIndexText(fullItem);
    const sourceSection = text.slice(text.indexOf("From the source:"), text.indexOf("From the user:"));
    expect(sourceSection).not.toContain("short ribs");
  });

  it("reports which channels contributed", () => {
    expect(buildIndexText(fullItem).channels).toEqual([
      "title",
      "source",
      "keywords",
      "extracted_text",
      "user_note",
      "summary"
    ]);
  });

  it("omits channels that are absent rather than emitting empty labels", () => {
    const { text, channels } = buildIndexText({ title: "Just a title", user_note: "a thought" });
    expect(channels).toEqual(["title", "user_note"]);
    expect(text).not.toContain("From the source:");
    expect(text).not.toContain("Shepherd's summary:");
  });

  it("caps each channel so one long page cannot crowd out the user's note", () => {
    const { text } = buildIndexText({
      ...fullItem,
      extracted_text: "x".repeat(50_000)
    });
    expect(text).toContain("From the user: Try this with short ribs");
    expect(text.length).toBeLessThanOrEqual(INDEX_LIMITS.total);
  });

  it("collapses whitespace so formatting churn does not look like a content change", () => {
    const a = buildIndexText({ title: "A", user_note: "hello   world" });
    const b = buildIndexText({ title: "A", user_note: "hello world\n" });
    expect(a.fingerprint).toBe(b.fingerprint);
  });
});

describe("fingerprint", () => {
  it("is stable for identical content", () => {
    expect(buildIndexText(fullItem).fingerprint).toBe(buildIndexText(fullItem).fingerprint);
  });

  it("changes when any contributing channel changes", () => {
    const base = buildIndexText(fullItem).fingerprint;
    expect(buildIndexText({ ...fullItem, user_note: "different note" }).fingerprint).not.toBe(base);
    expect(buildIndexText({ ...fullItem, summary: "different summary" }).fingerprint).not.toBe(base);
    expect(buildIndexText({ ...fullItem, extracted_text: "different source" }).fingerprint).not.toBe(base);
    expect(buildIndexText({ ...fullItem, title: "Different title" }).fingerprint).not.toBe(base);
  });

  it("is empty when there is nothing to index", () => {
    expect(buildIndexText({}).fingerprint).toBe("");
  });
});

describe("isIndexable", () => {
  it("indexes an item with source text", () => {
    expect(isIndexable(buildIndexText({ title: "T", extracted_text: "real content here" }))).toBe(true);
  });

  it("indexes an item with only a user note", () => {
    expect(isIndexable(buildIndexText({ title: "T", user_note: "my own thought" }))).toBe(true);
  });

  it("indexes an item with only an AI summary", () => {
    expect(isIndexable(buildIndexText({ title: "T", summary: "a summary" }))).toBe(true);
  });

  // Titles and keywords are already well served by lexical matching, so embedding them alone
  // would spend money without adding reach.
  it("skips an item with only a title and keywords", () => {
    expect(isIndexable(buildIndexText({ title: "T", keywords: ["a", "b"], source: "x.example" }))).toBe(false);
  });

  it("skips an entirely empty item", () => {
    expect(isIndexable(buildIndexText({}))).toBe(false);
  });
});
