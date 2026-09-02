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

// ---------- Rate Items (proposal builder rate card) ----------
// Step 1 of the AI proposal builder: rate_items is a per-trade line-item catalog -- labor rates by role,
// equipment rates, material/plant unit prices, and flat-rate service tasks -- and client_rate_overrides lets a
// specific client get a blanket discount/markup on a trade's computed total. A later step (the pricing
// engine) composes a trade's price from its rate_items, then applies any client override on top.

export const RATE_ITEM_CATEGORIES = ["Labor", "Equipment", "Materials", "Service"] as const;

export type RateItemCategory = (typeof RATE_ITEM_CATEGORIES)[number];

/** Matches a freeform value (e.g. from an uploaded sheet) against the fixed Category list, case-insensitively. */
export function matchRateItemCategory(value: string | null | undefined): RateItemCategory | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return RATE_ITEM_CATEGORIES.find((c) => c.toLowerCase() === normalized) ?? null;
}

export const PRICING_BASIS_OPTIONS = [
  "Per Hour",
  "Per Day",
  "Per Each",
  "Per Foot",
  "Per Sq Ft",
  "Per Visit",
  "Per Event",
  "Flat Monthly",
  "Flat",
] as const;

export type PricingBasis = (typeof PRICING_BASIS_OPTIONS)[number];

/** Matches a freeform value (e.g. from an uploaded sheet) against the fixed Pricing Basis list, case-insensitively. */
export function matchPricingBasis(value: string | null | undefined): PricingBasis | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return PRICING_BASIS_OPTIONS.find((b) => b.toLowerCase() === normalized) ?? null;
}

export const RATE_TIER_OPTIONS = ["Standard", "OT", "Premium"] as const;

export type RateTier = (typeof RATE_TIER_OPTIONS)[number];

/** Matches a freeform value (e.g. from an uploaded sheet) against the fixed Rate Tier list, case-insensitively. */
export function matchRateTier(value: string | null | undefined): RateTier | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return RATE_TIER_OPTIONS.find((t) => t.toLowerCase() === normalized) ?? null;
}

/** One priceable line item under a trade -- e.g. "Landscape Laborer" (Labor, Per Hour, Standard tier), "1.5" Valve Replaced" (Service, Flat), or "Gold Mop #2" (Materials, Per Each). A proposal's price for a trade is composed from its rate_items, not a single number. */
export interface RateItem {
  id: string;
  trade: string;
  category: string;
  itemName: string;
  pricingBasis: string;
  /** Standard/OT/Premium -- meaningful mainly for Labor; other categories are almost always "Standard". */
  rateTier: string;
  rate: number;
  /** Freeform clarification of the unit, e.g. "per 1,000 sq ft/month" -- optional, since pricingBasis usually says enough on its own. */
  unitLabel: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RateItemInput {
  trade: string;
  category: string;
  itemName: string;
  pricingBasis: string;
  rateTier: string;
  rate: number;
  unitLabel: string | null;
  notes: string | null;
}

/** A single row parsed from an uploaded sheet, mapped onto RateItem's fixed fields, for bulk import. */
export interface RateItemImportRow {
  trade: string;
  category: string;
  itemName: string;
  pricingBasis: string;
  rateTier: string;
  rate: number;
  unitLabel: string | null;
  notes: string | null;
}

export const OVERRIDE_TYPE_OPTIONS = ["Discount %", "Markup %"] as const;

export type OverrideType = (typeof OVERRIDE_TYPE_OPTIONS)[number];

/** A specific client's blanket discount/markup on one trade's computed total (the sum of its rate_items) -- e.g. Client X gets 10% off Landscaping. At most one override per (client, trade). */
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
