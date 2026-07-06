import type { Chat, Message, User } from '../types'

export const ME = 'me'

export const users: Record<string, User> = {
  me: {
    id: 'me',
    name: 'Вы',
    handle: '@you',
    avatar: '',
    color: '#000000',
    bio: 'Ценю цифровой суверенитет.',
  },
  anna: {
    id: 'anna',
    name: 'Айгерим Осмонова',
    handle: '@aigerim',
    avatar: 'https://i.pravatar.cc/240?img=45',
    color: '#B9E36B',
    bio: 'Продуктовый дизайнер. На кофе.',
  },
  marcus: {
    id: 'marcus',
    name: 'Данияр Бекболотов',
    handle: '@daniyar',
    avatar: 'https://i.pravatar.cc/240?img=12',
    color: '#7FC8F8',
    bio: 'Бэкенд @ Beam. Go и Rust.',
  },
  lena: {
    id: 'lena',
    name: 'Елена Ковалёва',
    handle: '@elena',
    avatar: 'https://i.pravatar.cc/240?img=25',
    color: '#F5A9C5',
    bio: 'Исследую безопасность.',
  },
  omar: {
    id: 'omar',
    name: 'Тимур Асанов',
    handle: '@timur',
    avatar: 'https://i.pravatar.cc/240?img=33',
    color: '#C9A7F0',
    bio: 'В пути.',
  },
  team: {
    id: 'team',
    name: 'Команда Beam',
    handle: '',
    avatar: '',
    color: '#0A0A0A',
  },
}

export const chats: Chat[] = [
  {
    id: 'c-anna',
    kind: 'dm',
    name: 'Айгерим Осмонова',
    avatar: '',
    color: '#B9E36B',
    members: ['me', 'anna'],
    via: 'Через Beam',
    pinned: true,
  },
  {
    id: 'c-team',
    kind: 'group',
    name: 'Команда Beam',
    avatar: '',
    color: '#0A0A0A',
    members: ['me', 'anna', 'marcus', 'lena', 'omar'],
    via: '5 участников',
    pinned: true,
  },
  {
    id: 'c-marcus',
    kind: 'dm',
    name: 'Данияр Бекболотов',
    avatar: '',
    color: '#7FC8F8',
    members: ['me', 'marcus'],
    via: 'Через Beam',
  },
  {
    id: 'c-lena',
    kind: 'dm',
    name: 'Елена Ковалёва',
    avatar: '',
    color: '#F5A9C5',
    members: ['me', 'lena'],
    via: 'Через Beam',
    muted: true,
  },
  {
    id: 'c-omar',
    kind: 'dm',
    name: 'Тимур Асанов',
    avatar: '',
    color: '#C9A7F0',
    members: ['me', 'omar'],
    via: 'Через Beam',
  },
]

const now = Date.now()
const mins = (m: number) => now - m * 60_000

let seq = 0
const mk = (
  chatId: string,
  authorId: string,
  text: string,
  createdAt: number,
  extra: Partial<Message> = {},
): Message => ({
  id: `seed-${seq++}`,
  chatId,
  authorId,
  text,
  createdAt,
  status: authorId === 'me' ? 'read' : 'delivered',
  ...extra,
})

export const messages: Message[] = [
  // Айгерим
  mk('c-anna', 'anna', 'Привет! Напоминаю, что во вторник в 9:00 у тебя встреча, как ты и просил. Хорошего дня! ☀️', mins(420)),
  mk('c-anna', 'me', 'Отлично, спасибо, Айгерим. Записал.', mins(418)),
  mk('c-anna', 'anna', 'И ещё — новый макет Консоли прозрачности готов к ревью.', mins(180)),
  mk('c-anna', 'anna', 'Скриншоты сейчас пришлю 👇', mins(179)),
  mk('c-anna', 'anna', '', mins(178), {
    attachments: [
      { id: 'a1', kind: 'image', name: 'console.png', url: 'linear-gradient(135deg,#FF5A1A,#0a0a0a)' },
    ],
  }),
  mk('c-anna', 'me', 'Выглядит потрясающе. Запускаем!', mins(20)),

  // Команда Beam
  mk('c-team', 'marcus', 'Бинарный WS-шлюз уже на стейджинге. p99 рукопожатия снизили до 41 мс.', mins(300)),
  mk('c-team', 'lena', 'Провела аудит метаданных — не храним ничего, кроме маршрутизации доставки. 🔒', mins(240)),
  mk('c-team', 'omar', 'Еду в поезде на 3G — всё равно мгновенно. Оптимистичный UI спасает.', mins(90)),
  mk('c-team', 'me', 'Отличная работа, команда. Демо в пятницу.', mins(12)),

  // Данияр
  mk('c-marcus', 'marcus', 'Запушил схему Protobuf v3. Теперь только дельты, без полной ресинхронизации.', mins(600)),
  mk('c-marcus', 'me', 'Круто, Smart Sync — в этом весь смысл.', mins(598)),
  mk('c-marcus', 'marcus', '', mins(500), {
    attachments: [{ id: 'v1', kind: 'voice', name: 'note.ogg', duration: 14, waveform: genWave(48) }],
  }),

  // Елена
  mk('c-lena', 'lena', 'Прототип E2EE на Web Crypto влит в ветку secret-chats.', mins(1440)),
  mk('c-lena', 'me', 'Пункт дорожной карты разблокирован 🎉', mins(1438)),

  // Тимур
  mk('c-omar', 'omar', 'Отправляю файл, он огромный.', mins(45)),
  mk('c-omar', 'omar', '', mins(44), {
    attachments: [{ id: 'f1', kind: 'file', name: 'beam-brand-kit.zip', size: 48_400_000 }],
  }),
  mk('c-omar', 'me', 'Получил — скачалось мгновенно. 🤝', mins(40)),
]

function genWave(n: number): number[] {
  // deterministic pseudo waveform so SSR/first paint is stable
  const out: number[] = []
  let s = 7
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280
    const r = s / 233280
    out.push(0.25 + Math.abs(Math.sin(i * 0.7)) * 0.55 * (0.6 + r * 0.4))
  }
  return out
}

// Canned replies used by the mock realtime engine when you message someone
export const cannedReplies: Record<string, string[]> = {
  anna: ['Уже делаю! 👍', 'Отличная идея.', 'Дай мне пару минут.', 'Сейчас пришлю.'],
  marcus: ['Деплою.', 'Цифры хорошие.', 'Смотрю логи…', 'У меня всё починил.'],
  lena: ['Проверила, всё чисто.', 'Утечки метаданных нет.', 'E2EE это покрывает.'],
  omar: ['🔥', 'В дороге, отвечу подробнее позже.', 'Получил!'],
}
