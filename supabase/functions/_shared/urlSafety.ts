/**
 * URL safety checks for user-submitted links.
 *
 * Every URL the user submits is untrusted input that this server will fetch on their behalf.
 * That makes the fetch path an SSRF sink: without these checks a user could aim Phone Shepherd
 * at cloud metadata endpoints, internal services, or loopback.
 *
 * This module is deliberately allow-list-first (only http/https, only public addresses) and is
 * applied to the submitted URL AND to every redirect hop, because a public URL can redirect
 * into a private range.
 *
 * No Deno globals and no remote imports, so it loads in the Edge runtime and in Node tests.
 */

export type UrlRejection = {
  ok: false;
  reason:
    | "invalid_url"
    | "unsupported_protocol"
    | "embedded_credentials"
    | "private_address"
    | "blocked_hostname"
    | "missing_hostname";
  message: string;
};

export type UrlAcceptance = { ok: true; url: URL };

export type UrlCheck = UrlAcceptance | UrlRejection;

/** Hostnames that must never be fetched, regardless of what they resolve to. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  // Cloud instance metadata services.
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "metadata"
]);

/** Suffixes that indicate a non-public name. */
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".intranet", ".lan", ".home.arpa"];

export function isPrivateIPv4(parts: number[]): boolean {
  const [a, b] = parts;
  if (a === 0) return true; // "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local, includes 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0) return true; // IETF protocol assignments / 192.0.0.0/24
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

/**
 * Parses an IPv4 literal. Accepts only dotted-quad decimal; the shorthand forms Node and some
 * resolvers allow (decimal 2130706433, octal 0177.0.0.1, hex 0x7f.0.0.1) are treated as
 * IP-shaped and rejected rather than parsed, because they are classic private-range bypasses.
 */
export function parseIPv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    nums.push(value);
  }
  return nums;
}

/** True when the host looks like a numeric address in any encoding we refuse to interpret. */
export function isAmbiguousNumericHost(host: string): boolean {
  if (/^\d+$/.test(host)) return true; // decimal, e.g. 2130706433
  if (/^0[xX][0-9a-fA-F]+$/.test(host)) return true; // hex
  if (/^0\d+/.test(host)) return true; // octal-ish leading zero
  // Dotted forms with fewer than four parts, e.g. 127.1
  if (/^[\d.]+$/.test(host) && host.split(".").length !== 4) return true;
  // Dotted forms with non-decimal components, e.g. 0x7f.0.0.1
  if (/^[\dxX0-9a-fA-F.]+$/.test(host) && /[xX]/.test(host)) return true;
  return false;
}

/**
 * Expands an IPv6 literal into its eight 16-bit groups.
 *
 * Necessary because the WHATWG URL parser rewrites IPv4-mapped addresses into hex form:
 * `http://[::ffff:127.0.0.1]/` becomes hostname `[::ffff:7f00:1]`. Matching on a dotted quad
 * alone therefore misses loopback written that way, which is a real SSRF bypass.
 */
export function expandIPv6(input: string): number[] | null {
  let raw = input.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
  if (!raw) return null;
  raw = raw.replace(/%.*$/, ""); // drop any zone index

  // A trailing dotted quad contributes the final two groups.
  let tail: number[] = [];
  const dotted = raw.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) {
    const quad = parseIPv4(dotted[1]);
    if (!quad) return null;
    tail = [(quad[0] << 8) | quad[1], (quad[2] << 8) | quad[3]];
    raw = raw.slice(0, raw.length - dotted[1].length).replace(/:$/, "") || "::";
  }

  const doubleColon = raw.split("::");
  if (doubleColon.length > 2) return null;

  const toGroups = (part: string) =>
    part
      .split(":")
      .filter((chunk) => chunk.length > 0)
      .map((chunk) => (/^[0-9a-f]{1,4}$/.test(chunk) ? parseInt(chunk, 16) : NaN));

  let groups: number[];
  if (doubleColon.length === 2) {
    const head = toGroups(doubleColon[0]);
    const rest = [...toGroups(doubleColon[1]), ...tail];
    const missing = 8 - head.length - rest.length;
    if (missing < 0) return null;
    groups = [...head, ...new Array(missing).fill(0), ...rest];
  } else {
    groups = [...toGroups(doubleColon[0]), ...tail];
  }

  if (groups.length !== 8 || groups.some((value) => Number.isNaN(value))) return null;
  return groups;
}

export function isPrivateIPv6(host: string): boolean {
  const groups = expandIPv6(host);
  if (!groups) {
    // Unparseable IPv6 is refused by the caller rather than trusted.
    return true;
  }

  const isZero = (from: number, to: number) => groups.slice(from, to).every((value) => value === 0);

  // Loopback ::1 and unspecified ::
  if (isZero(0, 7) && (groups[7] === 1 || groups[7] === 0)) return true;

  // IPv4-mapped ::ffff:a.b.c.d and IPv4-compatible ::a.b.c.d — including the hex form the URL
  // parser produces, which is how ::ffff:127.0.0.1 slips past a dotted-quad check.
  if (isZero(0, 5) && (groups[5] === 0xffff || groups[5] === 0)) {
    const quad = [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff];
    if (isPrivateIPv4(quad)) return true;
  }

  const first = groups[0];
  if ((first & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((first & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
  if ((first & 0xff00) === 0xff00) return true; // multicast ff00::/8
  return false;
}

function looksIPv6(host: string): boolean {
  return host.includes(":") || (host.startsWith("[") && host.endsWith("]"));
}

/**
 * Validates a single URL. Call this on the submitted URL and again on every redirect target.
 */
export function checkUrl(input: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: "invalid_url", message: "That does not look like a web address." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      reason: "unsupported_protocol",
      message: `Phone Shepherd can only open http and https links, not ${url.protocol.replace(":", "")}.`
    };
  }

  // Credentials in the URL are a redirect/proxy abuse vector and are never needed here.
  if (url.username || url.password) {
    return {
      ok: false,
      reason: "embedded_credentials",
      message: "Links with a username or password in them are not opened."
    };
  }

  const host = url.hostname.toLowerCase();
  if (!host) {
    return { ok: false, reason: "missing_hostname", message: "That web address has no site name." };
  }

  if (BLOCKED_HOSTNAMES.has(host) || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { ok: false, reason: "blocked_hostname", message: "That address points somewhere private, so it was not opened." };
  }

  if (looksIPv6(host)) {
    if (isPrivateIPv6(host)) {
      return { ok: false, reason: "private_address", message: "That address points to a private network, so it was not opened." };
    }
    return { ok: true, url };
  }

  if (isAmbiguousNumericHost(host)) {
    return {
      ok: false,
      reason: "private_address",
      message: "That address is written in a form Phone Shepherd will not open."
    };
  }

  const ipv4 = parseIPv4(host);
  if (ipv4) {
    if (isPrivateIPv4(ipv4)) {
      return { ok: false, reason: "private_address", message: "That address points to a private network, so it was not opened." };
    }
    return { ok: true, url };
  }

  return { ok: true, url };
}

/**
 * Optional second line of defence: when a resolver is available, confirm the hostname does not
 * resolve into a private range. Supabase's Edge runtime does not expose Deno.resolveDns, so this
 * is best-effort and the literal checks above remain the primary control.
 */
export async function checkResolvedAddresses(
  hostname: string,
  resolve?: (host: string) => Promise<string[]>
): Promise<UrlCheck | null> {
  if (!resolve) return null;
  let addresses: string[];
  try {
    addresses = await resolve(hostname);
  } catch {
    return null; // Resolution unavailable; fall back to literal checks.
  }
  for (const address of addresses) {
    if (looksIPv6(address)) {
      if (isPrivateIPv6(address)) {
        return { ok: false, reason: "private_address", message: "That site resolves to a private network address." };
      }
      continue;
    }
    const parts = parseIPv4(address);
    if (parts && isPrivateIPv4(parts)) {
      return { ok: false, reason: "private_address", message: "That site resolves to a private network address." };
    }
  }
  return null;
}
