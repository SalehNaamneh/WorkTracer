import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Fall back to a placeholder so a missing env var doesn't crash the whole bundle
// on import (blank page); main.tsx shows a config error instead.
export const supabase = createClient(
  supabaseUrl || 'http://localhost',
  supabaseAnonKey || 'missing-anon-key',
)
