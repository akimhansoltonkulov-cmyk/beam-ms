import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { Avatar, IconButton, Pill } from '../components/ui'
import { IconChecks, IconGrid, IconSearch } from '../components/Icons'
import { relative } from '../lib/format'
import type { Chat, Message } from '../types'

export default function Sidebar() {
  const chats = useStore((s) => s.chats)
  const messages = useStore((s) => s.messages)
  const users = useStore((s) => s.users)
  const online = useStore((s) => s.online)
  const activeChatId = useStore((s) => s.activeChatId)
  const openChat = useStore((s) => s.openChat)
  const view = useStore((s) => s.view)
  const search = useStore((s) => s.searchQuery)
  const setSearch = useStore((s) => s.setSearch)
  const setView = useStore((s) => s.setView)

  const lastByChat = useMemo(() => {
    const map: Record<string, Message | undefined> = {}
    for (const m of messages) map[m.chatId] = m
    return map
  }, [messages])

  const unreadByChat = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of messages)
      if (m.authorId !== 'me' && m.status !== 'read' && m.chatId !== activeChatId)
        map[m.chatId] = (map[m.chatId] ?? 0) + 1
    return map
  }, [messages, activeChatId])

  const q = search.trim().toLowerCase()
  const searching = view === 'search'
  const list = useMemo(() => {
    let arr = [...chats]
    if (q)
      arr = arr.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (lastByChat[c.id]?.text ?? '').toLowerCase().includes(q),
      )
    return arr.sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return a.pinned ? -1 : 1
      return (lastByChat[b.id]?.createdAt ?? 0) - (lastByChat[a.id]?.createdAt ?? 0)
    })
  }, [chats, q, lastByChat])

  // message hits for global search
  const msgHits = useMemo(() => {
    if (!q) return []
    return messages
      .filter((m) => m.text.toLowerCase().includes(q))
      .slice(-8)
      .reverse()
  }, [messages, q])

  return (
    <div className="flex h-full flex-col px-5 pt-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-display text-black">{searching ? 'Search' : 'Messages'}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-body-s font-semibold text-grey-mid">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Binary link · online
          </p>
        </div>
        <div className="flex gap-2">
          <IconButton title="New chat">
            <IconGrid size={18} />
          </IconButton>
        </div>
      </div>

      {/* Search box */}
      <div className="mb-3 flex items-center gap-2 rounded-pill bg-grey-soft px-4 py-3">
        <IconSearch size={18} className="text-grey-mid" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => view !== 'search' && setView('search')}
          placeholder="Search chats, messages…  (Ctrl+K)"
          className="w-full bg-transparent text-body-l text-ink outline-none placeholder:text-grey-mid"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-body-s font-semibold text-grey-mid">
            Clear
          </button>
        )}
      </div>

      {/* Filter pills */}
      {!q && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 beam-scroll">
          <Pill active>All</Pill>
          <Pill>Unread</Pill>
          <Pill>Groups</Pill>
          <Pill>Pinned</Pill>
        </div>
      )}

      {/* List */}
      <div className="beam-scroll -mx-1 flex-1 space-y-2.5 overflow-y-auto px-1 pb-40">
        {q && msgHits.length > 0 && (
          <>
            <p className="px-1 pb-1 pt-2 text-body-s font-semibold uppercase tracking-wide text-grey-mid">
              Messages
            </p>
            {msgHits.map((m) => {
              const chat = chats.find((c) => c.id === m.chatId)
              if (!chat) return null
              return (
                <button
                  key={m.id}
                  onClick={() => openChat(m.chatId)}
                  className="flex w-full items-center gap-3 rounded-ctrl bg-white/70 p-3 text-left hover:bg-white"
                >
                  <Avatar name={chat.name} color={chat.color} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-s font-bold text-ink">{chat.name}</p>
                    <p className="truncate text-body-s text-grey-mid">
                      {highlight(m.text, q)}
                    </p>
                  </div>
                </button>
              )
            })}
            <p className="px-1 pb-1 pt-3 text-body-s font-semibold uppercase tracking-wide text-grey-mid">
              Chats
            </p>
          </>
        )}

        {list.map((chat, i) => (
          <ChatCard
            key={chat.id}
            chat={chat}
            last={lastByChat[chat.id]}
            unread={unreadByChat[chat.id] ?? 0}
            active={chat.id === activeChatId}
            authorName={
              lastByChat[chat.id]
                ? users[lastByChat[chat.id]!.authorId]?.name.split(' ')[0]
                : ''
            }
            online={chat.kind === 'dm' ? online[chat.members.find((m) => m !== 'me')!] : undefined}
            index={i}
            onClick={() => openChat(chat.id)}
          />
        ))}

        {list.length === 0 && (
          <div className="mt-10 text-center text-body-s text-grey-mid">No results.</div>
        )}
      </div>
    </div>
  )
}

function ChatCard({
  chat,
  last,
  unread,
  active,
  authorName,
  online,
  index,
  onClick,
}: {
  chat: Chat
  last?: Message
  unread: number
  active: boolean
  authorName?: string
  online?: boolean
  index: number
  onClick: () => void
}) {
  const preview = previewText(last)
  const mine = last?.authorId === 'me'
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
      onClick={onClick}
      className={`group relative flex w-full items-start gap-3 rounded-card p-4 text-left transition-all ${
        active ? 'bg-black text-white shadow-lift' : 'bg-white/75 hover:bg-white'
      }`}
    >
      <Avatar name={chat.name} color={chat.color} size={48} online={online} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-section ${active ? 'text-white' : 'text-black'}`}>
            {chat.name}
          </span>
          <span className={`shrink-0 text-body-s ${active ? 'text-white/60' : 'text-grey-mid'}`}>
            {last ? relative(last.createdAt) : ''}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {mine && (
            <IconChecks
              size={16}
              className={last?.status === 'read' ? 'text-lime' : active ? 'text-white/50' : 'text-grey-mid'}
            />
          )}
          <span
            className={`truncate text-body-s ${
              active ? 'text-white/75' : 'text-grey-mid'
            }`}
          >
            {chat.typing ? (
              <span className="font-semibold text-green-500">typing…</span>
            ) : (
              <>
                {chat.kind === 'group' && authorName && !mine ? `${authorName}: ` : ''}
                {preview}
              </>
            )}
          </span>
        </div>
      </div>
      {unread > 0 && (
        <span className="ml-1 mt-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-lime px-1.5 text-body-s font-bold text-black">
          {unread}
        </span>
      )}
      {chat.pinned && unread === 0 && (
        <span className={`mt-1.5 text-body-s ${active ? 'text-white/40' : 'text-grey-mid'}`}>📌</span>
      )}
    </motion.button>
  )
}

function previewText(m?: Message): string {
  if (!m) return 'No messages yet'
  if (m.deleted) return 'Message deleted'
  if (m.attachments?.length) {
    const a = m.attachments[0]
    if (a.kind === 'image') return '📷 Photo'
    if (a.kind === 'voice') return '🎙️ Voice message'
    return `📎 ${a.name}`
  }
  return m.text
}

function highlight(text: string, q: string) {
  const idx = text.toLowerCase().indexOf(q)
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-lime/60 px-0.5 text-ink">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}
