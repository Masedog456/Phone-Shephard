import { safeFetchHtml } from "./safeFetch";

function html(body: string, headers: Record<string, string> = {}) {
  return new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8", ...headers } });
}

function redirect(to: string, status = 302) {
  return new Response(null, { status, headers: { location: to } });
}

describe("happy path", () => {
  it("fetches a public page and returns its HTML", async () => {
    const result = await safeFetchHtml("https://example.com/a", {
      fetchImpl: async () => html("<html><body><p>Hello</p></body></html>")
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.html).toContain("Hello");
      expect(result.finalUrl).toBe("https://example.com/a");
      expect(result.status).toBe(200);
    }
  });

  it("requests with manual redirect handling and a GET", async () => {
    let seen: RequestInit | undefined;
    await safeFetchHtml("https://example.com/a", {
      fetchImpl: async (_url, init) => {
        seen = init as RequestInit;
        return html("<p>ok</p>");
      }
    });
    expect(seen?.method).toBe("GET");
    // Automatic redirect following would defeat the per-hop address checks.
    expect(seen?.redirect).toBe("manual");
  });
});

describe("redirects", () => {
  it("follows a redirect and records the chain", async () => {
    const result = await safeFetchHtml("https://example.com/start", {
      fetchImpl: async (url) =>
        String(url).endsWith("/start") ? redirect("https://example.com/final") : html("<p>Arrived</p>")
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://example.com/final");
      expect(result.redirectChain).toEqual(["https://example.com/start", "https://example.com/final"]);
    }
  });

  it("resolves a relative redirect target", async () => {
    const result = await safeFetchHtml("https://example.com/a/b", {
      fetchImpl: async (url) => (String(url).endsWith("/a/b") ? redirect("/c") : html("<p>c</p>"))
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.finalUrl).toBe("https://example.com/c");
  });

  // The reason redirects are followed manually.
  it("rejects a redirect into a private address", async () => {
    const result = await safeFetchHtml("https://example.com/start", {
      fetchImpl: async (url) =>
        String(url).includes("example.com") ? redirect("http://169.254.169.254/latest/meta-data/") : html("<p>secret</p>")
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("private_address");
  });

  it("rejects a redirect to localhost", async () => {
    const result = await safeFetchHtml("https://example.com/start", {
      fetchImpl: async (url) => (String(url).includes("example.com") ? redirect("http://localhost:8000/admin") : html("<p>x</p>"))
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("blocked_hostname");
  });

  it("rejects a redirect to an unsupported protocol", async () => {
    const result = await safeFetchHtml("https://example.com/start", {
      fetchImpl: async () => redirect("file:///etc/passwd")
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsupported_protocol");
  });

  it("gives up after too many redirects", async () => {
    let n = 0;
    const result = await safeFetchHtml("https://example.com/0", {
      maxRedirects: 3,
      fetchImpl: async () => redirect(`https://example.com/${++n}`)
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too_many_redirects");
  });

  it("rejects a redirect with no location header", async () => {
    const result = await safeFetchHtml("https://example.com/a", {
      fetchImpl: async () => new Response(null, { status: 302 })
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("http_error");
  });
});

describe("response guards", () => {
  it("rejects a non-HTML content type", async () => {
    const result = await safeFetchHtml("https://example.com/file.pdf", {
      fetchImpl: async () => new Response("%PDF-1.7", { status: 200, headers: { "content-type": "application/pdf" } })
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsupported_content_type");
  });

  it("rejects an oversized response declared by content-length", async () => {
    const result = await safeFetchHtml("https://example.com/big", {
      maxBytes: 1000,
      fetchImpl: async () => html("<p>small body but big header</p>", { "content-length": "9999999" })
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too_large");
  });

  it("rejects an oversized body even when content-length lies", async () => {
    const result = await safeFetchHtml("https://example.com/big", {
      maxBytes: 50,
      fetchImpl: async () => html("x".repeat(5000))
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too_large");
  });

  it("reports a paywall or block honestly and does not treat it as retryable", async () => {
    const result = await safeFetchHtml("https://example.com/paywalled", {
      fetchImpl: async () => new Response("nope", { status: 403, headers: { "content-type": "text/html" } })
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("http_error");
      expect(result.status).toBe(403);
      expect(result.retryable).toBe(false);
      expect(result.message).toMatch(/login|blocked/i);
    }
  });

  it("marks server errors and rate limits as retryable", async () => {
    for (const status of [500, 503, 429]) {
      const result = await safeFetchHtml("https://example.com/x", {
        fetchImpl: async () => new Response("", { status, headers: { "content-type": "text/html" } })
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.retryable).toBe(true);
    }
  });

  it("reports a timeout as a retryable timeout", async () => {
    const result = await safeFetchHtml("https://example.com/slow", {
      fetchImpl: async () => {
        const error = new Error("The operation was aborted");
        error.name = "AbortError";
        throw error;
      }
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("timeout");
      expect(result.retryable).toBe(true);
    }
  });

  it("reports a network failure without leaking internals", async () => {
    const result = await safeFetchHtml("https://example.com/x", {
      fetchImpl: async () => {
        throw new Error("ECONNREFUSED");
      }
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("network_error");
  });
});

describe("pre-flight rejection", () => {
  it("never calls fetch for a private address", async () => {
    const fetchImpl = jest.fn();
    const result = await safeFetchHtml("http://192.168.0.1/admin", { fetchImpl: fetchImpl as never });
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never calls fetch for an unsupported protocol", async () => {
    const fetchImpl = jest.fn();
    const result = await safeFetchHtml("file:///etc/passwd", { fetchImpl: fetchImpl as never });
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
