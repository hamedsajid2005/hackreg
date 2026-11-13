import { admin, audit, loadSettings, REGISTRATION_SCHEMA } from "../_shared/db.ts";
import { finalizeConfirmedRegistration } from "../_shared/finalize.ts";
import { HttpError, fail, json } from "../_shared/http.ts";
import { getProvider, type ProviderId } from "../_shared/providers.ts";

/**
 * payment-webhook
 *
 * The ONLY place a payment becomes a confirmed registration.
 *  1. verifies the gateway signature over the raw body
 *  2. resolves our order (by order_id, or by qr_code_id for UPI QR payments)
 *  3. confirms atomically through zelvation.confirm_payment (idempotent,
 *     amount-checked, sequence-backed team ID)
 *  4. generates the PDF receipt into private storage
 *  5. sends the confirmation email exactly once
 *
 * Repeated deliveries are safe: confirm_payment returns the same team ID and
 * the email layer upserts a single delivery row per registration.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST") {
    return json({ error: { code: "method_not_allowed", message: "Method not allowed." } }, 405);
  }

  try {
    const rawBody = await req.text();

    // Determine the provider from the signature header, falling back to settings.
    const isRazorpay = Boolean(req.headers.get("x-razorpay-signature"));
    const settings = await loadSettings();
    const providerId: ProviderId = isRazorpay
      ? "razorpay"
      : (settings.payment_provider as ProviderId) ?? "razorpay";
    const provider = getProvider(providerId);

    const event = await provider.verifyWebhook(rawBody, req.headers);

    await audit({
      action: `webhook.${event.gatewayStatus}`,
      entity: "payment",
      metadata: {
        provider: providerId,
        order_id: event.orderId,
        payment_id: event.paymentId,
        qr_code_id: event.qrCodeId,
        amount_paise: event.amountPaise,
        kind: event.kind,
      },
    });

    if (event.kind === "ignored") {
      // Logged for the audit trail; nothing to confirm. Confirmation for QR
      // payments arrives through payment.captured, matched by qr_code_id.
      return json({ ok: true, ignored: true });
    }

    // Resolve our order reference.
    let orderId = event.orderId;
    if (!orderId && event.qrCodeId) {
      const { data: qrPayment } = await admin()
        .from("registration_payments")
        .select("provider_order_id")
        .eq("qr_code_id", event.qrCodeId)
        .maybeSingle();
      orderId = qrPayment?.provider_order_id ?? null;
    }

    if (!orderId) {
      console.warn("[zelvation] webhook without a resolvable order", event.gatewayStatus);
      return json({ ok: true, unresolved: true });
    }

    if (event.kind === "failure" || event.kind === "expired" || event.kind === "cancelled") {
      await admin().schema(REGISTRATION_SCHEMA).rpc("mark_payment_status", {
        p_order_id: orderId,
        p_status: event.kind === "failure" ? "failed" : event.kind === "cancelled" ? "cancelled" : "expired",
        p_reason: event.gatewayStatus,
        p_raw: event.raw as Record<string, unknown>,
      });
      return json({ ok: true });
    }

    /* --------------------------- success path --------------------------- */

    const { data: confirmed, error: confirmError } = await admin()
      .schema(REGISTRATION_SCHEMA)
      .rpc("confirm_payment", {
        p_order_id: orderId,
        p_payment_id: event.paymentId,
        p_amount_paise: event.amountPaise,
        p_currency: event.currency,
        p_method: event.method,
        p_raw: event.raw as Record<string, unknown>,
      });

    if (confirmError) {
      // An amount mismatch is a genuine incident: record and stop, never confirm.
      console.error("[zelvation] confirm_payment failed", confirmError.message.slice(0, 120));
      return json({ ok: false, error: "confirm_failed" }, 200);
    }

    const row = Array.isArray(confirmed) ? confirmed[0] : confirmed;
    if (!row) return json({ ok: true });

    // Receipt + email. Idempotent, and never allowed to fail the webhook.
    const finalize = await finalizeConfirmedRegistration(row.registration_id);

    return json({
      ok: true,
      team_id: row.team_id,
      already_confirmed: row.already_confirmed,
      receipt: finalize.receipt,
      email: finalize.email,
    });
  } catch (error) {
    // Invalid signatures return 401 so the gateway retries / alerts.
    if (error instanceof HttpError) return fail(error);
    return fail(error);
  }
});
