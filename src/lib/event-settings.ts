import { REGISTRATION_SCHEMA, isSupabaseConfigured } from "./config";
import { createAdminClient } from "./supabase/admin";
import type { EventSettings } from "./types";

/**
 * Defaults used before the organizer has saved anything (and as a safe fallback
 * when Supabase is unreachable, so the marketing pages still render).
 * No event dates, venue, prizes or contact details are invented — those stay
 * null until an organizer enters them in Organizer → Settings.
 */
export const DEFAULT_SETTINGS: EventSettings = {
  id: "main",
  event_name: "ZELVORA REGISTRATION PORTAL",
  organiser_name: "ZELVORA TECHNOLOGIES PVT. LTD.",
  tagline: "Build. Innovate. Transform.",
  registrations_open: true,
  registration_deadline: null,
  event_start: null,
  event_end: null,
  venue: null,
  contact_email: null,
  contact_phone: null,
  contact_address: null,
  announcement: null,
  tax_percent: 0,
  tax_label: null,
  currency: "INR",
  fee_2_members_paise: 29900,
  fee_3_members_paise: 49900,
  fee_4_members_paise: 69900,
  payment_provider: "razorpay",
  updated_at: null,
};

export async function getEventSettings(): Promise<EventSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .schema(REGISTRATION_SCHEMA)
      .from("event_settings")
      .select("*")
      .eq("id", "main")
      .maybeSingle();
    if (error || !data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(data as EventSettings) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
