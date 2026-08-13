/**
 * Readable-content extraction from HTML.
 *
 * Deliberately dependency-free. A remote parser would add a second fetch at cold start and a
 * supply-chain surface to a path that already handles untrusted input, and the heuristics below
 * are small enough to test exhaustively.
 *
 * This is honest about its limits: it reports how confident it is, and the caller refuses to
 * claim a successful capture when too little readable text was recovered (paywalls, login walls,
 * and JavaScript-rendered pages all land there).
 */

export type ExtractedMetadata = {
  title: string | null;
  author: string | null;
  publishedAt: string | null;
  canonicalUrl: string | null;
  siteName: string | null;
  description: string | null;
};

export type ExtractionResult = {
  metadata: ExtractedMetadata;
  text: string;
  /** Rough word count of the recovered text, used to judge whether extraction really worked. */
  wordCount: number;
};

/** Elements whose contents are never article text. */
const STRIP_ELEMENTS = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "canvas",
  "iframe",
  "form",
  "button",
  "select",
  "nav",
  "header",
  "footer",
  "aside"
];

const BLOCK_BOUNDARY = /<\/?(p|div|section|article|main|h[1-6]|li|ul|ol|br|tr|td|blockquote|pre|figcaption)\b[^>]*>/gi;

export function extractFromHtml(html: string, requestUrl: string): ExtractionResult {
  const metadata = extractMetadata(html, requestUrl);
  const body = isolateBody(html);
  const candidate = pickContentRegion(body);
  const text = htmlToText(candidate);
  return { metadata, text, wordCount: countWords(text) };
}

/* ────────────────────────────── metadata ────────────────────────────── */

function extractMetadata(html: string, requestUrl: string): ExtractedMetadata {
  const head = html.slice(0, 200_000); // metadata always lives near the top

  const title =
    meta(head, "property", "og:title") ??
    meta(head, "name", "twitter:title") ??
    tagText(head, "title") ??
    null;

  const author =
    meta(head, "name", "author") ??
    meta(head, "property", "article:author") ??
    meta(head, "name", "byl") ??
    meta(head, "name", "twitter:creator") ??
    jsonLdField(head, "author") ??
    null;

  const publishedRaw =
    meta(head, "property", "article:published_time") ??
    meta(head, "name", "date") ??
    meta(head, "itemprop", "datePublished") ??
    timeDatetime(head) ??
    jsonLdField(head, "datePublished") ??
    null;

  const canonicalUrl = linkHref(head, "canonical") ?? meta(head, "property", "og:url") ?? null;
  const siteName = meta(head, "property", "og:site_name") ?? null;
  const description = meta(head, "property", "og:description") ?? meta(head, "name", "description") ?? null;

  return {
    title: clean(title),
    author: clean(author),
    publishedAt: normalizeDate(publishedRaw),
    canonicalUrl: absolutize(clean(canonicalUrl), requestUrl),
    siteName: clean(siteName),
    description: clean(description)
  };
}

function meta(html: string, attr: string, value: string): string | null {
  // Matches the attribute in either order: <meta property="og:title" content="…"> and reversed.
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const forward = new RegExp(
    `<meta[^>]*${attr}\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']*)["']`,
    "i"
  );
  const reverse = new RegExp(
    `<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*${attr}\\s*=\\s*["']${escaped}["']`,
    "i"
  );
  return html.match(forward)?.[1] ?? html.match(reverse)?.[1] ?? null;
}

function linkHref(html: string, rel: string): string | null {
  const forward = new RegExp(`<link[^>]*rel\\s*=\\s*["']${rel}["'][^>]*href\\s*=\\s*["']([^"']*)["']`, "i");
  const reverse = new RegExp(`<link[^>]*href\\s*=\\s*["']([^"']*)["'][^>]*rel\\s*=\\s*["']${rel}["']`, "i");
  return html.match(forward)?.[1] ?? html.match(reverse)?.[1] ?? null;
}

function tagText(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeEntities(stripTags(match[1])) : null;
}

function timeDatetime(html: string): string | null {
  return html.match(/<time[^>]*datetime\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
}

/** Pulls a single scalar field out of JSON-LD without trusting it to be well-formed. */
function jsonLdField(html: string, field: string): string | null {
  const blocks = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!blocks) return null;
  for (const block of blocks) {
    const body = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    try {
      const parsed = JSON.parse(body);
      const found = findField(parsed, field);
      if (found) return found;
    } catch {
      // Malformed JSON-LD is common; ignore rather than failing the whole extraction.
    }
  }
  return null;
}

function findField(node: unknown, field: string, depth = 0): string | null {
  if (depth > 4 || node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = findField(entry, field, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = node as Record<string, unknown>;
  const value = record[field];
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const name = (value as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) return name;
    const found = findField(value, field, depth + 1);
    if (found) return found;
  }
  for (const key of Object.keys(record)) {
    if (key === field) continue;
    const found = findField(record[key], field, depth + 1);
    if (found) return found;
  }
  return null;
}

/* ────────────────────────────── content ────────────────────────────── */

function isolateBody(html: string): string {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  let cleaned = body;
  for (const tag of STRIP_ELEMENTS) {
    cleaned = cleaned.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
    cleaned = cleaned.replace(new RegExp(`<${tag}\\b[^>]*/>`, "gi"), " ");
  }
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, " ");
  return cleaned;
}

/**
 * Picks the densest plausible content region. Prefers semantic containers, then falls back to
 * whichever top-level block carries the most text — which is what separates an article body from
 * a page of navigation links.
 */
function pickContentRegion(body: string): string {
  for (const tag of ["article", "main"]) {
    const regions = matchAll(body, new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi"));
    if (regions.length) {
      const best = regions.reduce((a, b) => (textLength(b) >= textLength(a) ? b : a));
      if (countWords(htmlToText(best)) >= 40) return best;
    }
  }

  const roleMain = body.match(/<div[^>]*role\s*=\s*["']main["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
  if (roleMain && countWords(htmlToText(roleMain)) >= 40) return roleMain;

  const divs = matchAll(body, /<div\b[^>]*>([\s\S]*?)<\/div>/gi);
  if (divs.length) {
    const best = divs.reduce((a, b) => (textLength(b) >= textLength(a) ? b : a));
    if (countWords(htmlToText(best)) >= countWords(htmlToText(body)) * 0.5) return best;
  }

  return body;
}

function matchAll(input: string, pattern: RegExp): string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  while ((match = re.exec(input)) !== null) {
    out.push(match[1] ?? "");
    if (match.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

function textLength(html: string): number {
  return htmlToText(html).length;
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(BLOCK_BOUNDARY, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

export function decodeEntities(input: string): string {
  return input
    .replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        return safeCodePoint(parseInt(entity.slice(2), 16), match);
      }
      if (entity.startsWith("#")) {
        return safeCodePoint(parseInt(entity.slice(1), 10), match);
      }
      const named: Record<string, string> = {
        amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
        mdash: "—", ndash: "–", hellip: "…", rsquo: "’",
        lsquo: "‘", ldquo: "“", rdquo: "”", eacute: "é", middot: "·"
      };
      return named[entity.toLowerCase()] ?? match;
    });
}

function safeCodePoint(code: number, fallback: string): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return fallback;
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function clean(value: string | null): string | null {
  if (!value) return null;
  const text = decodeEntities(value).replace(/\s+/g, " ").trim();
  return text.length ? text.slice(0, 500) : null;
}

/** Normalizes a date to an ISO string, or null when it cannot be trusted. */
export function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value.trim());
  if (Number.isNaN(parsed)) return null;
  const date = new Date(parsed);
  const year = date.getUTCFullYear();
  // Reject obviously bogus dates rather than storing them as source metadata.
  if (year < 1990 || year > new Date().getUTCFullYear() + 1) return null;
  return date.toISOString();
}

function absolutize(href: string | null, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}
