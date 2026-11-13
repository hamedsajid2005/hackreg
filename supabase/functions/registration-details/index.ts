import { admin } from "../_shared/db.ts";
import { HttpError, fail, json, requireMethod } from "../_shared/http.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * registration-details — public-safe projection for the confirmation page.
 * Requires the secret access token. Returns member names and roles only —
 * never other teams' emails, phones or payment payloads.
 */
Deno.serve(async (req) => {
  const preflight = requireMethod(req, "POST");
  if (preflight) return preflight;

  try {
    const { access_token } = await req.json().catch(() => ({ access_token: null }));
    if (typeof access_token !== "string" || !UUID_RE.test(access_token)) {
      throw new HttpError("invalid_token", "A valid access token is required.", 400);
    }

    const { data, error } = await admin()
      .from("registrations")
      .select(
        "team_id, team_name, team_size, track, college, city, state, status, amount_paise, currency, leader_name, leader_email, confirmed_at, created_at, registration_members(full_name, role, is_leader, position), registration_payments(status, provider_payment_id, provider, created_at)",
      )
      .eq("access_token", access_token)
      .maybeSingle();

    if (error || !data) {
      throw new HttpError("not_found", "Registration not found.", 404);
    }

    const payments = ((data as any).registration_payments ?? []).slice().sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const latest = payments[0];
    const members = ((data as any).registration_members ?? [])
      .slice()
      .sort((a: any, b: any) => a.position - b.position)
      .map((m: any) => ({ full_name: m.full_name, role: m.role, is_leader: m.is_leader }));

    return json({
      registration: {
        team_id: (data as any).team_id,
        team_name: (data as any).team_name,
        team_size: (data as any).team_size,
        track: (data as any).track,
        college: (data as any).college,
        city: (data as any).city,
        state: (data as any).state,
        status: (data as any).status,
        amount_paise: (data as any).amount_paise,
        currency: (data as any).currency,
        leader_name: (data as any).leader_name,
        leader_email: (data as any).leader_email,
        confirmed_at: (data as any).confirmed_at,
        created_at: (data as any).created_at,
        payment_status: latest?.status ?? null,
        payment_reference: latest?.provider_payment_id ?? null,
        provider: latest?.provider ?? null,
        members,
      },
    });
  } catch (error) {
    return fail(error);
  }
});
