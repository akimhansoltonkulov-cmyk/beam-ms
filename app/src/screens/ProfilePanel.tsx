import { useState, useRef } from 'react'
import { useStore } from '../store'
import { Avatar } from '../components/ui'
import { useTranslation } from '../lib/i18n'
import { IconBolt, IconChevronRight, IconGrid, IconLock, IconShield } from '../components/Icons'

export default function ProfilePanel() {
  const { t, lang: currentLang } = useTranslation()
  const me = useStore((s) => s.me)
  const packets = useStore((s) => s.packets)
  const messages = useStore((s) => s.messages)
  const setView = useStore((s) => s.setView)
  const updateProfile = useStore((s) => s.updateProfile)

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(me.name)
  const [handle, setHandle] = useState(me.handle)
  const [bio, setBio] = useState(me.bio || '')
  const [avatar, setAvatar] = useState(me.avatar || '')
  const [color, setColor] = useState(me.color || '#E1FF00')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sent = messages.filter((m) => m.authorId === 'me').length

  const roadmapItems = currentLang === 'ru'
    ? ['Секретные чаты (E2EE)', 'Аудио/Видео звонки', 'Папки', 'Каналы', 'Стикеры']
    : ['Secret Chats (E2EE)', 'Audio/Video calls', 'Folders', 'Channels', 'Stickers']

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
    const success = await updateProfile({ name, handle, bio, avatar, color })
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
          {/* hero card */}
          <div className="relative mt-6 overflow-hidden rounded-card bg-black p-8 text-white">
            <div className="halftone-lime pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-25" />
            <div className="relative flex items-center gap-5">
              <Avatar name={me.name} color={me.color} url={me.avatar} size={72} ring />
              <div>
                <h2 className="text-display leading-none">{me.name}</h2>
                <p className="mt-1.5 text-body-l text-white/60">{me.handle}</p>
              </div>
            </div>
            {me.bio && <p className="relative mt-5 text-body-l text-white/80 leading-relaxed">{me.bio}</p>}
            <div className="relative mt-6 flex gap-3">
              <Metric label={t('sent')} value={String(sent)} />
              <Metric label={t('packets')} value={String(packets.length)} accent />
              <Metric label={t('metadata')} value="0" accent />
            </div>
          </div>

          {/* status */}
          <div className="mt-6 flex items-center gap-4 rounded-card bg-lime p-6 text-black">
            <IconShield size={28} className="shrink-0" />
            <div>
              <p className="text-section leading-tight">{t('safe_trans')}</p>
              <p className="text-body-s opacity-70 mt-0.5">{t('safe_trans_desc')}</p>
            </div>
          </div>

          {/* actions */}
          <div className="mt-6 space-y-3.5">
            <ActionRow icon={<IconLock size={20} />} title={t('sec_sessions')} desc={t('sec_sessions_desc')} onClick={() => setView('settings')} />
            <ActionRow icon={<IconBolt size={20} />} title={t('open_specs')} desc={t('open_specs_desc')} />
            <ActionRow icon={<IconGrid size={20} />} title={t('qr_code')} desc={t('qr_code_desc')} />
          </div>

          {/* roadmap teaser */}
          <div className="mt-8 rounded-card bg-white/70 p-6">
            <p className="mb-3.5 text-section text-black">{t('coming_soon')}</p>
            <div className="flex flex-wrap gap-2.5">
              {roadmapItems.map((t) => (
                <span key={t} className="rounded-pill bg-grey-soft px-3.5 py-2 text-body-s font-semibold text-ink">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex-1 rounded-ctrl bg-white/10 p-4 text-center">
      <p className={`text-section ${accent ? 'text-lime' : 'text-white'}`}>{value}</p>
      <p className="text-body-s text-white/50 mt-0.5">{label}</p>
    </div>
  )
}

function ActionRow({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-ctrl bg-white/70 py-5 px-5 text-left transition hover:bg-white"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-grey-soft text-ink shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-body-l font-semibold text-ink truncate">{title}</p>
        <p className="text-body-s text-grey-mid mt-0.5 truncate">{desc}</p>
      </div>
      <IconChevronRight size={20} className="text-grey-mid shrink-0" />
    </button>
  )
}
