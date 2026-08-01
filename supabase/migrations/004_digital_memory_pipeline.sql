create table public.library_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  client_id text, source text not null, content_type text not null, title text not null, creator text, source_url text,
  summary text not null default '', why_saved text, category text not null default 'other', collection_name text,
  keywords text[] not null default '{}', raw_metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(), created_at timestamptz not null default now(), unique (user_id, client_id)
);
create table public.transformations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  library_item_id uuid references public.library_items(id) on delete set null, transformation_type text not null,
  title text not null, summary text not null, output_json jsonb not null default '{}'::jsonb, model text,
  saved_to_library boolean not null default false, created_at timestamptz not null default now()
);
create table public.transformation_feedback (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  transformation_id uuid not null references public.transformations(id) on delete cascade,
  rating text not null check (rating in ('useful', 'not_useful', 'wrong_category')), created_at timestamptz not null default now(),
  unique (user_id, transformation_id)
);
create table public.shepherd_reminders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  transformation_id uuid references public.transformations(id) on delete cascade, remind_at timestamptz not null,
  message text not null, status text not null default 'scheduled', created_at timestamptz not null default now()
);
create unique index asset_ai_analysis_asset_idx on public.asset_ai_analysis (asset_id);
create index library_items_user_captured_idx on public.library_items (user_id, captured_at desc);
create index library_items_user_category_idx on public.library_items (user_id, category);
create index transformations_user_created_idx on public.transformations (user_id, created_at desc);
alter table public.library_items enable row level security;
alter table public.transformations enable row level security;
alter table public.transformation_feedback enable row level security;
alter table public.shepherd_reminders enable row level security;
create policy "Users can manage own library items" on public.library_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own transformations" on public.transformations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own transformation feedback" on public.transformation_feedback for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own reminders" on public.shepherd_reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.transformation_feedback alter column user_id set default auth.uid();
alter table public.shepherd_reminders alter column user_id set default auth.uid();
