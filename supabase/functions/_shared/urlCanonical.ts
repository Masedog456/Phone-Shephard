/**
 * URL canonicalization.
 *
 * Produces a stable identity for a page so the same article shared from two places is
 * recognisable as the same thing. Canonicalization is deliberately conservative: it only strips
 * parameters that are known to be tracking noise, because dropping a meaningful query parameter
 * would merge two genuinely different pages.
 */

/** Query parameters that never change which page you are looking at. */
const TRACKING_PARAMS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^gbraid$/i,
  /^wbraid$/i,
  /^dclid$/i,
  /^msclkid$/i,
  /^mc_(cid|eid)$/i,
  /^igshid$/i,
  /^igsh$/i,
  /^ref$/i,
  /^ref_src$/i,
  /^ref_url$/i,
  /^source$/i,
  /^spm$/i,
  /^scid$/i,
  /^si$/i,
  /^s_kwcid$/i,
  /^yclid$/i,
  /^_hs(enc|mi)$/i,
  /^vero_(id|conv)$/i,
  /^trk$/i,
  /^cmpid$/i,
  /^campaign_id$/i
];

function isTracking(name: string): boolean {
  return TRACKING_PARAMS.some((pattern) => pattern.test(name));
}

/**
 * Canonicalizes a URL for identity comparison.
 *
 * - lowercases scheme and host, drops a trailing dot on the host
 * - drops the default port
 * - removes tracking parameters, sorts the rest so order does not create false duplicates
 * - removes the fragment, which never identifies a different document to a fetcher
 * - trims a trailing slash on non-root paths
 *
 * `preferred` is the page's own rel=canonical or og:url when present; it wins over the
 * submitted URL, which is how "same content under different tracking URLs" collapses.
 */
export function canonicalizeUrl(input: string, preferred?: string | null): string {
  const base = safeParse(preferred) ?? safeParse(input);
  if (!base) return input.trim();

  const url = new URL(base.toString());
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  url.hash = "";

  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }

  const kept: Array<[string, string]> = [];
  url.searchParams.forEach((value, name) => {
    if (!isTracking(name)) kept.push([name, value]);
  });
  kept.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));

  const search = kept.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join("&");
  url.search = search ? `?${search}` : "";

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

function safeParse(value?: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

/** Human-readable site name used for display and for lexical retrieval. */
export function domainOf(input: string): string {
  try {
    return new URL(input).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Deterministic content identity.
 *
 * Hashes the normalized extracted text rather than the raw HTML, so a page that only changed its
 * ads, CSRF token, or build hash still counts as the same content. Uses FNV-1a over the
 * normalized text: this is an identity/dedupe key, not a security primitive, and it must be
 * computable synchronously in both runtimes.
 */
export function contentHash(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalized) return "";
  // 64-bit FNV-1a built from two 32-bit halves to stay inside safe integer arithmetic.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (code + i) & 0xff;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return `fnv1a64:${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}
