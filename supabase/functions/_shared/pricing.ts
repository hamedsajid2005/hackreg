import type { EventSettings } from "./db.ts";

/** Authoritative fee calculation. Mirrors src/lib/pricing.ts. */
export type FeeBreakdown = {
  basePaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: string;
  taxPercent: number;
  taxLabel: string | null;
};

export function baseFeeFor(teamSize: number, settings: EventSettings): number {
  switch (teamSize) {
    case 2:
      return settings.fee_2_members_paise;
    case 3:
      return settings.fee_3_members_paise;
    case 4:
      return settings.fee_4_members_paise;
    default:
      throw new Error(`Unsupported team size: ${teamSize}`);
  }
}

export function calculateFee(teamSize: number, settings: EventSettings): FeeBreakdown {
  const basePaise = baseFeeFor(teamSize, settings);
  const taxPercent = Number(settings.tax_percent ?? 0);
  const taxPaise = taxPercent > 0 ? Math.round((basePaise * taxPercent) / 100) : 0;
  return {
    basePaise,
    taxPaise,
    totalPaise: basePaise + taxPaise,
    currency: settings.currency || "INR",
    taxPercent,
    taxLabel: settings.tax_label ?? null,
  };
}
