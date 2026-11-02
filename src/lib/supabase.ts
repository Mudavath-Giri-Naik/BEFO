import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { env, isDemoData } from "@/app/env"

/** Null when running on demo data (VITE_DATA_SOURCE=demo). */
export const supabase: SupabaseClient | null =
  !isDemoData && env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY
    ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
      })
    : null

export function placePhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^(https?:|\/|data:)/.test(path)) return path
  if (!env.VITE_SUPABASE_URL) return null
  return `${env.VITE_SUPABASE_URL}/storage/v1/object/public/place-photos/${path}`
}
