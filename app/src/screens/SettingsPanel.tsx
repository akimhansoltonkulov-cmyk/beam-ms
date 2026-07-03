import { useState } from 'react'
import { useStore } from '../store'
import { Toggle } from '../components/ui'
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
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)
  const exportData = useStore((s) => s.exportData)
  const logout = useStore((s) => s.logout)
  const [exported, setExported] = useState(false)

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
    <div className="beam-scroll flex h-full flex-col overflow-y-auto px-5 pb-40 pt-5">
      <h1 className="text-display text-black">Adjust preferences</h1>
      <p className="mt-1 text-body-s text-grey-mid">Privacy, transparency &amp; performance controls.</p>

      {/* Privacy */}
      <Section title="Privacy & Independence" icon={<IconShield size={16} />}>
        <Row
          title="Metadata Minimizer"
          desc="Store nothing beyond delivery routing (no IP logs, no contact graph)."
        >
          <Toggle on={prefs.metadataMinimizer} onChange={(v) => setPref('metadataMinimizer', v)} />
        </Row>
        <Row title="No Trackers Policy" desc="Block all analytics & third-party marketing scripts.">
          <Toggle on={prefs.noTrackers} onChange={(v) => setPref('noTrackers', v)} />
        </Row>
        <div className="pt-1">
          <p className="mb-2 text-body-s font-semibold text-ink">Account self-destruct</p>
          <p className="mb-3 text-body-s text-grey-mid">
            Automatically erase the account after a period of inactivity.
          </p>
          <div className="flex flex-wrap gap-2">
            {([0, 1, 3, 6] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPref('selfDestructMonths', m)}
                className={`rounded-pill px-4 py-2 text-body-s font-bold transition ${
                  prefs.selfDestructMonths === m ? 'bg-black text-lime' : 'bg-grey-soft text-ink'
                }`}
              >
                {m === 0 ? 'Off' : `${m} mo`}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Data */}
      <Section title="Your Data" icon={<IconLock size={16} />}>
        <button
          onClick={doExport}
          className="flex w-full items-center gap-3 rounded-ctrl bg-grey-soft p-4 text-left transition hover:bg-[#e9e9e9]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-lime text-black">
            <IconDownload size={20} />
          </span>
          <div className="flex-1">
            <p className="text-body-l font-semibold text-ink">
              {exported ? 'Exported ✓' : 'Export all data'}
            </p>
            <p className="text-body-s text-grey-mid">One-click full history as JSON.</p>
          </div>
        </button>
      </Section>

      {/* Web */}
      <Section title="Web & Performance" icon={<IconBolt size={16} />}>
        <Row title="Web Push notifications" desc="Get notified even when the tab is closed.">
          <Toggle on={prefs.webPush} onChange={(v) => setPref('webPush', v)} />
        </Row>
        <Row title="Sounds" desc="Play a subtle tone on new messages.">
          <Toggle on={prefs.soundOn} onChange={(v) => setPref('soundOn', v)} />
        </Row>
        <button className="flex w-full items-center gap-3 rounded-ctrl bg-black p-4 text-left text-white transition hover:bg-[#1a1a1a]">
          <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-lime text-black">
            <IconGrid size={20} />
          </span>
          <div className="flex-1">
            <p className="text-body-l font-semibold">Install as app (PWA)</p>
            <p className="text-body-s text-white/60">Add Beam to your desktop — no address bar.</p>
          </div>
        </button>
      </Section>

      {/* Sessions */}
      <Section title="Active Sessions" icon={<IconGlobe size={16} />}>
        <SessionRow name="This device · Chrome" meta="Now · current session" current />
        <SessionRow name="iPhone 15 · Beam iOS" meta="2h ago · Berlin" />
        <SessionRow name="MacBook · Tauri app" meta="Yesterday · Berlin" />
      </Section>

      {/* danger */}
      <button
        onClick={logout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-btn border-2 border-black py-3.5 text-btn text-black transition hover:bg-black hover:text-lime"
      >
        <IconLogout size={18} /> Log out
      </button>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-body-s text-grey-mid">
        <IconClock size={13} /> Beam Web · Demo build
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
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime text-black">
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
  return (
    <div className="flex items-center justify-between gap-3 rounded-ctrl bg-grey-soft p-3.5">
      <div>
        <p className="text-body-l font-semibold text-ink">{name}</p>
        <p className="text-body-s text-grey-mid">{meta}</p>
      </div>
      {current ? (
        <span className="rounded-pill bg-lime px-3 py-1 text-body-s font-bold text-black">Active</span>
      ) : (
        <button className="rounded-pill border border-black/15 px-3 py-1 text-body-s font-bold text-ink hover:bg-black hover:text-white">
          End
        </button>
      )}
    </div>
  )
}
