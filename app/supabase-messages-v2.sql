-- Beam · messaging v2 — attachments + reactions sync + media storage
-- Run once in Supabase → SQL Editor (after supabase-messages.sql).

-- 1) New columns on messages
alter table public.messages add column if not exists attachments jsonb;
alter table public.messages add column if not exists reactions   jsonb;

-- 2) Public Storage bucket for media (images, files, voice notes)
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- 3) Storage policies (demo-permissive; the app uses the anon publishable key)
drop policy if exists "media_read"  on storage.objects;
create policy "media_read"  on storage.objects for select using (bucket_id = 'media');

drop policy if exists "media_write" on storage.objects;
create policy "media_write" on storage.objects for insert with check (bucket_id = 'media');

drop policy if exists "media_update" on storage.objects;
create policy "media_update" on storage.objects for update using (bucket_id = 'media');
