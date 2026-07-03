import { create } from 'zustand'
import type { Attachment, Chat, Message, Packet, User, ViewId } from './types'
import { ME, cannedReplies, chats as seedChats, messages as seedMessages, users as seedUsers } from './lib/seed'

let idc = 1000
const uid = (p: string) => `${p}-${idc++}`

interface Prefs {
  darkComposer: boolean
  metadataMinimizer: boolean
  noTrackers: boolean
  selfDestructMonths: 0 | 1 | 3 | 6
  webPush: boolean
  soundOn: boolean
}

interface State {
  // session
  authed: boolean
  booting: boolean
  me: User

  // data
  users: Record<string, User>
  chats: Chat[]
  messages: Message[]
  online: Record<string, boolean>

  // ui
  view: ViewId
  activeChatId: string | null
  replyTo: Message | null
  searchQuery: string
  transparencyOpen: boolean
  packets: Packet[]
  connected: boolean

  prefs: Prefs

  // auth
  login: () => void
  logout: () => void

  // navigation
  setView: (v: ViewId) => void
  openChat: (id: string | null) => void
  toggleTransparency: (v?: boolean) => void
  setSearch: (q: string) => void
  setReplyTo: (m: Message | null) => void

  // messaging
  sendMessage: (chatId: string, text: string, attachments?: Attachment[]) => void
  editMessage: (id: string, text: string) => void
  deleteMessage: (id: string, forEveryone: boolean) => void
  togglePin: (id: string) => void
  react: (id: string, emoji: string) => void
  markRead: (chatId: string) => void
  setDraft: (chatId: string, draft: string) => void

  // prefs
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void
  exportData: () => string

  // internal
  _log: (p: Omit<Packet, 'id' | 'ts'>) => void
}

// Approximate encoded size of a protobuf-ish payload
const sizeOf = (text: string, atts?: Attachment[]) =>
  18 + new TextEncoder().encode(text).length + (atts?.length ?? 0) * 46

export const useStore = create<State>((set, get) => ({
  authed: false,
  booting: false,
  me: seedUsers[ME],

  users: seedUsers,
  chats: seedChats,
  messages: seedMessages,
  online: { anna: true, marcus: true, lena: false, omar: true },

  view: 'chats',
  activeChatId: null,
  replyTo: null,
  searchQuery: '',
  transparencyOpen: false,
  packets: [],
  connected: true,

  prefs: {
    darkComposer: false,
    metadataMinimizer: true,
    noTrackers: true,
    selfDestructMonths: 3,
    webPush: true,
    soundOn: true,
  },

  login: () => {
    set({ booting: true })
    // Cold start < 1.5s (About.pdf) — simulate the WASM/bundle warm-up
    setTimeout(() => {
      set({ authed: true, booting: false })
      get()._log({ dir: 'out', op: 'ws.open', bytes: 24, summary: 'Binary WebSocket established', encrypted: true, latencyMs: 41 })
      get()._log({ dir: 'in', op: 'sync.delta', bytes: 512, summary: 'Top-20 chats hydrated (delta)', encrypted: true, latencyMs: 96 })
    }, 1400)
  },

  logout: () => set({ authed: false, activeChatId: null, view: 'chats' }),

  setView: (v) => set({ view: v, transparencyOpen: v === 'transparency' ? true : get().transparencyOpen }),
  openChat: (id) => {
    set({ activeChatId: id, replyTo: null })
    if (id) get().markRead(id)
  },
  toggleTransparency: (v) => set((s) => ({ transparencyOpen: v ?? !s.transparencyOpen })),
  setSearch: (q) => set({ searchQuery: q }),
  setReplyTo: (m) => set({ replyTo: m }),

  sendMessage: (chatId, text, attachments) => {
    const t = text.trim()
    if (!t && !(attachments && attachments.length)) return
    const id = uid('m')
    const replyToId = get().replyTo?.id
    const msg: Message = {
      id,
      chatId,
      authorId: ME,
      text: t,
      createdAt: Date.now(),
      status: 'sending', // Optimistic UI — appears immediately
      replyToId,
      attachments,
    }
    set((s) => ({ messages: [...s.messages, msg], replyTo: null }))
    get()._log({ dir: 'out', op: 'msg.send', bytes: sizeOf(t, attachments), summary: `→ ${chatId} · optimistic`, encrypted: true })

    // Instant delivery guarantee (<200ms) — ack over the binary channel
    const latency = 60 + Math.floor(Math.random() * 120)
    setTimeout(() => {
      set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, status: 'delivered' } : m)) }))
      get()._log({ dir: 'in', op: 'msg.ack', bytes: 12, summary: `ack ${id.slice(-4)}`, encrypted: true, latencyMs: latency })
    }, latency)
    // read receipt a moment later
    setTimeout(() => {
      set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, status: 'read' } : m)) }))
    }, latency + 700)

    // Canned reply + typing from the other party (dm only)
    const chat = get().chats.find((c) => c.id === chatId)
    if (chat && chat.kind === 'dm') {
      const other = chat.members.find((u) => u !== ME)!
      if (!get().online[other]) return
      const bank = cannedReplies[other] ?? ['👍']
      const reply = bank[Math.floor(Math.random() * bank.length)]
      const think = 700 + Math.floor(Math.random() * 1400)
      setTimeout(() => set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, typing: true } : c)) })), 400)
      setTimeout(() => {
        set((s) => ({
          chats: s.chats.map((c) => (c.id === chatId ? { ...c, typing: false } : c)),
          messages: [
            ...s.messages,
            {
              id: uid('m'),
              chatId,
              authorId: other,
              text: reply,
              createdAt: Date.now(),
              status: get().activeChatId === chatId ? 'read' : 'delivered',
            } as Message,
          ],
        }))
        get()._log({ dir: 'in', op: 'msg.recv', bytes: sizeOf(reply), summary: `← ${other}`, encrypted: true, latencyMs: 88 })
      }, 400 + think)
    }
  },

  editMessage: (id, text) => {
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, text: text.trim(), editedAt: Date.now() } : m)) }))
    get()._log({ dir: 'out', op: 'msg.edit', bytes: sizeOf(text), summary: `edit ${id.slice(-4)}`, encrypted: true })
  },

  deleteMessage: (id, forEveryone) => {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, deleted: true, text: '', attachments: undefined } : m)),
    }))
    get()._log({ dir: 'out', op: forEveryone ? 'msg.unsend' : 'msg.delete', bytes: 12, summary: `${forEveryone ? 'unsend' : 'delete'} ${id.slice(-4)}`, encrypted: true })
  },

  togglePin: (id) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)) })),

  react: (id, emoji) =>
    set((s) => ({
      messages: s.messages.map((m) => {
        if (m.id !== id) return m
        const reactions = { ...(m.reactions ?? {}) }
        const arr = new Set(reactions[emoji] ?? [])
        if (arr.has(ME)) arr.delete(ME)
        else arr.add(ME)
        if (arr.size === 0) delete reactions[emoji]
        else reactions[emoji] = [...arr]
        return { ...m, reactions }
      }),
    })),

  markRead: (chatId) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.chatId === chatId && m.authorId !== ME ? { ...m, status: 'read' } : m)),
    })),

  setDraft: (chatId, draft) =>
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, draft } : c)) })),

  setPref: (k, v) => set((s) => ({ prefs: { ...s.prefs, [k]: v } })),

  exportData: () => {
    const { chats, messages, users } = get()
    get()._log({ dir: 'out', op: 'data.export', bytes: 64, summary: 'Full history export (JSON)', encrypted: true })
    return JSON.stringify({ exportedAt: new Date().toISOString(), users, chats, messages }, null, 2)
  },

  _log: (p) =>
    set((s) => ({
      packets: [{ ...p, id: uid('pkt'), ts: Date.now() }, ...s.packets].slice(0, 120),
    })),
}))

// Selectors
export const selectChatMessages = (chatId: string) => (s: State) =>
  s.messages.filter((m) => m.chatId === chatId).sort((a, b) => a.createdAt - b.createdAt)

export const lastMessageOf = (chatId: string, msgs: Message[]): Message | undefined => {
  let last: Message | undefined
  for (const m of msgs) if (m.chatId === chatId) last = m
  return last
}
