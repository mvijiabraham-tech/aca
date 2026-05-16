import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Vite injects env vars via import.meta.env
const supabaseUrl = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/** True when Supabase env vars are configured */
export const isSupabaseConfigured = !!supabase;
