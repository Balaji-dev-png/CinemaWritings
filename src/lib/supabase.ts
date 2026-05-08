/**
 * Supabase browser client.
 *
 * Uses createBrowserClient from @supabase/ssr — this is compatible with
 * the cookie-based session handling used by middleware.ts, while also
 * working correctly in "use client" components.
 *
 * Note: JWTs are stored in cookies managed by @supabase/ssr.
 * autoRefreshToken is enabled by default in the Supabase JS client.
 */

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[Supabase] Credentials missing. Check your .env.local file."
    );
  }
}

// Singleton browser client — reuse across all components
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

// Named export for backwards compatibility with existing imports
export const supabase = getSupabaseClient();
