export const OPPORTUNITY_STAGES = [
  "Lead",
  "Site Walk/Measuring",
  "RFP Submitted",
  "Pricing/Negotiation",
  "Awarded",
  "Onboarding",
  "Active Contract",
  "Renewal",
  "Lost",
] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export interface Company {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Contact {
  id: string;
  companyId: string | null;
  companyName: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  notes: string | null;
  createdAt: string;
}

export const DEPARTMENTS = ["Facility Services", "Fire & Life Safety"] as const;

export type Department = (typeof DEPARTMENTS)[number];

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  department: string | null;
  createdAt: string;
}

export interface EmployeeInput {
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  department: string | null;
}

export interface Opportunity {
  id: string;
  name: string;
  companyId: string | null;
  companyName: string | null;
  stage: OpportunityStage;
  amount: number | null;
  siteCount: number | null;
  workType: string | null;
  expectedCloseDate: string | null;
  notes: string | null;
  contactIds: string[];
  salesManagerId: string | null;
  salesManagerName: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityInput {
  name: string;
  companyId: string | null;
  stage: OpportunityStage;
  amount: number | null;
  siteCount: number | null;
  workType: string | null;
  expectedCloseDate: string | null;
  notes: string | null;
  contactIds: string[];
  salesManagerId: string | null;
}

export interface OpportunityFile {
  id: string;
  opportunityId: string;
  fileName: string;
  storagePath: string;
  contentType: string | null;
  sizeBytes: number;
  uploadedAt: string;
}

export interface CompanyInput {
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  notes: string | null;
}

/** A single row parsed from an uploaded sheet, mapped onto Company's fixed fields, for bulk import. */
export interface CompanyImportRow {
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  notes: string | null;
}

/** A single row parsed from an uploaded sheet, mapped onto Employee's fixed fields, for bulk import. */
export interface EmployeeImportRow {
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  department: string | null;
}

export interface ContactInput {
  name: string;
  companyId: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  notes: string | null;
}

export const RATE_FREQUENCIES = [
  "One-time",
  "Per visit",
  "Monthly",
  "Seasonal",
  "Annual",
] as const;

export type RateFrequency = (typeof RATE_FREQUENCIES)[number];

export interface Contract {
  id: string;
  companyId: string | null;
  companyName: string | null;
  name: string;
  workType: string | null;
  siteCount: number | null;
  rateAmount: number | null;
  rateFrequency: string | null;
  /** How every trade under this contract is billed to the client -- Time and Materials, Fixed Monthly, Per Service, or Per Event. Applies to every site/trade linked to this contract. */
  billingType: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractInput {
  companyId: string | null;
  name: string;
  workType: string | null;
  siteCount: number | null;
  rateAmount: number | null;
  rateFrequency: string | null;
  billingType: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export interface ContractFile {
  id: string;
  contractId: string;
  fileName: string;
  storagePath: string;
  contentType: string | null;
  sizeBytes: number;
  uploadedAt: string;
}

// ---------- Rate Rules (proposal builder rate card) ----------
// Step 1 of the AI proposal builder: rate_rules holds each trade's default pricing formula, and
// client_rate_overrides lets a specific client's negotiated rate for a trade take precedence over that
// default. The pricing engine (a later step) checks for an override first, then falls back to the trade's
// rate rule.

export const PRICING_BASIS_OPTIONS = ["Per Sq Ft", "Per Visit", "Flat Monthly", "Per Event"] as const;

export type PricingBasis = (typeof PRICING_BASIS_OPTIONS)[number];

/** A trade's default pricing formula -- e.g. Landscaping billed Per Sq Ft at $0.03, or Snow Removal billed Per Event at $450. */
export interface RateRule {
  id: string;
  trade: string;
  pricingBasis: string;
  baseRate: number;
  /** Freeform clarification of the unit, e.g. "per 1,000 sq ft/month" -- optional, since pricingBasis usually says enough on its own. */
  unitLabel: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RateRuleInput {
  trade: string;
  pricingBasis: string;
  baseRate: number;
  unitLabel: string | null;
  notes: string | null;
}

export const OVERRIDE_TYPE_OPTIONS = ["Fixed Rate", "Discount %", "Markup %"] as const;

export type OverrideType = (typeof OVERRIDE_TYPE_OPTIONS)[number];

/** A specific client's negotiated rate for one trade, overriding that trade's default RateRule -- e.g. Client X gets a 10% discount on Landscaping, or a flat $0.025/sq ft regardless of the base rate. At most one override per (client, trade). */
export interface ClientRateOverride {
  id: string;
  companyId: string;
  companyName: string | null;
  trade: string;
  overrideType: string;
  overrideValue: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientRateOverrideInput {
  companyId: string;
  trade: string;
  overrideType: string;
  overrideValue: number;
  notes: string | null;
}
