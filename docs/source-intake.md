# Source Intake V1 — web URLs

Real external content enters Phone Shepherd through one path:

```
URL → validate → fetch (guarded) → extract → canonicalize → hash
    → classify duplicate → PERSIST → (optional) understand → retrieve
```

The source is persisted **before** any AI step. Understanding is opt-in and separate, so a
capture is never lost because a summary could not be produced.

## Where sources live

Sources are rows in the existing `library_items` table. They are not a separate table.

Ask Your Memory already reads `library_items`; a separate `sources` table would have needed a
union at query time and a second RLS surface, and would have created exactly the third retrieval
island this sprint was told to avoid.

## The four provenance channels

The central rule: **never store an AI summary as though it were source text.** Four channels,
four homes, four different authors:

| Channel | Column | Authored by | Rule |
| --- | --- | --- | --- |
| Source content | `extracted_text` | The external page | Never written by AI or by the user |
| Source metadata | `title`, `creator`, `published_at`, `canonical_url`, `source`, `raw_metadata.source_metadata` | The external page | Recorded as claimed; not verified |
| AI output | `summary` | Shepherd's model | Empty until the user asks. Never presented as source text |
| User reflection | `user_note` | The person | Never written or rewritten by AI |

`raw_metadata` additionally carries the fetch record — `submitted_url`, `final_url`,
`redirect_chain`, `http_status`, `content_type`, `bytes`, `word_count`, `duplicate_status` — so
future UI can answer *"where did this claim come from?"* without guessing.

Ask Your Memory receives these as `fromTheSource`, `fromTheUser` and `fromShepherdAI`, with an
instruction to attribute each correctly and never treat its own prior summary as evidence.

## Schema (migration 006)

Added to `library_items`: `canonical_url`, `content_hash`, `extracted_text`, `extraction_status`,
`extraction_reason`, `fetched_at`, `published_at`, `user_note`. Two partial indexes on
`(user_id, canonical_url)` and `(user_id, content_hash)` — deliberately **not unique**, because a
re-capture of changed content must be allowed to create a new row.

Deliberately not added: `source_type` (duplicates `content_type`), a `site_name` column (the
domain is derived and stored in the existing `source` column so lexical retrieval sees it), and
`word_count` (kept in `raw_metadata`, no query needs it).

## Retrieval

Ask Your Memory ranks lexically over `library_items`. A fetched page becomes findable because
`extracted_text` and `user_note` now participate in the haystack, with source-text and note
matches weighted so a page is retrievable by what it actually says.

**No embeddings are generated for URL sources in this sprint.** Adding vectors to `library_items`
would have begun memory unification, which is larger than this sprint and not required for the
URL flow to work. Writing vectors nothing reads would have been speculative infrastructure.

### Future consolidation path

1. Add `embedding vector(1536)` + `embedding_status` to `library_items` (same table, still no new
   island) and backfill.
2. Add a `search_library_items` RPC mirroring the existing `search_assets`, filtered on
   `auth.uid()`.
3. Make Ask Your Memory vector-first with the current lexical ranking as fallback.
4. Only then consider unifying `asset_embeddings` and `library_items` behind one retrieval API.

Steps 1–3 are additive and reversible. The embedding-failure contract from
`_shared/embedding.ts` already governs how failures must behave when that work happens: never a
fake vector, never overwrite a good one, never report success falsely, never lose the source.

## Duplicates

Nothing is ever silently discarded. Identity is `canonical_url` plus `content_hash` (FNV-1a over
the normalized extracted text, so an ad or build-hash change is not a content change).

| Case | Behaviour | Told to the user |
| --- | --- | --- |
| `new` | Insert | — |
| `identical` — same URL, same content | Refresh `fetched_at` on the existing row | "You already saved this page" |
| `content_changed` — same URL, new content | Insert a new row; `raw_metadata.previous_capture_id` links back | "This page changed since you saved it" |
| `same_content_different_url` | Insert a new row | "Same reading, different link" |

## Security

The fetch path is an SSRF sink and is treated as one. It is not a general proxy: GET only, HTML
only, no request bodies, no arbitrary headers.

- **Protocol allow-list** — `http`/`https` only.
- **Private ranges rejected** — loopback, RFC1918, link-local (including `169.254.169.254`),
  CGNAT, benchmarking, multicast, broadcast, unspecified.
- **Cloud metadata** — blocked by address and by hostname (`metadata.google.internal`).
- **IPv6** — parsed properly and expanded, including IPv4-mapped forms. This matters because the
  URL parser rewrites `::ffff:127.0.0.1` as `::ffff:7f00:1`; a dotted-quad check alone misses it.
  An unparseable IPv6 literal is treated as unsafe.
- **Obfuscated hosts** — decimal, hex and octal IP encodings are refused rather than interpreted.
- **Embedded credentials** — refused.
- **Redirects followed manually**, capped at 5, with the full address check re-applied to every
  hop, because a public URL can redirect into a private range.
- **Byte cap** — 2 MB, enforced by streaming, so an endless response is abandoned rather than
  buffered. A lying `content-length` does not defeat it.
- **Timeout** — 12 s via `AbortSignal`.
- **Content type** — HTML/XHTML/plain text only.

### Residual risk

**DNS rebinding.** The primary control is literal-address inspection. `Deno.resolveDns` is used
as a second check when the runtime provides it, but Supabase's hosted Edge runtime does not, and
a name that passes validation could still resolve to a private address at connect time. Closing
this properly needs resolve-then-connect-to-pinned-IP, which the platform's `fetch` does not
expose. Documented rather than silently accepted.

## Failure behaviour

Failures are recorded, never silent, never fabricated.

| Situation | Result |
| --- | --- |
| Paywall / login / bot block | Row saved with `extraction_status='failed'`, reason `http_error`; user's note preserved; no invented text |
| Timeout, 5xx, 429 | Recorded, marked retryable |
| Private address, bad protocol | Recorded as an attempt; never fetched |
| Thin or script-rendered page | `extraction_status='partial'`, reason `low_text_yield`; UI says it may be incomplete |
| Persist or lookup failure | Reported as retryable; no possibly-duplicate row written |

Phone Shepherd does not claim support for arbitrary sites. When too little readable text comes
back, it says so rather than presenting a near-empty capture as a success.
