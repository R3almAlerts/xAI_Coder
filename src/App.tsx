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

// === Client (supports auth for RLS) ===
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// === Get User ID (with fallback) ===
export const getUserId = async (): Promise<string> => {
  try {
    const { data } = await supabase.auth.getUser()
    return data.user?.id || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

// === FILE UPLOAD UTILITY ===
export const uploadFile = async (file: File, projectId: string, path: string) => {
  const userId = await getUserId();
  const fullPath = `${projectId}/${path}`;
  
  const { data, error } = await supabase.storage
    .from('project-files')
    .upload(fullPath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/octet-stream'
    });

  if (error) {
    console.error('Upload error:', error);
    return { data: null, error };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('project-files')
    .getPublicUrl(fullPath);

  return {
    data: {
      path: fullPath,
      publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    },
    error: null,
  };
};

// === Debug ===
if (import.meta.env.DEV) {
  console.log('Supabase initialized:', supabaseUrl);
}