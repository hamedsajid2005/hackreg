import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { admin, audit, REGISTRATION_SCHEMA } from "../_shared/db.ts";
import { deliverConfirmationEmail } from "../_shared/email.ts";
import { HttpError, fail, json, requireMethod, requiredEnv } from "../_shared/http.ts";

/**
 * resend-confirmation-email — organizer only.
 *
 * Requires a valid Supabase Auth JWT belonging to an active row in
 * zelvation.organizer_users. A participant cannot call this: the allow-list is
 * checked server-side, not in the browser.
 */
Deno.serve(async (req) => {
  const preflight = requireMethod(req, "POST");
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) throw new HttpError("unauthorized", "Authentication required.", 401);

    const userClient = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_ANON_KEY"),
      { auth: { persistSession: false } },
    );
    const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
    if (userError || !userData.user) {
      throw new HttpError("unauthorized", "Your session is not valid.", 401);
    }

    const { data: organizer } = await admin()
      .from("organizer_users")
      .select("user_id, email, role, is_active")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!organizer || !organizer.is_active) {
      throw new HttpError("forbidden", "You do not have organizer access.", 403);
    }

    const { registration_id } = await req.json().catch(() => ({ registration_id: null }));
    if (typeof registration_id !== "string") {
      throw new HttpError("invalid_request", "registration_id is required.", 400);
    }

    const { data: registration } = await admin()
      .from("registrations")
      .select("id, status, team_id, leader_email")
      .eq("id", registration_id)
      .maybeSingle();

    if (!registration) throw new HttpError("not_found", "Registration not found.", 404);
    if (registration.status !== "confirmed") {
      throw new HttpError(
        "not_confirmed",
        "A confirmation email is sent only for a verified payment.",
        409,
      );
    }

    const result = await deliverConfirmationEmail(registration.id, { force: true });

    await audit({
      action: "email.resent",
      entity: "registration",
      entity_id: registration.id,
      actor_id: organizer.user_id,
      actor_email: organizer.email,
      metadata: { result: result.status, team_id: registration.team_id },
    });

    if (result.status === "failed") {
      return json(
        { error: { code: "email_failed", message: result.error ?? "The email could not be sent." } },
        502,
      );
    }

    return json({ ok: true, message_id: result.messageId ?? null });
  } catch (error) {
    return fail(error);
  }
});
