// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// === Validation ===
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
  console.error('Create .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  throw new Error('Supabase config missing')
}

// === Client ===
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// === Get User ID (with fallback) ===
export const getUserId = async (): Promise<string> => {
  try {
    const { data } = await supabase.auth.getUser()
    return data.user?.id || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

// === FILE UPLOAD UTILITY (used by ChatInput.tsx) ===
export const uploadFile = async (file: File) => {
  const userId = await getUserId()
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Supabase upload error:', error)
    return { data: null, error }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(filePath)

  return {
    data: {
      path: filePath,
      publicUrl,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    },
    error: null,
  }
}

// === Debug (dev only) ===
if (import.meta.env.DEV) {
  console.log('Supabase initialized:', supabaseUrl)
}