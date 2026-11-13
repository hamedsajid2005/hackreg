import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { publicEnv } from "../config";

/** Server client bound to the organizer's auth session (RLS applies). */
export function createServerSupabase() {
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured on the server.");
  }
  const cookieStore = cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* called from a Server Component — middleware refreshes the session */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          /* no-op */
        }
      },
    },
  });
}
