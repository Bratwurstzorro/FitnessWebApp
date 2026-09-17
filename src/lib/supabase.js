import { createClient } from '@supabase/supabase-js'

// Publishable keys are designed for browser applications. Row Level Security
// remains the actual protection for user data in the database.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bpcvvuibjzfapttefoph.supabase.co'
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_wx-JuVWWscGcXYWfZAnYkg_V28Cj8si'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
