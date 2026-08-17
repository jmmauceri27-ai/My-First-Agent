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

/** Fixed color per Trade, used for map pins and legends -- Fire & Life Safety is red, Snow Removal is blue, Land is green, per the user's request. */
export const TRADE_COLORS: Record<Trade, string> = {
  Land: "#22c55e",
  "Snow Removal": "#3b82f6",
  "Fire & Life Safety": "#ef4444",
  HVAC: "#f97316",
  "General Maintenance": "#a855f7",
  "Facility Maintenance": "#14b8a6",
  "Parking Lot Maintenance": "#eab308",
  Electrical: "#ec4899",
  Plumbing: "#6366f1",
  Irrigation: "#06b6d4",
  Janitorial: "#84cc16",
  "Pest Control": "#78716c",
};

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
