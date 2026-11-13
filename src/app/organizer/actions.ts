"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { REGISTRATION_SCHEMA } from "@/lib/config";
import { getAccessToken, requireOrganizer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const settingsSchema = z.object({
  event_name: z.string().trim().min(2).max(60),
  organiser_name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(120),
  registrations_open: z.boolean(),
  registration_deadline: z.string().nullable(),
  event_start: z.string().nullable(),
  event_end: z.string().nullable(),
  venue: z.string().trim().max(160).nullable(),
  contact_email: z.string().trim().email().nullable().or(z.literal("")),
  contact_phone: z.string().trim().max(24).nullable().or(z.literal("")),
  contact_address: z.string().trim().max(240).nullable().or(z.literal("")),
  announcement: z.string().trim().max(240).nullable().or(z.literal("")),
  tax_percent: z.coerce.number().min(0).max(100),
  tax_label: z.string().trim().max(40).nullable().or(z.literal("")),
  fee_2_members_paise: z.coerce.number().int().min(0).max(10_000_000),
  fee_3_members_paise: z.coerce.number().int().min(0).max(10_000_000),
  fee_4_members_paise: z.coerce.number().int().min(0).max(10_000_000),
  payment_provider: z.enum(["razorpay", "icici"]),
});

export type SettingsActionResult = { ok: boolean; message: string };

const nullable = (value: string | null | undefined) =>
  value && String(value).trim().length ? String(value).trim() : null;

export async function updateEventSettings(input: unknown): Promise<SettingsActionResult> {
  const organizer = await requireOrganizer();

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid settings." };
  }
  const values = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin
    .schema(REGISTRATION_SCHEMA)
    .from("event_settings")
    .update({
      event_name: values.event_name,
      organiser_name: values.organiser_name,
      tagline: values.tagline,
      registrations_open: values.registrations_open,
      registration_deadline: nullable(values.registration_deadline),
      event_start: nullable(values.event_start),
      event_end: nullable(values.event_end),
      venue: nullable(values.venue),
      contact_email: nullable(values.contact_email),
      contact_phone: nullable(values.contact_phone),
      contact_address: nullable(values.contact_address),
      announcement: nullable(values.announcement),
      tax_percent: values.tax_percent,
      tax_label: nullable(values.tax_label),
      fee_2_members_paise: values.fee_2_members_paise,
      fee_3_members_paise: values.fee_3_members_paise,
      fee_4_members_paise: values.fee_4_members_paise,
      payment_provider: values.payment_provider,
      updated_by: organizer.userId,
    })
    .eq("id", "main");

  if (error) return { ok: false, message: "Could not save settings. Please try again." };

  await admin.schema(REGISTRATION_SCHEMA).from("registration_audit_logs").insert({
    action: "settings.updated",
    entity: "event_settings",
    actor_id: organizer.userId,
    actor_email: organizer.email,
    metadata: {
      registrations_open: values.registrations_open,
      fee_2: values.fee_2_members_paise,
      fee_3: values.fee_3_members_paise,
      fee_4: values.fee_4_members_paise,
      tax_percent: values.tax_percent,
    },
  });

  revalidatePath("/");
  revalidatePath("/register");
  revalidatePath("/organizer/settings");
  return { ok: true, message: "Settings saved." };
}

export async function setRegistrationWindow(open: boolean): Promise<SettingsActionResult> {
  const organizer = await requireOrganizer();
  const admin = createAdminClient();
  const { error } = await admin
    .schema(REGISTRATION_SCHEMA)
    .from("event_settings")
    .update({ registrations_open: open, updated_by: organizer.userId })
    .eq("id", "main");

  if (error) return { ok: false, message: "Could not update the registration window." };

  await admin.schema(REGISTRATION_SCHEMA).from("registration_audit_logs").insert({
    action: open ? "registrations.opened" : "registrations.closed",
    entity: "event_settings",
    actor_id: organizer.userId,
    actor_email: organizer.email,
    metadata: {},
  });

  revalidatePath("/");
  revalidatePath("/register");
  revalidatePath("/organizer");
  revalidatePath("/organizer/settings");
  return { ok: true, message: open ? "Registrations opened." : "Registrations closed." };
}

export async function resendConfirmationEmail(
  registrationId: string,
): Promise<SettingsActionResult> {
  const organizer = await requireOrganizer();
  const token = await getAccessToken();
  if (!token) return { ok: false, message: "Your session expired. Sign in again." };

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resend-confirmation-email`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ registration_id: registrationId }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: body?.error?.message ?? "The email could not be sent. Check the Resend configuration.",
      };
    }
    revalidatePath("/organizer/registrations");
    revalidatePath(`/organizer/registrations/${registrationId}`);
    return { ok: true, message: "Confirmation email re-sent." };
  } catch {
    return { ok: false, message: "Could not reach the email service." };
  }
}

export async function logExport(format: string, scope: string, rows: number) {
  const organizer = await getOrganizerSafe();
  if (!organizer) return;
  const admin = createAdminClient();
  await admin.schema(REGISTRATION_SCHEMA).from("registration_audit_logs").insert({
    action: "export.created",
    entity: "export",
    actor_id: organizer.userId,
    actor_email: organizer.email,
    metadata: { format, scope, rows },
  });
}

async function getOrganizerSafe() {
  try {
    return await requireOrganizer();
  } catch {
    return null;
  }
}
