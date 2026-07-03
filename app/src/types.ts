// Core domain types for Beam messenger demo

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read'

export interface User {
  id: string
  name: string
  handle: string
  avatar: string // solid color or url
  color: string
  bio?: string
  language?: string
}

export interface Attachment {
  id: string
  kind: 'image' | 'file' | 'voice'
  name: string
  size?: number
  url?: string // for images: gradient css or data url
  duration?: number // voice seconds
  waveform?: number[] // voice amplitudes 0..1
  progress?: number // 0..1 upload/stream progress
  uploading?: boolean // true while the file is uploading to storage
}

export interface Message {
  id: string
  chatId: string
  authorId: string
  text: string
  createdAt: number
  editedAt?: number
  status: MessageStatus
  replyToId?: string
  attachments?: Attachment[]
  pinned?: boolean
  deleted?: boolean
  reactions?: Record<string, string[]> // emoji -> userIds
}

export interface Chat {
  id: string
  kind: 'dm' | 'group'
  name: string
  avatar: string
  color: string
  members: string[] // user ids
  via?: string // e.g. "Via Beam" label shown on feed cards
  muted?: boolean
  pinned?: boolean
  typing?: boolean
  draft?: string
  archived?: boolean
}

// Transparency Console — a live packet in the audit log (Functions.pdf §3)
export interface Packet {
  id: string
  ts: number
  dir: 'out' | 'in'
  op: string // e.g. msg.send, ack, presence, sync.delta
  bytes: number
  latencyMs?: number
  summary: string
  encrypted: boolean
}

export type ViewId = 'chats' | 'search' | 'transparency' | 'profile' | 'settings'
