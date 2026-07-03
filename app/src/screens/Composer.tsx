import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import { IconClose, IconMic, IconPaperclip, IconPlus, IconReply, IconSend } from '../components/Icons'
import { secs } from '../lib/format'
import type { Attachment } from '../types'

let ac = 0

export default function Composer({ chatId }: { chatId: string }) {
  const users = useStore((s) => s.users)
  const replyTo = useStore((s) => s.replyTo)
  const setReplyTo = useStore((s) => s.setReplyTo)
  const sendMessage = useStore((s) => s.sendMessage)
  const chats = useStore((s) => s.chats)
  const setDraft = useStore((s) => s.setDraft)

  const draft = chats.find((c) => c.id === chatId)?.draft ?? ''
  const [text, setText] = useState(draft)
  const [atts, setAtts] = useState<Attachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSecs, setRecSecs] = useState(0)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recTimer = useRef<number>()

  // reset composer when switching chats
  useEffect(() => {
    setText(chats.find((c) => c.id === chatId)?.draft ?? '')
    setAtts([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId])

  useEffect(() => {
    const ta = taRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
    }
  }, [text])

  const send = () => {
    if (!text.trim() && atts.length === 0) return
    sendMessage(chatId, text, atts.length ? atts : undefined)
    setText('')
    setAtts([])
    setDraft(chatId, '')
  }

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const next: Attachment[] = []
    for (const f of Array.from(files)) {
      const isImg = f.type.startsWith('image/')
      next.push({
        id: `att-${ac++}`,
        kind: isImg ? 'image' : 'file',
        name: f.name,
        size: f.size,
        url: isImg
          ? `linear-gradient(135deg, hsl(${(ac * 47) % 360} 80% 60%), #0a0a0a)`
          : undefined,
      })
    }
    setAtts((a) => [...a, ...next])
  }

  const startRec = () => {
    setRecording(true)
    setRecSecs(0)
    recTimer.current = window.setInterval(() => setRecSecs((s) => s + 1), 1000)
  }
  const stopRec = (sendIt: boolean) => {
    clearInterval(recTimer.current)
    setRecording(false)
    if (sendIt && recSecs > 0) {
      const wf = Array.from({ length: 44 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 0.6)) * 0.6)
      sendMessage(chatId, '', [
        { id: `att-${ac++}`, kind: 'voice', name: 'voice.ogg', duration: recSecs, waveform: wf },
      ])
    }
    setRecSecs(0)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[104px]">
      <div className="pointer-events-auto mx-auto max-w-[680px]">
        {/* reply preview */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="glass mb-2 flex items-center gap-2 rounded-ctrl border border-black/5 px-4 py-2.5"
            >
              <IconReply size={18} className="text-black" />
              <div className="min-w-0 flex-1 border-l-2 border-lime pl-2">
                <p className="text-body-s font-bold text-black">
                  {users[replyTo.authorId]?.name ?? 'Unknown'}
                </p>
                <p className="truncate text-body-s text-grey-mid">{replyTo.text || 'Attachment'}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-grey-mid hover:text-black">
                <IconClose size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* attachment chips */}
        <AnimatePresence>
          {atts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="glass mb-2 flex gap-2 overflow-x-auto rounded-ctrl border border-black/5 p-2 beam-scroll"
            >
              {atts.map((a) => (
                <div
                  key={a.id}
                  className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-btn bg-grey-soft"
                  style={a.kind === 'image' ? { background: a.url } : undefined}
                >
                  {a.kind !== 'image' && <IconPaperclip size={20} className="text-grey-mid" />}
                  <button
                    onClick={() => setAtts((x) => x.filter((y) => y.id !== a.id))}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white"
                  >
                    <IconClose size={12} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* main bar */}
        {recording ? (
          <div className="glass flex items-center gap-3 rounded-pill border border-black/5 px-4 py-3">
            <span className="flex h-3 w-3 items-center justify-center">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            </span>
            <span className="flex-1 font-mono text-body-l font-semibold text-ink">
              Recording… {secs(recSecs)}
            </span>
            <button
              onClick={() => stopRec(false)}
              className="rounded-pill px-3 py-1.5 text-body-s font-bold text-grey-mid"
            >
              Cancel
            </button>
            <button
              onClick={() => stopRec(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-lime"
            >
              <IconSend size={20} />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              addFiles(e.dataTransfer.files)
            }}
            className={`glass flex items-end gap-2 rounded-[28px] border p-2 transition-colors ${
              dragOver ? 'border-lime bg-lime/20' : 'border-black/5'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grey-soft text-ink transition hover:bg-[#e6e6e6]"
              title="Attach file"
            >
              <IconPlus size={22} />
            </button>
            <textarea
              ref={taRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setDraft(chatId, e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={dragOver ? 'Drop files to send' : 'Message…'}
              className="beam-scroll max-h-[140px] flex-1 resize-none bg-transparent py-2.5 text-body-l text-ink outline-none placeholder:text-grey-mid"
            />
            {text.trim() || atts.length ? (
              <button
                onClick={send}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-lime transition active:scale-95"
                title="Send (Enter)"
              >
                <IconSend size={20} />
              </button>
            ) : (
              <button
                onClick={startRec}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grey-soft text-ink transition hover:bg-[#e6e6e6]"
                title="Record voice"
              >
                <IconMic size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
