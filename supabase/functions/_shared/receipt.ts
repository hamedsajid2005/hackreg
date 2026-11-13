import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { RECEIPT_BUCKET, admin, loadSettings } from "./db.ts";

/**
 * Zelvation-branded PDF receipt, generated only after a verified payment and
 * stored in the private `zelvation-receipts` bucket.
 *
 * Note on typography: pdf-lib's standard fonts use WinAnsi encoding, which has
 * no ₹ glyph, so amounts are rendered as "INR 499.00" rather than a broken
 * character. The logo is embedded from the site's public asset (the official
 * file, unmodified) and skipped gracefully if it cannot be fetched.
 */

export type ReceiptData = {
  teamId: string;
  teamName: string;
  teamSize: number;
  track: string;
  college: string;
  city: string;
  state: string;
  leaderName: string;
  leaderEmail: string;
  amountPaise: number;
  currency: string;
  paymentReference: string | null;
  orderId: string;
  paymentMethod: string | null;
  provider: string;
  confirmedAt: string;
  members: { fullName: string; role: string; college: string; isLeader: boolean }[];
  eventName: string;
  organiserName: string;
  tagline: string;
  contactEmail: string | null;
};

const TRACK_LABELS: Record<string, string> = {
  education: "Education / EdTech",
  ai: "AI Innovation",
  healthcare: "Healthcare",
  business: "Business",
};

const BRAND = rgb(0.02, 0.96, 0.93);
const BRAND_DEEP = rgb(0.0, 0.64, 0.76);
const INK = rgb(0.04, 0.06, 0.09);
const MUTED = rgb(0.42, 0.47, 0.53);
const HAIRLINE = rgb(0.85, 0.88, 0.91);

function money(paise: number, currency: string): string {
  return `${currency} ${(paise / 100).toFixed(2)}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(d) + " IST";
}

export async function buildReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${data.eventName} receipt — ${data.teamId}`);
  doc.setAuthor(data.organiserName);
  doc.setSubject("Team registration receipt");

  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const margin = 48;
  let y = height - margin;

  // ---- Header band -------------------------------------------------
  page.drawRectangle({ x: 0, y: height - 132, width, height: 132, color: rgb(0.016, 0.027, 0.043) });
  page.drawRectangle({ x: 0, y: height - 136, width, height: 4, color: BRAND });

  // Official logo, embedded untouched at its native aspect ratio.
  try {
    const siteUrl = Deno.env.get("SITE_URL");
    if (siteUrl) {
      const res = await fetch(`${siteUrl}/zelvora-logo.png`);
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        const png = await doc.embedPng(bytes);
        const logoSize = 78;
        page.drawImage(png, {
          x: margin,
          y: height - 112,
          width: logoSize,
          height: (png.height / png.width) * logoSize,
        });
      }
    }
  } catch (err) {
    console.error("[zelvation] logo embed skipped", err instanceof Error ? err.message : err);
  }

  page.drawText(data.eventName, {
    x: margin + 96,
    y: height - 58,
    size: 20,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(data.tagline, {
    x: margin + 96,
    y: height - 76,
    size: 9.5,
    font: regular,
    color: BRAND,
  });
  page.drawText(data.organiserName, {
    x: margin + 96,
    y: height - 92,
    size: 8,
    font: regular,
    color: rgb(0.62, 0.68, 0.74),
  });

  page.drawText("REGISTRATION RECEIPT", {
    x: width - margin - bold.widthOfTextAtSize("REGISTRATION RECEIPT", 8),
    y: height - 58,
    size: 8,
    font: bold,
    color: rgb(0.62, 0.68, 0.74),
  });
  page.drawText(data.teamId, {
    x: width - margin - bold.widthOfTextAtSize(data.teamId, 22),
    y: height - 84,
    size: 22,
    font: bold,
    color: BRAND,
  });

  y = height - 176;

  // ---- Team block --------------------------------------------------
  const label = (text: string, x: number, yy: number) =>
    page.drawText(text.toUpperCase(), { x, y: yy, size: 7, font: bold, color: MUTED });
  const value = (text: string, x: number, yy: number, size = 10.5, color = INK) =>
    page.drawText(text, { x, y: yy, size, font: regular, color });

  const colW = (width - margin * 2) / 2;
  const rows: [string, string, string, string][] = [
    ["Team name", data.teamName, "Team size", `${data.teamSize} members`],
    ["Team leader", data.leaderName, "Leader email", data.leaderEmail],
    ["Track", TRACK_LABELS[data.track] ?? data.track, "College / organisation", data.college],
    ["City / state", `${data.city}, ${data.state}`, "Registration status", "CONFIRMED"],
  ];

  for (const [l1, v1, l2, v2] of rows) {
    label(l1, margin, y);
    label(l2, margin + colW, y);
    value(v1, margin, y - 14);
    value(v2, margin + colW, y - 14);
    y -= 40;
  }

  // ---- Members -----------------------------------------------------
  y -= 4;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.7,
    color: HAIRLINE,
  });
  y -= 18;
  page.drawText("TEAM MEMBERS", { x: margin, y, size: 7.5, font: bold, color: MUTED });
  y -= 16;

  const cols = [margin, margin + 22, margin + 200, margin + 330];
  page.drawText("#", { x: cols[0], y, size: 8, font: bold, color: MUTED });
  page.drawText("NAME", { x: cols[1], y, size: 8, font: bold, color: MUTED });
  page.drawText("ROLE", { x: cols[2], y, size: 8, font: bold, color: MUTED });
  page.drawText("COLLEGE", { x: cols[3], y, size: 8, font: bold, color: MUTED });
  y -= 14;

  data.members.forEach((m, i) => {
    const name = m.isLeader ? `${m.fullName} (Leader)` : m.fullName;
    page.drawText(String(i + 1), { x: cols[0], y, size: 9.5, font: regular, color: MUTED });
    page.drawText(trim(name, 34), { x: cols[1], y, size: 9.5, font: regular, color: INK });
    page.drawText(trim(m.role, 22), { x: cols[2], y, size: 9.5, font: regular, color: INK });
    page.drawText(trim(m.college, 24), { x: cols[3], y, size: 9.5, font: regular, color: INK });
    y -= 17;
  });

  // ---- Payment box -------------------------------------------------
  y -= 12;
  const boxH = 104;
  page.drawRectangle({
    x: margin,
    y: y - boxH,
    width: width - margin * 2,
    height: boxH,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: HAIRLINE,
    borderWidth: 0.7,
  });

  page.drawText("AMOUNT PAID", { x: margin + 16, y: y - 22, size: 7.5, font: bold, color: MUTED });
  page.drawText(money(data.amountPaise, data.currency), {
    x: margin + 16,
    y: y - 48,
    size: 22,
    font: bold,
    color: INK,
  });

  const payRows: [string, string][] = [
    ["Payment status", "SUCCESSFUL"],
    ["Payment reference", data.paymentReference ?? "—"],
    ["Order ID", data.orderId],
    ["Gateway", data.provider.toUpperCase() + (data.paymentMethod ? ` · ${data.paymentMethod}` : "")],
    ["Paid on", fmtDate(data.confirmedAt)],
  ];
  let py = y - 20;
  for (const [l, v] of payRows) {
    page.drawText(l, { x: margin + 200, y: py, size: 8, font: regular, color: MUTED });
    page.drawText(trim(v, 52), { x: margin + 310, y: py, size: 8.5, font: regular, color: INK });
    py -= 15;
  }

  y = y - boxH - 30;

  // ---- Confirmation statement --------------------------------------
  const statement =
    `This receipt confirms that ${data.teamName} is registered for ${data.eventName}, ` +
    `organised by ${data.organiserName}, with team ID ${data.teamId}. The payment shown above ` +
    `was verified server-side by the payment gateway against the order created for this ` +
    `registration. This is a computer-generated receipt and does not require a signature.`;

  page.drawText("Registration confirmed", { x: margin, y, size: 10.5, font: bold, color: INK });
  y -= 16;
  for (const line of wrap(statement, regular, 9, width - margin * 2)) {
    page.drawText(line, { x: margin, y, size: 9, font: regular, color: rgb(0.29, 0.33, 0.38) });
    y -= 13;
  }

  // ---- Footer ------------------------------------------------------
  page.drawLine({
    start: { x: margin, y: 84 },
    end: { x: width - margin, y: 84 },
    thickness: 0.7,
    color: HAIRLINE,
  });
  page.drawRectangle({ x: margin, y: 66, width: 26, height: 3, color: BRAND_DEEP });
  page.drawText(
    `${data.organiserName}${data.contactEmail ? ` · ${data.contactEmail}` : ""}`,
    { x: margin, y: 52, size: 8, font: regular, color: MUTED },
  );
  page.drawText(`Team ID ${data.teamId} · Generated ${fmtDate(new Date().toISOString())}`, {
    x: margin,
    y: 40,
    size: 7.5,
    font: regular,
    color: MUTED,
  });

  return await doc.save();
}

function trim(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Assembles the receipt payload from the database. Returns null when the
 * registration is not (yet) confirmed — a receipt is never produced for an
 * unverified payment.
 */
export async function buildReceiptData(registrationId: string): Promise<ReceiptData | null> {
  const db = admin();
  const { data: registration, error } = await db
    .from("registrations")
    .select("*, registration_members(*), registration_payments(*)")
    .eq("id", registrationId)
    .maybeSingle();

  if (error || !registration) return null;
  if (registration.status !== "confirmed" || !registration.team_id) return null;

  const settings = await loadSettings();
  const payments = (registration.registration_payments ?? [])
    .slice()
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const payment = payments.find((p: any) => p.status === "successful") ?? payments[0];
  const members = (registration.registration_members ?? [])
    .slice()
    .sort((a: any, b: any) => a.position - b.position);

  return {
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
}

/**
 * Generates the receipt, uploads it to the private bucket and records the path
 * on the payment row. Idempotent: re-running overwrites the same object key.
 */
export async function generateAndStoreReceipt(data: ReceiptData): Promise<string> {
  const pdf = await buildReceiptPdf(data);
  const path = `${data.teamId}.pdf`;

  const { error } = await admin()
    .storage.from(RECEIPT_BUCKET)
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });

  if (error) throw new Error(`receipt upload failed: ${error.message}`);

  await admin().schema("zelvation").rpc("attach_receipt", {
    p_order_id: data.orderId,
    p_path: path,
  });

  return path;
}
