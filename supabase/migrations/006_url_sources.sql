-- Source Intake V1: first-class provenance for externally fetched sources.
--
-- These columns extend the EXISTING library_items table rather than creating a new sources
-- table. Ask Your Memory already reads library_items, so keeping sources here avoids a second
-- retrieval island; a separate table would have required a union at query time and a second
-- RLS surface for no user-visible benefit.
--
-- Every column below exists because a specific behaviour in this sprint needs it. Fields that
-- sounded useful but had no consumer (source_type, separate site_name, word_count) were left
-- out: content_type already carries the kind of thing, and the domain is derived from
-- canonical_url and stored in the existing `source` column so lexical retrieval sees it.

alter table public.library_items
  -- Stable identity after tracking parameters are removed and rel=canonical is honoured.
  -- Enables duplicate detection across differently-decorated links to the same page.
  add column if not exists canonical_url text,

  -- Deterministic identity of the READ TEXT (not the raw HTML), so a page whose ads changed is
  -- still recognised as the same content, and a page whose article changed is not.
  add column if not exists content_hash text,

  -- The actual words recovered from the source. Kept strictly separate from `summary`, which is
  -- AI-generated, and from `user_note`, which is authored by the person. This separation is what
  -- lets future UI answer "where did this claim come from?".
  add column if not exists extracted_text text,

  -- Honest reporting for paywalled, blocked, login-walled and script-rendered pages.
  add column if not exists extraction_status text not null default 'not_applicable',

  -- Machine-readable failure cause, so the UI can explain and a retry can be judged.
  add column if not exists extraction_reason text,

  -- When the server actually retrieved the page. Distinct from captured_at (when the user asked
  -- for it) and from published_at (when the source says it was written).
  add column if not exists fetched_at timestamptz,

  -- Publication date claimed by the source's own metadata. Nullable and untrusted-but-recorded.
  add column if not exists published_at timestamptz,

  -- The person's own words. Never written by AI, never overwritten by AI.
  add column if not exists user_note text;

alter table public.library_items
  drop constraint if exists library_items_extraction_status_check;

alter table public.library_items
  add constraint library_items_extraction_status_check
  check (extraction_status in ('not_applicable', 'pending', 'extracted', 'partial', 'failed'));

-- Duplicate lookups are per user and hit these two keys. Deliberately NOT unique: a re-capture
-- of changed content must be allowed to create a new row rather than being silently discarded.
create index if not exists library_items_user_canonical_url_idx
  on public.library_items (user_id, canonical_url)
  where canonical_url is not null;

create index if not exists library_items_user_content_hash_idx
  on public.library_items (user_id, content_hash)
  where content_hash is not null;

comment on column public.library_items.extracted_text is
  'Text recovered from the external source. Source-authored. Never AI-generated.';
comment on column public.library_items.summary is
  'AI-generated summary. Never present it as source text.';
comment on column public.library_items.user_note is
  'Authored by the user. Never written or modified by AI.';
