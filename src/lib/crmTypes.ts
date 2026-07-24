export const OPPORTUNITY_STAGES = [
  "Prospecting",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
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

export interface Employee {
  id: string;
  name: string;
  createdAt: string;
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

export interface ContactInput {
  name: string;
  companyId: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  notes: string | null;
}
