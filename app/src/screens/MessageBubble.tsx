import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import { Avatar } from '../components/ui'
import {
  IconCheck,
  IconChecks,
  IconClock,
  IconDownload,
  IconEdit,
  IconFile,
  IconForward,
  IconPin,
  IconReply,
  IconTrash,
} from '../components/Icons'
import { bytes, timeOf } from '../lib/format'
import type { Attachment, Message } from '../types'
import Waveform from '../components/Waveform'
import { useTranslation } from '../lib/i18n'

const REACTIONS = ['❤️', '🔥', '👍', '😂', '⚡']

export default function MessageBubble({
  message,
  grouped,
  isGroup,
}: {
  message: Message
  grouped: boolean
  isGroup: boolean
}) {
  const { t } = useTranslation()
  const users = useStore((s) => s.users)
  const meId = useStore((s) => s.me?.id)
  const messages = useStore((s) => s.messages)
  const setReplyTo = useStore((s) => s.setReplyTo)
  const editMessage = useStore((s) => s.editMessage)
  const deleteMessage = useStore((s) => s.deleteMessage)
  const togglePin = useStore((s) => s.togglePin)
  const react = useStore((s) => s.react)

  const [menu, setMenu] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.text)
  const timerRef = useRef<number>()

  const mine = message.authorId === 'me' || message.authorId === meId
  const author = users[message.authorId]
  const replyTo = message.replyToId ? messages.find((m) => m.id === message.replyToId) : undefined

  useEffect(() => {
    if (!showActions) return
    let active = false
    const tId = setTimeout(() => {
      active = true
    }, 100)
    const close = () => {
      if (active) {
        setShowActions(false)
        setMenu(false)
      }
    }
    window.addEventListener('click', close)
    return () => {
      clearTimeout(tId)
      window.removeEventListener('click', close)
    }
  }, [showActions])

  const handleStart = () => {
    timerRef.current = window.setTimeout(() => {
      setShowActions(true)
    }, 600)
  }

  const handleEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  if (message.deleted) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className="rounded-card bg-black/5 px-4 py-2 text-body-s italic text-grey-mid">
          {t('deleted')}
        </div>
      </div>
    )
  }

  const saveEdit = () => {
    if (draft.trim()) editMessage(message.id, draft)
    setEditing(false)
  }

  return (
    <div
      className={`group flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'} relative ${showActions ? 'z-50' : 'z-10'} ${!grouped ? 'mt-1.5' : ''}`}
      onContextMenu={(e) => {
        e.preventDefault()
        setShowActions(true)
      }}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchMove={handleEnd}
      onClick={(e) => {
        if (showActions) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      {!mine && (
        <div className="w-8 shrink-0">
          {!grouped && <Avatar name={author?.name ?? '?'} color={author?.color ?? '#ccc'} size={32} url={author?.avatar} />}
        </div>
      )}

      <div className={`relative max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
        {!mine && isGroup && !grouped && (
          <span className="mb-0.5 ml-1 text-body-s font-bold" style={{ color: shade(author?.color) }}>
            {author?.name}
          </span>
        )}

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`relative overflow-hidden px-3.5 py-2 shadow-card ${
              showActions ? 'z-50' : 'z-10'
            } ${
              mine
                ? 'rounded-card rounded-br-lg bg-lime-tint text-ink'
                : 'rounded-card rounded-bl-lg bg-white text-ink'
            }`}
          >
            {/* reply quote */}
            {replyTo && (
              <div
                className={`mb-1.5 rounded-btn border-l-2 px-2.5 py-1 text-body-s ${
                  mine ? 'border-black bg-black/5' : 'border-black bg-black/5'
                }`}
              >
                <p className={`font-bold ${mine ? 'text-black' : 'text-black'}`}>
                  {users[replyTo.authorId]?.name ?? 'Unknown'}
                </p>
                <p className={`truncate ${mine ? 'text-black/75' : 'text-grey-mid'}`}>
                  {replyTo.text || 'Attachment'}
                </p>
              </div>
            )}

            {/* attachments */}
            {message.attachments?.map((a) => (
              <AttachmentView key={a.id} att={a} mine={mine} />
            ))}

            {/* text / editor */}
            {editing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      saveEdit()
                    }
                    if (e.key === 'Escape') setEditing(false)
                  }}
                  className="w-64 resize-none rounded-btn bg-black/5 p-2 text-body-l outline-none"
                  rows={2}
                />
                <div className="flex justify-end gap-2 text-body-s font-semibold">
                  <button onClick={() => setEditing(false)} className="opacity-70">
                    {t('cancel')}
                  </button>
                  <button onClick={saveEdit} className="text-black">
                    {t('save')}
                  </button>
                </div>
              </div>
            ) : (
              message.text && (
                <p className="whitespace-pre-wrap break-words text-body-l leading-relaxed">
                  {message.text}
                </p>
              )
            )}

            {/* meta row */}
            <div
              className="mt-1 flex items-center justify-end gap-1 text-[11px] text-grey-mid"
            >
              {message.editedAt && <span>edited</span>}
              <span>{timeOf(message.createdAt)}</span>
              {mine && <StatusTick status={message.status} />}
            </div>
          </motion.div>

          {/* Background Dim & Blur Overlay */}
          {showActions && (
            <div
              className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[2.5px]"
              onClick={() => {
                setShowActions(false)
                setMenu(false)
              }}
            />
          )}

          {/* Action Rail (White circles) */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className={`absolute -top-[48px] z-50 flex items-center gap-1.5 ${mine ? 'right-0' : 'left-0'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ActionBtn title="Reply" onClick={() => { setReplyTo(message); setShowActions(false); }}>
                  <IconReply size={16} />
                </ActionBtn>
                <ActionBtn title="React" onClick={() => setMenu((v) => !v)}>
                  <span className="text-sm">😀</span>
                </ActionBtn>
                <ActionBtn title="Pin" onClick={() => { togglePin(message.id); setShowActions(false); }}>
                  <IconPin size={16} />
                </ActionBtn>
                {mine && (
                  <>
                    <ActionBtn title="Edit" onClick={() => { setEditing(true); setShowActions(false); }}>
                      <IconEdit size={16} />
                    </ActionBtn>
                    <ActionBtn title="Delete" onClick={() => { deleteMessage(message.id, true); setShowActions(false); }}>
                      <IconTrash size={16} />
                    </ActionBtn>
                  </>
                )}
                {!mine && (
                  <ActionBtn title="Forward" onClick={() => setShowActions(false)}>
                    <IconForward size={16} />
                  </ActionBtn>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* reaction picker */}
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute z-50 flex gap-1 rounded-pill bg-white p-1.5 shadow-lift ${
                  mine ? 'right-0 -top-14' : 'left-0 -top-14'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {REACTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      react(message.id, r)
                      setMenu(false)
                      setShowActions(false)
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:scale-125 hover:bg-grey-soft"
                  >
                    {r}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(message.reactions).map(([emoji, ids]) => (
              <button
                key={emoji}
                onClick={() => react(message.id, emoji)}
                className={`flex items-center gap-1 rounded-pill px-2 py-0.5 text-body-s font-semibold ${
                  ids.includes('me') || (meId && ids.includes(meId)) ? 'bg-lime text-black' : 'bg-white text-ink'
                }`}
              >
                <span>{emoji}</span>
                <span>{ids.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode
  onClick?: () => void
  title: string
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-card transition hover:bg-lime"
    >
      {children}
    </button>
  )
}

function StatusTick({ status }: { status: Message['status'] }) {
  if (status === 'sending') return <IconClock size={13} />
  if (status === 'sent') return <IconCheck size={13} />
  if (status === 'delivered') return <IconChecks size={16} />
  return <IconChecks size={16} className="text-green-500" />
}

function AttachmentView({ att, mine }: { att: Attachment; mine: boolean }) {
  if (att.kind === 'image') {
    const isUrl = att.url && (att.url.startsWith('http') || att.url.startsWith('blob:') || att.url.startsWith('data:'))
    return (
      <div className="mb-1.5 h-56 w-72 max-w-full overflow-hidden rounded-ctrl bg-grey-soft">
        {isUrl ? (
          <a href={att.url} target="_blank" rel="noreferrer">
            <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
          </a>
        ) : (
          <div className="halftone-lime h-full w-full opacity-30" style={{ background: att.url }} />
        )}
      </div>
    )
  }
  if (att.kind === 'voice') {
    return <Waveform data={att.waveform ?? []} duration={att.duration ?? 0} mine={mine} src={att.url} />
  }
  return (
    <div
      className={`mb-1 flex items-center gap-3 rounded-ctrl p-2.5 ${
        mine ? 'bg-white/10' : 'bg-grey-soft'
      }`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-btn bg-lime text-black">
        <IconFile size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-l font-semibold">{att.name}</p>
        <p className={`text-body-s ${mine ? 'text-white/60' : 'text-grey-mid'}`}>{bytes(att.size)}</p>
      </div>
      <a
        href={att.url || undefined}
        download={att.name}
        target="_blank"
        rel="noreferrer"
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          mine ? 'bg-lime text-black' : 'bg-black text-lime'
        } ${!att.url ? 'pointer-events-none opacity-50' : ''}`}
      >
        <IconDownload size={17} />
      </a>
    </div>
  )
}

function shade(_color?: string): string {
  return '#0a0a0a'
}
