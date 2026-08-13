/**
 * Guarded HTTP fetch for user-submitted URLs.
 *
 * This is not a general-purpose proxy and must never become one: it only performs GET, only
 * returns decoded HTML text, and enforces a byte cap, a timeout, a redirect cap, and an address
 * check on every hop.
 *
 * Redirects are followed MANUALLY (`redirect: "manual"`) because the platform's automatic
 * redirect following would happily land on a private address after starting at a public one.
 */

import { checkUrl, checkResolvedAddresses, type UrlRejection } from "./urlSafety.ts";

export const MAX_REDIRECTS = 5;
export const MAX_BYTES = 2_000_000; // 2 MB of HTML is far more than any article needs
export const TIMEOUT_MS = 12_000;

export type FetchFailure = {
  ok: false;
  reason:
    | UrlRejection["reason"]
    | "too_many_redirects"
    | "timeout"
    | "too_large"
    | "unsupported_content_type"
    | "http_error"
    | "network_error";
  message: string;
  status?: number;
  /** True when retrying later could plausibly succeed. */
  retryable: boolean;
};

export type FetchSuccess = {
  ok: true;
  html: string;
  finalUrl: string;
  status: number;
  redirectChain: string[];
  contentType: string;
  bytes: number;
};

export type FetchOutcome = FetchSuccess | FetchFailure;

export type SafeFetchOptions = {
  fetchImpl?: typeof fetch;
  resolveDns?: (host: string) => Promise<string[]>;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  userAgent?: string;
};

const ALLOWED_CONTENT_TYPES = ["text/html", "application/xhtml+xml", "text/plain"];

export async function safeFetchHtml(input: string, options: SafeFetchOptions = {}): Promise<FetchOutcome> {
  const {
    fetchImpl = fetch,
    resolveDns,
    maxBytes = MAX_BYTES,
    timeoutMs = TIMEOUT_MS,
    maxRedirects = MAX_REDIRECTS,
    userAgent = "PhoneShepherdBot/1.0 (+https://phoneshepherd.app; personal saved-content reader)"
  } = options;

  const redirectChain: string[] = [];
  let current = input;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const check = checkUrl(current);
    if (!check.ok) {
      return { ok: false, reason: check.reason, message: check.message, retryable: false };
    }

    const resolved = await checkResolvedAddresses(check.url.hostname, resolveDns);
    if (resolved && !resolved.ok) {
      return { ok: false, reason: resolved.reason, message: resolved.message, retryable: false };
    }

    redirectChain.push(check.url.toString());

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(check.url.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          // Identify honestly and ask for documents only.
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5",
          "Accept-Language": "en"
        }
      });
    } catch (error) {
      clearTimeout(timer);
      const aborted = error instanceof Error && (error.name === "AbortError" || /abort/i.test(error.message));
      if (aborted) {
        return { ok: false, reason: "timeout", message: "That page took too long to respond.", retryable: true };
      }
      return {
        ok: false,
        reason: "network_error",
        message: error instanceof Error ? error.message : "That page could not be reached.",
        retryable: true
      };
    }
    clearTimeout(timer);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return { ok: false, reason: "http_error", message: "That page redirected without saying where.", status: response.status, retryable: false };
      }
      try {
        current = new URL(location, check.url).toString();
      } catch {
        return { ok: false, reason: "invalid_url", message: "That page redirected somewhere invalid.", retryable: false };
      }
      continue; // Re-validated at the top of the next iteration.
    }

    if (!response.ok) {
      return {
        ok: false,
        reason: "http_error",
        message: httpMessage(response.status),
        status: response.status,
        // 4xx is usually permanent for us (paywall, blocked bot); 5xx may recover.
        retryable: response.status >= 500 || response.status === 429
      };
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    const mime = contentType.split(";")[0].trim();
    if (mime && !ALLOWED_CONTENT_TYPES.includes(mime)) {
      return {
        ok: false,
        reason: "unsupported_content_type",
        message: `Phone Shepherd reads web pages, and that link is ${mime}.`,
        retryable: false
      };
    }

    const declared = Number(response.headers.get("content-length") ?? "");
    if (Number.isFinite(declared) && declared > maxBytes) {
      return { ok: false, reason: "too_large", message: "That page is too large to read safely.", retryable: false };
    }

    const read = await readCapped(response, maxBytes);
    if (!read.ok) return read;

    return {
      ok: true,
      html: read.text,
      finalUrl: check.url.toString(),
      status: response.status,
      redirectChain,
      contentType: mime || "text/html",
      bytes: read.bytes
    };
  }

  return { ok: false, reason: "too_many_redirects", message: "That link redirected too many times.", retryable: false };
}

/**
 * Reads the body with a hard byte cap. Streams where possible so an oversized or endless
 * response is abandoned rather than buffered, and falls back to a post-hoc size check when the
 * response has no readable stream (which is the case for many test doubles).
 */
async function readCapped(
  response: Response,
  maxBytes: number
): Promise<{ ok: true; text: string; bytes: number } | FetchFailure> {
  const body = response.body;
  if (!body || typeof body.getReader !== "function") {
    const text = await response.text();
    const bytes = byteLength(text);
    if (bytes > maxBytes) {
      return { ok: false, reason: "too_large", message: "That page is too large to read safely.", retryable: false };
    }
    return { ok: true, text, bytes };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large", message: "That page is too large to read safely.", retryable: false };
      }
      chunks.push(value);
    }
  } catch (error) {
    const aborted = error instanceof Error && (error.name === "AbortError" || /abort/i.test(error.message));
    return aborted
      ? { ok: false, reason: "timeout", message: "That page stopped responding while it was being read.", retryable: true }
      : { ok: false, reason: "network_error", message: "That page could not be read.", retryable: true };
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder("utf-8").decode(merged), bytes: total };
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function httpMessage(status: number): string {
  if (status === 401 || status === 403) return "That page needs a login or blocked the request, so its text could not be read.";
  if (status === 404) return "That page could not be found.";
  if (status === 429) return "That site asked Phone Shepherd to slow down. Try again in a little while.";
  if (status >= 500) return "That site is having trouble right now.";
  return `That page returned status ${status}.`;
}
