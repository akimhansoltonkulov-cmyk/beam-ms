import { useMemo, useState } from 'react'
import emojiData from '../lib/emojiData.json'
import { useTranslation } from '../lib/i18n'

type EmojiEntry = { unicode: string; glyph: string; name: string; group: string; file: string }

const GROUP_ORDER = [
  'Smileys & Emotion',
  'People & Body',
  'Animals & Nature',
  'Food & Drink',
  'Activities',
  'Travel & Places',
  'Objects',
  'Symbols',
]

const GROUP_ICON: Record<string, string> = {
  'Smileys & Emotion': '😀',
  'People & Body': '👍',
  'Animals & Nature': '🐻',
  'Food & Drink': '🍕',
  Activities: '⚽',
  'Travel & Places': '🚀',
  Objects: '💡',
  Symbols: '❤️',
}

const RECENT_KEY = 'beam-recent-emoji'

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}
function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 28)))
  } catch {
    /* noop */
  }
}

export default function EmojiPicker({ onSelect }: { onSelect: (glyph: string) => void }) {
  const { lang: currentLang } = useTranslation()
  const emojis = emojiData as EmojiEntry[]
  const byUnicode = useMemo(() => Object.fromEntries(emojis.map((e) => [e.unicode, e])), [emojis])
  const groups = useMemo(() => {
    const map: Record<string, EmojiEntry[]> = {}
    for (const e of emojis) (map[e.group] ??= []).push(e)
    return map
  }, [emojis])
  const [recent, setRecent] = useState<string[]>(loadRecent)
  const [active, setActive] = useState<string>(recent.length ? 'Recent' : GROUP_ORDER[0])

  const tabs = recent.length ? ['Recent', ...GROUP_ORDER] : GROUP_ORDER
  const list = active === 'Recent' ? recent.map((u) => byUnicode[u]).filter(Boolean) : groups[active] ?? []

  const pick = (e: EmojiEntry) => {
    onSelect(e.glyph)
    setRecent((r) => {
      const next = [e.unicode, ...r.filter((u) => u !== e.unicode)].slice(0, 28)
      saveRecent(next)
      return next
    })
  }

  return (
    <div
      className="glass mb-2 flex h-72 flex-col overflow-hidden rounded-card border border-black/5 shadow-lift"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="beam-scroll flex shrink-0 gap-1 overflow-x-auto border-b border-black/5 p-2">
        {tabs.map((g) => (
          <button
            key={g}
            onClick={() => setActive(g)}
            title={g === 'Recent' ? (currentLang === 'ru' ? 'Недавние' : 'Recent') : g}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-body-l transition ${
              active === g ? 'bg-black text-lime' : 'text-grey-mid hover:bg-grey-soft'
            }`}
          >
            {g === 'Recent' ? '🕓' : GROUP_ICON[g] ?? '•'}
          </button>
        ))}
      </div>
      <div className="beam-scroll grid flex-1 grid-cols-7 content-start gap-1 overflow-y-auto p-2">
        {list.map((e) => (
          <button
            key={e.unicode}
            title={e.name}
            onClick={() => pick(e)}
            className="flex h-10 w-10 items-center justify-center rounded-btn transition hover:bg-grey-soft active:scale-90"
          >
            <img src={`/emoji/${e.file}`} alt={e.glyph} width={28} height={28} draggable={false} />
          </button>
        ))}
        {!list.length && (
          <p className="col-span-7 py-8 text-center text-body-s text-grey-mid">
            {currentLang === 'ru' ? 'Пока пусто' : 'Nothing yet'}
          </p>
        )}
      </div>
    </div>
  )
}
