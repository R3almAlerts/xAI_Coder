// src/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing Supabase admin config. Add to your .env:\n' +
    'VITE_SUPABASE_URL=your-url\n' +
    'VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key'
  );
}

// Single admin client — used only for global uploads (logo)
// No auth, no session, bypasses all RLS
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});