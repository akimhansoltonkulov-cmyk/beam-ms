import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from './store'
import Login from './screens/Login'
import Sidebar from './screens/Sidebar'
import ChatWindow from './screens/ChatWindow'
import FloatingDock from './screens/FloatingDock'
import SettingsPanel from './screens/SettingsPanel'
import ProfilePanel from './screens/ProfilePanel'
import CallOverlay from './screens/CallOverlay'

export default function App() {
  const authed = useStore((s) => s.authed)
  const activeChatId = useStore((s) => s.activeChatId)
  const view = useStore((s) => s.view)
  const call = useStore((s) => s.call)
  const openChat = useStore((s) => s.openChat)
  const setView = useStore((s) => s.setView)

  // Global keyboard shortcuts (Functions.pdf §4: Keyboard First)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!authed) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setView('search')
      }
      if (e.key === 'Escape' && activeChatId) openChat(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [authed, activeChatId, openChat, setView])

  return (
    // Outer wash fills the viewport; the app itself is a single mobile column
    // centered like a device on wide screens, edge-to-edge on phones.
    <div className="app-wash flex h-full w-full justify-center sm:py-6">
      <div className="beam-frame relative h-full w-full max-w-[440px] overflow-hidden bg-transparent sm:rounded-[40px]">
        {!authed ? (
          <Login />
        ) : (
          <>
            {/* One panel at a time: chat when open, otherwise list/search/settings/profile */}
            <AnimatePresence mode="wait">
              {activeChatId ? (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  <ChatWindow />
                </motion.div>
              ) : (
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0"
                >
                  {view === 'settings' ? (
                    <SettingsPanel />
                  ) : view === 'profile' ? (
                    <ProfilePanel />
                  ) : (
                    <Sidebar />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating glass dock (hidden inside a chat) */}
            {!activeChatId && <FloatingDock />}

            {/* Call surface — overlays everything while ringing / in a call */}
            <AnimatePresence>{call && <CallOverlay />}</AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}
