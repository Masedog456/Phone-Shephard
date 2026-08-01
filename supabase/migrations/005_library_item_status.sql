alter table public.library_items
add column if not exists status text not null default 'active'
check (status in ('active', 'archived'));

create index if not exists library_items_user_status_idx
on public.library_items (user_id, status, captured_at desc);
