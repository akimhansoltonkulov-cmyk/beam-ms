import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import { Avatar, IconButton } from '../components/ui'
import { IconBack, IconBolt, IconDots, IconPin, IconSearch } from '../components/Icons'
import { dayLabel } from '../lib/format'
import type { Message } from '../types'
import MessageBubble from './MessageBubble'
import Composer from './Composer'
import { useTranslation } from '../lib/i18n'

export default function ChatWindow() {
  const { t, lang: currentLang } = useTranslation()
  const me = useStore((s) => s.me)
  const activeChatId = useStore((s) => s.activeChatId)
  const chats = useStore((s) => s.chats)
  const messages = useStore((s) => s.messages)
  const users = useStore((s) => s.users)
  const online = useStore((s) => s.online)
  const openChat = useStore((s) => s.openChat)

  const chat = chats.find((c) => c.id === activeChatId)
  const scrollRef = useRef<HTMLDivElement>(null)

  const chatMessages = useMemo(
    () => messages.filter((m) => m.chatId === activeChatId).sort((a, b) => a.createdAt - b.createdAt),
    [messages, activeChatId],
  )
  const pinned = useMemo(() => chatMessages.filter((m) => m.pinned && !m.deleted), [chatMessages])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [chatMessages.length, chat?.typing])

  if (!chat) return <EmptyState />

  const other = chat.kind === 'dm' ? users[chat.members.find((m) => m !== 'me' && m !== me?.id)!] : undefined
  const isOnline = other ? online[other.id] : undefined

  // group by day
  const groups: { day: string; items: Message[] }[] = []
  for (const m of chatMessages) {
    const d = dayLabel(m.createdAt)
    const g = groups[groups.length - 1]
    if (g && g.day === d) g.items.push(m)
    else groups.push({ day: d, items: [m] })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="glass z-10 flex items-center justify-between border-b border-black/5 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => openChat(null)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
          >
            <IconBack size={22} />
          </button>
          <Avatar name={chat.name} color={chat.color} size={40} online={isOnline} />
          <div className="ml-2 min-w-0 flex-1">
            <h2 className="truncate text-subtitle text-black">{chat.name}</h2>
            <p className="truncate text-body-s text-grey-mid mt-0.5">
              {chat.typing ? (
                <span className="font-semibold text-green-600">{t('typing')}</span>
              ) : chat.kind === 'group' ? (
                currentLang === 'ru' ? `${chat.members.length} участников` : `${chat.members.length} members`
              ) : isOnline ? (
                t('online')
              ) : (
                t('last_seen')
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <IconButton title={currentLang === 'ru' ? 'Поиск в чате' : 'Search in chat'} size={40}>
            <IconSearch size={19} />
          </IconButton>
          <IconButton title={currentLang === 'ru' ? 'Ещё' : 'More'} size={40}>
            <IconDots size={19} />
          </IconButton>
        </div>
      </div>

      {/* Pinned bar */}
      {pinned.length > 0 && (
        <div className="glass flex items-center gap-2 border-b border-black/5 px-5 py-2.5">
          <IconPin size={16} className="text-black" />
          <span className="truncate text-body-s text-ink">
            <b className="font-semibold">{t('pinned_bar')}</b> {pinned[pinned.length - 1].text || (currentLang === 'ru' ? 'Вложение' : 'Attachment')}
          </span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="beam-scroll relative flex-1 overflow-y-auto px-4 py-4">
        {/* subtle dotted texture backdrop */}
        <div className="halftone pointer-events-none absolute inset-0 opacity-[0.06]" />
        <div className="relative mx-auto flex max-w-[720px] flex-col gap-[2px] pb-44">
          <SecurityBanner kind={chat.kind} />
          {groups.map((g) => (
            <div key={g.day} className="flex flex-col gap-[2px]">
              <div className="my-2 flex justify-center">
                <span className="rounded-pill bg-black/70 px-3 py-1 text-body-s font-semibold text-white">
                  {g.day}
                </span>
              </div>
              {g.items.map((m, i) => {
                const prev = g.items[i - 1]
                const grouped = prev && prev.authorId === m.authorId && m.createdAt - prev.createdAt < 120000
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    grouped={!!grouped}
                    isGroup={chat.kind === 'group'}
                  />
                )
              })}
            </div>
          ))}
          <AnimatePresence>{chat.typing && <TypingBubble color={chat.color} name={chat.name} />}</AnimatePresence>
        </div>
      </div>

      {/* Composer */}
      <Composer chatId={chat.id} />
    </div>
  )
}

function SecurityBanner({ kind }: { kind: 'dm' | 'group' }) {
  const { lang: currentLang } = useTranslation()
  return (
    <div className="mx-auto mb-3 flex max-w-[420px] items-center gap-2 rounded-ctrl bg-lime/25 px-4 py-2.5 text-center">
      <IconBolt size={16} className="shrink-0 text-black" />
      <p className="text-body-s text-ink">
        {currentLang === 'ru'
          ? (kind === 'dm'
            ? 'Сообщения в этом чате проходят по бинарному каналу Beam. Метаданные не сохраняются.'
            : 'Сообщения в этой группе проходят по бинарному каналу Beam. Метаданные не сохраняются.')
          : (kind === 'dm'
            ? 'Messages in this chat travel over Beam’s binary channel. No metadata is retained.'
            : 'Messages in this group travel over Beam’s binary channel. No metadata is retained.')}
      </p>
    </div>
  )
}

function TypingBubble({ color, name }: { color: string; name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-end gap-2"
    >
      <Avatar name={name} color={color} size={30} />
      <div className="flex items-center gap-1 rounded-card rounded-bl-md bg-white px-4 py-3.5 shadow-card">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="typing-dot h-2 w-2 rounded-full bg-grey-mid"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </motion.div>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden text-center">
      <div className="halftone pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="relative flex h-24 w-24 items-center justify-center rounded-[30px] bg-black">
        <span className="text-5xl font-extrabold text-lime">B</span>
      </div>
      <h2 className="mt-6 text-display text-black">{t('select_chat')}</h2>
      <p className="mt-2 max-w-[320px] text-body-s text-grey-mid">
        {t('pick_conversation')}
      </p>
      <div className="mt-5 flex items-center gap-2 rounded-pill bg-white/70 px-4 py-2 text-body-s font-semibold text-ink">
        <IconBolt size={15} /> {t('press_ctrl_k')}
      </div>
    </div>
  )
}
