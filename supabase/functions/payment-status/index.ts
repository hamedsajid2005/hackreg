import { admin, audit, loadSettings, REGISTRATION_SCHEMA } from "../_shared/db.ts";
import { finalizeConfirmedRegistration } from "../_shared/finalize.ts";
import { HttpError, fail, json, requireMethod } from "../_shared/http.ts";
import { getProvider, type ProviderId } from "../_shared/providers.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * payment-status — polled by the checkout page and the confirmation page.
 *
 * Beyond reporting status, this is the safety net for dynamic UPI QR payments:
 * QR settlements arrive with `order_id: null`, so when a registration is still
 * pending and a QR was issued for it, we ask the gateway directly which payments
 * were captured against that QR and confirm through the same idempotent
 * `confirm_payment` path. The browser is never trusted — it only triggers the
 * check, the gateway is the source of truth.
 */
Deno.serve(async (req) => {
  const preflight = requireMethod(req, "POST");
  if (preflight) return preflight;

  try {
    const { access_token } = await req.json().catch(() => ({ access_token: null }));
    if (typeof access_token !== "string" || !UUID_RE.test(access_token)) {
      throw new HttpError("invalid_token", "A valid access token is required.", 400);
    }

    const db = admin();

    const { data: registration, error } = await db
      .from("registrations")
      .select("id, status, team_id, amount_paise, currency, payment_expires_at, created_at")
      .eq("access_token", access_token)
      .maybeSingle();

    if (error || !registration) {
      throw new HttpError("not_found", "Registration not found.", 404);
    }

    const { data: payments } = await db
      .from("registration_payments")
      .select("id, status, provider, provider_order_id, expires_at, qr_code_id, qr_image_url, created_at")
      .eq("registration_id", registration.id)
      .order("created_at", { ascending: false })
      .limit(1);

    let latest = payments?.[0] ?? null;

    // --- QR reconciliation (pending registrations only) --------------------
    if (
      registration.status === "pending_payment" &&
      latest?.status === "pending" &&
      latest.qr_code_id
    ) {
      const settings = await loadSettings();
      const providerId = (latest.provider ?? settings.payment_provider) as ProviderId;
      const provider = getProvider(providerId);

      if (provider.reconcileQrPayments) {
        const fromUnix = Math.floor(new Date(latest.created_at).getTime() / 1000);
        const captured = (await provider.reconcileQrPayments(latest.qr_code_id, fromUnix)).filter(
          (event) => event.kind === "success" && event.paymentId,
        );

        for (const event of captured) {
          const { error: confirmError } = await db.schema(REGISTRATION_SCHEMA).rpc(
            "confirm_payment",
            {
              p_order_id: latest.provider_order_id,
              p_payment_id: event.paymentId,
              p_amount_paise: event.amountPaise,
              p_currency: event.currency,
              p_method: event.method,
              p_raw: event.raw as Record<string, unknown>,
            },
          );

          if (confirmError) {
            // Includes AMOUNT_MISMATCH — never confirm on a mismatch.
            console.error(
              "[zelvation] qr reconcile confirm failed",
              confirmError.message.slice(0, 120),
            );
            await audit({
              action: "payment.reconcile_failed",
              entity: "registration",
              entity_id: registration.id,
              metadata: {
                order_id: latest.provider_order_id,
                qr_code_id: latest.qr_code_id,
                payment_id: event.paymentId,
              },
            });
            break;
          }

          await audit({
            action: "payment.reconciled_from_qr",
            entity: "registration",
            entity_id: registration.id,
            metadata: {
              order_id: latest.provider_order_id,
              qr_code_id: latest.qr_code_id,
              payment_id: event.paymentId,
              amount_paise: event.amountPaise,
            },
          });

          await finalizeConfirmedRegistration(registration.id);
          break; // one captured payment is enough — single_use QR
        }

        // Re-read so the response reflects any confirmation we just made.
        const { data: refreshed } = await db
          .from("registrations")
          .select("id, status, team_id, amount_paise, currency, payment_expires_at")
          .eq("id", registration.id)
          .maybeSingle();
        if (refreshed) Object.assign(registration, refreshed);

        const { data: refreshedPayments } = await db
          .from("registration_payments")
          .select("id, status, provider, provider_order_id, expires_at, qr_code_id, qr_image_url, created_at")
          .eq("registration_id", registration.id)
          .order("created_at", { ascending: false })
          .limit(1);
        latest = refreshedPayments?.[0] ?? latest;
      }
    }

    return json({
      registration_status: registration.status,
      payment_status: latest?.status ?? null,
      team_id: registration.team_id,
      amount_paise: registration.amount_paise,
      currency: registration.currency,
      expires_at: latest?.expires_at ?? registration.payment_expires_at ?? null,
      qr_image_url: latest?.qr_image_url ?? null,
    });
  } catch (error) {
    return fail(error);
  }
});
