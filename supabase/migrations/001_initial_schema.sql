create extension if not exists vector;
create extension if not exists pgcrypto;

create type public.asset_type as enum ('photo', 'screenshot', 'video', 'unknown');
create type public.asset_status as enum ('active', 'archived', 'deleted_pending', 'deleted', 'ignored');
create type public.category_type as enum (
  'recipe',
  'travel',
  'shopping',
  'bill',
  'note',
  'password',
  'social',
  'receipt',
  'memory',
  'other'
);
create type public.suggested_action as enum ('delete', 'archive', 'save_category', 'keep', 'review_sensitive');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  scan_scope text not null default 'screenshots_30_days',
  sensitive_detection_enabled boolean not null default true,
  upload_originals_enabled boolean not null default false,
  weekly_reset_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_asset_id text not null,
  asset_type public.asset_type not null default 'unknown',
  status public.asset_status not null default 'active',
  storage_path text,
  thumbnail_path text,
  filename text,
  mime_type text,
  width int,
  height int,
  file_size_bytes bigint,
  captured_at timestamptz,
  imported_at timestamptz not null default now(),
  perceptual_hash text,
  blur_score numeric,
  is_sensitive boolean not null default false,
  unique (user_id, device_asset_id)
);

create table public.asset_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category public.category_type not null default 'other',
  confidence numeric not null default 0,
  summary text,
  extracted_text text,
  suggested_action public.suggested_action not null default 'keep',
  reason text,
  contains_credentials boolean not null default false,
  contains_financial_info boolean not null default false,
  contains_personal_info boolean not null default false,
  model text,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.asset_embeddings (
  asset_id uuid primary key references public.media_assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  embedding vector(1536),
  search_text text,
  updated_at timestamptz not null default now()
);

create table public.asset_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_type text not null,
  title text,
  estimated_savings_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create table public.asset_group_members (
  group_id uuid references public.asset_groups(id) on delete cascade,
  asset_id uuid references public.media_assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank int not null default 0,
  primary key (group_id, asset_id)
);

create table public.review_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid references public.media_assets(id) on delete set null,
  action text not null,
  previous_status public.asset_status,
  new_status public.asset_status,
  storage_saved_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create table public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  photos_taken int not null default 0,
  screenshots_saved int not null default 0,
  reviewed_count int not null default 0,
  cleaned_count int not null default 0,
  storage_cleaned_bytes bigint not null default 0,
  suggested_review_count int not null default 0,
  summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider text,
  status text not null default 'free',
  product_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scan_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued',
  scope text,
  total_assets int not null default 0,
  processed_assets int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );

  insert into public.user_settings (user_id)
  values (new.id);

  insert into public.subscriptions (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create index media_assets_user_status_idx on public.media_assets (user_id, status);
create index media_assets_user_type_idx on public.media_assets (user_id, asset_type);
create index media_assets_hash_idx on public.media_assets (user_id, perceptual_hash);
create index asset_ai_analysis_user_category_idx on public.asset_ai_analysis (user_id, category);
create index asset_embeddings_vector_idx on public.asset_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.media_assets enable row level security;
alter table public.asset_ai_analysis enable row level security;
alter table public.asset_embeddings enable row level security;
alter table public.asset_groups enable row level security;
alter table public.asset_group_members enable row level security;
alter table public.review_actions enable row level security;
alter table public.weekly_summaries enable row level security;
alter table public.subscriptions enable row level security;
alter table public.scan_jobs enable row level security;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can manage own settings" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own assets" on public.media_assets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can read own analysis" on public.asset_ai_analysis for select using (auth.uid() = user_id);
create policy "Users can read own embeddings" on public.asset_embeddings for select using (auth.uid() = user_id);
create policy "Users can manage own groups" on public.asset_groups for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own group members" on public.asset_group_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own review actions" on public.review_actions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can read own weekly summaries" on public.weekly_summaries for select using (auth.uid() = user_id);
create policy "Users can read own subscription" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can manage own scan jobs" on public.scan_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.search_assets(
  query_embedding vector(1536),
  match_count int default 20,
  filter_category public.category_type default null
)
returns table (
  asset_id uuid,
  similarity float,
  search_text text
)
language sql
stable
as $$
  select
    ae.asset_id,
    1 - (ae.embedding <=> query_embedding) as similarity,
    ae.search_text
  from public.asset_embeddings ae
  left join public.asset_ai_analysis aa on aa.asset_id = ae.asset_id
  where ae.user_id = auth.uid()
    and (filter_category is null or aa.category = filter_category)
  order by ae.embedding <=> query_embedding
  limit match_count;
$$;
