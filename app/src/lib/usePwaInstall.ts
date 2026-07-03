import { useEffect, useState } from 'react'

// PWA "Install as app" support (Functions.pdf §4: PWA Support).
// Captures the browser's beforeinstallprompt event and lets the UI trigger it.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(!!deferred)
  const [installed, setInstalled] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(display-mode: standalone)').matches,
  )

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      deferred = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }
    const onInstalled = () => {
      deferred = null
      setCanInstall(false)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable'
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    deferred = null
    setCanInstall(false)
    return outcome
  }

  return { canInstall, installed, promptInstall }
}
