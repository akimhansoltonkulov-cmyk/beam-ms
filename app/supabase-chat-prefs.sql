-- Beam · per-user chat preferences (pin / archive / block)
-- Run once in Supabase → SQL Editor.
--
-- Pin/archive/block are per-viewer, not shared chat state — blocking a
-- peer or archiving a chat should never affect what the other side sees.
-- One row per (user, chat) holds the viewer's own flags.

create table if not exists public.chat_prefs (
  user_id    text not null,
  chat_id    text not null,
  pinned     boolean not null default false,
  archived   boolean not null default false,
  blocked    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, chat_id)
);

create index if not exists chat_prefs_user_idx on public.chat_prefs (user_id);

-- Row Level Security (demo-permissive: the app uses the anon publishable key).
-- Tighten these once you wire real Supabase Auth (auth.uid()).
alter table public.chat_prefs enable row level security;

drop policy if exists "chat_prefs_select" on public.chat_prefs;
create policy "chat_prefs_select" on public.chat_prefs for select using (true);

drop policy if exists "chat_prefs_insert" on public.chat_prefs;
create policy "chat_prefs_insert" on public.chat_prefs for insert with check (true);

drop policy if exists "chat_prefs_update" on public.chat_prefs;
create policy "chat_prefs_update" on public.chat_prefs for update using (true);

drop policy if exists "chat_prefs_delete" on public.chat_prefs;
create policy "chat_prefs_delete" on public.chat_prefs for delete using (true);

-- Enable Realtime broadcast so a pin/archive/block applied on one device
-- shows up immediately on another signed-in device.
alter table public.chat_prefs replica identity full;
do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_prefs;
  exception when duplicate_object then
    null; -- already added
  end;
end $$;
