export function timeOf(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function dayLabel(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const y = new Date()
  y.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (same(d, today)) return 'Today'
  if (same(d, y)) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function relative(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return dayLabel(ts)
}

export function bytes(n?: number): string {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function initials(name?: string): string {
  if (!name) return '?'
  const p = name.trim().split(/\s+/)
  if (p.length === 0 || !p[0]) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return ((p[0]?.[0] || '') + (p[p.length - 1]?.[0] || '')).toUpperCase() || '?'
}

export function secs(s?: number): string {
  if (!s) return '0:00'
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${r.toString().padStart(2, '0')}`
}
