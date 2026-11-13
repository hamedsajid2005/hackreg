import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";
import { requiredEnv } from "./http.ts";

export const REGISTRATION_SCHEMA = "zelvation";
export const RECEIPT_BUCKET = "zelvation-receipts";

let cached: SupabaseClient | null = null;

/** Service-role client — bypasses RLS. Never returned to the browser. */
export function admin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: REGISTRATION_SCHEMA },
  });
  return cached;
}

export type EventSettings = {
  event_name: string;
  organiser_name: string;
  tagline: string;
  registrations_open: boolean;
  registration_deadline: string | null;
  venue: string | null;
  event_start: string | null;
  event_end: string | null;
  contact_email: string | null;
  tax_percent: number;
  tax_label: string | null;
  currency: string;
  fee_2_members_paise: number;
  fee_3_members_paise: number;
  fee_4_members_paise: number;
  payment_provider: "razorpay" | "icici";
};

export async function loadSettings(): Promise<EventSettings> {
  const { data, error } = await admin()
    .from("event_settings")
    .select("*")
    .eq("id", "main")
    .maybeSingle();
  if (error) throw new Error(`settings: ${error.message}`);
  if (!data) throw new Error("event_settings row is missing");
  return data as EventSettings;
}

export function isWindowOpen(settings: EventSettings): boolean {
  if (!settings.registrations_open) return false;
  if (settings.registration_deadline) {
    const deadline = new Date(settings.registration_deadline).getTime();
    if (Number.isFinite(deadline) && Date.now() > deadline) return false;
  }
  return true;
}

export async function audit(entry: {
  action: string;
  entity?: string;
  entity_id?: string | null;
  actor_id?: string | null;
  actor_email?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await admin()
      .from("registration_audit_logs")
      .insert({
        action: entry.action,
        entity: entry.entity ?? null,
        entity_id: entry.entity_id ?? null,
        actor_id: entry.actor_id ?? null,
        actor_email: entry.actor_email ?? null,
        metadata: entry.metadata ?? {},
        ip: entry.ip ?? null,
      });
  } catch (err) {
    console.error("[zelvation] audit write failed", err instanceof Error ? err.message : err);
  }
}
