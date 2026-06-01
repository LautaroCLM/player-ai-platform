import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Helpful warning for missing env vars during development
  // This will show up in the server console / terminal.
  console.warn("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");
}

declare global {
  // allow reuse across hot-reloads in dev
  // eslint-disable-next-line no-var
  var __supabase: SupabaseClient | undefined;
}

export const supabase = globalThis.__supabase ?? (globalThis.__supabase = createClient(url!, key!));