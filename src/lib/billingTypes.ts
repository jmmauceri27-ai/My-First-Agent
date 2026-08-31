/** Fixed set of Billing Type values -- how a contract's work is billed to the client. Set once on the Contract, applying to every site/trade linked to it. */
export const BILLING_TYPE_OPTIONS = ["Time and Materials", "Fixed Monthly", "Per Service", "Per Event"] as const;

export type BillingType = (typeof BILLING_TYPE_OPTIONS)[number];
