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

/** Splits a cell like "Snow Removal, HVAC" into its recognized Trade values, dropping anything that doesn't match the fixed list. */
export function matchTrades(value: string | null | undefined): string[] {
  if (!value) return [];
  const matches = value
    .split(/[,;]/)
    .map((part) => matchTrade(part))
    .filter((t): t is Trade => t !== null);
  return Array.from(new Set(matches));
}
