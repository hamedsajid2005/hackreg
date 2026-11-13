import { NextResponse } from "next/server";
import { getOrganizer } from "@/lib/auth";
import { exportRegistrations, type RegistrationFilters } from "@/lib/registrations";
import { REGISTRATION_SCHEMA } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildWorkbook,
  emailRows,
  memberRows,
  paymentRows,
  teamRows,
  toCsv,
} from "@/lib/export";

/**
 * Organizer-only export endpoint. Authorisation is re-checked here — never
 * trusted from the client — and every export is written to the audit log.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const organizer = await getOrganizer();
  if (!organizer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "xlsx").toLowerCase();
  const scope = url.searchParams.get("scope") === "filtered" ? "filtered" : "all";
  const kind = url.searchParams.get("kind") ?? "workbook";

  const filters: RegistrationFilters = {};
  if (scope === "filtered") {
    const q = url.searchParams.get("q");
    const teamSize = url.searchParams.get("teamSize");
    const track = url.searchParams.get("track");
    const status = url.searchParams.get("status");
    const paymentStatus = url.searchParams.get("paymentStatus");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (q) filters.q = q;
    if (teamSize) filters.teamSize = Number(teamSize);
    if (track) filters.track = track;
    if (status) filters.status = status;
    if (paymentStatus) filters.paymentStatus = paymentStatus;
    if (from) filters.from = from;
    if (to) filters.to = to;
  }

  let rows;
  try {
    rows = await exportRegistrations(filters);
  } catch {
    return NextResponse.json({ error: "Could not read registrations." }, { status: 500 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = scope === "filtered" ? "filtered" : "all";

  // Audit every export (personal data access trail).
  try {
    const admin = createAdminClient();
    await admin.schema(REGISTRATION_SCHEMA).from("registration_audit_logs").insert({
      action: "export.created",
      entity: "export",
      actor_id: organizer.userId,
      actor_email: organizer.email,
      metadata: { format, scope, kind, rows: rows.length },
    });
  } catch {
    /* audit failure must not block the download */
  }

  if (format === "csv") {
    const data =
      kind === "members" ? memberRows(rows) : kind === "payments" ? paymentRows(rows) : teamRows(rows);
    const csv = toCsv(data);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="zelvation-${kind}-${suffix}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "members" || kind === "payments" || kind === "emails") {
    // Single-sheet XLSX when a specific dataset was requested.
    const { default: XLSX } = await import("xlsx");
    const data =
      kind === "members" ? memberRows(rows) : kind === "payments" ? paymentRows(rows) : emailRows(rows);
    const sheet = XLSX.utils.json_to_sheet(data.length ? data : [{ "No records": "" }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      kind === "members" ? "Member Details" : kind === "payments" ? "Payments" : "Email Records",
    );
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="zelvation-${kind}-${suffix}-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const buffer = buildWorkbook(rows);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="zelvation-registrations-${suffix}-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
