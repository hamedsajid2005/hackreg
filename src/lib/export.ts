import * as XLSX from "xlsx";
import { TRACKS } from "./constants";
import { formatDateTime } from "./utils";
import type { Registration } from "./types";

const trackLabel = (id: string) => TRACKS.find((t) => t.id === id)?.name ?? id;

function latestPayment(reg: Registration) {
  const payments = (reg.registration_payments ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return payments[0] ?? null;
}

function successfulPayment(reg: Registration) {
  return (reg.registration_payments ?? []).find((p) => p.status === "successful") ?? latestPayment(reg);
}

/* ------------------------------ row builders ----------------------------- */

export function teamRows(rows: Registration[]) {
  return rows.map((r) => ({
    "Team ID": r.team_id ?? "",
    "Team name": r.team_name,
    "Team size": r.team_size,
    "Team leader": r.leader_name,
    "Leader email": r.leader_email,
    "Leader phone": r.leader_phone,
    College: r.college,
    City: r.city,
    State: r.state,
    "Selected track": trackLabel(r.track),
    "Registration status": r.status,
    "Payment status": latestPayment(r)?.status ?? "",
    "Amount (INR)": (r.amount_paise / 100).toFixed(2),
    "Registration timestamp": formatDateTime(r.created_at),
    "Confirmed timestamp": formatDateTime(r.confirmed_at),
  }));
}

export function memberRows(rows: Registration[]) {
  return rows.flatMap((r) =>
    (r.registration_members ?? []).map((m) => ({
      "Team ID": r.team_id ?? "",
      "Team name": r.team_name,
      "Member name": m.full_name,
      "Member email": m.email,
      "Member phone": `+91 ${m.phone}`,
      "Member role": m.role,
      College: m.college,
      Leader: m.is_leader ? "Yes" : "No",
    })),
  );
}

export function paymentRows(rows: Registration[]) {
  return rows.flatMap((r) =>
    (r.registration_payments ?? []).map((p) => ({
      "Team ID": r.team_id ?? "",
      "Team name": r.team_name,
      Amount: (p.amount_paise / 100).toFixed(2),
      Currency: p.currency,
      "Payment gateway": p.provider,
      "Payment status": p.status,
      "Payment reference": p.provider_payment_id ?? "",
      "Order ID": p.provider_order_id,
      Method: p.method ?? "",
      "Payment timestamp": formatDateTime(p.verified_at ?? p.created_at),
    })),
  );
}

export function emailRows(rows: Registration[]) {
  return rows.flatMap((r) =>
    ((r as any).registration_emails ?? []).map((e: any) => ({
      "Team ID": r.team_id ?? "",
      "Recipient email": e.recipient,
      "Email delivery status": e.status,
      "Sent timestamp": formatDateTime(e.sent_at),
      "Provider reference": e.provider_message_id ?? "",
      Attempts: e.attempts ?? 0,
      Error: e.error ?? "",
    })),
  );
}

/* ------------------------------- XLSX ----------------------------------- */

const COL_WIDTHS: Record<string, number> = {
  "Team ID": 12,
  "Team name": 26,
  "Team size": 10,
  "Team leader": 24,
  "Leader email": 30,
  "Leader phone": 16,
  College: 34,
  City: 16,
  State: 18,
  "Selected track": 20,
  "Registration status": 18,
  "Payment status": 16,
  "Amount (INR)": 14,
  "Registration timestamp": 24,
  "Confirmed timestamp": 24,
  "Member name": 24,
  "Member email": 30,
  "Member phone": 16,
  "Member role": 22,
  Leader: 9,
  Amount: 12,
  Currency: 10,
  "Payment gateway": 16,
  "Payment reference": 26,
  "Order ID": 26,
  Method: 12,
  "Payment timestamp": 24,
  "Recipient email": 30,
  "Email delivery status": 20,
  "Sent timestamp": 24,
  "Provider reference": 30,
  Attempts: 10,
  Error: 40,
};

function makeSheet(data: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(data.length ? data : [{ "No records": "" }]);
  const headers = Object.keys(data[0] ?? { "No records": "" });
  sheet["!cols"] = headers.map((h) => ({ wch: COL_WIDTHS[h] ?? Math.max(12, h.length + 2) }));
  if (data.length) {
    sheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { c: 0, r: 0 },
        e: { c: headers.length - 1, r: data.length },
      }),
    };
    // Freeze the header row (honoured by Excel/LibreOffice).
    (sheet as any)["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };
  }
  return sheet;
}

/** Four-sheet workbook exactly as specified in the brief. */
export function buildWorkbook(rows: Registration[]): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, makeSheet(teamRows(rows)), "Team Registrations");
  XLSX.utils.book_append_sheet(workbook, makeSheet(memberRows(rows)), "Member Details");
  XLSX.utils.book_append_sheet(workbook, makeSheet(paymentRows(rows)), "Payments");
  XLSX.utils.book_append_sheet(workbook, makeSheet(emailRows(rows)), "Email Records");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/* -------------------------------- CSV ----------------------------------- */

function escapeCsv(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formula injection before quoting.
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of data) lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  // BOM keeps Excel happy with the ₹/unicode characters.
  return `\uFEFF${lines.join("\r\n")}`;
}
