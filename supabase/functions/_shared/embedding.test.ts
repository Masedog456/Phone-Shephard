import { createEmbedding, EMBEDDING_DIMENSIONS } from "./embedding";

function validVector() {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => (index % 7) + 0.5);
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as unknown as Response;
}

describe("createEmbedding", () => {
  it("returns a valid embedding when the provider succeeds", async () => {
    const vector = validVector();
    const result = await createEmbedding("a chicken recipe", {
      apiKey: "sk-test",
      fetchImpl: async () => jsonResponse({ data: [{ embedding: vector }] })
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.embedding).toHaveLength(EMBEDDING_DIMENSIONS);
      expect(result.embedding).toEqual(vector);
    }
  });

  it("sends the configured model and the input text", async () => {
    const seen: { url?: string; body?: string } = {};
    await createEmbedding("travel plans", {
      apiKey: "sk-test",
      model: "text-embedding-3-large",
      fetchImpl: async (url, init) => {
        seen.url = String(url);
        seen.body = String((init as RequestInit).body);
        return jsonResponse({ data: [{ embedding: validVector() }] });
      }
    });

    expect(seen.url).toContain("/v1/embeddings");
    expect(JSON.parse(seen.body ?? "{}")).toMatchObject({ model: "text-embedding-3-large", input: "travel plans" });
  });

  // The regression this whole module exists to prevent.
  it("never returns a zero vector when the API key is missing", async () => {
    const result = await createEmbedding("anything", { apiKey: undefined });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_configured");
    }
    expect(result).not.toHaveProperty("embedding");
  });

  it("never returns a zero vector when the provider errors", async () => {
    const result = await createEmbedding("anything", {
      apiKey: "sk-test",
      fetchImpl: async () => jsonResponse({ error: "rate limited" }, 429)
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("provider_error");
      expect(result.message).toContain("429");
    }
    expect(result).not.toHaveProperty("embedding");
  });

  it("reports network failure as an explicit, retryable reason", async () => {
    const result = await createEmbedding("anything", {
      apiKey: "sk-test",
      fetchImpl: async () => {
        throw new Error("socket hang up");
      }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("network_error");
      expect(result.message).toBe("socket hang up");
    }
  });

  it("rejects a wrong-dimension vector rather than persisting it", async () => {
    const result = await createEmbedding("anything", {
      apiKey: "sk-test",
      fetchImpl: async () => jsonResponse({ data: [{ embedding: [0.1, 0.2, 0.3] }] })
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_response");
  });

  it("rejects an all-zero vector returned by the provider", async () => {
    const result = await createEmbedding("anything", {
      apiKey: "sk-test",
      fetchImpl: async () => jsonResponse({ data: [{ embedding: new Array(EMBEDDING_DIMENSIONS).fill(0) }] })
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_response");
  });

  it("rejects a malformed body instead of throwing", async () => {
    const result = await createEmbedding("anything", {
      apiKey: "sk-test",
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ nope: true }) }) as unknown as Response
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_response");
  });
});
