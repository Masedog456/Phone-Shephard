create type public.shepherd_task_source as enum (
  'photos',
  'screenshots',
  'tabs',
  'notes',
  'saved_posts',
  'documents',
  'receipts',
  'links',
  'reminders',
  'custom'
);

create type public.shepherd_task_action as enum (
  'review',
  'delete',
  'archive',
  'save',
  'categorize',
  'summarize',
  'remind_later'
);

create type public.shepherd_task_status as enum ('ready', 'coming_soon', 'custom');

create table public.shepherd_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null,
  ai_instruction text not null,
  source public.shepherd_task_source not null default 'custom',
  action public.shepherd_task_action not null default 'review',
  status public.shepherd_task_status not null default 'custom',
  cadence text not null default 'manual',
  is_default boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shepherd_task_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.shepherd_tasks(id) on delete cascade,
  title text not null,
  source_label text not null,
  preview text not null,
  suggested_action public.shepherd_task_action not null default 'review',
  reason text,
  is_sensitive boolean not null default false,
  integration_status text not null default 'mock',
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index shepherd_tasks_user_idx on public.shepherd_tasks (user_id, source, status);
create index shepherd_task_results_user_task_idx on public.shepherd_task_results (user_id, task_id);

alter table public.shepherd_tasks enable row level security;
alter table public.shepherd_task_results enable row level security;

create policy "Users can manage own shepherd tasks"
on public.shepherd_tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own shepherd task results"
on public.shepherd_task_results
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
