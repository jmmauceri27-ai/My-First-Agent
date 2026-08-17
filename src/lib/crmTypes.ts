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
