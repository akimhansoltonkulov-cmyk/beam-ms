import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qhypyajfbflrqfqanpvm.supabase.co'
const supabaseKey = 'sb_publishable_77jrZ18YRDbc6eDuriKe-A_t-FHSzJ8'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Bundled as a real npm dependency now, so the client is always available —
// no CDN race, no silent mock fallback.
const getSupabaseClient = () => supabase

export interface SupabaseProfile {
  id: string
  phone: string
  name: string
  handle: string
  avatar: string
  color: string
  bio: string
  language: string
}

export async function getProfileByPhone(phone: string): Promise<SupabaseProfile | null> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('phone', phone.trim())
      .maybeSingle()
    
    if (error) {
      console.error('Error fetching profile by phone:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('Exception in getProfileByPhone:', err)
    return null
  }
}

// Find registered users by nickname (@handle) or name — global directory search.
export async function searchProfiles(query: string): Promise<SupabaseProfile[]> {
  const q = query.trim().replace(/^@/, '').toLowerCase()
  if (q.length < 2) return []
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .or(`handle.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(20)
    if (error) {
      console.error('Error searching profiles:', error)
      return []
    }
    return (data as SupabaseProfile[]) || []
  } catch (err) {
    console.error('Exception in searchProfiles:', err)
    return []
  }
}

export async function getProfileById(id: string): Promise<SupabaseProfile | null> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client.from('profiles').select('*').eq('id', id).maybeSingle()
    if (error) {
      console.error('Error fetching profile by id:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('Exception in getProfileById:', err)
    return null
  }
}

export async function getProfileByHandle(handle: string): Promise<SupabaseProfile | null> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('handle', handle.trim().replace(/^@/, '').toLowerCase())
      .maybeSingle()
    if (error) {
      console.error('Error fetching profile by handle:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('Exception in getProfileByHandle:', err)
    return null
  }
}

export async function isHandleTaken(handle: string): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('profiles')
      .select('handle')
      .eq('handle', handle.trim().toLowerCase())
      .maybeSingle()
      
    if (error) return false
    return !!data
  } catch (err) {
    return false
  }
}

export async function updateProfileInDb(
  id: string,
  updates: Partial<Omit<SupabaseProfile, 'id'>>,
): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    const patch = { ...updates }
    if (patch.handle) patch.handle = patch.handle.trim().toLowerCase()
    const { error } = await client.from('profiles').update(patch).eq('id', id)
    if (error) {
      console.error('Error updating profile:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Exception in updateProfileInDb:', err)
    return false
  }
}

// ─────────────────────────────────────────────────────────────
// Real-time messaging (Supabase Realtime) — see supabase-messages.sql
// ─────────────────────────────────────────────────────────────

export interface DbMessage {
  id: string
  chat_id: string
  author_id: string
  recipient_id: string | null
  text: string
  reply_to_id: string | null
  status: string
  deleted: boolean
  edited_at: string | null
  created_at: string
  attachments: any | null
  reactions: any | null
}

// Upload a file/blob to the public "media" bucket and return its public URL.
export async function uploadMedia(file: Blob, filename: string): Promise<string | null> {
  try {
    const client = getSupabaseClient()
    if (!client.storage) return null
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${Date.now()}-${Math.floor(performance.now())}-${safe}`
    const { error } = await client.storage.from('media').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: (file as File).type || undefined,
    })
    if (error) {
      console.error('Error uploading media:', error)
      return null
    }
    const { data } = client.storage.from('media').getPublicUrl(path)
    return data?.publicUrl ?? null
  } catch (err) {
    console.error('Exception in uploadMedia:', err)
    return null
  }
}

// Deterministic DM channel id — both peers derive the SAME id from the pair.
export function dmChatId(a: string, b: string): string {
  return 'dm:' + [a, b].sort().join('__')
}

export async function fetchMessages(chatId: string): Promise<DbMessage[]> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(300)
    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }
    return (data as DbMessage[]) || []
  } catch (err) {
    console.error('Exception in fetchMessages:', err)
    return []
  }
}

export async function insertMessage(row: {
  id: string
  chat_id: string
  author_id: string
  recipient_id?: string | null
  text: string
  reply_to_id?: string | null
  attachments?: any
}): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    const { error } = await client.from('messages').insert([
      {
        id: row.id,
        chat_id: row.chat_id,
        author_id: row.author_id,
        recipient_id: row.recipient_id ?? null,
        text: row.text,
        reply_to_id: row.reply_to_id ?? null,
        attachments: row.attachments ?? null,
        status: 'sent',
      },
    ])
    if (error) {
      console.error('Error inserting message:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Exception in insertMessage:', err)
    return false
  }
}

export async function patchMessage(
  id: string,
  patch: Partial<Pick<DbMessage, 'text' | 'status' | 'deleted' | 'edited_at' | 'reactions'>>,
): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    const { error } = await client.from('messages').update(patch).eq('id', id)
    if (error) {
      console.error('Error patching message:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Exception in patchMessage:', err)
    return false
  }
}

// Subscribe to all row changes for one chat. Returns an unsubscribe function.
export function subscribeToChat(
  chatId: string,
  onChange: (evt: 'INSERT' | 'UPDATE', row: DbMessage) => void,
): () => void {
  const client = getSupabaseClient()
  if (!client.channel) return () => {}
  const channel = client
    .channel(`chat:${chatId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload: any) => onChange(payload.eventType, payload.new as DbMessage),
    )
    .subscribe()
  return () => {
    try {
      client.removeChannel(channel)
    } catch {
      /* noop */
    }
  }
}

// Presence — track which users are online across the app (Supabase Realtime Presence).
export function joinPresence(userId: string, onSync: (onlineIds: string[]) => void): () => void {
  const client = getSupabaseClient()
  if (!client.channel) return () => {}
  const channel = client.channel('presence:beam', {
    config: { presence: { key: userId } },
  })
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, unknown[]>
      onSync(Object.keys(state))
    })
    .subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() })
      }
    })
  return () => {
    try {
      client.removeChannel(channel)
    } catch {
      /* noop */
    }
  }
}

// Subscribe to messages addressed to me across all chats (inbox for offline delivery).
export function subscribeToInbox(
  userId: string,
  onInsert: (row: DbMessage) => void,
): () => void {
  const client = getSupabaseClient()
  if (!client.channel) return () => {}
  const channel = client
    .channel(`inbox:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` },
      (payload: any) => onInsert(payload.new as DbMessage),
    )
    .subscribe()
  return () => {
    try {
      client.removeChannel(channel)
    } catch {
      /* noop */
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Groups & channels (Supabase) — see supabase-groups.sql
// ─────────────────────────────────────────────────────────────

export interface DbChat {
  id: string
  kind: string
  name: string
  color: string
  about: string | null
  owner_id: string
  created_at: string
}

export async function insertChat(row: {
  id: string
  kind: string
  name: string
  color: string
  about?: string | null
  owner_id: string
}): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    const { error } = await client.from('chats').insert([{ ...row, about: row.about ?? null }])
    if (error) {
      console.error('Error inserting chat:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Exception in insertChat:', err)
    return false
  }
}

export async function updateChatInDb(
  id: string,
  patch: Partial<Pick<DbChat, 'name' | 'color' | 'about'>>,
): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    const { error } = await client.from('chats').update(patch).eq('id', id)
    if (error) {
      console.error('Error updating chat:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Exception in updateChatInDb:', err)
    return false
  }
}

export async function deleteChatInDb(id: string): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    const { error } = await client.from('chats').delete().eq('id', id)
    if (error) {
      console.error('Error deleting chat:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Exception in deleteChatInDb:', err)
    return false
  }
}

export async function addChatMembers(chatId: string, userIds: string[], ownerId?: string): Promise<boolean> {
  if (!userIds.length) return true
  try {
    const client = getSupabaseClient()
    const rows = userIds.map((uid) => ({
      chat_id: chatId,
      user_id: uid,
      role: uid === ownerId ? 'owner' : 'member',
    }))
    const { error } = await client.from('chat_members').upsert(rows, { onConflict: 'chat_id,user_id' })
    if (error) {
      console.error('Error adding members:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Exception in addChatMembers:', err)
    return false
  }
}

export async function removeChatMembers(chatId: string, userIds: string[]): Promise<boolean> {
  if (!userIds.length) return true
  try {
    const client = getSupabaseClient()
    const { error } = await client
      .from('chat_members')
      .delete()
      .eq('chat_id', chatId)
      .in('user_id', userIds)
    if (error) {
      console.error('Error removing members:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Exception in removeChatMembers:', err)
    return false
  }
}

export async function fetchChatMembers(chatId: string): Promise<string[]> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client.from('chat_members').select('user_id').eq('chat_id', chatId)
    if (error) {
      console.error('Error fetching members:', error)
      return []
    }
    return (data as { user_id: string }[]).map((r) => r.user_id)
  } catch (err) {
    console.error('Exception in fetchChatMembers:', err)
    return []
  }
}

// All groups/channels the user belongs to, each with its member list.
export async function fetchMyChats(userId: string): Promise<{ chat: DbChat; members: string[] }[]> {
  try {
    const client = getSupabaseClient()
    const { data: mem, error: memErr } = await client
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId)
    if (memErr) {
      console.error('Error fetching my memberships:', memErr)
      return []
    }
    const ids = Array.from(new Set((mem as { chat_id: string }[]).map((r) => r.chat_id)))
    if (!ids.length) return []
    const { data: chatsData, error: chatsErr } = await client.from('chats').select('*').in('id', ids)
    if (chatsErr) {
      console.error('Error fetching my chats:', chatsErr)
      return []
    }
    const { data: allMem } = await client.from('chat_members').select('chat_id, user_id').in('chat_id', ids)
    const byChat: Record<string, string[]> = {}
    for (const r of (allMem as { chat_id: string; user_id: string }[]) || []) {
      ;(byChat[r.chat_id] ||= []).push(r.user_id)
    }
    return (chatsData as DbChat[]).map((chat) => ({ chat, members: byChat[chat.id] ?? [userId] }))
  } catch (err) {
    console.error('Exception in fetchMyChats:', err)
    return []
  }
}

export async function fetchChatById(id: string): Promise<DbChat | null> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client.from('chats').select('*').eq('id', id).maybeSingle()
    if (error) {
      console.error('Error fetching chat by id:', error)
      return null
    }
    return data as DbChat | null
  } catch (err) {
    console.error('Exception in fetchChatById:', err)
    return null
  }
}

// Watch which groups/channels I'm added to or removed from (across all clients).
export function subscribeToMyMemberships(
  userId: string,
  onAdded: (chatId: string) => void,
  onRemoved: (chatId: string) => void,
): () => void {
  const client = getSupabaseClient()
  if (!client.channel) return () => {}
  const channel = client
    .channel(`memberships:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_members', filter: `user_id=eq.${userId}` },
      (payload: any) => onAdded(payload.new.chat_id),
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'chat_members', filter: `user_id=eq.${userId}` },
      (payload: any) => onRemoved(payload.old?.chat_id),
    )
    .subscribe()
  return () => {
    try {
      client.removeChannel(channel)
    } catch {
      /* noop */
    }
  }
}

// One channel per group carrying its messages, metadata edits, and roster changes.
export function subscribeToGroup(
  chatId: string,
  onMessage: (evt: 'INSERT' | 'UPDATE', row: DbMessage) => void,
  onMeta: (row: DbChat) => void,
  onRoster: () => void,
): () => void {
  const client = getSupabaseClient()
  if (!client.channel) return () => {}
  const channel = client
    .channel(`group:${chatId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload: any) => onMessage(payload.eventType, payload.new as DbMessage),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chats', filter: `id=eq.${chatId}` },
      (payload: any) => onMeta(payload.new as DbChat),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_members', filter: `chat_id=eq.${chatId}` },
      () => onRoster(),
    )
    .subscribe()
  return () => {
    try {
      client.removeChannel(channel)
    } catch {
      /* noop */
    }
  }
}

export async function registerProfile(profile: Omit<SupabaseProfile, 'id'>): Promise<SupabaseProfile | null> {
  try {
    const client = getSupabaseClient()
    const id = `u-${Date.now()}`
    const newProfile = {
      id,
      ...profile,
      handle: profile.handle.trim().toLowerCase()
    }
    
    const { error } = await client
      .from('profiles')
      .insert([newProfile])
      
    if (error) {
      console.error('Error inserting profile:', error)
      return null
    }
    return newProfile
  } catch (err) {
    console.error('Exception in registerProfile:', err)
    return null
  }
}
