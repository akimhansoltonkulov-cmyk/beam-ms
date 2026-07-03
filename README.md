# Beam — Messenger

**Instant. Private. Transparent.** — an independent, next-generation messenger web demo.

Beam is a high-performance web messenger built around three principles: ultimate speed
(sub-200 ms delivery, instant cold start), architectural privacy (minimal metadata, zero
trackers), and radical transparency.

![Design: black + acid lime, extreme radii, glassmorphism](Design%20Ref.png)

## Repository layout

| Path | What's inside |
|------|---------------|
| [`app/`](app/) | The web application — Vite + React + TypeScript + Zustand + Framer Motion + Tailwind |
| `About.pdf` · `Functions.pdf` · `Stack.pdf` · `User Flow.pdf` · `Design.pdf` | Product & design specification the app is built to |
| `Design Ref.png` | Visual design reference |

## Quick start

```bash
cd app
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle
```

Login with any phone number and any 4-digit code (the backend is mocked in-memory).

## Highlights

- **Engine feel** — optimistic UI, sub-200 ms delivery ticks, cold-start warm-up, delta sync
- **Messaging** — DMs & groups, replies, edit, delete/unsend, pin, reactions, drag-&-drop
  files, image/file/voice attachments with animated waveform, global search, read receipts
- **Privacy** — Metadata Minimizer, No-Trackers toggle, account self-destruct timer,
  one-click JSON data export, session management
- **Mobile-first UX** — single-column device layout, glassmorphism floating dock,
  keyboard shortcuts (Ctrl/⌘+K, Esc), PWA manifest

## Design system

Black `#000` · Acid Lime `#E1FF00` · Soft Grey `#F2F2F2`. Extreme radii (32 px cards,
100 px toggles), Inter type scale, minimalist line icons, halftone textures.

See [`app/README.md`](app/README.md) for full implementation details.

---

*Demo build — the binary WebSocket / Protobuf / Supabase backend described in the spec is
simulated in-memory so the app runs fully offline.*
