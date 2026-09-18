export const OPPORTUNITY_STAGES = [
  "Lead",
  "Site Walk/Measuring",
  "RFP Submitted",
  "Pricing/Negotiation",
  "Awarded",
  "Onboarding",
  "Won",
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
  /** Public URL for the client's logo, ready to use as an <img> src, or null if none is set. */
  logoUrl: string | null;
  createdAt: string;
}

export interface Contact {
  id: string;
  companyId: string | null;
  companyName: string | null;
  companyLogoUrl: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  notes: string | null;
  /** Whether this contact can approve work on their own, up to approvalLimit (if set) -- null limit with
   * canApproveWork true means no set ceiling. */
  canApproveWork: boolean;
  approvalLimit: number | null;
  /** Free-text region/territory label, e.g. "Northeast" -- there's no fixed list since it varies per client. */
  region: string | null;
  /** Sites this contact is responsible for -- many-to-many, since a site can have more than one responsible
   * contact (e.g. primary + backup). */
  siteIds: string[];
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
  /** Permanent tracking id (e.g. "T-0001"), assigned once at creation and never reassigned -- carries
   * forward onto a Contract created from this opportunity. */
  trackingNumber: string;
  name: string;
  companyId: string | null;
  companyName: string | null;
  companyLogoUrl: string | null;
  stage: OpportunityStage;
  amount: number | null;
  siteCount: number | null;
  trades: string[];
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
  /** A plain manual estimate -- an opportunity doesn't get real linked Site records (no locations to
   * upload at the bidding stage), so this is just a number the user types in themselves. */
  siteCount: number | null;
  trades: string[];
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
  canApproveWork: boolean;
  approvalLimit: number | null;
  region: string | null;
  siteIds: string[];
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
  companyLogoUrl: string | null;
  /** The Opportunity this contract was created from, if any -- optional, since a contract can be entered
   * directly with no tracked opportunity behind it. */
  opportunityId: string | null;
  opportunityName: string | null;
  /** Copied from the source opportunity's tracking number the first time one is linked, then permanent --
   * it doesn't change even if opportunityId is later changed or cleared. Null if never linked to one. */
  trackingNumber: string | null;
  name: string;
  trades: string[];
  siteCount: number | null;
  rateAmount: number | null;
  rateFrequency: string | null;
  /** How every trade under this contract is billed to the client -- Time and Materials, Fixed Monthly, Per Service, or Per Event. Applies to every site/trade linked to this contract. */
  billingType: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  contactIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContractInput {
  companyId: string | null;
  opportunityId: string | null;
  name: string;
  trades: string[];
  rateAmount: number | null;
  rateFrequency: string | null;
  billingType: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  contactIds: string[];
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

/** One priceable line item under a trade -- e.g. "Landscape Laborer" (Labor, Per Hour, Standard tier), "1.5" Valve Replaced" (Service, Flat), or "Gold Mop #2" (Materials, Per Each). A proposal's price for a trade is composed from its rate_items, not a single number. Scoped one of three ways: fully generic (contractId and companyId both null), a specific Client's on-demand rates with no particular agreement (companyId set, contractId null -- e.g. work done for them outside any signed contract), or one specific contract's own negotiated rate card (contractId set, e.g. an MSA rate sheet; companyId is then reachable transitively through the contract and not stored directly). See resolveTradeRateItems in pricingEngine.ts for how the three levels are reconciled. */
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
  contractId: string | null;
  contractName: string | null;
  /** Set directly only when contractId is null (a Client's on-demand rates, no specific agreement) -- when
   * contractId is set, this is that contract's own company instead. */
  companyId: string | null;
  companyName: string | null;
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
  contractId: string | null;
  /** Ignored (stored as null) when contractId is set -- see RateItem's companyId doc. */
  companyId: string | null;
}

/** A single row parsed from an uploaded sheet, mapped onto RateItem's fixed fields, for bulk import. contractId
 * and companyId come from single pickers in the upload modal, not sheet columns -- a whole import batch shares
 * one contract/client (or neither, for the generic catalog). */
export interface RateItemImportRow {
  trade: string;
  category: string;
  itemName: string;
  pricingBasis: string;
  rateTier: string;
  rate: number;
  unitLabel: string | null;
  notes: string | null;
  contractId: string | null;
  companyId: string | null;
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

// ---------- CRM Fields (custom properties) ----------
// A Class is a named section (e.g. "Contact Info") holding one or more Fields (e.g. "Phone Number"). Classes
// and Fields aren't scoped to any one record type -- the same class/field is usable on any CRM/Network
// record (opportunity, agreement, site, client, contact); a record just opts a field in via
// crm_field_assignments. A record's actual values live separately in crm_field_values, keyed by
// (fieldId, recordId) -- see fieldsDal.ts.

export const FIELD_TYPES = ["Text", "Number", "Date", "Dropdown", "Checkbox"] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

/** A named section (e.g. "Contact Info") that groups related Fields together. */
export interface FieldClass {
  id: string;
  name: string;
  position: number;
  fields: CrmField[];
  createdAt: string;
  updatedAt: string;
}

export interface FieldClassInput {
  name: string;
}

/** One custom field definition -- e.g. "Phone Number" (Text, in the "Contact Info" class). Named CrmField,
 * not Field, to avoid colliding with the FieldChoice/FieldResolution "field" concept used in mergeSites.ts. */
export interface CrmField {
  id: string;
  classId: string;
  /** Stable internal key, slugified from the label at creation (e.g. "phone_number"). Globally unique. */
  name: string;
  label: string;
  fieldType: string;
  /** Only set when fieldType is "Dropdown" -- the fixed list of choices. */
  options: string[] | null;
  /** Standard fields render on every record, like Company's fields do today. Custom fields only render on a
   * record once attached to it -- see crm_field_assignments in fieldsDal.ts. */
  isStandard: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrmFieldInput {
  classId: string;
  label: string;
  fieldType: string;
  options: string[] | null;
  isStandard: boolean;
}

/** One record's stored value for one field. value is always a string on the wire -- Number/Date/Checkbox
 * are parsed/formatted by the UI, not by this type. */
export interface FieldValue {
  fieldId: string;
  value: string | null;
}
