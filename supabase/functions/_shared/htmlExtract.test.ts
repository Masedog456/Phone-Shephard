import { extractFromHtml, decodeEntities, normalizeDate } from "./htmlExtract";

const ARTICLE_BODY = Array.from({ length: 40 }, (_, i) => `<p>Sentence number ${i} about slow cooking and patience.</p>`).join("");

const PAGE = `<!doctype html>
<html><head>
  <title>Fallback Title</title>
  <meta property="og:title" content="How to Braise Anything">
  <meta name="author" content="Jane Cook">
  <meta property="article:published_time" content="2026-03-04T10:00:00Z">
  <meta property="og:site_name" content="Slow Kitchen">
  <meta property="og:description" content="A patient guide.">
  <link rel="canonical" href="/braising-guide">
</head><body>
  <nav><a href="/">Home</a><a href="/about">About</a><a href="/recipes">Recipes</a></nav>
  <header><h1>Slow Kitchen</h1></header>
  <script>window.analytics = { track(){} };</script>
  <style>.ad { display:none }</style>
  <article>${ARTICLE_BODY}</article>
  <aside><a href="/x">Sponsored partner content</a></aside>
  <footer>Copyright 2026 Slow Kitchen</footer>
</body></html>`;

describe("metadata extraction", () => {
  const result = extractFromHtml(PAGE, "https://slowkitchen.example/posts/braise?utm_source=x");

  it("prefers og:title over <title>", () => {
    expect(result.metadata.title).toBe("How to Braise Anything");
  });

  it("reads the author", () => {
    expect(result.metadata.author).toBe("Jane Cook");
  });

  it("reads and normalizes the published date", () => {
    expect(result.metadata.publishedAt).toBe("2026-03-04T10:00:00.000Z");
  });

  it("resolves a relative rel=canonical against the request URL", () => {
    expect(result.metadata.canonicalUrl).toBe("https://slowkitchen.example/braising-guide");
  });

  it("reads the site name and description", () => {
    expect(result.metadata.siteName).toBe("Slow Kitchen");
    expect(result.metadata.description).toBe("A patient guide.");
  });
});

describe("content extraction", () => {
  const result = extractFromHtml(PAGE, "https://slowkitchen.example/posts/braise");

  it("recovers the article body", () => {
    expect(result.text).toContain("Sentence number 0 about slow cooking");
    expect(result.wordCount).toBeGreaterThan(100);
  });

  it("strips script and style contents", () => {
    expect(result.text).not.toContain("window.analytics");
    expect(result.text).not.toContain("display:none");
  });

  it("strips navigation, aside and footer boilerplate", () => {
    expect(result.text).not.toContain("Sponsored partner content");
    expect(result.text).not.toContain("Copyright 2026");
    expect(result.text).not.toContain("About");
  });

  it("reports a low word count for a page with no real article", () => {
    const thin = extractFromHtml("<html><body><div>Please enable JavaScript.</div></body></html>", "https://x.example/");
    expect(thin.wordCount).toBeLessThan(60);
  });

  it("falls back to <title> when og:title is absent", () => {
    const simple = extractFromHtml("<html><head><title>Plain Page</title></head><body><p>Hello there friend.</p></body></html>", "https://x.example/");
    expect(simple.metadata.title).toBe("Plain Page");
  });

  it("reads JSON-LD author and date when meta tags are missing", () => {
    const ld = `<html><head><script type="application/ld+json">
      {"@type":"Article","author":{"name":"Ada Byron"},"datePublished":"2025-06-01"}
    </script><title>LD Page</title></head><body><p>Body text here.</p></body></html>`;
    const result = extractFromHtml(ld, "https://x.example/");
    expect(result.metadata.author).toBe("Ada Byron");
    expect(result.metadata.publishedAt).toBe("2025-06-01T00:00:00.000Z");
  });

  it("survives malformed JSON-LD without failing extraction", () => {
    const bad = `<html><head><script type="application/ld+json">{ nope </script><title>T</title></head><body><p>Text.</p></body></html>`;
    expect(() => extractFromHtml(bad, "https://x.example/")).not.toThrow();
    expect(extractFromHtml(bad, "https://x.example/").metadata.title).toBe("T");
  });
});

describe("entity decoding", () => {
  it("decodes named, decimal and hex entities", () => {
    expect(decodeEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(decodeEntities("caf&#233;")).toBe("café");
    expect(decodeEntities("caf&#xe9;")).toBe("café");
    expect(decodeEntities("it&rsquo;s")).toBe("it’s");
  });

  it("leaves unknown entities alone rather than mangling them", () => {
    expect(decodeEntities("&notarealentity;")).toBe("&notarealentity;");
  });
});

describe("normalizeDate", () => {
  it("accepts plausible dates", () => {
    expect(normalizeDate("2026-01-15")).toBe("2026-01-15T00:00:00.000Z");
  });

  it("rejects unparseable and implausible dates rather than storing them as source metadata", () => {
    expect(normalizeDate("not a date")).toBeNull();
    expect(normalizeDate("1201-01-01")).toBeNull();
    expect(normalizeDate(null)).toBeNull();
  });
});
