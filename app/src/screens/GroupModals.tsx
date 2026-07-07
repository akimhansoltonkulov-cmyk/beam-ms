import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { Avatar } from '../components/ui'
import { IconCheck, IconClose, IconTrash } from '../components/Icons'
import { useTranslation } from '../lib/i18n'

const PALETTE = ['#FF5A1A', '#B9E36B', '#7FC8F8', '#F5A9C5', '#C9A7F0', '#FF3B30', '#34C759', '#000000']

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/45 sm:items-center sm:rounded-[40px]">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[400px] max-h-[88%] overflow-y-auto beam-scroll rounded-t-[28px] bg-white p-5 shadow-lift sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  )
}

function MemberPicker({
  selected,
  toggle,
}: {
  selected: Set<string>
  toggle: (id: string) => void
}) {
  const { lang } = useTranslation()
  const users = useStore((s) => s.users)
  const meId = useStore((s) => s.me?.id)
  const contacts = Object.values(users).filter((u) => u.id !== 'me' && u.id !== 'team' && u.id !== meId)

  return (
    <div>
      <p className="mb-2 text-body-s font-semibold text-grey-mid">
        {lang === 'ru' ? 'Участники' : 'Members'} · {selected.size}
      </p>
      <div className="space-y-1.5">
        {contacts.length === 0 && (
          <p className="py-3 text-center text-body-s text-grey-mid">
            {lang === 'ru' ? 'Нет контактов. Добавьте их в разделе Контакты.' : 'No contacts yet. Add some under Contacts.'}
          </p>
        )}
        {contacts.map((u) => {
          const on = selected.has(u.id)
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => toggle(u.id)}
              className="flex w-full items-center gap-3 rounded-ctrl bg-grey-soft px-3 py-2 text-left transition hover:bg-[#E9E9E9]"
            >
              <Avatar name={u.name} color={u.color} url={u.avatar} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-l font-semibold text-ink">{u.name}</p>
                <p className="truncate text-body-s text-grey-mid">{u.handle}</p>
              </div>
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition"
                style={{
                  borderColor: on ? '#000' : '#C4C4C6',
                  background: on ? '#000' : 'transparent',
                  color: '#FF5A1A',
                }}
              >
                {on && <IconCheck size={14} />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ColorRow({ color, setColor }: { color: string; setColor: (c: string) => void }) {
  return (
    <div className="flex gap-2.5">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setColor(c)}
          className="h-7 w-7 rounded-full border border-black/15 transition-transform active:scale-90"
          style={{ backgroundColor: c, transform: color === c ? 'scale(1.2)' : undefined }}
        />
      ))}
    </div>
  )
}

// ── Create group / channel ──────────────────────────────────────
export function CreateGroupModal({ kind, onClose }: { kind: 'group' | 'channel'; onClose: () => void }) {
  const { lang } = useTranslation()
  const createGroupChat = useStore((s) => s.createGroupChat)
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const ru = lang === 'ru'
  const isChannel = kind === 'channel'

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const create = () => {
    if (!name.trim()) return
    createGroupChat(kind, name, [...selected], { about, color })
    onClose()
  }

  return (
    <Backdrop onClose={onClose}>
      <Header
        title={isChannel ? (ru ? 'Новый канал' : 'New Channel') : (ru ? 'Новая группа' : 'New Group')}
        onClose={onClose}
      />
      <div className="mt-4 flex flex-col items-center gap-3">
        <Avatar name={name || (isChannel ? 'C' : 'G')} color={color} size={72} ring />
        <ColorRow color={color} setColor={setColor} />
      </div>

      <div className="mt-5 space-y-3">
        <Field label={ru ? 'Название' : 'Name'}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isChannel ? (ru ? 'Название канала' : 'Channel name') : (ru ? 'Название группы' : 'Group name')}
            className="w-full rounded-ctrl bg-grey-soft px-4 py-3 text-body-l font-medium text-ink outline-none"
          />
        </Field>
        <Field label={ru ? 'Описание' : 'Description'}>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={2}
            placeholder={ru ? 'О чём это?' : 'What is it about?'}
            className="w-full resize-none rounded-ctrl bg-grey-soft px-4 py-3 text-body-l font-medium text-ink outline-none"
          />
        </Field>
      </div>

      <div className="mt-5">
        <MemberPicker selected={selected} toggle={toggle} />
      </div>

      <button
        onClick={create}
        disabled={!name.trim()}
        className="mt-6 w-full rounded-pill bg-black py-3.5 text-btn text-lime transition active:scale-[0.98] disabled:opacity-40"
      >
        {isChannel ? (ru ? 'Создать канал' : 'Create channel') : (ru ? 'Создать группу' : 'Create group')}
      </button>
    </Backdrop>
  )
}

// ── Edit existing group / channel ───────────────────────────────
export function EditChatModal({ chatId, onClose }: { chatId: string; onClose: () => void }) {
  const { lang } = useTranslation()
  const chat = useStore((s) => s.chats.find((c) => c.id === chatId))
  const updateChat = useStore((s) => s.updateChat)
  const deleteChat = useStore((s) => s.deleteChat)
  const openChat = useStore((s) => s.openChat)
  const ru = lang === 'ru'

  const [name, setName] = useState(chat?.name ?? '')
  const [about, setAbout] = useState(chat?.about ?? '')
  const [color, setColor] = useState(chat?.color ?? PALETTE[0])
  const [selected, setSelected] = useState<Set<string>>(new Set(chat?.members ?? []))

  if (!chat) return null
  const isChannel = chat.kind === 'channel'

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const save = () => {
    if (!name.trim()) return
    updateChat(chatId, { name: name.trim(), about: about.trim(), color, members: [...selected] })
    onClose()
  }

  const remove = () => {
    if (
      confirm(
        ru
          ? `Удалить ${isChannel ? 'канал' : 'группу'} безвозвратно?`
          : `Delete this ${isChannel ? 'channel' : 'group'} permanently?`,
      )
    ) {
      deleteChat(chatId)
      openChat(null)
      onClose()
    }
  }

  return (
    <Backdrop onClose={onClose}>
      <Header
        title={isChannel ? (ru ? 'Изменить канал' : 'Edit Channel') : (ru ? 'Изменить группу' : 'Edit Group')}
        onClose={onClose}
      />
      <div className="mt-4 flex flex-col items-center gap-3">
        <Avatar name={name || chat.name} color={color} size={72} ring />
        <ColorRow color={color} setColor={setColor} />
      </div>

      <div className="mt-5 space-y-3">
        <Field label={ru ? 'Название' : 'Name'}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-ctrl bg-grey-soft px-4 py-3 text-body-l font-medium text-ink outline-none"
          />
        </Field>
        <Field label={ru ? 'Описание' : 'Description'}>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-ctrl bg-grey-soft px-4 py-3 text-body-l font-medium text-ink outline-none"
          />
        </Field>
      </div>

      <div className="mt-5">
        <MemberPicker selected={selected} toggle={toggle} />
      </div>

      <div className="mt-6 space-y-2.5">
        <button
          onClick={save}
          disabled={!name.trim()}
          className="w-full rounded-pill bg-black py-3.5 text-btn text-lime transition active:scale-[0.98] disabled:opacity-40"
        >
          {ru ? 'Сохранить' : 'Save changes'}
        </button>
        <button
          onClick={remove}
          className="flex w-full items-center justify-center gap-2 rounded-pill bg-grey-soft py-3 text-btn text-[#FF3B30] transition active:scale-[0.98]"
        >
          <IconTrash size={17} />
          {isChannel ? (ru ? 'Удалить канал' : 'Delete channel') : (ru ? 'Удалить группу' : 'Delete group')}
        </button>
      </div>
    </Backdrop>
  )
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-section text-black">{title}</h3>
      <button
        onClick={onClose}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-grey-soft text-ink hover:bg-[#E9E9E9]"
      >
        <IconClose size={18} />
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-body-s font-semibold text-grey-mid">{label}</label>
      {children}
    </div>
  )
}
