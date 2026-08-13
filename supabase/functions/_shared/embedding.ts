/**
 * Shared embedding helper.
 *
 * This module deliberately contains no Deno globals and no remote imports so it can be
 * loaded by the Edge Functions at runtime and by the Node test runner during CI.
 *
 * The important contract: a failed embedding is NEVER represented as a vector. Callers
 * receive an explicit failure and decide what to do. Returning a zero vector (the previous
 * behaviour) silently corrupted semantic search, because a zero vector is equidistant from
 * every other vector and cannot be distinguished from a real embedding once persisted.
 */

export const EMBEDDING_DIMENSIONS = 1536;

export type EmbeddingSuccess = { ok: true; embedding: number[] };

export type EmbeddingFailure = {
  ok: false;
  /** Machine-readable cause, used for logging and for deciding whether a retry makes sense. */
  reason: "not_configured" | "provider_error" | "invalid_response" | "network_error";
  message: string;
};

export type EmbeddingResult = EmbeddingSuccess | EmbeddingFailure;

export type CreateEmbeddingOptions = {
  apiKey?: string | null;
  model?: string | null;
  /** Injectable for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
};

/**
 * Requests an embedding from the provider.
 *
 * Never throws and never fabricates a vector. Every failure path returns `ok: false` so the
 * caller can skip persistence, surface a diagnosable error, and retry later.
 */
export async function createEmbedding(text: string, options: CreateEmbeddingOptions = {}): Promise<EmbeddingResult> {
  const { apiKey, model, fetchImpl = fetch } = options;

  if (!apiKey) {
    return {
      ok: false,
      reason: "not_configured",
      message: "OPENAI_API_KEY is not configured, so no embedding was generated."
    };
  }

  let response: Response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || "text-embedding-3-small",
        input: text
      })
    });
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      message: error instanceof Error ? error.message : "The embedding request could not be sent."
    };
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "<unreadable response body>";
    }
    return {
      ok: false,
      reason: "provider_error",
      message: `Embedding provider returned ${response.status}: ${detail}`
    };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    return {
      ok: false,
      reason: "invalid_response",
      message: error instanceof Error ? error.message : "The embedding response was not valid JSON."
    };
  }

  const embedding = extractEmbedding(json);
  if (!embedding) {
    return {
      ok: false,
      reason: "invalid_response",
      message: `The embedding response did not contain a ${EMBEDDING_DIMENSIONS}-dimension vector.`
    };
  }

  return { ok: true, embedding };
}

function extractEmbedding(json: unknown): number[] | null {
  const candidate = (json as { data?: Array<{ embedding?: unknown }> })?.data?.[0]?.embedding;
  if (!Array.isArray(candidate) || candidate.length !== EMBEDDING_DIMENSIONS) {
    return null;
  }
  if (!candidate.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return null;
  }
  // A response that is entirely zeroes carries no semantic signal. Treat it as a provider
  // fault rather than persisting it, which is exactly the corruption this helper prevents.
  if (candidate.every((value) => value === 0)) {
    return null;
  }
  return candidate as number[];
}
