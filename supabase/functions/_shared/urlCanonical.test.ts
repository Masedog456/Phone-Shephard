import { canonicalizeUrl, contentHash, domainOf } from "./urlCanonical";

describe("canonicalizeUrl", () => {
  it("strips tracking parameters but keeps meaningful ones", () => {
    const result = canonicalizeUrl("https://example.com/post?id=42&utm_source=twitter&utm_campaign=x&fbclid=abc");
    expect(result).toBe("https://example.com/post?id=42");
  });

  it("collapses two differently-tracked links to the same identity", () => {
    const a = canonicalizeUrl("https://example.com/story?utm_source=newsletter");
    const b = canonicalizeUrl("https://example.com/story?fbclid=xyz&igshid=1");
    expect(a).toBe(b);
  });

  it("sorts remaining parameters so order does not create false duplicates", () => {
    expect(canonicalizeUrl("https://example.com/a?b=2&a=1")).toBe(canonicalizeUrl("https://example.com/a?a=1&b=2"));
  });

  it("drops the fragment", () => {
    expect(canonicalizeUrl("https://example.com/a#section-3")).toBe("https://example.com/a");
  });

  it("lowercases the host, drops default ports and a trailing slash", () => {
    expect(canonicalizeUrl("HTTPS://Example.COM:443/path/")).toBe("https://example.com/path");
    expect(canonicalizeUrl("http://example.com:80/")).toBe("http://example.com/");
  });

  it("prefers the page's declared canonical URL", () => {
    const result = canonicalizeUrl("https://m.example.com/amp/story?utm_source=x", "https://example.com/story");
    expect(result).toBe("https://example.com/story");
  });

  it("ignores an unusable declared canonical and falls back to the request URL", () => {
    expect(canonicalizeUrl("https://example.com/story", "javascript:alert(1)")).toBe("https://example.com/story");
    expect(canonicalizeUrl("https://example.com/story", "   ")).toBe("https://example.com/story");
  });

  it("returns the input unchanged when it cannot be parsed", () => {
    expect(canonicalizeUrl("not a url")).toBe("not a url");
  });
});

describe("domainOf", () => {
  it("returns the bare host without www", () => {
    expect(domainOf("https://www.example.com/a")).toBe("example.com");
    expect(domainOf("https://news.bbc.co.uk/a")).toBe("news.bbc.co.uk");
  });

  it("returns empty string for junk", () => {
    expect(domainOf("nope")).toBe("");
  });
});

describe("contentHash", () => {
  it("is stable for identical text", () => {
    expect(contentHash("Hello world")).toBe(contentHash("Hello world"));
  });

  it("ignores whitespace and case differences", () => {
    expect(contentHash("Hello   world\n")).toBe(contentHash("hello world"));
  });

  it("differs when the content genuinely differs", () => {
    expect(contentHash("Hello world")).not.toBe(contentHash("Hello worlds"));
  });

  it("returns empty for empty content, so it is never used as a false duplicate key", () => {
    expect(contentHash("   \n  ")).toBe("");
  });

  it("produces a namespaced, fixed-width digest", () => {
    expect(contentHash("some article text")).toMatch(/^fnv1a64:[0-9a-f]{16}$/);
  });
});
