import type { Chat, Message, User } from '../types'

export const ME = 'me'

// Placeholder shown only before login/registration completes — replaced by
// the real Supabase profile immediately after auth.
export const users: Record<string, User> = {
  me: {
    id: 'me',
    name: 'Вы',
    handle: '@you',
    avatar: '',
    color: '#000000',
  },
}

export const chats: Chat[] = []
export const messages: Message[] = []

// Canned replies for the pre-auth demo path (unused once a real account is
// signed in, since every chat by then is Supabase-backed).
export const cannedReplies: Record<string, string[]> = {}
