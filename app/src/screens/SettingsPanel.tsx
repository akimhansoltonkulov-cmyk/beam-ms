import { useState } from 'react'
import { useStore } from '../store'
import { Toggle } from '../components/ui'
import { useTranslation } from '../lib/i18n'
import { usePwaInstall } from '../lib/usePwaInstall'
import {
  IconBolt,
  IconClock,
  IconDownload,
  IconGlobe,
  IconGrid,
  IconLock,
  IconLogout,
  IconShield,
} from '../components/Icons'

export default function SettingsPanel() {
  const { t, lang: currentLang } = useTranslation()
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)
  const exportData = useStore((s) => s.exportData)
  const logout = useStore((s) => s.logout)
  const [exported, setExported] = useState(false)
  const { installed, promptInstall } = usePwaInstall()

  const doInstall = async () => {
    const outcome = await promptInstall()
    if (outcome === 'unavailable') {
      alert(
        currentLang === 'ru'
          ? 'Установка недоступна в этом браузере. В Chrome/Edge нажмите значок «Установить» в адресной строке, либо меню ⋮ → «Установить приложение».'
          : 'Install isn’t available in this browser. In Chrome/Edge, use the install icon in the address bar, or menu ⋮ → “Install app”.',
      )
    }
  }

  const doExport = () => {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'beam-export.json'
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  return (
    <div className="beam-scroll flex h-full flex-col overflow-y-auto px-5 pb-40 pt-4">
      <h1 className="text-section text-black">{t('adjust_prefs')}</h1>
      <p className="mt-1 text-body-s text-grey-mid">{t('privacy_perf')}</p>

      {/* Privacy */}
      <Section title={t('privacy_ind')} icon={<IconShield size={16} />}>
        <Row
          title={t('meta_minimizer')}
          desc={t('meta_minimizer_desc')}
        >
          <Toggle on={prefs.metadataMinimizer} onChange={(v) => setPref('metadataMinimizer', v)} />
        </Row>
        <Row title={t('no_trackers')} desc={t('no_trackers_desc')}>
          <Toggle on={prefs.noTrackers} onChange={(v) => setPref('noTrackers', v)} />
        </Row>
        <div className="pt-1">
          <p className="mb-2 text-body-s font-semibold text-ink">{t('self_destruct')}</p>
          <p className="mb-3 text-body-s text-grey-mid">
            {t('self_destruct_desc')}
          </p>
          <div className="flex flex-wrap gap-2">
            {([0, 1, 3, 6] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPref('selfDestructMonths', m)}
                className={`rounded-pill px-4 py-2 text-body-s font-bold transition ${
                  prefs.selfDestructMonths === m ? 'bg-black text-white' : 'bg-grey-soft text-ink'
                }`}
              >
                {m === 0
                  ? currentLang === 'ru'
                    ? 'Выкл'
                    : 'Off'
                  : currentLang === 'ru'
                  ? `${m} мес`
                  : `${m} mo`}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Data */}
      <Section title={t('your_data')} icon={<IconLock size={16} />}>
        <button
          onClick={doExport}
          className="flex w-full items-center gap-3 rounded-ctrl bg-grey-soft p-4 text-left transition hover:bg-[#e9e9e9]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-black text-white">
            <IconDownload size={20} />
          </span>
          <div className="flex-1">
            <p className="text-body-l font-semibold text-ink">
              {exported ? (currentLang === 'ru' ? 'Экспортировано ✓' : 'Exported ✓') : t('export_all')}
            </p>
            <p className="text-body-s text-grey-mid">{t('export_all_desc')}</p>
          </div>
        </button>
      </Section>

      {/* Web */}
      <Section title={t('web_perf')} icon={<IconBolt size={16} />}>
        <Row title={t('web_push')} desc={t('web_push_desc')}>
          <Toggle on={prefs.webPush} onChange={(v) => setPref('webPush', v)} />
        </Row>
        <Row title={t('sounds')} desc={t('sounds_desc')}>
          <Toggle on={prefs.soundOn} onChange={(v) => setPref('soundOn', v)} />
        </Row>
        <button
          onClick={doInstall}
          disabled={installed}
          className="flex w-full items-center gap-3 rounded-ctrl bg-black p-4 text-left text-white transition hover:bg-[#1a1a1a] disabled:opacity-60"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-black text-white">
            <IconGrid size={20} />
          </span>
          <div className="flex-1">
            <p className="text-body-l font-semibold">
              {installed
                ? currentLang === 'ru'
                  ? 'Приложение установлено ✓'
                  : 'App installed ✓'
                : t('install_app')}
            </p>
            <p className="text-body-s text-white/60">{t('install_app_desc')}</p>
          </div>
        </button>
      </Section>

      {/* Sessions */}
      <Section title={t('active_sessions')} icon={<IconGlobe size={16} />}>
        <SessionRow name={t('this_device')} meta={t('now_session')} current />
        <SessionRow name="iPhone 15 · Beam iOS" meta={currentLang === 'ru' ? '2 ч назад · Берлин' : '2h ago · Berlin'} />
        <SessionRow name="MacBook · Tauri app" meta={currentLang === 'ru' ? 'Вчера · Берлин' : 'Yesterday · Berlin'} />
      </Section>

      {/* danger */}
      <button
        onClick={logout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-btn border-2 border-black py-3.5 text-btn text-black transition hover:bg-black hover:text-white"
      >
        <IconLogout size={18} /> {t('logout')}
      </button>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-body-s text-grey-mid">
        <IconClock size={13} /> {t('beam_demo')}
      </p>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mt-6 rounded-card bg-white/70 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white">
          {icon}
        </span>
        <h2 className="text-section text-black">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Row({
  title,
  desc,
  children,
}: {
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-body-l font-semibold text-ink">{title}</p>
        <p className="text-body-s text-grey-mid">{desc}</p>
      </div>
      {children}
    </div>
  )
}

function SessionRow({ name, meta, current }: { name: string; meta: string; current?: boolean }) {
  const [ended, setEnded] = useState(false)
  if (ended) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-ctrl bg-grey-soft p-3.5">
      <div>
        <p className="text-body-l font-semibold text-ink">{name}</p>
        <p className="text-body-s text-grey-mid">{meta}</p>
      </div>
      {current ? (
        <span className="rounded-pill bg-black px-3 py-1 text-body-s font-bold text-black">Active</span>
      ) : (
        <button
          onClick={() => setEnded(true)}
          className="rounded-pill border border-black/15 px-3 py-1 text-body-s font-bold text-ink hover:bg-black hover:text-white"
        >
          End
        </button>
      )}
    </div>
  )
}
