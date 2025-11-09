import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getMessageCount(userId: string): Promise<number> {
  // Note: Requires RPC function 'get_message_count' in Supabase (see migration update below)
  const { data, error } = await supabase.rpc('get_message_count', { p_user_id: userId })
  if (error) {
    console.error('Error fetching message count:', error)
    return 0
  }
  return data || 0
}