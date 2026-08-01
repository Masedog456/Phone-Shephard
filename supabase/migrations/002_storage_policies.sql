insert into storage.buckets (id, name, public)
values ('user-assets', 'user-assets', false)
on conflict (id) do nothing;

create policy "Users can read own asset files"
on storage.objects
for select
using (
  bucket_id = 'user-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can upload own asset files"
on storage.objects
for insert
with check (
  bucket_id = 'user-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own asset files"
on storage.objects
for update
using (
  bucket_id = 'user-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own asset files"
on storage.objects
for delete
using (
  bucket_id = 'user-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);
