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

// Upload file to Supabase storage and return public URL
export async function uploadFile(file: File, userId: string, projectId?: string): Promise<string | null> {
  if (!file) return null;

  // Path: userId/[projectId]/timestamp-filename (projectId optional for default)
  const pathSegments = projectId ? [userId, projectId] : [userId];
  const fileName = `${pathSegments.join('/')}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('attachments') // Bucket name; create in Supabase dashboard if not exists
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('attachments')
    .getPublicUrl(fileName);

  return publicUrl;
}

// Delete file from Supabase storage (optional, for cleanup)
export async function deleteFile(filePath: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from('attachments')
    .remove([filePath]);

  return !error;
}