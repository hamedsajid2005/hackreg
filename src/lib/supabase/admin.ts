import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "../config";

/**
 * Service-role client. Bypasses RLS, therefore:
 *   • never import this from a "use client" module
 *   • only call it inside Server Components, Server Actions or Route Handlers
 */
export function createAdminClient() {
  const { url, service } = serverEnv();
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "zelvation-registration-portal" } },
  });
}
