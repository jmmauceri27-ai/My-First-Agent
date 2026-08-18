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
  /** The signed contract (crm_contracts) this site belongs to, if any -- separate from an Opportunity/RFP. */
  contractId: string | null;
  contractName: string | null;
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
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteInput {
  companyId: string | null;
  opportunityId: string | null;
  contractId: string | null;
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
  /** What the client pays for this trade at this site. */
  contractValue: number | null;
  /** What we pay the Vendor for this trade -- our margin is contractValue - subPrice. */
  subPrice: number | null;
  /** What the Vendor pays the Sub-Vendor for this trade -- Vendor's margin is subPrice - subVendorPrice. */
  subVendorPrice: number | null;
}

export interface SiteTradeAssignmentInput {
  trade: string;
  vendorId: string | null;
  subVendorId: string | null;
  contractValue: number | null;
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

/** Shared Client/Opportunity/Contract/Trades links applied to every row in a bulk site import. Vendor assignments are per-trade and set afterward from each site's detail page. */
export interface SiteBulkLinks {
  companyId: string | null;
  opportunityId: string | null;
  contractId: string | null;
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
  contractValue?: number | null;
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
}

export interface SiteFilterTemplate {
  id: string;
  name: string;
  filters: SiteFilters;
  createdAt: string;
  updatedAt: string;
}
