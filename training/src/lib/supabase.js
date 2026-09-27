import { createClient } from '@supabase/supabase-js'

// Same URL and publishable key as BodyTrack; never put a secret/service key here.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://bpcvvuibjzfapttefoph.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_wx-JuVWWscGcXYWfZAnYkg_V28Cj8si'
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
