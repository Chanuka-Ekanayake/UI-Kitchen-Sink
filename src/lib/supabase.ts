import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Safety check to prevent initialization with empty strings
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing. Check your .env file.")
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
)