import { checkUrl, checkResolvedAddresses, expandIPv6, isPrivateIPv4, isPrivateIPv6, parseIPv4 } from "./urlSafety";

describe("protocol handling", () => {
  it.each(["https://example.com/a", "http://example.com/a"])("accepts %s", (url) => {
    expect(checkUrl(url).ok).toBe(true);
  });

  it.each([
    "file:///etc/passwd",
    "ftp://example.com/x",
    "gopher://example.com",
    "javascript:alert(1)",
    "data:text/html,<h1>hi</h1>"
  ])("rejects unsupported protocol %s", (url) => {
    const result = checkUrl(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(["unsupported_protocol", "invalid_url"]).toContain(result.reason);
  });

  it("rejects nonsense input", () => {
    const result = checkUrl("not a url at all");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_url");
  });

  it("rejects credentials embedded in the URL", () => {
    const result = checkUrl("https://user:pass@example.com/");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("embedded_credentials");
  });
});

describe("private and loopback addresses", () => {
  it.each([
    "http://127.0.0.1/",
    "http://127.1.1.1/",
    "http://10.0.0.5/",
    "http://10.255.255.255/",
    "http://172.16.0.1/",
    "http://172.31.255.1/",
    "http://192.168.1.1/",
    "http://0.0.0.0/",
    "http://100.64.0.1/",
    "http://198.18.0.1/",
    "http://224.0.0.1/",
    "http://255.255.255.255/"
  ])("rejects %s", (url) => {
    const result = checkUrl(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("private_address");
  });

  // The single most important case: cloud instance metadata.
  it("rejects the AWS/GCP metadata address", () => {
    expect(checkUrl("http://169.254.169.254/latest/meta-data/").ok).toBe(false);
  });

  it("rejects the GCP metadata hostname", () => {
    const result = checkUrl("http://metadata.google.internal/computeMetadata/v1/");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("blocked_hostname");
  });

  it.each(["http://localhost:3000/", "http://LOCALHOST/", "http://app.localhost/", "http://db.internal/", "http://printer.local/"])(
    "rejects blocked hostname %s",
    (url) => {
      const result = checkUrl(url);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("blocked_hostname");
    }
  );

  // The URL parser rewrites ::ffff:127.0.0.1 into hex (::ffff:7f00:1), which a dotted-quad
  // check misses. These cases pin that bypass shut.
  it.each([
    "http://[::1]/",
    "http://[::]/",
    "http://[fe80::1]/",
    "http://[fc00::1]/",
    "http://[fd00:ec2::254]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:7f00:1]/",
    "http://[::ffff:169.254.169.254]/",
    "http://[::ffff:10.0.0.1]/",
    "http://[ff02::1]/"
  ])(
    "rejects IPv6 %s",
    (url) => {
      const result = checkUrl(url);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("private_address");
    }
  );

  // Classic bypasses: the same loopback address written so a naive parser misses it.
  it.each(["http://2130706433/", "http://0x7f000001/", "http://127.1/", "http://0177.0.0.1/", "http://0x7f.0.0.1/"])(
    "rejects obfuscated numeric host %s",
    (url) => {
      const result = checkUrl(url);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("private_address");
    }
  );

  it("still accepts ordinary public addresses", () => {
    expect(checkUrl("https://93.184.216.34/").ok).toBe(true);
    expect(checkUrl("https://example.com/article").ok).toBe(true);
  });
});

describe("range helpers", () => {
  it("classifies IPv4 ranges", () => {
    expect(isPrivateIPv4([127, 0, 0, 1])).toBe(true);
    expect(isPrivateIPv4([169, 254, 169, 254])).toBe(true);
    expect(isPrivateIPv4([172, 15, 0, 1])).toBe(false); // just outside the private block
    expect(isPrivateIPv4([172, 32, 0, 1])).toBe(false);
    expect(isPrivateIPv4([8, 8, 8, 8])).toBe(false);
  });

  it("parses only strict dotted quads", () => {
    expect(parseIPv4("192.168.0.1")).toEqual([192, 168, 0, 1]);
    expect(parseIPv4("999.1.1.1")).toBeNull();
    expect(parseIPv4("1.2.3")).toBeNull();
  });

  it("classifies IPv6", () => {
    expect(isPrivateIPv6("::1")).toBe(true);
    expect(isPrivateIPv6("2606:4700:4700::1111")).toBe(false);
  });

  it("expands IPv6 including IPv4-mapped forms", () => {
    expect(expandIPv6("::1")).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(expandIPv6("::ffff:127.0.0.1")).toEqual([0, 0, 0, 0, 0, 0xffff, 0x7f00, 1]);
    expect(expandIPv6("2606:4700:4700::1111")).toEqual([0x2606, 0x4700, 0x4700, 0, 0, 0, 0, 0x1111]);
    expect(expandIPv6("not-an-address")).toBeNull();
  });

  it("treats an unparseable IPv6 literal as unsafe rather than trusting it", () => {
    expect(isPrivateIPv6("[:::::]")).toBe(true);
  });
});

describe("DNS-based second check", () => {
  it("rejects a public name that resolves into a private range", async () => {
    const result = await checkResolvedAddresses("evil.example.com", async () => ["10.0.0.7"]);
    expect(result?.ok).toBe(false);
  });

  it("allows a name that resolves publicly", async () => {
    const result = await checkResolvedAddresses("example.com", async () => ["93.184.216.34"]);
    expect(result).toBeNull();
  });

  it("falls back safely when no resolver is available", async () => {
    expect(await checkResolvedAddresses("example.com", undefined)).toBeNull();
  });

  it("falls back safely when resolution throws", async () => {
    const result = await checkResolvedAddresses("example.com", async () => {
      throw new Error("no resolver on this runtime");
    });
    expect(result).toBeNull();
  });
});
