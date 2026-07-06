-- Beam · groups & channels schema
-- Run once in Supabase → SQL Editor (after supabase-messages.sql / v2).
-- Group & channel messages reuse the existing public.messages table
-- (chat_id = the group/channel id, recipient_id = null).

-- 1) Chats (groups & channels)
create table if not exists public.chats (
  id         text primary key,
  kind       text not null default 'group',   -- 'group' | 'channel'
  name       text not null default '',
  color      text not null default '#E1FF00',
  about      text,
  owner_id   text not null,
  created_at timestamptz not null default now()
);

-- 2) Membership (subscribers for channels)
create table if not exists public.chat_members (
  chat_id  text not null references public.chats(id) on delete cascade,
  user_id  text not null,
  role     text not null default 'member',    -- 'owner' | 'member'
  added_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
create index if not exists chat_members_user_idx on public.chat_members (user_id);

-- 3) Row Level Security (demo-permissive: the app uses the anon publishable key).
-- Tighten once you wire real Supabase Auth (auth.uid()).
alter table public.chats enable row level security;
drop policy if exists "chats_select" on public.chats;
create policy "chats_select" on public.chats for select using (true);
drop policy if exists "chats_insert" on public.chats;
create policy "chats_insert" on public.chats for insert with check (true);
drop policy if exists "chats_update" on public.chats;
create policy "chats_update" on public.chats for update using (true);
drop policy if exists "chats_delete" on public.chats;
create policy "chats_delete" on public.chats for delete using (true);

alter table public.chat_members enable row level security;
drop policy if exists "chat_members_select" on public.chat_members;
create policy "chat_members_select" on public.chat_members for select using (true);
drop policy if exists "chat_members_insert" on public.chat_members;
create policy "chat_members_insert" on public.chat_members for insert with check (true);
drop policy if exists "chat_members_update" on public.chat_members;
create policy "chat_members_update" on public.chat_members for update using (true);
drop policy if exists "chat_members_delete" on public.chat_members;
create policy "chat_members_delete" on public.chat_members for delete using (true);

-- 4) Enable Realtime broadcast of row changes.
alter table public.chats        replica identity full;
alter table public.chat_members replica identity full;
do $$
begin
  begin
    alter publication supabase_realtime add table public.chats;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_members;
  exception when duplicate_object then null;
  end;
end $$;
