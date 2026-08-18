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
  vendorId: string | null;
  vendorName: string | null;
  /** The vendor's own subcontractor for this site -- e.g. a vendor we treat as a self-perform team who further subs the work out. */
  subVendorId: string | null;
  subVendorName: string | null;
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
  contractValue: number | null;
  subPrice: number | null;
  /** What the Vendor pays the Sub-Vendor -- Vendor's margin on this site is subPrice - subVendorPrice. */
  subVendorPrice: number | null;
  measurements: SiteMeasurements;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteInput {
  companyId: string | null;
  opportunityId: string | null;
  contractId: string | null;
  vendorId: string | null;
  subVendorId: string | null;
  siteCode: string | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  trades: string[];
  contractValue: number | null;
  subPrice: number | null;
  subVendorPrice: number | null;
  measurements: SiteMeasurements;
  notes: string | null;
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
  contractValue: number | null;
  subPrice: number | null;
  subVendorPrice: number | null;
  siteCode: string | null;
  /** Per-row Client override (e.g. matched from a "Client Name" column) -- takes precedence over the batch's SiteBulkLinks.companyId. */
  companyId?: string | null;
}

/** Shared Client/Opportunity/Contract/Vendor/Sub-Vendor/Trades links applied to every row in a bulk site import. */
export interface SiteBulkLinks {
  companyId: string | null;
  opportunityId: string | null;
  contractId: string | null;
  vendorId: string | null;
  subVendorId: string | null;
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
  contractValue?: number | null;
  subPrice?: number | null;
  subVendorPrice?: number | null;
  notes?: string | null;
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
