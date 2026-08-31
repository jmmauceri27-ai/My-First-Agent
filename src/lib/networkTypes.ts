export interface Vendor {
  id: string;
  name: string;
  services: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorInput {
  name: string;
  services: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
}

/** A single row parsed from an uploaded sheet, mapped onto Vendor's fixed fields, for bulk import. */
export interface VendorImportRow {
  name: string;
  services: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
}

/** Flexible bag of numeric sq. ft measurements (Turf Area, Sidewalk, Parking Lot, Bed Space, Public Walk, etc.). */
export type SiteMeasurements = Record<string, number>;

export interface Site {
  id: string;
  companyId: string | null;
  companyName: string | null;
  opportunityId: string | null;
  opportunityName: string | null;
  /** A user-entered identifier/code (e.g. from your own facility system) -- separate from `id`, the database's own record id. */
  siteCode: string | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  /** Trades performed at this site, chosen from the fixed TRADE_OPTIONS list -- a site can have more than one. */
  trades: string[];
  /** Per-trade Vendor/Sub-Vendor + pricing -- a site commonly has a different vendor for each trade (e.g. one for Land, another for Snow Removal). */
  tradeAssignments: SiteTradeAssignment[];
  /** Sq. ft areas -- Turf Area, Sidewalk, Parking Lot, etc. */
  measurements: SiteMeasurements;
  /** Plain counts -- Palm Trees, Deciduous Tree, Shrubs, etc. -- kept separate from `measurements` so each displays with the right unit. */
  counts: SiteMeasurements;
  /** Total snowfall (inches) recorded for this site over the most recent winter season. */
  lastSeasonSnowfall: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteInput {
  companyId: string | null;
  opportunityId: string | null;
  siteCode: string | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  trades: string[];
  measurements: SiteMeasurements;
  counts: SiteMeasurements;
  lastSeasonSnowfall: number | null;
  notes: string | null;
}

/** One Trade's Vendor/Sub-Vendor assignment and pricing chain for a Site -- a site has at most one of these per trade. */
export interface SiteTradeAssignment {
  id: string;
  siteId: string;
  trade: string;
  vendorId: string | null;
  vendorName: string | null;
  /** The vendor's own subcontractor for this trade -- e.g. a vendor we treat as our own self-perform team who further subs the work out. */
  subVendorId: string | null;
  subVendorName: string | null;
  /** The signed contract (crm_contracts) this trade is covered under, if any -- separate from an Opportunity/RFP. A site can have a different contract per trade. */
  contractId: string | null;
  contractName: string | null;
  /** How this trade is billed to the client -- derived from the linked Contract's own Billing Type, so every site/trade under the same contract always shows the same value. Not independently settable here. */
  billingType: string | null;
  /** What the client pays for this trade at this site. */
  contractValue: number | null;
  /** The rate shown in the Rates section -- tracked separately from contractValue, since the two don't always match (e.g. a blended contract value vs. this trade's own billed rate). */
  rateAmount: number | null;
  /** How often rateAmount is billed, e.g. "Monthly", "Per visit", "Per push" -- freeform, not a fixed list. */
  rateFrequency: string | null;
  /** What we pay the Vendor for this trade -- our margin is contractValue - subPrice. */
  subPrice: number | null;
  /** What the Vendor pays the Sub-Vendor for this trade -- Vendor's margin is subPrice - subVendorPrice. */
  subVendorPrice: number | null;
}

export interface SiteTradeAssignmentInput {
  trade: string;
  vendorId: string | null;
  subVendorId: string | null;
  contractId: string | null;
  contractValue: number | null;
  rateAmount: number | null;
  rateFrequency: string | null;
  subPrice: number | null;
  subVendorPrice: number | null;
}

/** A SiteTradeAssignment enriched with the site/client it belongs to -- used on the Vendor detail page, where a vendor's assignments span many sites. */
export interface VendorTradeAssignment extends SiteTradeAssignment {
  siteName: string;
  companyName: string | null;
}

/** A single row parsed from an uploaded sheet, mapped onto Site's fixed fields, for bulk import. */
export interface SiteImportRow {
  name: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  siteCode: string | null;
  /** Per-row Client override (e.g. matched from a "Client Name" column) -- takes precedence over the batch's SiteBulkLinks.companyId. */
  companyId?: string | null;
}

/** Shared Client/Opportunity/Trades links applied to every row in a bulk site import. Vendor and Contract assignments are per-trade and set afterward from each site's detail page. */
export interface SiteBulkLinks {
  companyId: string | null;
  opportunityId: string | null;
  trades: string[];
}

/**
 * A single row parsed from an uploaded sheet meant to UPDATE existing sites rather than create new ones.
 * Matched to an existing site by `matchCode` (the custom Site ID) if present, else `matchId` (the database's own
 * record id), else `matchName` (case-insensitive). Only the fields actually present on the row are touched --
 * an omitted field leaves the site's existing value alone.
 */
export interface SiteUpdateRow {
  matchCode: string | null;
  matchId: string | null;
  matchName: string | null;
  siteCode?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  trades?: string[];
  lastSeasonSnowfall?: number | null;
  notes?: string | null;
}

/**
 * A single row parsed from an uploaded sheet meant to UPDATE one Trade's assignment (Vendor/Sub-Vendor +
 * pricing) on existing sites -- scoped to exactly one trade per call, so it never touches a site's other
 * trades. Matched the same way as SiteUpdateRow. Only the fields present on the row are touched.
 */
export interface SiteTradeAssignmentUpdateRow {
  matchCode: string | null;
  matchId: string | null;
  matchName: string | null;
  vendorId?: string | null;
  subVendorId?: string | null;
  contractId?: string | null;
  contractValue?: number | null;
  rateAmount?: number | null;
  rateFrequency?: string | null;
  subPrice?: number | null;
  subVendorPrice?: number | null;
}

/**
 * A single row parsed from an uploaded sheet meant to bulk-set Measurements (sq. ft) and/or Counts (plain
 * counts) on existing sites. Matched the same way as SiteUpdateRow. Labels present in `measurements`/`counts`
 * are merged into the site's existing bag (added or overwritten) -- labels not included are left untouched.
 */
export interface SiteMeasurementsUpdateRow {
  matchCode: string | null;
  matchId: string | null;
  matchName: string | null;
  measurements: Record<string, number>;
  counts: Record<string, number>;
}

export interface SiteUpdateResult {
  updated: number;
  /** Match keys (ID or name) from the sheet that didn't correspond to any existing site. */
  notFound: string[];
  /** Names that matched more than one site (no Site ID and no Client scope to disambiguate). */
  ambiguous: string[];
}

/** A saved snapshot of the Sites screen's filter controls -- re-applying one sets every filter at once. */
export interface SiteFilters {
  companyFilters: string[];
  vendorFilter: string;
  subVendorFilter: string;
  contractFilter: string;
  tradeFilter: string[];
  colorMode: string;
  addressField: string;
  addressValues: string[];
  infoField: string;
  infoValues: string[];
  /** Trade that assignmentVendorStatus/assignmentSubVendorStatus are scoped to, e.g. "assigned for Land". */
  assignmentTrade: string;
  /** "" (any), "assigned", or "unassigned" -- whether the site has a Vendor set for assignmentTrade. */
  assignmentVendorStatus: string;
  /** "" (any), "assigned", or "unassigned" -- whether the site has a Sub-Vendor set for assignmentTrade. */
  assignmentSubVendorStatus: string;
}

export interface SiteFilterTemplate {
  id: string;
  name: string;
  filters: SiteFilters;
  createdAt: string;
  updatedAt: string;
}
