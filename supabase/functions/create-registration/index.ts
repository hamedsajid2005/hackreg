import { admin, audit, isWindowOpen, loadSettings, REGISTRATION_SCHEMA } from "../_shared/db.ts";
import { HttpError, clientIp, fail, json, requireMethod } from "../_shared/http.ts";
import { calculateFee } from "../_shared/pricing.ts";
import { getProvider, type ProviderId } from "../_shared/providers.ts";
import { parsePayload } from "../_shared/validation.ts";

/**
 * create-registration
 *
 * The only way a registration is created. Everything the browser sends is
 * treated as untrusted input:
 *   • the fee is recalculated here from the trusted event_settings row
 *   • duplicate team names / leader emails are rejected
 *   • the gateway order is created server-side with our amount
 *   • the browser never receives a team ID
 */

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_PER_IP = 8;

Deno.serve(async (req) => {
  const preflight = requireMethod(req, "POST");
  if (preflight) return preflight;

  try {
    const ip = clientIp(req);
    const body = await req.json().catch(() => {
      throw new HttpError("invalid_json", "Request body must be valid JSON.", 400);
    });

    const settings = await loadSettings();
    if (!isWindowOpen(settings)) {
      throw new HttpError(
        "registration_closed",
        "Registration is currently closed. Please check the event website for updates.",
        423,
      );
    }

    const providerId = (settings.payment_provider ?? "razorpay") as ProviderId;
    const provider = getProvider(providerId);

    /* ---------------- retry path: existing pending registration -------- */
    if (typeof body?.retry_for === "string") {
      const { data: registration, error } = await admin()
        .from("registrations")
        .select("*")
        .eq("access_token", body.retry_for)
        .maybeSingle();

      if (error || !registration) {
        throw new HttpError("not_found", "That registration could not be found.", 404);
      }
      if (registration.status === "confirmed") {
        throw new HttpError(
          "already_confirmed",
          "This registration is already confirmed. Your team ID is on the confirmation page.",
          409,
        );
      }
      if (registration.status === "cancelled") {
        throw new HttpError("cancelled", "This registration was cancelled.", 409);
      }

      // Close any earlier pending order so two orders cannot both settle.
      const { data: openPayments } = await admin()
        .from("registration_payments")
        .select("provider_order_id")
        .eq("registration_id", registration.id)
        .eq("status", "pending");
      for (const p of openPayments ?? []) {
        await admin().schema(REGISTRATION_SCHEMA).rpc("mark_payment_status", {
          p_order_id: p.provider_order_id,
          p_status: "expired",
          p_reason: "superseded_by_retry",
          p_raw: null,
        });
      }

      const order = await provider.createOrder({
        amountPaise: registration.amount_paise,
        currency: registration.currency,
        receipt: `zelv_${registration.id.replace(/-/g, "").slice(0, 12)}`,
        notes: { registration_id: registration.id, team_name: registration.team_name },
        description: `ZELVATION ${registration.team_size}-member team registration`,
      });

      await admin().from("registration_payments").insert({
        registration_id: registration.id,
        provider: providerId,
        provider_order_id: order.orderId,
        amount_paise: registration.amount_paise,
        currency: registration.currency,
        status: "pending",
        qr_code_id: order.qr?.id ?? null,
        qr_image_url: order.qr?.imageUrl ?? null,
        expires_at: order.qr?.expiresAt ?? null,
      });

      await audit({
        action: "payment.retry_order_created",
        entity: "registration",
        entity_id: registration.id,
        metadata: { order_id: order.orderId },
        ip,
      });

      return json(toClientPayload(registration, order));
    }

    /* ---------------- new registration -------------------------------- */
    const payload = parsePayload(body);

    // Best-effort rate limit keyed on the caller's IP (audit trail doubles as
    // the counter). Production deployments should also put a WAF/Upstash limiter
    // in front of this function.
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
    const { count: recentCount } = await admin()
      .from("registration_audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "registration.created")
      .eq("ip", ip)
      .gte("created_at", since);
    if ((recentCount ?? 0) >= RATE_LIMIT_MAX_PER_IP) {
      throw new HttpError(
        "rate_limited",
        "Too many registration attempts from this connection. Please try again shortly.",
        429,
      );
    }

    const fee = calculateFee(payload.team_size, settings);
    const leader = payload.members[0];

    const { data: registration, error: insertError } = await admin()
      .from("registrations")
      .insert({
        team_name: payload.team_name,
        team_size: payload.team_size,
        college: payload.college,
        city: payload.city,
        state: payload.state,
        track: payload.track,
        status: "pending_payment",
        amount_paise: fee.totalPaise, // server-computed, never client-supplied
        currency: fee.currency,
        leader_name: leader.full_name,
        leader_email: leader.email,
        leader_phone: leader.phone,
        payment_expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      })
      .select("*")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const detail = insertError.message.includes("leader_email")
          ? "A team is already registered with this team leader email address."
          : "A team with this name is already registered. Please choose another team name.";
        throw new HttpError("duplicate_registration", detail, 409);
      }
      console.error("[zelvation] insert failed", insertError.code);
      throw new HttpError("registration_failed", "We could not save your registration.", 500);
    }

    const { error: membersError } = await admin().from("registration_members").insert(
      payload.members.map((m, index) => ({
        registration_id: registration.id,
        position: index + 1,
        full_name: m.full_name,
        email: m.email,
        phone: m.phone,
        college: m.college || payload.college,
        role: m.role,
        is_leader: index === 0,
      })),
    );

    if (membersError) {
      await admin().from("registrations").delete().eq("id", registration.id);
      console.error("[zelvation] member insert failed", membersError.code);
      throw new HttpError("registration_failed", "We could not save the team members.", 500);
    }

    let order;
    try {
      order = await provider.createOrder({
        amountPaise: fee.totalPaise,
        currency: fee.currency,
        receipt: `zelv_${registration.id.replace(/-/g, "").slice(0, 12)}`,
        notes: { registration_id: registration.id, team_name: payload.team_name },
        description: `ZELVATION ${payload.team_size}-member team registration`,
      });
    } catch (err) {
      // No payable order exists — release the team name rather than leaving a
      // half-created pending registration behind.
      await admin().from("registrations").update({ status: "cancelled" }).eq("id", registration.id);
      throw err;
    }

    const { error: paymentError } = await admin().from("registration_payments").insert({
      registration_id: registration.id,
      provider: providerId,
      provider_order_id: order.orderId,
      amount_paise: fee.totalPaise,
      currency: fee.currency,
      status: "pending",
      qr_code_id: order.qr?.id ?? null,
      qr_image_url: order.qr?.imageUrl ?? null,
      expires_at: order.qr?.expiresAt ?? null,
    });

    if (paymentError) {
      console.error("[zelvation] payment row failed", paymentError.code);
      throw new HttpError("payment_init_failed", "We could not initialise the payment.", 500);
    }

    await audit({
      action: "registration.created",
      entity: "registration",
      entity_id: registration.id,
      metadata: {
        team_size: payload.team_size,
        track: payload.track,
        amount_paise: fee.totalPaise,
        order_id: order.orderId,
      },
      ip,
    });

    return json(toClientPayload(registration, order), 201);
  } catch (error) {
    return fail(error);
  }
});

function toClientPayload(registration: any, order: any) {
  return {
    access_token: registration.access_token,
    registration_id: registration.id,
    provider: order.provider,
    amount_paise: order.amountPaise,
    currency: order.currency,
    order: {
      id: order.orderId,
      key_id: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: "ZELVATION",
      description: `${registration.team_size}-member team registration`,
      hosted_url: order.hostedUrl,
    },
    qr: order.qr,
    checkout_mode: order.checkoutMode,
  };
}
