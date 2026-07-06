import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import { Avatar } from '../components/ui'
import { useTranslation } from '../lib/i18n'
import { uploadMedia } from '../lib/supabase'
import { usePwaInstall } from '../lib/usePwaInstall'
import { IconArrowUpRight, IconChevronRight, IconClose, IconDownload, IconEdit, IconImage, IconSettings } from '../components/Icons'

type SheetField = 'phone' | 'handle' | 'bio'

export default function ProfilePanel() {
  const { t, lang: currentLang } = useTranslation()
  const ru = currentLang === 'ru'
  const me = useStore((s) => s.me)
  const setView = useStore((s) => s.setView)
  const updateProfile = useStore((s) => s.updateProfile)

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(me.name)
  const [handle, setHandle] = useState(me.handle)
  const [bio, setBio] = useState(me.bio || '')
  const [phone, setPhone] = useState(me.phone || '')
  const [avatar, setAvatar] = useState(me.avatar || '')
  const [color, setColor] = useState(me.color || '#E1FF00')
  const [photoUploading, setPhotoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Bottom-sheet quick-edit for a single field (phone / nickname / bio)
  const [sheet, setSheet] = useState<SheetField | null>(null)
  const [sheetValue, setSheetValue] = useState('')
  const [sheetSaving, setSheetSaving] = useState(false)

  const roadmapItems = currentLang === 'ru'
    ? ['Секретные чаты (E2EE)', 'Папки', 'Каналы', 'Стикеры']
    : ['Secret Chats (E2EE)', 'Folders', 'Channels', 'Stickers']

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Instant local preview…
    const reader = new FileReader()
    reader.onloadend = () => setAvatar(reader.result as string)
    reader.readAsDataURL(file)
    // …then upload to Storage so the DB only ever stores a short URL (fast, reliable).
    setPhotoUploading(true)
    const url = await uploadMedia(file, file.name || 'avatar.jpg')
    if (url) setAvatar(url)
    setPhotoUploading(false)
    e.target.value = ''
  }

  // Never write a giant base64 string to the DB — upload it first if needed.
  const resolveAvatar = async (value: string): Promise<string> => {
    if (!value.startsWith('data:')) return value
    try {
      const blob = await (await fetch(value)).blob()
      const url = await uploadMedia(blob, 'avatar.jpg')
      return url || value
    } catch {
      return value
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !handle.trim()) return
    const finalAvatar = await resolveAvatar(avatar)
    const success = await updateProfile({ name, handle, bio, avatar: finalAvatar, color, phone })
    if (success) {
      setAvatar(finalAvatar)
      setEditing(false)
    } else {
      alert(currentLang === 'ru' ? 'Ошибка сохранения профиля' : 'Error saving profile')
    }
  }

  const openSheet = (field: SheetField) => {
    setSheetValue(field === 'phone' ? me.phone || '' : field === 'handle' ? me.handle.replace(/^@/, '') : me.bio || '')
    setSheet(field)
  }

  const saveSheet = async () => {
    if (!sheet) return
    setSheetSaving(true)
    const ok = await updateProfile({
      name: me.name,
      handle: sheet === 'handle' ? sheetValue : me.handle,
      bio: sheet === 'bio' ? sheetValue : me.bio || '',
      phone: sheet === 'phone' ? sheetValue : me.phone || '',
      avatar: me.avatar || '',
      color: me.color,
    })
    setSheetSaving(false)
    if (ok) setSheet(null)
    else alert(currentLang === 'ru' ? 'Ошибка сохранения' : 'Save failed')
  }

  return (
    <div className="beam-scroll flex h-full flex-col overflow-y-auto px-5 pb-40 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-section text-black">{t('profile')}</h1>
        {editing && (
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

      {/* Always-mounted photo picker so "Set photo" works from view mode too */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          if (editing) {
            // In the edit form the preview updates; Save persists it.
            handlePhotoChange(e)
            return
          }
          // View mode → upload and save the new photo immediately.
          const file = e.target.files?.[0]
          if (!file) return
          setPhotoUploading(true)
          const url = await uploadMedia(file, file.name || 'avatar.jpg')
          if (url) {
            await updateProfile({
              name: me.name,
              handle: me.handle,
              bio: me.bio || '',
              phone: me.phone || '',
              avatar: url,
              color: me.color,
            })
          }
          setPhotoUploading(false)
          e.target.value = ''
        }}
      />

      {editing ? (
        <div className="mt-6 rounded-card bg-white p-6 shadow-card space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar name={name || 'You'} color={color} url={avatar} size={80} ring />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                📷
              </div>
            </div>
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
            <button
              type="button"
              onClick={() => !photoUploading && fileInputRef.current?.click()}
              className="relative rounded-full"
            >
              <Avatar name={me.name} color={me.color} url={me.avatar} size={96} ring />
              {photoUploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
                  <span className="beam-spin inline-block h-6 w-6 rounded-full border-2 border-lime border-t-transparent" />
                </span>
              )}
            </button>
            <h2 className="mt-4 text-display leading-none text-black">{me.name}</h2>
            <p className="mt-2 text-body-s font-semibold text-green-600">{ru ? 'в сети' : 'online'}</p>
          </div>

          {/* Action buttons row (Telegram) */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <ActionButton
              icon={<IconImage size={20} />}
              label={ru ? 'Выбрать фото' : 'Set photo'}
              onClick={() => fileInputRef.current?.click()}
            />
            <ActionButton
              icon={<IconEdit size={20} />}
              label={ru ? 'Изменить' : 'Edit'}
              onClick={() => setEditing(true)}
            />
            <ActionButton
              icon={<IconSettings size={20} />}
              label={ru ? 'Настройки' : 'Settings'}
              onClick={() => setView('settings')}
            />
          </div>

          {/* Info — phone, username, bio (tap to edit, Telegram-like) */}
          <div className="mt-6">
            <ListCard>
              <InfoRow
                value={me.phone || (ru ? 'Не указан' : 'Not set')}
                caption={ru ? 'Телефон' : 'Phone'}
                onClick={() => openSheet('phone')}
              />
              <InfoRow
                value={me.handle}
                caption={ru ? 'Имя пользователя' : 'Username'}
                onClick={() => openSheet('handle')}
              />
              <InfoRow
                value={me.bio || (ru ? 'Добавить описание' : 'Add a bio')}
                caption={ru ? 'О себе' : 'Bio'}
                muted={!me.bio}
                onClick={() => openSheet('bio')}
              />
            </ListCard>
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

          {/* Install as app */}
          <div className="mt-4">
            <InstallButton ru={ru} />
          </div>
        </>
      )}

      {/* Bottom sheet — quick edit for one field */}
      <AnimatePresence>
        {sheet && (
          <FieldSheet
            field={sheet}
            value={sheetValue}
            onChange={setSheetValue}
            onClose={() => setSheet(null)}
            onSave={saveSheet}
            saving={sheetSaving}
            ru={ru}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// "Install as app" button — launches the PWA install / Add-to-Home-Screen flow.
function InstallButton({ ru }: { ru: boolean }) {
  const { installed, promptInstall } = usePwaInstall()
  const [iosHint, setIosHint] = useState(false)

  if (installed) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-card bg-white/70 py-4 text-body-l font-semibold text-grey-mid">
        {ru ? 'Приложение установлено ✓' : 'App installed ✓'}
      </div>
    )
  }

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  const onClick = async () => {
    if (isIos) {
      setIosHint(true)
      return
    }
    const res = await promptInstall()
    if (res === 'unavailable') setIosHint(true)
  }

  return (
    <div>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-4 rounded-card bg-black py-4 px-5 text-left text-white transition active:scale-[0.98]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-lime text-black">
          <IconDownload size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-l font-semibold">{ru ? 'Установить приложение' : 'Install app'}</p>
          <p className="text-body-s text-white/60">{ru ? 'Полный экран, без строки браузера' : 'Full screen, no browser bar'}</p>
        </div>
        <IconArrowUpRight size={18} className="shrink-0 text-white/60" />
      </button>
      {iosHint && (
        <p className="mt-2 px-2 text-body-s text-grey-mid leading-snug">
          {ru
            ? 'Нажмите «Поделиться» → «На экран «Домой»», чтобы открыть Beam без адресной строки.'
            : 'Tap Share → “Add to Home Screen” to run Beam without the address bar.'}
        </p>
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

// Slide-up sheet for editing a single profile field.
function FieldSheet({
  field,
  value,
  onChange,
  onClose,
  onSave,
  saving,
  ru,
}: {
  field: SheetField
  value: string
  onChange: (v: string) => void
  onClose: () => void
  onSave: () => void
  saving: boolean
  ru: boolean
}) {
  const title =
    field === 'phone' ? (ru ? 'Телефон' : 'Phone')
    : field === 'handle' ? (ru ? 'Имя пользователя' : 'Username')
    : (ru ? 'О себе' : 'Bio')

  return (
    <div className="absolute inset-0 z-[70] flex items-end justify-center bg-black/45 sm:rounded-[40px]">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[440px] rounded-t-[28px] bg-white p-5 pb-7 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/15" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-section text-black">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-grey-soft text-ink hover:bg-[#E9E9E9]"
          >
            <IconClose size={18} />
          </button>
        </div>

        {field === 'bio' ? (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder={ru ? 'Расскажите о себе' : 'Tell about yourself'}
            className="w-full resize-none rounded-ctrl bg-grey-soft px-4 py-3 text-body-l font-medium text-ink outline-none"
          />
        ) : field === 'handle' ? (
          <div className="flex items-center gap-1 rounded-ctrl bg-grey-soft px-4 py-3">
            <span className="text-body-l font-semibold text-grey-mid">@</span>
            <input
              autoFocus
              value={value.replace(/^@/, '')}
              onChange={(e) => onChange(e.target.value)}
              placeholder="username"
              className="w-full bg-transparent text-body-l font-medium text-ink outline-none"
            />
          </div>
        ) : (
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="tel"
            placeholder="+996 555 000 123"
            className="w-full rounded-ctrl bg-grey-soft px-4 py-3 text-body-l font-medium text-ink outline-none"
          />
        )}

        <button
          onClick={onSave}
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-pill bg-black py-3.5 text-btn text-lime transition active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
            <span className="beam-spin inline-block h-4 w-4 rounded-full border-2 border-lime border-t-transparent" />
          ) : (
            ru ? 'Сохранить' : 'Save'
          )}
        </button>
      </motion.div>
    </div>
  )
}

// Telegram-style stacked action button (icon over label).
function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-card bg-white/80 py-4 text-center transition hover:bg-white active:scale-[0.97]"
    >
      <span className="text-ink">{icon}</span>
      <span className="text-body-s font-semibold text-ink">{label}</span>
    </button>
  )
}
