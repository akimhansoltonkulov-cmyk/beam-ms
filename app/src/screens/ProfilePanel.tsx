import { useState, useRef } from 'react'
import { useStore } from '../store'
import { Avatar } from '../components/ui'
import { useTranslation } from '../lib/i18n'
import { IconBolt, IconChevronRight, IconGrid, IconLock, IconShield } from '../components/Icons'

export default function ProfilePanel() {
  const { t, lang: currentLang } = useTranslation()
  const ru = currentLang === 'ru'
  const me = useStore((s) => s.me)
  const packets = useStore((s) => s.packets)
  const messages = useStore((s) => s.messages)
  const setView = useStore((s) => s.setView)
  const updateProfile = useStore((s) => s.updateProfile)

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(me.name)
  const [handle, setHandle] = useState(me.handle)
  const [bio, setBio] = useState(me.bio || '')
  const [phone, setPhone] = useState(me.phone || '')
  const [avatar, setAvatar] = useState(me.avatar || '')
  const [color, setColor] = useState(me.color || '#E1FF00')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sent = messages.filter((m) => m.authorId === 'me').length

  const roadmapItems = currentLang === 'ru'
    ? ['Секретные чаты (E2EE)', 'Папки', 'Каналы', 'Стикеры']
    : ['Secret Chats (E2EE)', 'Folders', 'Channels', 'Stickers']

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatar(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!name.trim() || !handle.trim()) return
    const success = await updateProfile({ name, handle, bio, avatar, color, phone })
    if (success) {
      setEditing(false)
    } else {
      alert(currentLang === 'ru' ? 'Ошибка сохранения профиля' : 'Error saving profile')
    }
  }

  return (
    <div className="beam-scroll flex h-full flex-col overflow-y-auto px-5 pb-40 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-section text-black">{t('profile')}</h1>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="rounded-pill bg-grey-soft px-4 py-1.5 text-body-s font-bold text-ink hover:bg-black hover:text-white transition"
          >
            {currentLang === 'ru' ? 'Редактировать' : 'Edit'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditing(false)
                setName(me.name)
                setHandle(me.handle)
                setBio(me.bio || '')
                setPhone(me.phone || '')
                setAvatar(me.avatar || '')
                setColor(me.color || '#E1FF00')
              }}
              className="rounded-pill bg-grey-soft px-4 py-1.5 text-body-s font-bold text-ink hover:opacity-80 transition"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              className="rounded-pill bg-black px-4 py-1.5 text-body-s font-bold text-lime hover:opacity-90 transition"
            >
              {t('save')}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-6 rounded-card bg-white p-6 shadow-card space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar name={name || 'You'} color={color} url={avatar} size={80} ring />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                📷
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <div className="flex gap-2.5">
              {['#E1FF00', '#B9E36B', '#7FC8F8', '#F5A9C5', '#C9A7F0', '#000000'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border border-black/15 transition-transform active:scale-90"
                  style={{ backgroundColor: c, transform: color === c ? 'scale(1.2)' : undefined }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-body-s font-semibold text-grey-mid">{t('your_name')}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-ctrl bg-grey-soft px-4 py-3 text-body-l font-medium text-ink outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-body-s font-semibold text-grey-mid">{t('nickname')}</label>
              <div className="flex items-center gap-1 rounded-ctrl bg-grey-soft px-4 py-3">
                <span className="text-body-l font-semibold text-grey-mid">@</span>
                <input
                  value={handle.replace(/^@/, '')}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full bg-transparent text-body-l font-medium text-ink outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-body-s font-semibold text-grey-mid">{currentLang === 'ru' ? 'Телефон' : 'Phone'}</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="+996 555 000 123"
                className="w-full rounded-ctrl bg-grey-soft px-4 py-3 text-body-l font-medium text-ink outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-body-s font-semibold text-grey-mid">{currentLang === 'ru' ? 'О себе' : 'Bio'}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-ctrl bg-grey-soft px-4 py-3 text-body-l font-medium text-ink outline-none resize-none"
                rows={2}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Telegram-style header — big avatar, name, status */}
          <div className="mt-6 flex flex-col items-center text-center">
            <Avatar name={me.name} color={me.color} url={me.avatar} size={96} ring />
            <h2 className="mt-4 text-display leading-none text-black">{me.name}</h2>
            <p className="mt-2 text-body-s font-semibold text-green-600">{ru ? 'в сети' : 'online'}</p>
          </div>

          {/* Info — phone, username, bio (tap to edit, Telegram-like) */}
          <p className="mb-2 mt-7 px-2 text-body-s font-semibold uppercase tracking-wide text-grey-mid">
            {ru ? 'Информация' : 'Info'}
          </p>
          <ListCard>
            <InfoRow
              value={me.phone || (ru ? 'Не указан' : 'Not set')}
              caption={ru ? 'Телефон' : 'Phone'}
              onClick={() => setEditing(true)}
            />
            <InfoRow
              value={me.handle}
              caption={ru ? 'Имя пользователя' : 'Username'}
              onClick={() => setEditing(true)}
            />
            <InfoRow
              value={me.bio || (ru ? 'Добавить описание' : 'Add a bio')}
              caption={ru ? 'О себе' : 'Bio'}
              muted={!me.bio}
              onClick={() => setEditing(true)}
            />
          </ListCard>

          {/* Settings */}
          <p className="mb-2 mt-7 px-2 text-body-s font-semibold uppercase tracking-wide text-grey-mid">
            {ru ? 'Настройки' : 'Settings'}
          </p>
          <ListCard>
            <SettingRow icon={<IconLock size={19} />} title={t('sec_sessions')} onClick={() => setView('settings')} />
            <SettingRow icon={<IconBolt size={19} />} title={t('open_specs')} />
            <SettingRow icon={<IconGrid size={19} />} title={t('qr_code')} />
          </ListCard>

          {/* Privacy status */}
          <p className="mb-2 mt-7 px-2 text-body-s font-semibold uppercase tracking-wide text-grey-mid">
            {ru ? 'Приватность' : 'Privacy'}
          </p>
          <div className="flex items-center gap-4 rounded-card bg-lime p-5 text-black">
            <IconShield size={26} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-subtitle leading-tight">{t('safe_trans')}</p>
              <p className="mt-0.5 text-body-s opacity-70">{t('safe_trans_desc')}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <StatBox label={t('sent')} value={String(sent)} />
            <StatBox label={t('packets')} value={String(packets.length)} />
            <StatBox label={t('metadata')} value="0" />
          </div>

          {/* Roadmap */}
          <p className="mb-2 mt-7 px-2 text-body-s font-semibold uppercase tracking-wide text-grey-mid">
            {t('coming_soon')}
          </p>
          <div className="rounded-card bg-white/70 p-5">
            <div className="flex flex-wrap gap-2.5">
              {roadmapItems.map((label) => (
                <span key={label} className="rounded-pill bg-grey-soft px-3.5 py-2 text-body-s font-semibold text-ink">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Grouped list card — Telegram-style rows with hairline dividers.
function ListCard({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-card bg-white/80">{children}</div>
}

// A tappable "value over caption" row (phone / username / bio).
function InfoRow({
  value,
  caption,
  onClick,
  muted,
}: {
  value: string
  caption: string
  onClick?: () => void
  muted?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-black/[0.06] px-5 py-3.5 text-left transition last:border-b-0 hover:bg-black/[0.02]"
    >
      <div className="min-w-0 flex-1">
        <p className={`truncate text-body-l font-medium ${muted ? 'text-grey-mid' : 'text-ink'}`}>{value}</p>
        <p className="mt-0.5 text-body-s text-grey-mid">{caption}</p>
      </div>
      <IconChevronRight size={18} className="shrink-0 text-grey-mid" />
    </button>
  )
}

// An icon + title settings row.
function SettingRow({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 border-b border-black/[0.06] px-5 py-4 text-left transition last:border-b-0 hover:bg-black/[0.02]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-btn bg-grey-soft text-ink shrink-0">
        {icon}
      </span>
      <p className="flex-1 truncate text-body-l font-medium text-ink">{title}</p>
      <IconChevronRight size={18} className="shrink-0 text-grey-mid" />
    </button>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-ctrl bg-white/70 p-3.5 text-center">
      <p className="text-section text-black">{value}</p>
      <p className="mt-0.5 text-body-s text-grey-mid">{label}</p>
    </div>
  )
}
