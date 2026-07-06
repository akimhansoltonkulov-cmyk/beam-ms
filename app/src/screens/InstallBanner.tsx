import { useState } from 'react'
import { motion } from 'framer-motion'
import { usePwaInstall } from '../lib/usePwaInstall'
import { IconArrowUpRight, IconClose } from '../components/Icons'
import { useTranslation } from '../lib/i18n'

const DISMISS_KEY = 'beam.install.dismissed'

// Prompts the user to install the PWA so it launches without browser chrome.
export default function InstallBanner() {
  const { lang } = useTranslation()
  const ru = lang === 'ru'
  const { installed, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [showIosHint, setShowIosHint] = useState(false)

  // Already running as an installed app → nothing to do.
  if (installed || dismissed) return null

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  // On desktop Chrome the browser chrome is fine; only nudge on mobile.
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
  if (!isMobile) return null

  const close = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* noop */
    }
  }

  const onInstall = async () => {
    if (isIos) {
      setShowIosHint(true)
      return
    }
    const res = await promptInstall()
    if (res === 'unavailable') setShowIosHint(true) // fall back to manual hint
  }

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      className="absolute inset-x-0 top-0 z-40 px-3 pt-3"
    >
      <div className="flex items-center gap-3 rounded-card bg-black px-4 py-3 text-white shadow-lift">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-lime text-black">
          <span className="text-lg font-extrabold">B</span>
        </div>
        <div className="min-w-0 flex-1">
          {showIosHint ? (
            <p className="text-body-s text-white/90 leading-snug">
              {ru
                ? 'Нажмите «Поделиться» → «На экран «Домой»», чтобы открыть Beam без адресной строки.'
                : 'Tap Share → “Add to Home Screen” to run Beam without the address bar.'}
            </p>
          ) : (
            <>
              <p className="text-body-l font-semibold leading-tight">
                {ru ? 'Установить Beam' : 'Install Beam'}
              </p>
              <p className="text-body-s text-white/60 leading-tight">
                {ru ? 'Полный экран, без строки браузера' : 'Full screen, no browser bar'}
              </p>
            </>
          )}
        </div>
        {!showIosHint && (
          <button
            onClick={onInstall}
            className="flex shrink-0 items-center gap-1 rounded-pill bg-lime px-3.5 py-2 text-body-s font-bold text-black transition active:scale-95"
          >
            {ru ? 'Установить' : 'Install'}
            <IconArrowUpRight size={15} />
          </button>
        )}
        <button
          onClick={close}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10"
        >
          <IconClose size={16} />
        </button>
      </div>
    </motion.div>
  )
}
