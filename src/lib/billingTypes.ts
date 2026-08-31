/** Fixed set of Billing Type values -- how a trade's contract value is billed to the client. Set per (site, trade), same as Vendor/Sub-Vendor/Contract. */
export const BILLING_TYPE_OPTIONS = ["Time and Materials", "Fixed Monthly", "Per Service", "Per Event"] as const;

export type BillingType = (typeof BILLING_TYPE_OPTIONS)[number];

/** Matches a freeform value (e.g. from an uploaded sheet) against the fixed Billing Type list, case-insensitively. */
export function matchBillingType(value: string | null | undefined): BillingType | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return BILLING_TYPE_OPTIONS.find((b) => b.toLowerCase() === normalized) ?? null;
}
