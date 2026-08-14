export const TRADE_OPTIONS = [
  "Land",
  "Snow Removal",
  "Fire & Life Safety",
  "HVAC",
  "General Maintenance",
  "Facility Maintenance",
  "Parking Lot Maintenance",
  "Electrical",
  "Plumbing",
  "Irrigation",
  "Janitorial",
  "Pest Control",
] as const;

export type Trade = (typeof TRADE_OPTIONS)[number];

/** Matches a freeform value (e.g. an Opportunity/Contract's "Type of work") against the fixed Trade list, case-insensitively. */
export function matchTrade(value: string | null | undefined): Trade | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return TRADE_OPTIONS.find((t) => t.toLowerCase() === normalized) ?? null;
}
