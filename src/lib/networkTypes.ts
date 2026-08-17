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
}

/** Shared Client/Opportunity/Contract/Vendor/Trades links applied to every row in a bulk site import. */
export interface SiteBulkLinks {
  companyId: string | null;
  opportunityId: string | null;
  contractId: string | null;
  vendorId: string | null;
  trades: string[];
}
