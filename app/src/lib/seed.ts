import type { Chat, Message, User } from '../types'

export const ME = 'me'

export const users: Record<string, User> = {
  me: {
    id: 'me',
    name: 'You',
    handle: '@you',
    avatar: '',
    color: '#000000',
    bio: 'Digital sovereignty enjoyer.',
  },
  anna: {
    id: 'anna',
    name: 'Anna Wilson',
    handle: '@anna',
    avatar: '',
    color: '#B9E36B',
    bio: 'Product designer. Coffee-driven.',
  },
  marcus: {
    id: 'marcus',
    name: 'Marcus Reed',
    handle: '@marcus',
    avatar: '',
    color: '#7FC8F8',
    bio: 'Backend @ Beam. Go & Rust.',
  },
  lena: {
    id: 'lena',
    name: 'Lena Kovac',
    handle: '@lena',
    avatar: '',
    color: '#F5A9C5',
    bio: 'Security research.',
  },
  omar: {
    id: 'omar',
    name: 'Omar Haddad',
    handle: '@omar',
    avatar: '',
    color: '#C9A7F0',
    bio: 'On the move.',
  },
  team: {
    id: 'team',
    name: 'Core Team',
    handle: '',
    avatar: '',
    color: '#0A0A0A',
  },
}

export const chats: Chat[] = [
  {
    id: 'c-anna',
    kind: 'dm',
    name: 'Anna Wilson',
    avatar: '',
    color: '#B9E36B',
    members: ['me', 'anna'],
    via: 'Via Beam',
    pinned: true,
  },
  {
    id: 'c-team',
    kind: 'group',
    name: 'Core Team',
    avatar: '',
    color: '#0A0A0A',
    members: ['me', 'anna', 'marcus', 'lena', 'omar'],
    via: '5 members',
    pinned: true,
  },
  {
    id: 'c-marcus',
    kind: 'dm',
    name: 'Marcus Reed',
    avatar: '',
    color: '#7FC8F8',
    members: ['me', 'marcus'],
    via: 'Via Beam',
  },
  {
    id: 'c-lena',
    kind: 'dm',
    name: 'Lena Kovac',
    avatar: '',
    color: '#F5A9C5',
    members: ['me', 'lena'],
    via: 'Via Beam',
    muted: true,
  },
  {
    id: 'c-omar',
    kind: 'dm',
    name: 'Omar Haddad',
    avatar: '',
    color: '#C9A7F0',
    members: ['me', 'omar'],
    via: 'Via Beam',
  },
]

const now = Date.now()
const mins = (m: number) => now - m * 60_000

let seq = 0
const mk = (
  chatId: string,
  authorId: string,
  text: string,
  createdAt: number,
  extra: Partial<Message> = {},
): Message => ({
  id: `seed-${seq++}`,
  chatId,
  authorId,
  text,
  createdAt,
  status: authorId === 'me' ? 'read' : 'delivered',
  ...extra,
})

export const messages: Message[] = [
  // Anna — mirrors the design reference card
  mk('c-anna', 'anna', 'Hi! Just wanted to remind you that you have a meeting this Tuesday at 9 AM as you requested. That’s it. Have a great day! ☀️', mins(420)),
  mk('c-anna', 'me', 'Perfect, thanks Anna. Booked it.', mins(418)),
  mk('c-anna', 'anna', 'Also — the new Transparency Console mock is ready for review.', mins(180)),
  mk('c-anna', 'anna', 'Screenshots incoming 👇', mins(179)),
  mk('c-anna', 'anna', '', mins(178), {
    attachments: [
      { id: 'a1', kind: 'image', name: 'console.png', url: 'linear-gradient(135deg,#E1FF00,#0a0a0a)' },
    ],
  }),
  mk('c-anna', 'me', 'This looks incredible. Ship it.', mins(20)),

  // Core Team
  mk('c-team', 'marcus', 'Binary WS gateway is live on staging. p99 handshake shaved to 41ms.', mins(300)),
  mk('c-team', 'lena', 'Ran the metadata audit — we store literally nothing beyond delivery routing. 🔒', mins(240)),
  mk('c-team', 'omar', 'On a 3G train and it still feels instant. Optimistic UI carrying us.', mins(90)),
  mk('c-team', 'me', 'Great work everyone. Demo Friday.', mins(12)),

  // Marcus
  mk('c-marcus', 'marcus', 'Pushed the Protobuf schema v3. Deltas only now, no full re-sync.', mins(600)),
  mk('c-marcus', 'me', 'Nice, Smart Sync is the whole point.', mins(598)),
  mk('c-marcus', 'marcus', '', mins(500), {
    attachments: [{ id: 'v1', kind: 'voice', name: 'note.ogg', duration: 14, waveform: genWave(48) }],
  }),

  // Lena
  mk('c-lena', 'lena', 'Web Crypto E2EE prototype merged into the secret-chats branch.', mins(1440)),
  mk('c-lena', 'me', 'Roadmap item unlocked 🎉', mins(1438)),

  // Omar
  mk('c-omar', 'omar', 'Sending the file now, huge one.', mins(45)),
  mk('c-omar', 'omar', '', mins(44), {
    attachments: [{ id: 'f1', kind: 'file', name: 'beam-brand-kit.zip', size: 48_400_000 }],
  }),
  mk('c-omar', 'me', 'Got it — download was instant. 🤝', mins(40)),
]

function genWave(n: number): number[] {
  // deterministic pseudo waveform so SSR/first paint is stable
  const out: number[] = []
  let s = 7
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280
    const r = s / 233280
    out.push(0.25 + Math.abs(Math.sin(i * 0.7)) * 0.55 * (0.6 + r * 0.4))
  }
  return out
}

// Canned replies used by the mock realtime engine when you message someone
export const cannedReplies: Record<string, string[]> = {
  anna: ['On it! 👍', 'Love that.', 'Give me two minutes.', 'Sending it over now.'],
  marcus: ['Deploying.', 'Numbers look good.', 'Checking the logs…', 'Fixed on my end.'],
  lena: ['Audited & clean.', 'No metadata leak there.', 'E2EE handles that.'],
  omar: ['🔥', 'On the move, will reply properly soon.', 'Received!'],
}
