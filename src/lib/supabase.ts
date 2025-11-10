// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vrcxtkstyeutxwhllnws.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyY3h0a3N0eWV1dHh3aGxsbndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyNzQ3NzcsImV4cCI6MjA0Njg1MDc3N30.q1L5x9k9t5v5u5v5w5x5y5z5A5B5C5D5E5F5G5H5I5J'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`
    }
  }
})

// CRITICAL: Export uploadFile function
export const uploadFile = async (file: File, path: string) => {
  const { data, error } = await supabase.storage
    .from('project-files')
    .upload(path, file, { upsert: true })

  if (error) throw error
  return data
}

// Also export getUserId for other hooks
export const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || 'anonymous'
}