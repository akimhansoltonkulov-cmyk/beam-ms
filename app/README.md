# Beam — Messenger (Web Demo)

Independent, next-generation messenger demo. **Instant. Private. Transparent.**

Built to the spec in the project docs (`About`, `Functions`, `Stack`, `User Flow`, `Design`).

## Stack

- **Vite + React + TypeScript** — instant builds, strict typing
- **Zustand** — lightweight state (the "heart" of the messenger)
- **Framer Motion** — screen transitions & micro-interactions
- **Tailwind CSS** — minimal CSS bundle, design tokens from `Design.pdf`

The backend (binary WebSocket / Protobuf / Supabase) is **mocked in-memory** inside
`src/store.ts` so the demo runs fully offline while faithfully simulating:
optimistic UI, <200 ms delivery acks, typing indicators, and the live packet log.

## Run

```bash
cd app
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle
```

Login: enter any phone number, then any 4-digit code.

## Supabase setup (required for real multi-user features)

Real-time messaging, contacts, presence, **groups & channels**, and calls are backed by
Supabase. Before deploying (e.g. to Vercel), run these SQL scripts once in
**Supabase → SQL Editor**, in order:

1. `supabase-messages.sql` — messages table + realtime
2. `supabase-messages-v2.sql` — attachments/reactions columns + media storage bucket
3. `supabase-groups.sql` — **groups & channels** (`chats` + `chat_members`) + realtime

You also need a `profiles` table (id, phone, name, handle, avatar, color, bio, language).
The client URL/key live in `src/lib/supabase.ts`. Real-time features work between
registered users (ids prefixed `u-`); the seed demo contacts remain local-only.

Groups and channels created in the app are stored in `chats`/`chat_members` and pushed
to every member's device over Supabase Realtime — create on one device, and members see
it (and its messages, edits, and roster changes) live on another.

## What's implemented

**Engine feel** — optimistic send, sub-200 ms delivery ticks, cold-start warm-up,
delta-sync hydration, local-first instant chat open.

**Messaging** — DMs & groups, replies, edit, delete/unsend, pin, reactions, drag-&-drop
files, image/file/voice attachments with animated waveform, global search, read receipts.

**Trust & Privacy** — **Transparency Console** (live human-readable packet audit),
Metadata Minimizer, No-Trackers toggle, Account Self-Destruct timer, one-click JSON
data export, session management.

**Web UX** — adaptive 1/2-panel layout, glassmorphism **Floating Dock**, keyboard
shortcuts (Ctrl/⌘+K search, Esc back), PWA manifest.

## Design system

Black `#000` · Acid Lime `#E1FF00` · Soft Grey `#F2F2F2`. Extreme radii (32 px cards,
100 px toggles), Inter type scale, minimalist line icons, halftone dotted textures —
all defined in `tailwind.config.js` and `src/styles/index.css`.

## Structure

```
src/
  store.ts            Zustand store + mock realtime engine + transparency log
  types.ts            domain types
  lib/                seed data, formatters, media query hook
  components/         Icons, ui primitives (Avatar/Toggle/Pill), Waveform
  screens/            Login, Sidebar, ChatWindow, MessageBubble, Composer,
                      FloatingDock, TransparencyPanel, SettingsPanel, ProfilePanel
```
