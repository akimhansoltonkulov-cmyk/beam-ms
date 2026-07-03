import { useStore } from '../store'
import { Avatar } from '../components/ui'
import { IconBolt, IconChevronRight, IconGrid, IconLock, IconShield } from '../components/Icons'

export default function ProfilePanel() {
  const me = useStore((s) => s.me)
  const packets = useStore((s) => s.packets)
  const messages = useStore((s) => s.messages)
  const setView = useStore((s) => s.setView)

  const sent = messages.filter((m) => m.authorId === 'me').length

  return (
    <div className="beam-scroll flex h-full flex-col overflow-y-auto px-5 pb-40 pt-5">
      <h1 className="text-display text-black">Profile</h1>

      {/* hero card */}
      <div className="relative mt-4 overflow-hidden rounded-card bg-black p-6 text-white">
        <div className="halftone-lime pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-25" />
        <div className="relative flex items-center gap-4">
          <Avatar name="You" color="#E1FF00" size={72} ring />
          <div>
            <h2 className="text-display leading-none">You</h2>
            <p className="mt-1 text-body-l text-white/60">{me.handle}</p>
          </div>
        </div>
        <p className="relative mt-4 text-body-l text-white/80">{me.bio}</p>
        <div className="relative mt-5 flex gap-2">
          <Metric label="Sent" value={String(sent)} />
          <Metric label="Packets" value={String(packets.length)} accent />
          <Metric label="Metadata" value="0" accent />
        </div>
      </div>

      {/* status */}
      <div className="mt-4 flex items-center gap-3 rounded-card bg-lime p-5 text-black">
        <IconShield size={28} />
        <div>
          <p className="text-section">Safe &amp; Transparent</p>
          <p className="text-body-s opacity-70">Your account leaves no trackable footprint.</p>
        </div>
      </div>

      {/* actions */}
      <div className="mt-4 space-y-2.5">
        <ActionRow icon={<IconLock size={20} />} title="Security & Sessions" desc="Manage active devices" onClick={() => setView('settings')} />
        <ActionRow icon={<IconBolt size={20} />} title="Open Security Specs" desc="Architecture documentation" />
        <ActionRow icon={<IconGrid size={20} />} title="My QR code" desc="Share your contact instantly" />
      </div>

      {/* roadmap teaser */}
      <div className="mt-6 rounded-card bg-white/70 p-5">
        <p className="mb-3 text-section text-black">Coming soon</p>
        <div className="flex flex-wrap gap-2">
          {['Secret Chats (E2EE)', 'Audio/Video calls', 'Folders', 'Channels', 'Stickers'].map((t) => (
            <span key={t} className="rounded-pill bg-grey-soft px-3.5 py-2 text-body-s font-semibold text-ink">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex-1 rounded-ctrl bg-white/10 p-3 text-center">
      <p className={`text-section ${accent ? 'text-lime' : 'text-white'}`}>{value}</p>
      <p className="text-body-s text-white/50">{label}</p>
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
      className="flex w-full items-center gap-3.5 rounded-ctrl bg-white/70 p-4 text-left transition hover:bg-white"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-grey-soft text-ink">
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-body-l font-semibold text-ink">{title}</p>
        <p className="text-body-s text-grey-mid">{desc}</p>
      </div>
      <IconChevronRight size={20} className="text-grey-mid" />
    </button>
  )
}
