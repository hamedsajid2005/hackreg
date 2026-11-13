import { REGISTRATION_SCHEMA } from "./config";
import { createAdminClient } from "./supabase/admin";
import type { DashboardStats, Registration } from "./types";

/**
 * Server-only registration data access. Every function here is called from a
 * Server Component / Server Action that has already authorised the caller
 * (organizer session) or that holds the participant's secret access token.
 */

const FULL_SELECT =
  "*, registration_members(*), registration_payments(*), registration_emails(*)";

function normalise(row: any): Registration {
  return {
    ...row,
    registration_members: (row.registration_members ?? []).sort(
      (a: any, b: any) => a.position - b.position,
    ),
    registration_payments: (row.registration_payments ?? []).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
  } as Registration;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Looks up a registration using the private, unguessable access token.
 * Sequential team IDs are never used as a lookup key, so one team can never
 * enumerate another team's record.
 */
export async function getRegistrationByToken(token: string): Promise<Registration | null> {
  if (!UUID_RE.test(token)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema(REGISTRATION_SCHEMA)
    .from("registrations")
    .select(FULL_SELECT)
    .eq("access_token", token)
    .maybeSingle();
  if (error || !data) return null;
  return normalise(data);
}

export async function getRegistrationById(id: string): Promise<Registration | null> {
  if (!UUID_RE.test(id)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema(REGISTRATION_SCHEMA)
    .from("registrations")
    .select(FULL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalise(data);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema(REGISTRATION_SCHEMA)
    .from("registrations")
    .select("status, team_size, track, amount_paise, registration_payments(status)");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];
  const paid = rows.filter((r) => r.status === "confirmed");
  const failedPayments = rows.filter((r) =>
    (r.registration_payments ?? []).some((p: any) => p.status === "failed"),
  ).length;

  const sizeMap = new Map<number, number>();
  const trackMap = new Map<string, number>();
  for (const r of rows) {
    sizeMap.set(r.team_size, (sizeMap.get(r.team_size) ?? 0) + 1);
    trackMap.set(r.track, (trackMap.get(r.track) ?? 0) + 1);
  }

  return {
    totalRegistrations: rows.length,
    paidRegistrations: paid.length,
    pendingRegistrations: rows.filter((r) => r.status === "pending_payment").length,
    failedPayments,
    totalParticipants: paid.reduce((sum, r) => sum + r.team_size, 0),
    confirmedRevenuePaise: paid.reduce((sum, r) => sum + r.amount_paise, 0),
    byTeamSize: [2, 3, 4].map((size) => ({ size, count: sizeMap.get(size) ?? 0 })),
    byTrack: ["education", "ai", "healthcare", "business"].map((track) => ({
      track,
      count: trackMap.get(track) ?? 0,
    })),
  };
}

export type RegistrationFilters = {
  q?: string;
  teamSize?: number;
  track?: string;
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function listRegistrations(filters: RegistrationFilters) {
  const admin = createAdminClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .schema(REGISTRATION_SCHEMA)
    .from("registrations")
    .select(FULL_SELECT, { count: "exact" });

  if (filters.q) {
    const q = filters.q.replace(/[%,]/g, " ").trim();
    if (q) {
      query = query.or(
        [
          `team_id.ilike.%${q}%`,
          `team_name.ilike.%${q}%`,
          `leader_name.ilike.%${q}%`,
          `leader_email.ilike.%${q}%`,
        ].join(","),
      );
    }
  }
  if (filters.teamSize) query = query.eq("team_size", filters.teamSize);
  if (filters.track) query = query.eq("track", filters.track);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  if (filters.paymentStatus) {
    // Filter on the related payment status via an inner join.
    query = query.eq("registration_payments.status", filters.paymentStatus);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    rows: (data ?? []).map(normalise),
    total: count ?? 0,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

/** Full export set — same filters, no pagination. Authorised organizers only. */
export async function exportRegistrations(filters: RegistrationFilters) {
  const admin = createAdminClient();
  let query = admin.schema(REGISTRATION_SCHEMA).from("registrations").select(FULL_SELECT);

  if (filters.q) {
    const q = filters.q.replace(/[%,]/g, " ").trim();
    if (q) {
      query = query.or(
        [
          `team_id.ilike.%${q}%`,
          `team_name.ilike.%${q}%`,
          `leader_name.ilike.%${q}%`,
          `leader_email.ilike.%${q}%`,
        ].join(","),
      );
    }
  }
  if (filters.teamSize) query = query.eq("team_size", filters.teamSize);
  if (filters.track) query = query.eq("track", filters.track);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalise);
}
