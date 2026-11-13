/**
 * Central runtime configuration.
 *
 * Anything prefixed NEXT_PUBLIC_ is inlined into the browser bundle — only
 * publishable values (Supabase URL, anon key) belong there. The service-role
 * key and every payment secret is read exclusively in server code.
 */

export const SITE = {
  name: "ZELVORA REGISTRATION PORTAL",
  eventName: "ZELVORA REGISTRATION PORTAL",
  organiser: "ZELVORA TECHNOLOGIES PVT. LTD.",
  tagline: "Build. Innovate. Transform.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/** Dedicated Postgres schema so registration data stays isolated from the
 *  existing submission/evaluation platform that shares the same Supabase project. */
export const REGISTRATION_SCHEMA = "zelvation";

export const STORAGE_BUCKET_RECEIPTS = "zelvation-receipts";

export function publicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

export function isSupabaseConfigured() {
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/** Server-only. Throws a clear error instead of silently degrading. */
export function serverEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    throw new Error(
      "Supabase server environment is incomplete. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return { url, anon, service };
}

export const PAYMENT_PROVIDER =
  (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER as "razorpay" | "icici" | undefined) ?? "razorpay";
