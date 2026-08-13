# Deletion and privacy behaviour

Last updated: stabilization sprint, August 2026.

Phone Shepherd has **one** deletion concept today. This document states exactly what it does,
what it deliberately does not do, and why. If the user-facing copy and this document ever
disagree, the copy is wrong and must be corrected — not the other way around.

## The one deletion control

**Where:** Settings → Privacy → *Delete screenshot AI analysis*
**Backend:** `supabase/functions/delete-analysis`
**Core logic:** `supabase/functions/_shared/deleteScreenshotAnalysis.ts`

### What it removes

| Table | Operation | Why |
| --- | --- | --- |
| `asset_embeddings` | delete, scoped to `user_id` | The semantic search index derived from screenshot analysis. |
| `asset_ai_analysis` | delete, scoped to `user_id` | Summaries, categories, extracted text, reasons, sensitivity findings. |
| `media_assets` | `is_sensitive → false`, scoped to `user_id` | A conclusion derived from the analysis being deleted. Leaving it would keep a stale judgement about screenshots whose analysis is gone. |

Deletion order is `asset_embeddings` → `asset_ai_analysis` → `media_assets`. The embedding index
is removed first so the derived index never outlives the analysis rows it points at. Neither
delete depends on the other via a foreign key, so the ordering is safe in both directions; it is
fixed for determinism.

### What it deliberately keeps

The following contain user-owned data and are **not** touched by this control. They are listed in
code as `RETAINED_TABLES` so the promise is reviewable rather than implied:

- `media_assets` rows themselves — the screenshots stay on the device and their records remain
- `library_items` — everything saved to the Universal Library
- `transformations` — everything Shepherd created
- `transformation_feedback` — useful / not useful ratings
- `shepherd_reminders` — scheduled reminders
- `review_actions` — the keep/archive/delete audit trail
- `weekly_summaries`
- `user_settings`

**There is no account-deletion or delete-everything feature.** If one is added later it must be a
separate control with its own copy, and it must handle Storage (see below) and `auth.users`.

### Storage objects

Not involved. The `user-assets` bucket and its ownership policies exist
(`supabase/migrations/002_storage_policies.sql`), but `media_assets.storage_path` and
`thumbnail_path` are never written by any code path in the app — screenshots are resized in
memory and sent to the analysis function as data URLs; originals are never uploaded. There are
therefore no Storage objects for this control to delete.

**If original uploads are ever implemented, this control must be revisited**, because analysis
deletion would then need to remove the derived files it created.

### Cross-user isolation

`delete-analysis` runs with the service-role client, which bypasses RLS. Every statement is
therefore explicitly scoped with `.eq("user_id", userId)`, and the helper refuses to run at all
when the user id is empty. `deleteScreenshotAnalysis.test.ts` asserts that every recorded
statement is scoped to the calling user.

### Failure behaviour

The previous implementation issued three statements without checking any of their results and
always returned `{ ok: true }`. A failed delete was reported to the user as a completed one.

Now:

- Each step's error is checked. The first failure aborts the sequence.
- The function returns HTTP 500 with `ok: false`, a specific message, and a per-step breakdown.
- When a later step fails, the message states what *did* succeed — for example
  *"Semantic index was removed, but the analysis records could not be deleted: …"* — rather than
  implying nothing happened.
- The client (`deleteAnalysis` in `src/lib/api.ts`) reads the Edge Function's JSON body so the
  specific reason reaches the user, instead of the generic
  "Edge Function returned a non-2xx status code".
- The UI only shows the success confirmation when the call resolves. Any failure shows
  *"Shepherd could not finish deleting"* with the specific reason.

Partial deletion is never reported as success.

## User-facing copy

The copy was previously broader than the behaviour. *"This removes stored summaries, memory
links, and analysis notes"* reasonably reads as covering the Library — Shepherd's own retrieval
feature is called **Ask Your Memory** — when in fact Library items, transformations, feedback and
reminders all survive.

The intended feature is narrow, so the copy was narrowed to match rather than the deletion being
widened. Deleting the Library to satisfy vague wording would have destroyed data the user never
asked to lose.

| Surface | Before | After |
| --- | --- | --- |
| Button | Delete AI analysis data | Delete screenshot AI analysis |
| Confirm title | Ask Shepherd to forget? | Delete screenshot analysis? |
| Confirm body | This removes stored summaries, memory links, and analysis notes. | Names the four things removed (summaries, categories, sensitivity flags, search index) and states that screenshots, Library, creations and reminders are unaffected. |
| Success | *(none — nothing was shown)* | Screenshot analysis deleted, restating what was kept. |
| Failure | Shepherd could not forget yet | Shepherd could not finish deleting, with the specific reason. |

A permanent note under the button restates what is retained, so the scope is visible without
opening the dialog.
