import type { ReactNode } from 'react'
import { initials } from '../lib/format'

export function Avatar({
  name,
  color,
  size = 44,
  ring = false,
  online,
  url,
}: {
  name: string
  color: string
  size?: number
  ring?: boolean
  online?: boolean
  url?: string
}) {
  const dark = isDark(color)
  const isImg = url && (url.startsWith('http') || url.startsWith('data:image/') || url.startsWith('/'))
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {isImg ? (
        <img
          src={url}
          alt={name}
          className="rounded-full object-cover"
          style={{
            width: size,
            height: size,
            boxShadow: ring ? '0 0 0 2px #FF5A1A' : undefined,
          }}
        />
      ) : (
        <span
          className="flex items-center justify-center rounded-full font-bold"
          style={{
            width: size,
            height: size,
            background: color,
            color: dark ? '#FF5A1A' : '#0a0a0a',
            fontSize: size * 0.36,
            boxShadow: ring ? '0 0 0 2px #FF5A1A' : undefined,
          }}
        >
          {initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-white"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            background: online ? '#22C55E' : '#C4C4C6',
          }}
        />
      )}
    </span>
  )
}

function isDark(hex: string): boolean {
  const h = hex.replace('#', '')
  if (h.length < 6) return true
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 140
}

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  // Switch spec (Design.pdf §5.3): black track, acid-lime knob, 100px radius
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="focus-lime relative h-8 w-[58px] shrink-0 rounded-pill transition-colors duration-200"
      style={{ background: on ? '#000' : '#D8D8DA' }}
    >
      <span
        className="absolute top-1 h-6 w-6 rounded-full transition-all duration-200"
        style={{
          left: on ? 30 : 4,
          background: on ? '#FF5A1A' : '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  )
}

export function Pill({
  children,
  active,
  onClick,
  className = '',
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-lime inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-body-s font-semibold transition-all ${
        active ? 'bg-lime text-black' : 'bg-grey-soft text-ink hover:bg-[#E9E9E9]'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function IconButton({
  children,
  onClick,
  active,
  title,
  className = '',
  size = 44,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  title?: string
  className?: string
  size?: number
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`focus-lime inline-flex items-center justify-center rounded-full transition-all active:scale-95 ${
        active ? 'bg-lime text-black' : 'bg-grey-soft text-ink hover:bg-[#E9E9E9]'
      } ${className}`}
    >
      {children}
    </button>
  )
}
