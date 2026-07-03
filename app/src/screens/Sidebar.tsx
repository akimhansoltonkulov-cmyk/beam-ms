import { useMemo, useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { Avatar, IconButton, Pill } from '../components/ui'
import { IconChecks, IconGrid, IconSearch, IconPlus } from '../components/Icons'
import { relative } from '../lib/format'
import type { Chat, Message } from '../types'
import { useTranslation } from '../lib/i18n'

export default function Sidebar() {
  const { t } = useTranslation()
  const addContact = useStore((s) => s.addContact)
  const searchUsers = useStore((s) => s.searchUsers)
  const startChat = useStore((s) => s.startChat)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newContactPhone, setNewContactPhone] = useState('')
  const [dirLoading, setDirLoading] = useState(false)

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

  const meId = useStore((s) => s.me?.id)
  const unreadByChat = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of messages)
      if (m.authorId !== 'me' && m.authorId !== meId && m.status !== 'read' && m.chatId !== activeChatId)
        map[m.chatId] = (map[m.chatId] ?? 0) + 1
    return map
  }, [messages, activeChatId, meId])

  const togglePinChat = useStore((s) => s.togglePinChat)
  const archiveChat = useStore((s) => s.archiveChat)
  const deleteChat = useStore((s) => s.deleteChat)

  const q = search.trim().toLowerCase()
  const searching = view === 'search'
  const list = useMemo(() => {
    let arr = chats.filter((c) => !(c as any).archived)
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

  const contactsList = useMemo(() => {
    let arr = Object.values(users).filter((u) => u.id !== 'me' && u.id !== 'team')
    if (q) {
      arr = arr.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.handle.toLowerCase().includes(q)
      )
    }
    return arr.sort((a, b) => a.name.localeCompare(b.name))
  }, [users, q])

  // Global directory search — find registered users by @nickname or name (Supabase)
  useEffect(() => {
    if (!searching || q.length < 2) {
      setDirLoading(false)
      return
    }
    setDirLoading(true)
    const h = setTimeout(async () => {
      await searchUsers(q)
      setDirLoading(false)
    }, 350)
    return () => clearTimeout(h)
  }, [q, searching, searchUsers])

  // message hits for global search
  const msgHits = useMemo(() => {
    if (!q) return []
    return messages
      .filter((m) => m.text.toLowerCase().includes(q))
      .slice(-8)
      .reverse()
  }, [messages, q])

  return (
    <div className="flex h-full flex-col px-4 pt-4 relative">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-section text-black">{searching ? t('contacts') : t('messages')}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-body-s font-semibold text-grey-mid">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Binary link · {t('online')}
          </p>
        </div>
        <div className="flex gap-2">
          {searching ? (
            <IconButton title={t('add_contact')} onClick={() => setShowAddModal(true)}>
              <IconPlus size={18} />
            </IconButton>
          ) : (
            <IconButton title={t('new_chat')}>
              <IconGrid size={18} />
            </IconButton>
          )}
        </div>
      </div>

      {/* Search box */}
      <div className="mb-3 flex items-center gap-2 rounded-pill bg-grey-soft px-4 py-3">
        <IconSearch size={18} className="text-grey-mid" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => view !== 'search' && setView('search')}
          placeholder={searching ? t('search_contacts_ph') : t('search_placeholder')}
          className="w-full bg-transparent text-body-l text-ink outline-none placeholder:text-grey-mid"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-body-s font-semibold text-grey-mid">
            {t('clear')}
          </button>
        )}
      </div>

      {/* Filter pills */}
      {!q && !searching && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 beam-scroll">
          <Pill active>{t('all')}</Pill>
          <Pill>{t('unread')}</Pill>
          <Pill>{t('groups')}</Pill>
          <Pill>{t('pinned')}</Pill>
        </div>
      )}

      {/* Add Contact Modal overlay */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-5 rounded-[40px]">
          <div className="w-full max-w-[320px] rounded-card bg-white p-5 shadow-lift">
            <h3 className="text-section text-black mb-3">{t('add_contact_title')}</h3>
            <input
              autoFocus
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              placeholder="+996 555 000 123  ·  @nickname"
              className="w-full rounded-ctrl bg-grey-soft px-4 py-3 text-body-l font-medium text-ink outline-none mb-4"
            />
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-pill bg-grey-soft py-2.5 text-body-s font-bold text-ink hover:bg-grey-soft/85 transition"
              >
                {t('close')}
              </button>
              <button
                onClick={async () => {
                  if (!newContactPhone.trim()) return
                  const res = await addContact(newContactPhone)
                  if (res.success) {
                    setShowAddModal(false)
                    setNewContactPhone('')
                  } else {
                    alert(t('user_not_found'))
                  }
                }}
                className="flex-1 rounded-pill bg-black py-2.5 text-body-s font-bold text-lime hover:opacity-90 transition"
              >
                {t('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="beam-scroll -mx-1 flex-1 space-y-2.5 overflow-y-auto px-1 pb-40">
        {searching ? (
          <>
            {contactsList.map((contact) => (
              <button
                key={contact.id}
                onClick={() => startChat(contact.id)}
                className="flex w-full items-center gap-3 rounded-card bg-white/75 px-3 py-2.5 text-left hover:bg-white transition-all"
              >
                <Avatar name={contact.name} color={contact.color} size={46} url={contact.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="text-body-l font-semibold text-ink">{contact.name}</p>
                  <p className="text-body-s text-grey-mid">{contact.handle}</p>
                </div>
              </button>
            ))}

            {contactsList.length === 0 && (
              <div className="mt-10 flex flex-col items-center gap-2 text-center text-body-s text-grey-mid">
                {dirLoading ? (
                  <>
                    <span className="beam-spin inline-block h-5 w-5 rounded-full border-2 border-grey-mid border-t-transparent" />
                    {t('searching_dir')}
                  </>
                ) : q.length >= 2 ? (
                  t('no_results')
                ) : (
                  t('search_hint')
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {q && msgHits.length > 0 && (
              <>
                <p className="px-1 pb-1 pt-2 text-body-s font-semibold uppercase tracking-wide text-grey-mid">
                  {t('messages')}
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
                    ? users[lastByChat[chat.id]!.authorId]?.name?.split(' ')[0] || ''
                    : ''
                }
                online={chat.kind === 'dm' ? online[chat.members.find((m) => m !== 'me' && m !== meId)!] : undefined}
                index={i}
                onClick={() => openChat(chat.id)}
                togglePinChat={togglePinChat}
                archiveChat={archiveChat}
                deleteChat={deleteChat}
              />
            ))}

            {list.length === 0 && (
              <div className="mt-10 text-center text-body-s text-grey-mid">{t('no_results')}</div>
            )}
          </>
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
  togglePinChat,
  archiveChat,
  deleteChat,
}: {
  chat: Chat
  last?: Message
  unread: number
  active: boolean
  authorName?: string
  online?: boolean
  index: number
  onClick: () => void
  togglePinChat: (chatId: string) => void
  archiveChat: (chatId: string) => void
  deleteChat: (chatId: string) => void
}) {
  const { t, lang: currentLang } = useTranslation()
  const meIdCard = useStore((s) => s.me?.id)
  const preview = previewText(last, t)
  const mine = last?.authorId === 'me' || last?.authorId === meIdCard
  const [showMenu, setShowMenu] = useState(false)
  const [confirmModal, setConfirmModal] = useState<'block' | 'delete' | null>(null)
  const timerRef = useRef<number>()

  useEffect(() => {
    if (!showMenu) return
    let active = false
    const tId = setTimeout(() => {
      active = true
    }, 100)
    const close = () => {
      if (active) setShowMenu(false)
    }
    window.addEventListener('click', close)
    return () => {
      clearTimeout(tId)
      window.removeEventListener('click', close)
    }
  }, [showMenu])

  const handleStart = () => {
    timerRef.current = window.setTimeout(() => {
      setShowMenu(true)
    }, 600)
  }

  const handleEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const me = useStore((s) => s.me)
  const users = useStore((s) => s.users)
  const otherUserId = chat.kind === 'dm' ? chat.members.find((m) => m !== 'me' && m !== me?.id) : undefined
  const avatarUrl = otherUserId ? users[otherUserId]?.avatar : chat.avatar

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
      onClick={(e) => {
        if (showMenu) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        onClick()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        setShowMenu(true)
      }}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchMove={handleEnd}
      className={`group relative flex w-full items-start gap-3 rounded-card p-4 text-left transition-all cursor-pointer ${
        active ? 'bg-black text-white shadow-lift' : 'bg-white/75 hover:bg-white'
      }`}
    >
      <Avatar name={chat.name} color={chat.color} size={48} online={online} url={avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-subtitle ${active ? 'text-white' : 'text-black'}`}>
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
              <span className="font-semibold text-green-500">{t('typing')}</span>
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

      {/* Context Menu Dropdown */}
      {showMenu && (
        <div className="absolute right-4 top-12 z-50 w-44 rounded-card bg-white p-1.5 shadow-lift border border-black/5 text-black">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(false)
              togglePinChat(chat.id)
            }}
            className="flex w-full items-center px-3 py-2 text-body-s font-semibold rounded-ctrl hover:bg-grey-soft transition-colors"
          >
            {chat.pinned
              ? (currentLang === 'ru' ? 'Открепить' : 'Unpin')
              : (currentLang === 'ru' ? 'Закрепить' : 'Pin')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(false)
              archiveChat(chat.id)
            }}
            className="flex w-full items-center px-3 py-2 text-body-s font-semibold rounded-ctrl hover:bg-grey-soft transition-colors"
          >
            {currentLang === 'ru' ? 'В архив' : 'Archive'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(false)
              alert(currentLang === 'ru' ? 'Чат выделен' : 'Chat selected')
            }}
            className="flex w-full items-center px-3 py-2 text-body-s font-semibold rounded-ctrl hover:bg-grey-soft transition-colors"
          >
            {currentLang === 'ru' ? 'Выделить' : 'Select'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(false)
              setConfirmModal('block')
            }}
            className="flex w-full items-center px-3 py-2 text-body-s font-semibold rounded-ctrl hover:bg-grey-soft transition-colors text-red-500 hover:text-red-600"
          >
            {currentLang === 'ru' ? 'Заблокировать' : 'Block'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(false)
              setConfirmModal('delete')
            }}
            className="flex w-full items-center px-3 py-2 text-body-s font-semibold rounded-ctrl hover:bg-grey-soft transition-colors text-red-500 hover:text-red-600"
          >
            {currentLang === 'ru' ? 'Удалить' : 'Delete'}
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-[310px] overflow-hidden rounded-card bg-white p-7 text-black shadow-lift border border-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h3 className="text-section text-ink leading-tight">
                {confirmModal === 'block'
                  ? (currentLang === 'ru' ? 'Заблокировать?' : 'Block User?')
                  : (currentLang === 'ru' ? 'Удалить чат?' : 'Delete Chat?')}
              </h3>
              <p className="mt-2 text-body-s text-grey-mid leading-snug">
                {confirmModal === 'block'
                  ? (currentLang === 'ru'
                      ? 'Вы уверены, что хотите заблокировать этого пользователя?'
                      : 'Are you sure you want to block this user?')
                  : (currentLang === 'ru'
                      ? 'Вы уверены, что хотите удалить этот чат? Это действие нельзя будет отменить.'
                      : 'Are you sure you want to delete this chat? This action cannot be undone.')}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirmModal === 'block') {
                    alert(currentLang === 'ru' ? 'Пользователь заблокирован' : 'User blocked')
                  } else {
                    deleteChat(chat.id)
                  }
                  setConfirmModal(null)
                }}
                className="w-full rounded-pill bg-[#FF3B30] py-3 text-center text-btn text-white transition active:scale-95"
              >
                {confirmModal === 'block'
                  ? (currentLang === 'ru' ? 'Заблокировать' : 'Block')
                  : (currentLang === 'ru' ? 'Удалить' : 'Delete')}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmModal(null)
                }}
                className="w-full rounded-pill bg-grey-soft py-3 text-center text-btn text-ink transition active:scale-95"
              >
                {currentLang === 'ru' ? 'Отменить' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}

function previewText(m?: Message, t: any = (k: string) => k): string {
  if (!m) return t('no_messages')
  if (m.deleted) return t('deleted')
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
