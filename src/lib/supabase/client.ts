"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "../config";

/**
 * Browser client — publishable credentials only. Row Level Security decides what
 * this client can see; it can never write payment or team-ID state.
 */
export function createBrowserSupabase() {
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured for the browser.");
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
