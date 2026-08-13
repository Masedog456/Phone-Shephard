-- Unified Memory Retrieval V1: semantic index over library_items.
--
-- Mirrors asset_embeddings deliberately. A dedicated table (rather than a generalized
-- polymorphic one) keeps ON DELETE CASCADE on both sides: an embedding can never outlive the
-- content it describes, which is a privacy property here and not merely tidiness.
--
-- Purely additive. Nothing existing is altered, so the working screenshot path
-- (asset_embeddings / search_assets / analyze-assets / delete-analysis) is untouched.

create table if not exists public.library_item_embeddings (
  library_item_id uuid primary key references public.library_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Null until a real vector exists. A failed attempt must never write a placeholder here.
  embedding vector(1536),

  -- The labelled document that was embedded, retained so an index can be explained and audited.
  search_text text,

  -- pending  : row exists, no usable vector yet
  -- indexed  : vector present and current for source_fingerprint
  -- failed   : provider or persistence failure; retryable
  -- stale    : content changed since indexing; old vector kept but excluded from search
  status text not null default 'pending'
    check (status in ('pending', 'indexed', 'failed', 'stale')),

  failure_reason text,
  attempts integer not null default 0,

  -- Hash of the composed index text. Lets staleness be detected without re-embedding.
  source_fingerprint text,

  -- Recorded so a future model change can be detected and re-indexed rather than silently
  -- mixing incompatible vector spaces in one index.
  model text,

  indexed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Vector index for cosine similarity, matching the screenshot index's configuration so both
-- stores behave the same way at query time.
create index if not exists library_item_embeddings_vector_idx
  on public.library_item_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Drives the backfill queue: "which of this user's items still need work?"
create index if not exists library_item_embeddings_user_status_idx
  on public.library_item_embeddings (user_id, status);

alter table public.library_item_embeddings enable row level security;

-- SELECT-only, exactly like asset_embeddings: a derived index is written by trusted server code
-- (service role) and only ever read by its owner.
create policy "Users can read own library embeddings"
  on public.library_item_embeddings
  for select
  using (auth.uid() = user_id);

-- Semantic search over Library items.
--
-- SECURITY INVOKER (the default): it runs as the caller and filters on auth.uid(), so it must be
-- invoked with the user's client. Archived items are excluded here as well as in the lexical
-- path, so no caller can accidentally surface them.
create or replace function public.search_library_items(
  query_embedding vector(1536),
  match_count int default 20
)
returns table (
  library_item_id uuid,
  similarity float,
  search_text text
)
language sql
stable
as $$
  select
    lie.library_item_id,
    1 - (lie.embedding <=> query_embedding) as similarity,
    lie.search_text
  from public.library_item_embeddings lie
  join public.library_items li on li.id = lie.library_item_id
  where lie.user_id = auth.uid()
    and li.user_id = auth.uid()
    and lie.status = 'indexed'
    and lie.embedding is not null
    and li.status = 'active'
  order by lie.embedding <=> query_embedding
  limit match_count;
$$;

-- Content edits arrive from three different writers, including the client updating user_note
-- directly. Marking the row stale in the database is the only place that catches all of them, and
-- it keeps a served vector from describing text that no longer exists.
create or replace function public.mark_library_embedding_stale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.title is distinct from old.title)
     or (new.summary is distinct from old.summary)
     or (new.user_note is distinct from old.user_note)
     or (new.extracted_text is distinct from old.extracted_text)
     or (new.keywords is distinct from old.keywords)
  then
    -- Only demote a row that currently claims to be current. A pending or failed row is already
    -- queued for work, and overwriting its state would lose the failure reason.
    update public.library_item_embeddings
      set status = 'stale', updated_at = now()
      where library_item_id = new.id
        and status = 'indexed';
  end if;
  return new;
end;
$$;

drop trigger if exists library_items_embedding_staleness on public.library_items;

create trigger library_items_embedding_staleness
  after update on public.library_items
  for each row
  execute function public.mark_library_embedding_stale();

comment on table public.library_item_embeddings is
  'Derived semantic index over library_items. Content lives in library_items; this table is rebuildable and cascade-deletes with its item.';
comment on column public.library_item_embeddings.status is
  'pending | indexed | failed | stale. Only "indexed" rows are returned by search_library_items.';
