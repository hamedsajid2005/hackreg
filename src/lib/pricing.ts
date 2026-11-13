import type { EventSettings } from "./types";

export type FeeBreakdown = {
  teamSize: number;
  basePaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: string;
  taxPercent: number;
  taxLabel: string | null;
};

/** Canonical, authoritative fee table shape used by both UI and backend. */
export type FeeTable = Pick<
  EventSettings,
  "fee_2_members_paise" | "fee_3_members_paise" | "fee_4_members_paise" | "tax_percent" | "tax_label" | "currency"
>;

export function baseFeeFor(teamSize: number, table: FeeTable): number {
  switch (teamSize) {
    case 2:
      return table.fee_2_members_paise;
    case 3:
      return table.fee_3_members_paise;
    case 4:
      return table.fee_4_members_paise;
    default:
      throw new Error(`Unsupported team size: ${teamSize}`);
  }
}

/**
 * Single source of truth for pricing. The browser uses it to render an estimate;
 * the Edge Function recomputes it from the database row before creating an order.
 * The client-submitted amount is never trusted.
 */
export function calculateFee(teamSize: number, table: FeeTable): FeeBreakdown {
  const basePaise = baseFeeFor(teamSize, table);
  const taxPercent = Number(table.tax_percent ?? 0);
  // Rounded to the nearest paisa; zero when no tax is configured.
  const taxPaise = taxPercent > 0 ? Math.round((basePaise * taxPercent) / 100) : 0;
  return {
    teamSize,
    basePaise,
    taxPaise,
    totalPaise: basePaise + taxPaise,
    currency: table.currency || "INR",
    taxPercent,
    taxLabel: table.tax_label ?? null,
  };
}

export function isRegistrationWindowOpen(settings: Pick<EventSettings, "registrations_open" | "registration_deadline">) {
  if (!settings.registrations_open) return false;
  if (settings.registration_deadline) {
    const deadline = new Date(settings.registration_deadline).getTime();
    if (Number.isFinite(deadline) && Date.now() > deadline) return false;
  }
  return true;
}
