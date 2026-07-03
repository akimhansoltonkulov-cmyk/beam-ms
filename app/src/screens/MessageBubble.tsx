import { useState } from 'react'
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
  const users = useStore((s) => s.users)
  const messages = useStore((s) => s.messages)
  const setReplyTo = useStore((s) => s.setReplyTo)
  const editMessage = useStore((s) => s.editMessage)
  const deleteMessage = useStore((s) => s.deleteMessage)
  const togglePin = useStore((s) => s.togglePin)
  const react = useStore((s) => s.react)

  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.text)

  const mine = message.authorId === 'me'
  const author = users[message.authorId]
  const replyTo = message.replyToId ? messages.find((m) => m.id === message.replyToId) : undefined

  if (message.deleted) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className="rounded-card bg-black/5 px-4 py-2 text-body-s italic text-grey-mid">
          Message deleted
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
      className={`group flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseLeave={() => setMenu(false)}
    >
      {!mine && (
        <div className="w-8 shrink-0">
          {!grouped && <Avatar name={author?.name ?? '?'} color={author?.color ?? '#ccc'} size={32} />}
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
            className={`relative overflow-hidden px-4 py-2.5 shadow-card ${
              mine
                ? 'rounded-card rounded-br-lg bg-black text-white'
                : 'rounded-card rounded-bl-lg bg-white text-ink'
            }`}
          >
            {/* reply quote */}
            {replyTo && (
              <div
                className={`mb-1.5 rounded-btn border-l-2 px-2.5 py-1 text-body-s ${
                  mine ? 'border-lime bg-white/10' : 'border-black bg-black/5'
                }`}
              >
                <p className={`font-bold ${mine ? 'text-lime' : 'text-black'}`}>
                  {users[replyTo.authorId]?.name ?? 'Unknown'}
                </p>
                <p className={`truncate ${mine ? 'text-white/70' : 'text-grey-mid'}`}>
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
                  className="w-64 resize-none rounded-btn bg-white/15 p-2 text-body-l outline-none"
                  rows={2}
                />
                <div className="flex justify-end gap-2 text-body-s font-semibold">
                  <button onClick={() => setEditing(false)} className="opacity-70">
                    Cancel
                  </button>
                  <button onClick={saveEdit} className={mine ? 'text-lime' : 'text-black'}>
                    Save
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
              className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
                mine ? 'text-white/55' : 'text-grey-mid'
              }`}
            >
              {message.editedAt && <span>edited</span>}
              <span>{timeOf(message.createdAt)}</span>
              {mine && <StatusTick status={message.status} />}
            </div>
          </motion.div>

          {/* hover action rail */}
          <div
            className={`absolute top-1/2 hidden -translate-y-1/2 group-hover:flex ${
              mine ? '-left-2 -translate-x-full' : '-right-2 translate-x-full'
            } items-center gap-1`}
          >
            <ActionBtn title="Reply" onClick={() => setReplyTo(message)}>
              <IconReply size={16} />
            </ActionBtn>
            <ActionBtn title="React" onClick={() => setMenu((v) => !v)}>
              <span className="text-sm">😀</span>
            </ActionBtn>
            <ActionBtn title="Pin" onClick={() => togglePin(message.id)}>
              <IconPin size={16} />
            </ActionBtn>
            {mine && (
              <>
                <ActionBtn title="Edit" onClick={() => setEditing(true)}>
                  <IconEdit size={16} />
                </ActionBtn>
                <ActionBtn title="Delete" onClick={() => deleteMessage(message.id, true)}>
                  <IconTrash size={16} />
                </ActionBtn>
              </>
            )}
            {!mine && (
              <ActionBtn title="Forward">
                <IconForward size={16} />
              </ActionBtn>
            )}
          </div>

          {/* reaction picker */}
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute z-20 flex gap-1 rounded-pill bg-white p-1.5 shadow-lift ${
                  mine ? 'right-0 top-full mt-1' : 'left-0 top-full mt-1'
                }`}
              >
                {REACTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      react(message.id, r)
                      setMenu(false)
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
                  ids.includes('me') ? 'bg-lime text-black' : 'bg-white text-ink'
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
  return <IconChecks size={16} className="text-lime" />
}

function AttachmentView({ att, mine }: { att: Attachment; mine: boolean }) {
  if (att.kind === 'image') {
    return (
      <div
        className="mb-1.5 h-56 w-72 max-w-full overflow-hidden rounded-ctrl"
        style={{ background: att.url }}
      >
        <div className="halftone-lime h-full w-full opacity-30" />
      </div>
    )
  }
  if (att.kind === 'voice') {
    return <Waveform data={att.waveform ?? []} duration={att.duration ?? 0} mine={mine} />
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
      <button
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          mine ? 'bg-lime text-black' : 'bg-black text-lime'
        }`}
      >
        <IconDownload size={17} />
      </button>
    </div>
  )
}

function shade(_color?: string): string {
  return '#0a0a0a'
}
