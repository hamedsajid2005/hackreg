import { redirect } from "next/navigation";
import { REGISTRATION_SCHEMA } from "./config";
import { createAdminClient } from "./supabase/admin";
import { createServerSupabase } from "./supabase/server";

export type Organizer = {
  userId: string;
  email: string;
  fullName: string | null;
  role: "admin" | "viewer";
};

/**
 * Resolves the signed-in user against the organiser allow-list.
 * Both conditions must hold: a valid Supabase Auth session AND an active row in
 * zelvation.organizer_users. There is no public organizer sign-up.
 */
export async function getOrganizer(): Promise<Organizer | null> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .schema(REGISTRATION_SCHEMA)
    .from("organizer_users")
    .select("user_id, email, full_name, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  return {
    userId: user.id,
    email: user.email ?? data.email,
    fullName: data.full_name,
    role: data.role,
  };
}

export async function requireOrganizer(): Promise<Organizer> {
  const organizer = await getOrganizer();
  if (!organizer) redirect("/organizer/login?error=not_authorized");
  return organizer;
}

/** Returns the raw access token so server actions can call Edge Functions. */
export async function getAccessToken(): Promise<string | null> {
  const supabase = createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
