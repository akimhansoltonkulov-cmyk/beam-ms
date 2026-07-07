import { create } from 'zustand'
import type { Attachment, Chat, Message, Packet, User, ViewId } from './types'
import { ME, cannedReplies, chats as seedChats, messages as seedMessages, users as seedUsers } from './lib/seed'
import {
  addChatMembers,
  deleteChatInDb,
  deleteChatPref,
  dmChatId,
  fetchChatById,
  fetchChatMembers,
  fetchMessages,
  fetchLastMessages,
  fetchMyChatPrefs,
  fetchMyChats,
  fetchMyDmChatIds,
  getProfileByHandle,
  getProfileById,
  getProfileByPhone,
  insertChat,
  insertMessage,
  joinPresence,
  patchMessage,
  registerProfile,
  removeChatMembers,
  searchProfiles,
  subscribeToChat,
  subscribeToGroup,
  subscribeToInbox,
  subscribeToMyChatPrefs,
  subscribeToMyMemberships,
  updateChatInDb,
  updateProfileInDb,
  upsertChatPref,
  type DbChat,
  type DbChatPref,
  type DbMessage,
  type SupabaseProfile,
} from './lib/supabase'
import {
  acceptCall as rtcAccept,
  declineCall as rtcDecline,
  endCall as rtcEnd,
  initCallSignaling,
  startCall as rtcStart,
  teardownCallSignaling,
  toggleCamera as rtcToggleCamera,
  toggleMute as rtcToggleMute,
  type EndReason,
} from './lib/webrtc'

// A chat is backed by real Supabase Realtime when its id is a canonical DM id
// or a persisted group/channel id (g-… / ch-…). Seed chats use the c-… prefix.
const isRealChatId = (id: string) =>
  id.startsWith('dm:') || id.startsWith('g-') || id.startsWith('ch-')

const dbToChat = (c: DbChat, members: string[]): Chat => ({
  id: c.id,
  kind: (c.kind as Chat['kind']) === 'channel' ? 'channel' : 'group',
  name: c.name,
  avatar: '',
  color: c.color || '#FF5A1A',
  members,
  about: c.about || undefined,
  ownerId: c.owner_id,
  via: c.kind === 'channel' ? 'Beam Channel' : 'Beam Group',
})

const dbToMessage = (row: DbMessage): Message => ({
  id: row.id,
  chatId: row.chat_id,
  authorId: row.author_id,
  text: row.text || '',
  createdAt: new Date(row.created_at).getTime(),
  status: (row.status as Message['status']) || 'sent',
  replyToId: row.reply_to_id || undefined,
  deleted: row.deleted,
  editedAt: row.edited_at ? new Date(row.edited_at).getTime() : undefined,
  attachments: row.attachments || undefined,
  reactions: row.reactions || undefined,
})

// Live subscription handles (kept outside React state).
let chatUnsub: (() => void) | null = null
let inboxUnsub: (() => void) | null = null
let presenceUnsub: (() => void) | null = null
let membershipUnsub: (() => void) | null = null
let chatPrefsUnsub: (() => void) | null = null
const groupSubs: Record<string, () => void> = {}

// Guards _startInbox against running twice for the same session — React 18
// StrictMode (dev only) double-invokes effects, and login/register/
// restoreSession can each trigger it. Without this, call signaling ends up
// with several duplicate personal-channel subscriptions: an incoming call
// then fires 'invite' multiple times, and the app's own "already active"
// guard auto-declines every duplicate — so calls ring, then silently die
// before the callee can even tap Accept.
let inboxStartedFor: string | null = null

// Pin/archive/block fetched at login, applied to chats as they're hydrated
// (DM history and group membership load independently, sometimes after
// this cache is already populated).
let chatPrefsCache: Record<string, DbChatPref> = {}
const withChatPref = (chat: Chat): Chat => {
  const pref = chatPrefsCache[chat.id]
  return pref ? { ...chat, pinned: pref.pinned, archived: pref.archived, blocked: pref.blocked } : chat
}

// Map a Supabase profile row to a local User
const profileToUser = (p: SupabaseProfile): User => ({
  id: p.id,
  name: p.name,
  handle: `@${p.handle}`,
  avatar: p.avatar || p.color || '#FF5A1A',
  color: p.color || '#FF5A1A',
  bio: p.bio || 'Independent Beam user',
  language: p.language || 'en',
  phone: p.phone,
})

const uid = (p: string) => `${p}-${crypto.randomUUID()}`

interface Prefs {
  darkComposer: boolean
  metadataMinimizer: boolean
  noTrackers: boolean
  selfDestructMonths: 0 | 1 | 3 | 6
  webPush: boolean
  soundOn: boolean
}

export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'active'

export interface CallState {
  status: CallStatus
  peerId: string
  peerName: string
  peerColor: string
  chatId: string
  video: boolean
  muted: boolean
  cameraOff: boolean
  startedAt?: number
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  // Temporary on-screen trace — see webrtc.ts's onDebug. Remove once
  // calls are solid.
  debugLog?: string[]
}

// Persisted session — remembers the device so a returning user skips login.
const SESSION_KEY = 'beam.session.id'
const saveSession = (id: string) => {
  try {
    localStorage.setItem(SESSION_KEY, id)
  } catch {
    /* storage unavailable */
  }
}
const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* noop */
  }
}
const readSession = (): string | null => {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

// Theme (light/dark) — persisted and applied as a root class.
const THEME_KEY = 'beam.theme'
type Theme = 'light' | 'dark'
const readTheme = (): Theme => {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
const applyTheme = (thm: Theme) => {
  try {
    document.documentElement.classList.toggle('dark', thm === 'dark')
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', thm === 'dark' ? '#121316' : '#f4f4f5')
  } catch {
    /* noop */
  }
}
applyTheme(readTheme()) // apply immediately on load

interface State {
  // session
  authed: boolean
  booting: boolean
  restoring: boolean
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

  // calls
  call: CallState | null

  // appearance
  theme: Theme
  setTheme: (t: Theme) => void

  prefs: Prefs

  // auth
  login: (phone: string) => Promise<{ exists: boolean; profile?: User }>
  register: (phone: string, name: string, handle: string, language: string) => Promise<boolean>
  logout: () => void
  restoreSession: () => Promise<void>
  updateProfile: (updates: {
    name: string
    handle: string
    bio: string
    avatar?: string
    color?: string
    phone?: string
  }) => Promise<boolean>

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

  // chat management
  togglePinChat: (chatId: string) => void
  archiveChat: (chatId: string) => void
  unarchiveChat: (chatId: string) => void
  blockChat: (chatId: string) => void
  unblockChat: (chatId: string) => void
  deleteChat: (chatId: string) => void

  // groups & channels
  createGroupChat: (
    kind: 'group' | 'channel',
    name: string,
    memberIds: string[],
    opts?: { about?: string; color?: string },
  ) => string
  updateChat: (chatId: string, patch: Partial<Pick<Chat, 'name' | 'about' | 'color' | 'members'>>) => void

  // calls
  startCall: (chatId: string, video: boolean) => Promise<void>
  acceptCall: () => Promise<void>
  declineCall: () => void
  hangUp: () => void
  toggleCallMute: () => void
  toggleCallCamera: () => void
  _endCallLocal: (reason: EndReason) => void

  // contacts
  addContact: (query: string) => Promise<{ success: boolean; error?: string; profile?: User }>
  searchUsers: (query: string) => Promise<User[]>
  startChat: (userId: string) => void

  // prefs
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void
  exportData: () => string

  // internal
  _log: (p: Omit<Packet, 'id' | 'ts'>) => void
  _upsertMessage: (m: Message) => void
  _startInbox: () => void
  _startGroups: () => Promise<void>
  _subscribeGroup: (chatId: string) => void
  _upsertLocalChat: (chat: Chat) => void
  _syncChatPref: (chatId: string, flags: Partial<{ pinned: boolean; archived: boolean; blocked: boolean }>) => void
}

const isRealUserId = (id?: string) => !!id && id.startsWith('u-')

// Approximate encoded size of a protobuf-ish payload
const sizeOf = (text: string, atts?: Attachment[]) =>
  18 + new TextEncoder().encode(text).length + (atts?.length ?? 0) * 46

export const useStore = create<State>((set, get) => ({
  authed: false,
  booting: false,
  restoring: true,
  me: seedUsers[ME],

  users: seedUsers,
  chats: seedChats,
  messages: seedMessages,
  online: {},

  view: 'chats',
  activeChatId: null,
  replyTo: null,
  searchQuery: '',
  transparencyOpen: false,
  packets: [],
  connected: true,

  call: null,

  theme: readTheme(),
  setTheme: (thm) => {
    try {
      localStorage.setItem(THEME_KEY, thm)
    } catch {
      /* noop */
    }
    applyTheme(thm)
    set({ theme: thm })
  },

  prefs: {
    darkComposer: false,
    metadataMinimizer: true,
    noTrackers: true,
    selfDestructMonths: 3,
    webPush: true,
    soundOn: true,
  },

  login: async (phone: string) => {
    set({ booting: true })
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const profile = await getProfileByPhone(phone)
      if (profile) {
        const meUser: User = {
          id: profile.id,
          name: profile.name,
          handle: `@${profile.handle}`,
          avatar: profile.avatar || '#FF5A1A',
          color: profile.color || '#FF5A1A',
          bio: profile.bio || 'Independent Beam user',
          language: profile.language || 'en',
          phone: profile.phone,
        }
        // Add profile to local users seed dictionary so avatars render
        const updatedUsers = { ...get().users, [profile.id]: meUser }
        set({ me: meUser, users: updatedUsers, authed: true, booting: false })
        saveSession(profile.id)
        get()._log({ dir: 'out', op: 'ws.open', bytes: 24, summary: 'Binary WebSocket established', encrypted: true, latencyMs: 41 })
        get()._log({ dir: 'in', op: 'sync.delta', bytes: 512, summary: 'Top-20 chats hydrated (delta)', encrypted: true, latencyMs: 96 })
        get()._startInbox()
        return { exists: true, profile: meUser }
      } else {
        set({ booting: false })
        return { exists: false }
      }
    } catch (e) {
      console.error('Exception inside login store action:', e)
      set({ booting: false })
      return { exists: false }
    }
  },

  register: async (phone: string, name: string, handle: string, language: string) => {
    set({ booting: true })
    try {
      const colors = ['#FF5A1A', '#FF3B30', '#34C759', '#007AFF', '#AF52DE']
      const color = colors[Math.floor(Math.random() * colors.length)]
      const newProfile = await registerProfile({
        phone,
        name,
        handle,
        language,
        avatar: color,
        color,
        bio: `Using Beam in ${language === 'ru' ? 'Русский' : 'English'} · Zero footprints`,
      })
      if (newProfile) {
        const meUser: User = {
          id: newProfile.id,
          name: newProfile.name,
          handle: `@${newProfile.handle}`,
          avatar: newProfile.avatar,
          color: newProfile.color,
          bio: newProfile.bio,
          language: newProfile.language,
          phone: newProfile.phone,
        }
        const updatedUsers = { ...get().users, [newProfile.id]: meUser }
        set({ me: meUser, users: updatedUsers, authed: true, booting: false })
        saveSession(newProfile.id)
        get()._log({ dir: 'out', op: 'ws.open', bytes: 24, summary: 'Binary WebSocket established', encrypted: true, latencyMs: 41 })
        get()._log({ dir: 'in', op: 'sync.delta', bytes: 512, summary: 'Registered & Syncing delta', encrypted: true, latencyMs: 96 })
        get()._startInbox()
        return true
      } else {
        set({ booting: false })
        return false
      }
    } catch (e) {
      console.error('Exception inside register store action:', e)
      set({ booting: false })
      return false
    }
  },

  logout: () => {
    if (chatUnsub) {
      chatUnsub()
      chatUnsub = null
    }
    if (inboxUnsub) {
      inboxUnsub()
      inboxUnsub = null
    }
    if (presenceUnsub) {
      presenceUnsub()
      presenceUnsub = null
    }
    if (membershipUnsub) {
      membershipUnsub()
      membershipUnsub = null
    }
    if (chatPrefsUnsub) {
      chatPrefsUnsub()
      chatPrefsUnsub = null
    }
    chatPrefsCache = {}
    inboxStartedFor = null
    Object.values(groupSubs).forEach((unsub) => unsub())
    Object.keys(groupSubs).forEach((k) => delete groupSubs[k])
    teardownCallSignaling()
    clearSession()
    set({ authed: false, activeChatId: null, view: 'chats', call: null })
  },

  restoreSession: async () => {
    const id = readSession()
    if (!id) {
      set({ restoring: false })
      return
    }
    try {
      const profile = await getProfileById(id)
      if (!profile) {
        // Could be a transient error or a deleted account — keep the saved id
        // and just show login; a later reload will retry.
        set({ restoring: false })
        return
      }
      const meUser = profileToUser(profile)
      set((s) => ({
        me: meUser,
        users: { ...s.users, [profile.id]: meUser },
        authed: true,
        restoring: false,
      }))
      get()._log({ dir: 'in', op: 'session.restore', bytes: 24, summary: `Device remembered · ${meUser.name}`, encrypted: true, latencyMs: 30 })
      get()._startInbox()
    } catch (e) {
      console.error('restoreSession failed:', e)
      set({ restoring: false })
    }
  },

  updateProfile: async (updates) => {
    const me = get().me
    if (!me) return false
    try {
      const cleanHandle = updates.handle.replace(/^@/, '')
      const patch: Parameters<typeof updateProfileInDb>[1] = {
        name: updates.name,
        handle: cleanHandle,
        bio: updates.bio,
        avatar: updates.avatar,
        color: updates.color || me.color,
      }
      if (updates.phone !== undefined && updates.phone.trim() && updates.phone !== me.phone) {
        patch.phone = updates.phone.trim()
      }
      const ok = await updateProfileInDb(me.id, patch)
      if (!ok) throw new Error('update failed')

      const updatedMe: User = {
        ...me,
        name: updates.name,
        handle: `@${cleanHandle}`,
        bio: updates.bio,
        avatar: updates.avatar || '',
        color: updates.color || me.color,
        phone: patch.phone ?? me.phone,
      }
      set({ me: updatedMe, users: { ...get().users, [me.id]: updatedMe } })
      return true
    } catch (e) {
      console.error('Exception updating profile:', e)
      return false
    }
  },

  // ── Calls ──────────────────────────────────────────────────
  startCall: async (chatId, video) => {
    const chat = get().chats.find((c) => c.id === chatId)
    const meId = get().me?.id
    if (!chat || chat.kind !== 'dm') return
    const peerId = chat.members.find((m) => m !== meId && m !== 'me')
    const peer = peerId ? get().users[peerId] : undefined
    if (!peerId || !peer) return
    if (!isRealChatId(chatId) || !isRealUserId(meId) || !isRealUserId(peerId)) {
      alert(get().me?.language === 'ru'
        ? 'Звонки доступны только реальным пользователям Beam. Добавьте контакт по @нику.'
        : 'Calls are only available with real Beam users. Add a contact by @handle first.')
      return
    }
    set({
      call: {
        status: 'outgoing',
        peerId,
        peerName: peer.name,
        peerColor: peer.color,
        chatId,
        video,
        muted: false,
        cameraOff: false,
        localStream: null,
        remoteStream: null,
      },
    })
    get()._log({ dir: 'out', op: 'call.invite', bytes: 48, summary: `ring ${peer.name}`, encrypted: true })
    try {
      await rtcStart(peerId, get().me!.name, video, chatId)
    } catch (e) {
      console.error('startCall failed:', e)
      set({ call: null })
      alert(get().me?.language === 'ru'
        ? 'Не удалось получить доступ к камере/микрофону.'
        : 'Could not access camera / microphone.')
    }
  },

  acceptCall: async () => {
    const call = get().call
    if (!call || call.status !== 'incoming') return
    set({ call: { ...call, status: 'active', startedAt: Date.now() } })
    get()._log({ dir: 'out', op: 'call.accept', bytes: 24, summary: `accept ${call.peerName}`, encrypted: true })
    try {
      await rtcAccept()
    } catch (e) {
      console.error('acceptCall failed:', e)
      get()._endCallLocal('failed')
    }
  },

  declineCall: () => {
    get()._log({ dir: 'out', op: 'call.decline', bytes: 24, summary: 'declined', encrypted: true })
    rtcDecline()
    set({ call: null })
  },

  hangUp: () => {
    get()._log({ dir: 'out', op: 'call.end', bytes: 24, summary: 'hangup', encrypted: true })
    rtcEnd('local')
    set({ call: null })
  },

  toggleCallMute: () => {
    const muted = rtcToggleMute()
    set((s) => (s.call ? { call: { ...s.call, muted } } : {}))
  },

  toggleCallCamera: () => {
    const cameraOff = rtcToggleCamera()
    set((s) => (s.call ? { call: { ...s.call, cameraOff } } : {}))
  },

  _endCallLocal: (_reason) => {
    if (get().call) set({ call: null })
  },

  addContact: async (query: string) => {
    try {
      const raw = query.trim()
      // Detect nickname (@handle or letters) vs phone number
      const looksLikeHandle = raw.startsWith('@') || /[a-zA-Z_]/.test(raw)
      const profile = looksLikeHandle
        ? (await getProfileByHandle(raw)) || (await getProfileByPhone(raw))
        : (await getProfileByPhone(raw)) || (await getProfileByHandle(raw))
      if (profile) {
        if (profile.id === get().me?.id) {
          return { success: false, error: 'That is you' }
        }
        const contactUser = profileToUser(profile)
        set((s) => ({ users: { ...s.users, [profile.id]: contactUser } }))
        return { success: true, profile: contactUser }
      }
      return { success: false, error: 'User not found' }
    } catch (e) {
      console.error('Exception adding contact:', e)
      return { success: false, error: 'Database error' }
    }
  },

  searchUsers: async (query: string) => {
    const profiles = await searchProfiles(query)
    const meId = get().me?.id
    const found = profiles.filter((p) => p.id !== meId && p.id !== 'me').map(profileToUser)
    if (found.length) {
      set((s) => {
        const users = { ...s.users }
        for (const u of found) users[u.id] = u
        return { users }
      })
    }
    return found
  },

  startChat: (userId: string) => {
    const meId = get().me?.id || 'me'
    const existingChat = get().chats.find(
      (c) =>
        c.kind === 'dm' &&
        c.members.includes(userId) &&
        (c.members.includes(meId) || c.members.includes('me')),
    )
    if (existingChat) {
      set({ view: 'chats' })
      get().openChat(existingChat.id)
      return
    }
    const other = get().users[userId]
    const real = isRealUserId(userId) && isRealUserId(meId)
    const newChat: Chat = real
      ? {
          id: dmChatId(meId, userId),
          kind: 'dm',
          name: other?.name || 'User',
          avatar: '',
          color: other?.color || '#FF5A1A',
          members: [meId, userId],
          via: 'Via Beam',
        }
      : {
          id: `c-${userId}`,
          kind: 'dm',
          name: other?.name || 'User',
          avatar: '',
          color: other?.color || '#FF5A1A',
          members: ['me', userId],
          via: 'Via Beam',
        }
    set((s) => ({ chats: [...s.chats, newChat], view: 'chats' }))
    get().openChat(newChat.id)
  },

  // Persists the full pin/archive/block flag set for one chat — a viewer-only
  // preference, never shared with the other side of a DM.
  _syncChatPref: (chatId, flags) => {
    const meId = get().me?.id
    if (!isRealUserId(meId)) return
    const chat = get().chats.find((c) => c.id === chatId)
    if (!chat) return
    const merged = {
      pinned: flags.pinned ?? !!chat.pinned,
      archived: flags.archived ?? !!chat.archived,
      blocked: flags.blocked ?? !!chat.blocked,
    }
    chatPrefsCache[chatId] = { user_id: meId!, chat_id: chatId, ...merged }
    upsertChatPref(meId!, chatId, merged)
  },

  togglePinChat: (chatId: string) => {
    const pinned = !get().chats.find((c) => c.id === chatId)?.pinned
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, pinned } : c)),
    }))
    get()._syncChatPref(chatId, { pinned })
  },

  archiveChat: (chatId: string) => {
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, archived: true } : c)),
    }))
    get()._syncChatPref(chatId, { archived: true })
  },

  unarchiveChat: (chatId: string) => {
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, archived: false } : c)),
    }))
    get()._syncChatPref(chatId, { archived: false })
  },

  blockChat: (chatId: string) => {
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, blocked: true } : c)),
    }))
    get()._syncChatPref(chatId, { blocked: true })
  },

  unblockChat: (chatId: string) => {
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, blocked: false } : c)),
    }))
    get()._syncChatPref(chatId, { blocked: false })
  },

  deleteChat: (chatId: string) => {
    const chat = get().chats.find((c) => c.id === chatId)
    const meId = get().me?.id
    set((s) => ({
      chats: s.chats.filter((c) => c.id !== chatId),
      activeChatId: get().activeChatId === chatId ? null : get().activeChatId,
    }))
    delete chatPrefsCache[chatId]
    if (isRealUserId(meId)) deleteChatPref(meId!, chatId)
    // Persisted group/channel → remove server-side (cascade drops memberships).
    if (chat && isRealChatId(chatId) && chat.kind !== 'dm') {
      if (groupSubs[chatId]) {
        groupSubs[chatId]()
        delete groupSubs[chatId]
      }
      deleteChatInDb(chatId)
    }
  },

  createGroupChat: (kind, name, memberIds, opts) => {
    const meId = get().me?.id || 'me'
    const palette = ['#FF5A1A', '#B9E36B', '#7FC8F8', '#F5A9C5', '#C9A7F0', '#FF3B30', '#34C759']
    const color = opts?.color || palette[Math.floor(Math.random() * palette.length)]
    const members = Array.from(new Set([meId, ...memberIds]))
    const id = `${kind === 'channel' ? 'ch' : 'g'}-${uid('x')}`
    const chat: Chat = {
      id,
      kind,
      name: name.trim() || (kind === 'channel' ? 'New Channel' : 'New Group'),
      avatar: '',
      color,
      members,
      about: opts?.about?.trim() || undefined,
      ownerId: meId,
      via: kind === 'channel' ? 'Beam Channel' : 'Beam Group',
    }
    set((s) => ({ chats: [...s.chats, chat], view: 'chats' }))
    get()._log({
      dir: 'out',
      op: kind === 'channel' ? 'channel.create' : 'group.create',
      bytes: 40 + members.length * 8,
      summary: `${chat.name} · ${members.length} ${kind === 'channel' ? 'subscribers' : 'members'}`,
      encrypted: true,
    })

    // Persist to Supabase so members on other devices receive it.
    if (isRealUserId(meId)) {
      insertChat({ id, kind, name: chat.name, color, about: chat.about ?? null, owner_id: meId }).then((ok) => {
        if (ok) {
          addChatMembers(id, members.filter(isRealUserId), meId)
          get()._subscribeGroup(id)
        }
      })
    }
    get().openChat(id)
    return id
  },

  updateChat: (chatId, patch) => {
    const prev = get().chats.find((c) => c.id === chatId)
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, ...patch } : c)),
    }))
    get()._log({ dir: 'out', op: 'chat.update', bytes: 32, summary: `edit ${chatId}`, encrypted: true })

    if (!prev || !isRealChatId(chatId) || prev.kind === 'dm') return
    // Persist metadata changes.
    const metaPatch: Partial<Pick<DbChat, 'name' | 'color' | 'about'>> = {}
    if (patch.name !== undefined) metaPatch.name = patch.name
    if (patch.color !== undefined) metaPatch.color = patch.color
    if (patch.about !== undefined) metaPatch.about = patch.about || null
    if (Object.keys(metaPatch).length) updateChatInDb(chatId, metaPatch)
    // Diff the roster and sync membership rows.
    if (patch.members) {
      const before = new Set(prev.members)
      const after = new Set(patch.members)
      const added = patch.members.filter((m) => !before.has(m) && isRealUserId(m))
      const removed = prev.members.filter((m) => !after.has(m) && isRealUserId(m))
      if (added.length) addChatMembers(chatId, added, prev.ownerId)
      if (removed.length) removeChatMembers(chatId, removed)
    }
  },

  setView: (v) => set({ view: v, transparencyOpen: v === 'transparency' ? true : get().transparencyOpen }),
  openChat: (id) => {
    // tear down previous per-chat subscription
    if (chatUnsub) {
      chatUnsub()
      chatUnsub = null
    }
    set({ activeChatId: id, replyTo: null })
    if (!id) return
    get().markRead(id)

    if (isRealChatId(id)) {
      const meId = get().me?.id
      // hydrate history from Supabase
      fetchMessages(id).then((rows) => {
        rows.forEach((r) => get()._upsertMessage(dbToMessage(r)))
        // send read receipts for the other party's messages
        rows
          .filter((r) => r.author_id !== meId && r.status !== 'read')
          .forEach((r) => patchMessage(r.id, { status: 'read' }))
        get().markRead(id)
      })
      // live updates (inserts, edits, deletes, read receipts)
      chatUnsub = subscribeToChat(id, (_evt, row) => {
        const msg = dbToMessage(row)
        get()._upsertMessage(msg)
        // if the incoming message is from the peer and chat is open, mark it read
        if (msg.authorId !== meId && get().activeChatId === id && msg.status !== 'read') {
          patchMessage(msg.id, { status: 'read' })
        }
      })
    }
  },
  toggleTransparency: (v) => set((s) => ({ transparencyOpen: v ?? !s.transparencyOpen })),
  setSearch: (q) => set({ searchQuery: q }),
  setReplyTo: (m) => set({ replyTo: m }),

  sendMessage: (chatId, text, attachments) => {
    const t = text.trim()
    if (!t && !(attachments && attachments.length)) return
    const meId = get().me?.id || 'me'
    const chat = get().chats.find((c) => c.id === chatId)
    if (chat?.blocked) return
    const real = !!chat && isRealChatId(chatId)
    const id = uid('m')
    const replyToId = get().replyTo?.id
    const msg: Message = {
      id,
      chatId,
      authorId: real ? meId : ME,
      text: t,
      createdAt: Date.now(),
      status: 'sending', // Optimistic UI — appears immediately
      replyToId,
      attachments,
    }
    set((s) => ({ messages: [...s.messages, msg], replyTo: null }))
    get()._log({ dir: 'out', op: 'msg.send', bytes: sizeOf(t, attachments), summary: `→ ${chatId} · optimistic`, encrypted: true })

    // Real chat → persist to Supabase and let Realtime deliver to the peer(s).
    if (real) {
      // DMs carry a recipient (for the inbox channel); groups/channels are
      // fanned out via their group subscription, so recipient stays null.
      const other = chat!.kind === 'dm' ? chat!.members.find((m) => m !== meId) : null
      insertMessage({ id, chat_id: chatId, author_id: meId, recipient_id: other, text: t, reply_to_id: replyToId, attachments }).then(
        (ok) => {
          set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, status: ok ? 'sent' : 'sending' } : m)) }))
          if (ok) get()._log({ dir: 'in', op: 'msg.ack', bytes: 12, summary: `ack ${id.slice(-4)}`, encrypted: true, latencyMs: 90 })
        },
      )
      return
    }

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

    // Canned reply + typing from the other party (demo dm only)
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
    const m = get().messages.find((x) => x.id === id)
    set((s) => ({ messages: s.messages.map((x) => (x.id === id ? { ...x, text: text.trim(), editedAt: Date.now() } : x)) }))
    get()._log({ dir: 'out', op: 'msg.edit', bytes: sizeOf(text), summary: `edit ${id.slice(-4)}`, encrypted: true })
    if (m && isRealChatId(m.chatId)) patchMessage(id, { text: text.trim(), edited_at: new Date().toISOString() })
  },

  deleteMessage: (id, forEveryone) => {
    const m = get().messages.find((x) => x.id === id)
    set((s) => ({
      messages: s.messages.map((x) => (x.id === id ? { ...x, deleted: true, text: '', attachments: undefined } : x)),
    }))
    get()._log({ dir: 'out', op: forEveryone ? 'msg.unsend' : 'msg.delete', bytes: 12, summary: `${forEveryone ? 'unsend' : 'delete'} ${id.slice(-4)}`, encrypted: true })
    if (m && isRealChatId(m.chatId) && forEveryone) patchMessage(id, { deleted: true, text: '' })
  },

  togglePin: (id) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)) })),

  react: (id, emoji) => {
    const meId = get().me?.id || ME
    const msg = get().messages.find((m) => m.id === id)
    if (!msg) return
    const real = isRealChatId(msg.chatId)
    const key = real ? meId : ME
    const reactions: Record<string, string[]> = { ...(msg.reactions ?? {}) }
    const arr = new Set(reactions[emoji] ?? [])
    if (arr.has(key)) arr.delete(key)
    else arr.add(key)
    if (arr.size === 0) delete reactions[emoji]
    else reactions[emoji] = [...arr]
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, reactions } : m)) }))
    if (real) patchMessage(id, { reactions })
  },

  markRead: (chatId) => {
    const meId = get().me?.id
    set((s) => ({
      messages: s.messages.map((m) =>
        m.chatId === chatId && m.authorId !== ME && m.authorId !== meId ? { ...m, status: 'read' } : m,
      ),
    }))
  },

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

  _upsertMessage: (m) =>
    set((s) => {
      const idx = s.messages.findIndex((x) => x.id === m.id)
      if (idx >= 0) {
        const next = s.messages.slice()
        next[idx] = { ...next[idx], ...m }
        return { messages: next }
      }
      return { messages: [...s.messages, m] }
    }),

  _upsertLocalChat: (chat) =>
    set((s) => {
      const idx = s.chats.findIndex((c) => c.id === chat.id)
      if (idx >= 0) {
        const next = s.chats.slice()
        next[idx] = { ...next[idx], ...chat }
        return { chats: next }
      }
      return { chats: [...s.chats, chat] }
    }),

  _subscribeGroup: (chatId) => {
    if (groupSubs[chatId]) return
    groupSubs[chatId] = subscribeToGroup(
      chatId,
      async (_evt, row) => {
        const msg = dbToMessage(row)
        const meId = get().me?.id
        const status: Message['status'] =
          msg.authorId === meId ? msg.status : get().activeChatId === chatId ? 'read' : 'delivered'
        get()._upsertMessage({ ...msg, status })
        // Ensure the author renders with a name/avatar in group bubbles.
        if (msg.authorId !== meId && !get().users[msg.authorId] && isRealUserId(msg.authorId)) {
          const p = await getProfileById(msg.authorId)
          if (p) set((s) => ({ users: { ...s.users, [p.id]: profileToUser(p) } }))
        }
      },
      (meta) => {
        const existing = get().chats.find((c) => c.id === meta.id)
        get()._upsertLocalChat(dbToChat(meta, existing?.members ?? [get().me?.id || '']))
      },
      async () => {
        const members = await fetchChatMembers(chatId)
        const meId = get().me?.id
        // If I was removed from the roster, drop the chat locally.
        if (meId && !members.includes(meId)) {
          if (groupSubs[chatId]) {
            groupSubs[chatId]()
            delete groupSubs[chatId]
          }
          set((s) => ({
            chats: s.chats.filter((c) => c.id !== chatId),
            activeChatId: s.activeChatId === chatId ? null : s.activeChatId,
          }))
          return
        }
        set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, members } : c)) }))
      },
    )
  },

  _startGroups: async () => {
    const meId = get().me?.id
    if (!isRealUserId(meId)) return
    // Hydrate all my groups/channels and keep them live.
    const rows = await fetchMyChats(meId!)
    rows.forEach(({ chat, members }) => get()._upsertLocalChat(withChatPref(dbToChat(chat, members))))
    rows.forEach(({ chat }) => get()._subscribeGroup(chat.id))
    // Sidebar previews need at least the latest message per chat.
    fetchLastMessages(rows.map(({ chat }) => chat.id)).then((msgRows) =>
      msgRows.forEach((r) => get()._upsertMessage(dbToMessage(r))),
    )

    if (membershipUnsub) {
      membershipUnsub()
      membershipUnsub = null
    }
    membershipUnsub = subscribeToMyMemberships(
      meId!,
      async (chatId) => {
        // Added to a new group/channel on another client.
        if (get().chats.some((c) => c.id === chatId)) {
          get()._subscribeGroup(chatId)
          return
        }
        const chat = await fetchChatById(chatId)
        if (!chat) return
        const members = await fetchChatMembers(chatId)
        get()._upsertLocalChat(withChatPref(dbToChat(chat, members)))
        get()._subscribeGroup(chatId)
        get()._log({ dir: 'in', op: 'group.join', bytes: 40, summary: `joined ${chat.name}`, encrypted: true })
      },
      (chatId) => {
        if (groupSubs[chatId]) {
          groupSubs[chatId]()
          delete groupSubs[chatId]
        }
        set((s) => ({
          chats: s.chats.filter((c) => c.id !== chatId),
          activeChatId: s.activeChatId === chatId ? null : s.activeChatId,
        }))
      },
    )
  },

  _startInbox: () => {
    const meId = get().me?.id
    if (!isRealUserId(meId)) return
    if (inboxStartedFor === meId) return
    inboxStartedFor = meId!

    if (inboxUnsub) {
      inboxUnsub()
      inboxUnsub = null
    }

    // Pin/archive/block — fetch before hydrating chats so both the DM
    // restore below and _startGroups() can apply flags as they build
    // each chat entry, and re-apply to whatever's already on screen.
    fetchMyChatPrefs(meId!).then((prefs) => {
      chatPrefsCache = Object.fromEntries(prefs.map((p) => [p.chat_id, p]))
      set((s) => ({
        chats: s.chats.map((c) => {
          const pref = chatPrefsCache[c.id]
          return pref ? { ...c, pinned: pref.pinned, archived: pref.archived, blocked: pref.blocked } : c
        }),
      }))
    })

    if (chatPrefsUnsub) {
      chatPrefsUnsub()
      chatPrefsUnsub = null
    }
    chatPrefsUnsub = subscribeToMyChatPrefs(meId!, (row) => {
      chatPrefsCache[row.chat_id] = row
      set((s) => ({
        chats: s.chats.map((c) =>
          c.id === row.chat_id ? { ...c, pinned: row.pinned, archived: row.archived, blocked: row.blocked } : c,
        ),
      }))
    })

    // Groups & channels — hydrate memberships and keep them live
    get()._startGroups()

    // DMs have no membership table — rebuild the list from message history.
    fetchMyDmChatIds(meId!).then(async (chatIds) => {
      for (const chatId of chatIds) {
        if (get().chats.some((c) => c.id === chatId)) continue
        const peerId = chatId.slice(3).split('__').find((id) => id !== meId)
        if (!peerId) continue
        let peer = get().users[peerId]
        if (!peer) {
          const p = await getProfileById(peerId)
          if (!p) continue
          peer = profileToUser(p)
          set((s) => ({ users: { ...s.users, [peerId]: peer! } }))
        }
        const chat: Chat = withChatPref({
          id: chatId,
          kind: 'dm',
          name: peer.name,
          avatar: '',
          color: peer.color || '#FF5A1A',
          members: [meId!, peerId],
          via: 'Via Beam',
        })
        set((s) => (s.chats.some((c) => c.id === chatId) ? s : { chats: [...s.chats, chat] }))
      }
      // Sidebar previews need at least the latest message per chat.
      const rows = await fetchLastMessages(chatIds)
      rows.forEach((r) => get()._upsertMessage(dbToMessage(r)))
    })

    // Calls — listen for incoming invites on the personal channel
    initCallSignaling(meId!, {
      onIncoming: (from, fromName, video, chatId) => {
        const peer = get().users[from]
        set({
          call: {
            status: 'incoming',
            peerId: from,
            peerName: peer?.name || fromName,
            peerColor: peer?.color || '#FF5A1A',
            chatId,
            video,
            muted: false,
            cameraOff: false,
            localStream: null,
            remoteStream: null,
          },
        })
        get()._log({ dir: 'in', op: 'call.ring', bytes: 48, summary: `← ${fromName}`, encrypted: true })
      },
      onLocalStream: (stream) => set((s) => (s.call ? { call: { ...s.call, localStream: stream } } : {})),
      onRemoteStream: (stream) => set((s) => (s.call ? { call: { ...s.call, remoteStream: stream } } : {})),
      onConnected: () =>
        set((s) => (s.call ? { call: { ...s.call, status: 'active', startedAt: s.call.startedAt ?? Date.now() } } : {})),
      onDebug: (line) =>
        set((s) => (s.call ? { call: { ...s.call, debugLog: [...(s.call.debugLog ?? []), line].slice(-14) } } : {})),
      onEnded: (reason) => get()._endCallLocal(reason),
    })

    // Presence — reflect who is online among real users
    if (presenceUnsub) {
      presenceUnsub()
      presenceUnsub = null
    }
    presenceUnsub = joinPresence(meId!, (ids) => {
      const present = new Set(ids)
      set((s) => {
        const online = { ...s.online }
        for (const uid of Object.keys(s.users)) {
          if (isRealUserId(uid)) online[uid] = present.has(uid)
        }
        online[meId!] = true
        return { online }
      })
    })

    inboxUnsub = subscribeToInbox(meId!, async (row) => {
      const msg = dbToMessage(row)
      if (msg.authorId === meId) return
      // ensure a chat exists for this incoming DM
      let chat = get().chats.find((c) => c.id === msg.chatId)
      if (!chat) {
        let author = get().users[msg.authorId]
        if (!author) {
          const p = await getProfileById(msg.authorId)
          if (p) {
            author = profileToUser(p)
            set((s) => ({ users: { ...s.users, [p.id]: author! } }))
          }
        }
        chat = withChatPref({
          id: msg.chatId,
          kind: 'dm',
          name: author?.name || 'User',
          avatar: '',
          color: author?.color || '#FF5A1A',
          members: [meId!, msg.authorId],
          via: 'Via Beam',
        })
        set((s) => ({ chats: [...s.chats, chat!] }))
      }
      const status: Message['status'] = get().activeChatId === msg.chatId ? 'read' : 'delivered'
      get()._upsertMessage({ ...msg, status })
      get()._log({ dir: 'in', op: 'msg.recv', bytes: 12 + msg.text.length, summary: `← ${msg.authorId}`, encrypted: true, latencyMs: 74 })
    })
  },
}))

// Selectors
export const selectChatMessages = (chatId: string) => (s: State) =>
  s.messages.filter((m) => m.chatId === chatId).sort((a, b) => a.createdAt - b.createdAt)

export const lastMessageOf = (chatId: string, msgs: Message[]): Message | undefined => {
  let last: Message | undefined
  for (const m of msgs) if (m.chatId === chatId) last = m
  return last
}
