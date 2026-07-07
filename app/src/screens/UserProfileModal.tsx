import { motion } from 'framer-motion'
import { useStore } from '../store'
import { Avatar } from '../components/ui'
import { IconBack, IconChat, IconPhone, IconVideo } from '../components/Icons'
import { useTranslation } from '../lib/i18n'

// Full-panel profile of a chat peer (Telegram-style contact info).
export default function UserProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { lang } = useTranslation()
  const ru = lang === 'ru'
  const user = useStore((s) => s.users[userId])
  const online = useStore((s) => s.online[userId])
  const startCall = useStore((s) => s.startCall)
  const chats = useStore((s) => s.chats)
  const meId = useStore((s) => s.me?.id)

  if (!user) return null

  // The DM chat with this peer (for placing calls / jumping back to messages).
  const dm = chats.find(
    (c) => c.kind === 'dm' && c.members.includes(userId) && (c.members.includes(meId || '') || c.members.includes('me')),
  )

  const rows: { value: string; caption: string }[] = []
  if (user.phone) rows.push({ value: user.phone, caption: ru ? 'Телефон' : 'Phone' })
  rows.push({ value: user.handle, caption: ru ? 'Имя пользователя' : 'Username' })
  if (user.bio) rows.push({ value: user.bio, caption: ru ? 'О себе' : 'Bio' })

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="app-wash absolute inset-0 z-[65] flex flex-col sm:rounded-[40px]"
    >
      {/* Header */}
      <div className="glass beam-header-top flex items-center gap-2 border-b border-black/5 px-3 pb-3">
        <button
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
        >
          <IconBack size={22} />
        </button>
        <h2 className="text-subtitle text-black">{ru ? 'Профиль' : 'Profile'}</h2>
      </div>

      <div className="beam-scroll flex-1 overflow-y-auto px-5 pb-10 pt-6">
        {/* Identity */}
        <div className="flex flex-col items-center text-center">
          <Avatar name={user.name} color={user.color} url={user.avatar} size={96} ring />
          <h2 className="mt-4 text-display leading-none text-black">{user.name}</h2>
          <p className={`mt-2 text-body-s font-semibold ${online ? 'text-green-600' : 'text-grey-mid'}`}>
            {online ? (ru ? 'в сети' : 'online') : (ru ? 'был(а) недавно' : 'last seen recently')}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <ActionButton
            icon={<IconChat size={20} />}
            label={ru ? 'Сообщение' : 'Message'}
            onClick={() => {
              if (dm) useStore.getState().openChat(dm.id)
              onClose()
            }}
          />
          <ActionButton
            icon={<IconPhone size={20} />}
            label={ru ? 'Звонок' : 'Call'}
            disabled={!dm}
            onClick={() => dm && startCall(dm.id, false)}
          />
          <ActionButton
            icon={<IconVideo size={20} />}
            label={ru ? 'Видео' : 'Video'}
            disabled={!dm}
            onClick={() => dm && startCall(dm.id, true)}
          />
        </div>

        {/* Info */}
        <div className="mt-6 overflow-hidden rounded-card bg-white/80">
          {rows.map((r) => (
            <div
              key={r.caption}
              className="border-b border-black/[0.06] px-5 py-3.5 last:border-b-0"
            >
              <p className="text-body-l font-medium text-ink break-words">{r.value}</p>
              <p className="mt-0.5 text-body-s text-grey-mid">{r.caption}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1.5 rounded-card bg-white/80 py-4 text-center transition hover:bg-white active:scale-[0.97] disabled:opacity-40"
    >
      <span className="text-ink">{icon}</span>
      <span className="text-body-s font-semibold text-ink">{label}</span>
    </button>
  )
}
