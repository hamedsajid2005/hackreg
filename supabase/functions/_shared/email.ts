import { admin, loadSettings } from "./db.ts";
import { requiredEnv } from "./http.ts";
import { buildReceiptData, buildReceiptPdf, type ReceiptData } from "./receipt.ts";

/**
 * Transactional email via Resend.
 *
 * Delivery state lives in zelvation.registration_emails, one row per
 * (registration, template). Repeated webhooks therefore update that row instead
 * of sending a second email, and an organizer can retry a failed send.
 * A failed email never reverses a confirmed payment.
 */

const TRACK_LABELS: Record<string, string> = {
  education: "Education / EdTech",
  ai: "AI Innovation",
  healthcare: "Healthcare",
  business: "Business",
};

export type EmailResult = { status: "sent" | "failed"; messageId?: string; error?: string };

function inr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderConfirmationHtml(data: ReceiptData, receiptUrl: string | null): string {
  const siteUrl = Deno.env.get("SITE_URL") ?? "";
  const logoUrl = `${siteUrl}/zelvora-logo.png`;
  const track = TRACK_LABELS[data.track] ?? data.track;

  const memberRows = data.members
    .map(
      (m) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eef2f6;font:14px/1.5 Arial,sans-serif;color:#0b1016;">
          ${escapeHtml(m.fullName)}${m.isLeader ? ' <span style="font-size:10px;font-weight:bold;letter-spacing:.08em;color:#00a4c2;">LEADER</span>' : ""}
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #eef2f6;font:13px/1.5 Arial,sans-serif;color:#64748b;">
          ${escapeHtml(m.role)}
        </td>
      </tr>`,
    )
    .join("");

  const detail = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;font:12px/1.5 Arial,sans-serif;color:#64748b;width:42%;">${label}</td>
      <td style="padding:6px 0;font:13px/1.5 Arial,sans-serif;color:#0b1016;font-weight:bold;">${escapeHtml(value)}</td>
    </tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Zelvation Registration Confirmed — ${escapeHtml(data.teamId)}</title>
</head>
<body style="margin:0;padding:0;background:#04070b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#04070b;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#04070b;padding:26px 28px;border-bottom:3px solid #06f4ed;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="72" valign="middle">
                    <img src="${logoUrl}" width="64" height="64" alt="Zelvora Technologies Pvt. Ltd." style="display:block;border-radius:10px;background:#000;" />
                  </td>
                  <td valign="middle" style="padding-left:14px;">
                    <div style="font:800 19px/1.2 Arial,sans-serif;letter-spacing:.14em;color:#ffffff;">${escapeHtml(data.eventName)}</div>
                    <div style="font:12px/1.6 Arial,sans-serif;color:#06f4ed;margin-top:4px;">${escapeHtml(data.tagline)}</div>
                    <div style="font:10px/1.6 Arial,sans-serif;letter-spacing:.1em;color:#94a3b8;margin-top:2px;">${escapeHtml(data.organiserName)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px 28px 8px;">
              <div style="display:inline-block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:6px 14px;font:bold 11px/1 Arial,sans-serif;letter-spacing:.12em;">REGISTRATION CONFIRMED</div>
              <h1 style="margin:16px 0 8px;font:800 23px/1.3 Arial,sans-serif;color:#0b1016;">You're in, ${escapeHtml(data.teamName)}.</h1>
              <p style="margin:0 0 22px;font:14px/1.65 Arial,sans-serif;color:#475569;">
                Your payment has been verified and your team is registered for ${escapeHtml(data.eventName)}.
                Your team ID is permanent — please quote it in every communication with the organiser.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#04070b;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td align="center" style="padding:20px;">
                    <div style="font:bold 10px/1 Arial,sans-serif;letter-spacing:.2em;color:#22f0e4;">YOUR TEAM ID</div>
                    <div style="font:800 34px/1.2 Arial,sans-serif;letter-spacing:.06em;color:#ffffff;margin-top:8px;">${escapeHtml(data.teamId)}</div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;padding:4px 18px;">
                ${detail("Team name", data.teamName)}
                ${detail("Team size", `${data.teamSize} members`)}
                ${detail("Team leader", data.leaderName)}
                ${detail("Selected track", track)}
                ${detail("Amount paid", inr(data.amountPaise))}
                ${detail("Payment reference", data.paymentReference ?? "—")}
                ${detail("Registration time", new Date(data.confirmedAt).toUTCString())}
              </table>

              <h2 style="margin:26px 0 6px;font:bold 12px/1.4 Arial,sans-serif;letter-spacing:.14em;color:#64748b;">TEAM MEMBERS</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${memberRows}</table>

              ${
                receiptUrl
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;">
                       <tr><td style="background:#06f4ed;border-radius:10px;">
                         <a href="${receiptUrl}" style="display:inline-block;padding:13px 24px;font:bold 14px/1 Arial,sans-serif;color:#04070b;text-decoration:none;">Download your PDF receipt</a>
                       </td></tr>
                     </table>
                     <p style="margin:6px 0 0;font:11px/1.6 Arial,sans-serif;color:#94a3b8;">The receipt is also attached to this email. The link expires in 7 days.</p>`
                  : `<p style="margin:22px 0 0;font:12px/1.6 Arial,sans-serif;color:#64748b;">Your PDF receipt is attached to this email.</p>`
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 28px 28px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;" />
              <p style="margin:0 0 6px;font:11px/1.6 Arial,sans-serif;color:#94a3b8;">
                Questions? ${data.contactEmail ? `Write to <a href="mailto:${escapeHtml(data.contactEmail)}" style="color:#00a4c2;">${escapeHtml(data.contactEmail)}</a>.` : "Contact the organiser from the event website."}
              </p>
              <p style="margin:0;font:11px/1.6 Arial,sans-serif;color:#cbd5e1;">
                ${escapeHtml(data.organiserName)} · This is a transactional email sent because your team completed registration.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends (or re-sends) the confirmation email for a registration.
 * Returns the delivery result and records it in registration_emails.
 */
export async function deliverConfirmationEmail(
  registrationId: string,
  opts: { force?: boolean } = {},
): Promise<EmailResult> {
  const db = admin();

  const { data: registration, error: regError } = await db
    .from("registrations")
    .select("*, registration_members(*), registration_payments(*)")
    .eq("id", registrationId)
    .maybeSingle();

  if (regError || !registration) return { status: "failed", error: "registration_not_found" };
  if (registration.status !== "confirmed" || !registration.team_id) {
    // Never email a confirmation for an unverified payment.
    return { status: "failed", error: "registration_not_confirmed" };
  }

  const settings = await loadSettings();
  const payments = (registration.registration_payments ?? [])
    .slice()
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const payment = payments.find((p: any) => p.status === "successful") ?? payments[0];
  const members = (registration.registration_members ?? [])
    .slice()
    .sort((a: any, b: any) => a.position - b.position);

  // Existing delivery row — this is what makes repeated webhooks safe.
  const { data: existing } = await db
    .from("registration_emails")
    .select("*")
    .eq("registration_id", registrationId)
    .eq("template", "registration_confirmed")
    .maybeSingle();

  if (existing?.status === "sent" && !opts.force) {
    return { status: "sent", messageId: existing.provider_message_id ?? undefined };
  }

  // Single source of truth for receipt content (shared with the webhook).
  const receiptData: ReceiptData = (await buildReceiptData(registrationId)) ?? {
    teamId: registration.team_id,
    teamName: registration.team_name,
    teamSize: registration.team_size,
    track: registration.track,
    college: registration.college,
    city: registration.city,
    state: registration.state,
    leaderName: registration.leader_name,
    leaderEmail: registration.leader_email,
    amountPaise: registration.amount_paise,
    currency: registration.currency,
    paymentReference: payment?.provider_payment_id ?? null,
    orderId: payment?.provider_order_id ?? "—",
    paymentMethod: payment?.method ?? null,
    provider: payment?.provider ?? "razorpay",
    confirmedAt: registration.confirmed_at ?? new Date().toISOString(),
    members: members.map((m: any) => ({
      fullName: m.full_name,
      role: m.role,
      college: m.college,
      isLeader: m.is_leader,
    })),
    eventName: settings.event_name,
    organiserName: settings.organiser_name,
    tagline: settings.tagline,
    contactEmail: settings.contact_email,
  };

  const attempt = (existing?.attempts ?? 0) + 1;
  const upsertBase = {
    registration_id: registrationId,
    recipient: registration.leader_email,
    template: "registration_confirmed",
    attempts: attempt,
  };

  try {
    const apiKey = requiredEnv("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "Zelvation <onboarding@resend.dev>";
    const siteUrl = Deno.env.get("SITE_URL") ?? "";

    // Receipt attachment (generated on the fly if storage is unavailable).
    let pdfBase64: string | null = null;
    try {
      const pdfBytes = await buildReceiptPdf(receiptData);
      pdfBase64 = base64FromBytes(pdfBytes);
    } catch (err) {
      console.error("[zelvation] receipt attach failed", err instanceof Error ? err.message : err);
    }

    let receiptUrl: string | null = null;
    if (payment?.receipt_url) {
      const { data: signed } = await db.storage
        .from("zelvation-receipts")
        .createSignedUrl(payment.receipt_url, 60 * 60 * 24 * 7);
      receiptUrl = signed?.signedUrl ?? null;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [registration.leader_email],
        subject: "Zelvation Registration Confirmed — Your Team ID",
        html: renderConfirmationHtml(receiptData, receiptUrl),
        reply_to: settings.contact_email ?? undefined,
        attachments: pdfBase64
          ? [{ filename: `${registration.team_id}-zelvation-receipt.pdf`, content: pdfBase64 }]
          : undefined,
        tags: [{ name: "type", value: "registration_confirmed" }],
      }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const message = body?.message ?? `resend_error_${res.status}`;
      await db.from("registration_emails").upsert(
        {
          ...upsertBase,
          status: "failed",
          error: String(message).slice(0, 400),
        },
        { onConflict: "registration_id,template" },
      );
      console.error("[zelvation] email failed", res.status);
      return { status: "failed", error: String(message) };
    }

    await db.from("registration_emails").upsert(
      {
        ...upsertBase,
        status: "sent",
        provider_message_id: body?.id ?? null,
        error: null,
        sent_at: new Date().toISOString(),
      },
      { onConflict: "registration_id,template" },
    );

    return { status: "sent", messageId: body?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "email_failed";
    await db.from("registration_emails").upsert(
      { ...upsertBase, status: "failed", error: message.slice(0, 400) },
      { onConflict: "registration_id,template" },
    );
    // Payment stays confirmed; email failure is recorded, never fatal.
    console.error("[zelvation] email exception", message);
    return { status: "failed", error: message };
  }
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
