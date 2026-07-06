import { motion } from 'framer-motion'
import { useStore } from '../store'
import { IconChat, IconSettings, IconUser, IconUsers } from '../components/Icons'
import type { ViewId } from '../types'
import { useTranslation } from '../lib/i18n'

// The Floating Dock (Design.pdf §5.1) — a translucent glass "island" of section icons.
export default function FloatingDock() {
  const { t } = useTranslation()
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const openChat = useStore((s) => s.openChat)

  const go = (v: ViewId) => {
    if (v === 'chats') openChat(null)
    setView(v)
  }

  const items: { id: ViewId; icon: React.ReactNode; label: string }[] = [
    { id: 'chats', icon: <IconChat size={24} />, label: t('messages') },
    { id: 'search', icon: <IconUsers size={24} />, label: t('contacts') },
    { id: 'settings', icon: <IconSettings size={24} />, label: t('settings') },
    { id: 'profile', icon: <IconUser size={24} />, label: t('profile') },
  ]

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-40 flex justify-center">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.15 }}
        className="glass pointer-events-auto flex items-center gap-2 rounded-pill border border-white/40 p-2 shadow-dock"
      >
        {items.map((it) => (
          <DockBtn key={it.id} active={view === it.id} onClick={() => go(it.id)} label={it.label}>
            {it.icon}
          </DockBtn>
        ))}
      </motion.div>
    </div>
  )
}

function DockBtn({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="relative flex h-14 w-14 items-center justify-center rounded-full active:scale-95 text-ink outline-none select-none"
    >
      {active && (
        <motion.div
          layoutId="active-dock-tab"
          className="absolute inset-0 rounded-full bg-lime shadow-sm"
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        />
      )}
      <span className={`relative z-10 flex items-center justify-center transition-colors duration-200 ${active ? 'text-white' : 'text-ink hover:text-black'}`}>
        {children}
      </span>
    </button>
  )
}
