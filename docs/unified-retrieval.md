# Unified Memory Retrieval V1

## Phase 1 — Retrieval as it exists today

| Question | Answer |
| --- | --- |
| What gets embedded | Only screenshots. `analyze-assets` embeds `category + summary + extracted_text + reason + filename`. |
| Where embeddings live | `asset_embeddings`, PK `asset_id` → `media_assets(id) ON DELETE CASCADE`. |
| Model / dimension | `text-embedding-3-small`, 1536 dims, ivfflat cosine (`lists = 100`). |
| Screenshot semantic search | `search-assets` → `search_assets` RPC (SECURITY INVOKER, `where user_id = auth.uid()`), called with the **user** client so RLS applies. Rows then re-read via admin client scoped `.eq("user_id", user.id)`. |
| Library ranking | Lexical only. `memoryRanking.rankItems` over a haystack of title, summary, why_saved, source, content_type, creator, category, collection, `extracted_text` (4 000 chars), `user_note`, keywords. Weighted: title ×2, keywords ×2, note ×2, source-text ×1 extra, category boost 4. |
| Ask Your Memory context | `library_items` only, `status = 'active'`, newest 200, ranked lexically, floor `score >= 2`, top 8 to the model. |
| Retrieval failures | `createEmbedding` returns an explicit failure (never a zero vector). `search-assets` returns 503 `retryable`. Ask Your Memory has no vector path, so it cannot fail this way. |

### Two facts that shaped this sprint

1. **Screenshot vector search is orphaned.** `searchAssets` in `src/lib/api.ts` is exported but no
   screen calls it. The only retrieval a user can actually reach is Ask Your Memory — lexical,
   Library-only. Screenshots are embedded and then unreachable.
2. **`asset_embeddings` is structurally bound to `media_assets`.** `asset_id` is simultaneously the
   primary key and a cascading foreign key. That cascade is what guarantees embeddings die with
   their content.

### What would break if Library embeddings were added carelessly

- **Deletion consistency.** A polymorphic owner column cannot carry `ON DELETE CASCADE`. Deleting a
  Library item would silently orphan its vector — the same class of defect as the earlier
  `delete-analysis` privacy bug.
- **Staleness.** `library_items` is edited after creation (notes, AI summaries, title edits) from
  three different writers, including the client directly. Without invalidation, retrieval would
  serve vectors describing text that no longer exists.
- **RLS.** `asset_embeddings` has a SELECT-only policy; writes are service-role. Copying the table
  without copying that posture would let a client write vectors.
- **Row weight.** `library_items` is read on every Library load. A 1536-float column on that row
  makes every list query drag ~6 KB per item unless every `select` is audited.
- **Model drift.** Two embedding call sites with different defaults would put two incompatible
  vector spaces in one index, silently degrading similarity.

## Phase 2 — Design decision

**Chosen: a dedicated `library_item_embeddings` table mirroring `asset_embeddings`.**

Two derived indexes over the two existing content stores, merged at query time. Content still lives
in exactly two places — `media_assets` and `library_items` — so no third *knowledge* store is
created. What is unified is retrieval, which is the actual goal.

### Options considered

| Option | Verdict |
| --- | --- |
| Generalize `asset_embeddings` with `(owner_type, owner_id)` | **Rejected.** Loses `ON DELETE CASCADE` on both sides, requires migrating live screenshot vectors, and forces changes to `search_assets`, `analyze-assets` and `delete-analysis` — three recently stabilized paths. Deletion consistency is a privacy property here, not a nicety. |
| One table with two nullable FKs (`media_asset_id`, `library_item_id`) + check constraint | **Rejected, though closest on elegance.** Keeps both cascades and gives one index, but still requires migrating existing rows and rewriting the working screenshot path. The brief warns against choosing on elegance; migration risk decides it, especially as migrations are applied outside this workflow. |
| Embedding column directly on `library_items` | **Rejected.** Bloats the hot row, puts an ivfflat index on a frequently-updated wide table, and makes re-indexing rewrite the content row. |
| **Dedicated `library_item_embeddings`** | **Chosen.** Purely additive. Real cascade. Proven RLS posture. Narrow table for the vector index. Symmetric with `search_assets`, so retrieval code is parallel rather than special-cased. Any future media that becomes a Library item is covered automatically. |

## Phase 3 — Embedding contract

One contract, four states, enforced in `_shared/libraryIndexer.ts`:

| State | Meaning |
| --- | --- |
| `pending` | Row exists, no usable vector yet. Never returned by search. |
| `indexed` | Vector present and current for `source_fingerprint`. |
| `failed` | Provider or persistence failure. `failure_reason` + `attempts` recorded. Retryable. |
| `stale` | Content changed since indexing. Old vector retained but excluded from search. |

Guarantees, all covered by tests:

- Never a fabricated vector — `createEmbedding` already refuses zero vectors and all-zero provider responses.
- A failed embedding **never overwrites a valid one**: on failure only status/reason/attempts change; the `embedding` column is left untouched.
- Persistence never depends on indexing. Items save first; indexing is a separate step.
- `status` never reports `indexed` unless a vector was actually written.
- `source_fingerprint` makes staleness detectable without re-embedding, and a DB trigger marks rows stale on content change so client-side edits are caught too.

## Phase 4 — What becomes searchable

`buildIndexText` composes a **labelled** document — not a blind concatenation:

```
Title: …
Source: … (domain / origin)
Keywords: …
From the source: …      (extracted_text, capped)
From the user: …        (user_note, capped)
Shepherd's summary: …   (summary, capped)
```

The embedding represents combined meaning, but the labels survive in `search_text`, and — critically
— **retrieval reads provenance from the item row, never from the index**. Ask Your Memory still emits
`fromTheSource` / `fromTheUser` / `fromShepherdAI` from `library_items`, so authorship can never be
lost or confused by the index.

Per-channel caps keep one long page from crowding out the user's own note.

## Phase 7 — Hybrid ranking

Lexical is **not** replaced. Names, exact phrases, URLs and rare identifiers match lexically far
better than semantically.

Deterministic merge, no randomness, no model call:

1. Run lexical ranking (unchanged) and semantic search independently.
2. Normalize each to 0–1 within its own result set.
3. Fuse: `0.55 × lexical + 0.45 × semantic`, plus a small bonus when both agree, which is the
   strongest evidence available.
4. Deduplicate by `(kind, id)` so an item found by both paths appears once.
5. Sort by fused score, then recency, then id — fully deterministic.

Semantic failure degrades to lexical-only rather than erroring; the response reports which paths ran.

## Phase 8 — Screenshot bridge

Screenshots and Library items are retrieved through their own indexes and merged into one ranked
list. Each carries an explicit `kind` (`screenshot` | `library`) all the way to the model, with its
own provenance shape. A screenshot is never described as a webpage or vice versa.

## Phase 10 — Security posture

- Both RPCs are SECURITY INVOKER and filter on `auth.uid()`; both are called with the **user** client.
- `library_item_embeddings` gets a SELECT-only RLS policy; writes are service-role only, matching `asset_embeddings`.
- Every service-role read is additionally scoped `.eq("user_id", …)`.
- Archived Library items are excluded in the RPC *and* in the lexical path.
- Embeddings cascade-delete with their content; `delete-analysis` continues to clear screenshot vectors.
- Logs record ids, counts and reasons — never memory text.

## Operations (handled outside this workflow)

Nothing here was applied or deployed. This branch only produces reviewed code.

### Migration to apply

`supabase/migrations/007_library_item_embeddings.sql`

- **Purpose:** create `library_item_embeddings`, its ivfflat + status indexes, its SELECT-only RLS
  policy, the `search_library_items` RPC, and the staleness trigger on `library_items`.
- **Backward compatibility:** additive only. No existing table, column, policy, function or index is
  altered or dropped. `library_items` gains a trigger but no schema change.
- **Rollback:** drop the trigger, the function `mark_library_embedding_stale`, the RPC
  `search_library_items`, and the table. No data loss outside the derived index, which is rebuildable.
- **Order:** apply after `006_url_sources.sql` — the trigger references `extracted_text` and
  `user_note`, which 006 adds.
- **Before it is applied:** `ask-memory` calls `search_library_items` and tolerates the RPC being
  missing. It logs the failure and falls back to lexical-only, so deploying the function before the
  migration degrades reach but does not break Ask Your Memory. A runtime test covers this.

### Functions to deploy

| Function | Why |
| --- | --- |
| `ask-memory` | **Changed** — hybrid retrieval, screenshot bridge, explicit user scoping |
| `ingest-url` | **Changed** — indexes after persisting |
| `index-library` | **New** — single-item indexing and bounded backfill |

`analyze-assets`, `search-assets`, `delete-analysis`, `transform-capture`, `apply-action` and
`weekly-summary` are unchanged.

### Backfill after migrating

Existing Library items have no embedding. Migration does **not** embed anything — embedding inside a
schema migration would hold a transaction open across hundreds of network calls.

Instead, call `index-library` with `{ "batch": true }` repeatedly until `hasMore` is `false`.
Each call is bounded (default 10, max 25), idempotent, and resumable: an item is only finished once
it is `indexed` with a matching fingerprint, so an interrupted run simply leaves work for the next
call. A provider outage stops the batch early rather than burning the quota.

Until an item is indexed it remains fully retrievable lexically, so the backfill can proceed at
whatever pace cost allows without degrading the product.
