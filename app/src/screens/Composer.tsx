import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import { IconClose, IconMic, IconPaperclip, IconPlus, IconReply, IconSend } from '../components/Icons'
import { secs } from '../lib/format'
import type { Attachment } from '../types'
import { useTranslation } from '../lib/i18n'
import { uploadMedia } from '../lib/supabase'

let ac = 0

export default function Composer({ chatId }: { chatId: string }) {
  const { lang: currentLang } = useTranslation()
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
  const [cancelling, setCancelling] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recTimer = useRef<number>()
  const mediaRec = useRef<MediaRecorder | null>(null)
  const recChunks = useRef<Blob[]>([])
  const recStream = useRef<MediaStream | null>(null)
  const recSecsRef = useRef(0) // duration read from a ref so window listeners aren't stale
  const recStartX = useRef(0)
  const cancellingRef = useRef(false)

  const uploading = atts.some((a) => a.uploading)

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
    if (uploading) return
    if (!text.trim() && atts.length === 0) return
    // strip transient upload flag before sending (undefined is omitted from JSON)
    const clean = atts.map((a) => ({ ...a, uploading: undefined }))
    sendMessage(chatId, text, clean.length ? clean : undefined)
    setText('')
    setAtts([])
    setDraft(chatId, '')
  }

  const addFiles = (files: FileList | null) => {
    if (!files) return
    for (const f of Array.from(files)) {
      const isImg = f.type.startsWith('image/')
      const id = `att-${ac++}`
      // optimistic preview (local blob) while it uploads to storage
      const local = isImg ? URL.createObjectURL(f) : undefined
      setAtts((x) => [
        ...x,
        { id, kind: isImg ? 'image' : 'file', name: f.name, size: f.size, url: local, uploading: true },
      ])
      uploadMedia(f, f.name).then((publicUrl) => {
        setAtts((x) =>
          x.map((a) =>
            a.id === id ? { ...a, url: publicUrl || a.url, uploading: false } : a,
          ),
        )
      })
    }
  }

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recStream.current = stream
      recChunks.current = []
      const rec = new MediaRecorder(stream)
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recChunks.current.push(e.data)
      }
      mediaRec.current = rec
      rec.start()
      setRecording(true)
      setRecSecs(0)
      recSecsRef.current = 0
      recTimer.current = window.setInterval(() => {
        recSecsRef.current += 1
        setRecSecs(recSecsRef.current)
      }, 1000)
    } catch {
      alert(currentLang === 'ru' ? 'Доступ к микрофону заблокирован.' : 'Microphone access denied.')
    }
  }

  const cleanupRec = () => {
    clearInterval(recTimer.current)
    recStream.current?.getTracks().forEach((tr) => tr.stop())
    recStream.current = null
    mediaRec.current = null
  }

  const stopRec = (sendIt: boolean) => {
    const rec = mediaRec.current
    const duration = recSecsRef.current
    setRecording(false)
    setRecSecs(0)
    setCancelling(false)
    if (!rec) {
      cleanupRec()
      return
    }
    rec.onstop = async () => {
      cleanupRec()
      if (!sendIt || duration < 1) return
      const blob = new Blob(recChunks.current, { type: rec.mimeType || 'audio/webm' })
      const publicUrl = await uploadMedia(blob, `voice-${Date.now()}.webm`)
      sendMessage(chatId, '', [
        {
          id: `voice-${ac++}`,
          kind: 'voice',
          name: 'voice.webm',
          url: publicUrl || URL.createObjectURL(blob),
          duration,
          waveform: Array.from({ length: 48 }, () => 0.25 + Math.random() * 0.55),
        },
      ])
    }
    rec.stop()
  }

  // Press-and-hold voice: hold to record, release to send, swipe left to cancel.
  const onMicMove = (e: PointerEvent) => {
    const dx = e.clientX - recStartX.current
    const c = dx < -70
    if (c !== cancellingRef.current) {
      cancellingRef.current = c
      setCancelling(c)
    }
  }
  const onMicUp = () => {
    window.removeEventListener('pointermove', onMicMove)
    window.removeEventListener('pointerup', onMicUp)
    window.removeEventListener('pointercancel', onMicUp)
    stopRec(!cancellingRef.current)
  }
  const onMicDown = (e: React.PointerEvent) => {
    e.preventDefault()
    recStartX.current = e.clientX
    cancellingRef.current = false
    setCancelling(false)
    startRec()
    window.addEventListener('pointermove', onMicMove)
    window.addEventListener('pointerup', onMicUp)
    window.addEventListener('pointercancel', onMicUp)
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4">
      {/* drag overlay visual helper */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 top-0 rounded-[28px] border-2 border-dashed border-lime bg-lime/10" />
      )}

      <div className="mx-auto max-w-[720px]">
        {/* Reply indicator */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="glass mb-2 flex items-center justify-between gap-3 rounded-card border border-black/5 p-3.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <IconReply size={16} className="shrink-0 text-black" />
                <div className="min-w-0 border-l-2 border-black/15 pl-2.5">
                  <p className="text-body-s font-bold text-ink">
                    {users[replyTo.authorId]?.name || 'User'}
                  </p>
                  <p className="truncate text-body-s text-grey-mid">
                    {replyTo.text || (currentLang === 'ru' ? 'Вложение' : 'Attachment')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5"
              >
                <IconClose size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachment preview */}
        <AnimatePresence>
          {atts.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="glass mb-2 flex gap-2 overflow-x-auto rounded-card border border-black/5 p-3"
            >
              {atts.map((a) => (
                <div
                  key={a.id}
                  className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-btn bg-grey-soft"
                >
                  {a.kind === 'image' && a.url ? (
                    <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                  ) : (
                    <IconPaperclip size={20} className="text-grey-mid" />
                  )}
                  {a.uploading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="beam-spin inline-block h-4 w-4 rounded-full border-2 border-lime border-t-transparent" />
                    </span>
                  )}
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
          <div
            className={`glass flex items-center gap-3 rounded-pill border px-4 py-3 transition-colors ${
              cancelling ? 'border-red-400 bg-red-50' : 'border-black/5'
            }`}
          >
            <span className="flex h-3 w-3 items-center justify-center">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            </span>
            <span className="font-mono text-body-l font-semibold text-ink">{secs(recSecs)}</span>
            <span className={`flex-1 truncate text-body-s ${cancelling ? 'font-bold text-red-500' : 'text-grey-mid'}`}>
              {cancelling
                ? currentLang === 'ru' ? 'Отпустите — отмена' : 'Release to cancel'
                : currentLang === 'ru' ? '‹ Влево — отмена' : '‹ Slide to cancel'}
            </span>
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
              title={currentLang === 'ru' ? 'Прикрепить файл' : 'Attach file'}
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
              placeholder={dragOver ? (currentLang === 'ru' ? 'Перетащите файлы сюда' : 'Drop files to send') : (currentLang === 'ru' ? 'Сообщение…' : 'Message…')}
              className="beam-scroll max-h-[140px] flex-1 resize-none bg-transparent py-2.5 text-body-l text-ink outline-none placeholder:text-grey-mid"
            />
            {text.trim() || atts.length ? (
              <button
                onClick={send}
                disabled={uploading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-lime transition active:scale-95 disabled:opacity-50"
                title={currentLang === 'ru' ? 'Отправить (Enter)' : 'Send (Enter)'}
              >
                {uploading ? (
                  <span className="beam-spin inline-block h-4 w-4 rounded-full border-2 border-lime border-t-transparent" />
                ) : (
                  <IconSend size={20} />
                )}
              </button>
            ) : (
              <button
                onPointerDown={onMicDown}
                onContextMenu={(e) => e.preventDefault()}
                style={{ touchAction: 'none' }}
                className="flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-full bg-grey-soft text-ink transition hover:bg-[#e6e6e6] active:scale-95"
                title={currentLang === 'ru' ? 'Зажмите для записи' : 'Hold to record'}
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
