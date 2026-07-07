-- Beam · real-time messaging schema
-- Run this once in Supabase → SQL Editor (like you did for `profiles`).

create table if not exists public.messages (
  id           text primary key,
  chat_id      text not null,
  author_id    text not null,
  recipient_id text,                       -- other DM member (null for groups) — used for inbox
  text         text not null default '',
  reply_to_id  text,
  status       text not null default 'sent',
  deleted      boolean not null default false,
  edited_at    timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists messages_chat_id_idx   on public.messages (chat_id, created_at);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at);

-- Row Level Security (demo-permissive: the app uses the anon publishable key).
-- Tighten these once you wire real Supabase Auth (auth.uid()).
alter table public.messages enable row level security;

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select using (true);

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert with check (true);

drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages for update using (true);

drop policy if exists "messages_delete" on public.messages;
create policy "messages_delete" on public.messages for delete using (true);

-- Enable Realtime broadcast of row changes for this table.
alter table public.messages replica identity full;
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then
    null; -- already added
  end;
end $$;
