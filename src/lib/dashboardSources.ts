/** Fixed registry of the entities Dashboard cards can be built on -- CRM and Network data, not uploaded sheets. */
export type DashboardSourceKey =
  | "opportunities"
  | "contracts"
  | "companies"
  | "employees"
  | "sites"
  | "vendors"
  | "siteTradeAssignments";

export interface DashboardSourceColumn {
  key: string;
  label: string;
  type: "string" | "number" | "date";
}

export interface DashboardSourceDef {
  key: DashboardSourceKey;
  label: string;
  domain: "CRM" | "Network";
  columns: DashboardSourceColumn[];
}

export const DASHBOARD_SOURCES: DashboardSourceDef[] = [
  {
    key: "opportunities",
    label: "Opportunities",
    domain: "CRM",
    columns: [
      { key: "name", label: "Name", type: "string" },
      { key: "companyName", label: "Client", type: "string" },
      { key: "stage", label: "Stage", type: "string" },
      { key: "amount", label: "Amount", type: "number" },
      { key: "siteCount", label: "Site count", type: "number" },
      { key: "workType", label: "Work type", type: "string" },
      { key: "expectedCloseDate", label: "Expected close date", type: "date" },
      { key: "salesManagerName", label: "Sales manager", type: "string" },
      { key: "createdAt", label: "Created", type: "date" },
      { key: "updatedAt", label: "Updated", type: "date" },
    ],
  },
  {
    key: "contracts",
    label: "Contracts",
    domain: "CRM",
    columns: [
      { key: "name", label: "Name", type: "string" },
      { key: "companyName", label: "Client", type: "string" },
      { key: "workType", label: "Work type", type: "string" },
      { key: "siteCount", label: "Site count", type: "number" },
      { key: "rateAmount", label: "Rate amount", type: "number" },
      { key: "rateFrequency", label: "Rate frequency", type: "string" },
      { key: "startDate", label: "Start date", type: "date" },
      { key: "endDate", label: "End date", type: "date" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
  },
  {
    key: "companies",
    label: "Companies",
    domain: "CRM",
    columns: [
      { key: "name", label: "Name", type: "string" },
      { key: "city", label: "City", type: "string" },
      { key: "state", label: "State", type: "string" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
  },
  {
    key: "employees",
    label: "Employees",
    domain: "CRM",
    columns: [
      { key: "name", label: "Name", type: "string" },
      { key: "department", label: "Department", type: "string" },
      { key: "title", label: "Title", type: "string" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
  },
  {
    key: "sites",
    label: "Sites",
    domain: "Network",
    columns: [
      { key: "name", label: "Name", type: "string" },
      { key: "companyName", label: "Client", type: "string" },
      { key: "opportunityName", label: "Opportunity", type: "string" },
      { key: "contractName", label: "Contract", type: "string" },
      { key: "siteCode", label: "Site ID", type: "string" },
      { key: "city", label: "City", type: "string" },
      { key: "state", label: "State", type: "string" },
      { key: "tradeCount", label: "Trade count", type: "number" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
  },
  {
    key: "vendors",
    label: "Vendors",
    domain: "Network",
    columns: [
      { key: "name", label: "Name", type: "string" },
      { key: "services", label: "Services", type: "string" },
      { key: "city", label: "City", type: "string" },
      { key: "state", label: "State", type: "string" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
  },
  {
    key: "siteTradeAssignments",
    label: "Site Trade Assignments",
    domain: "Network",
    columns: [
      { key: "siteName", label: "Site", type: "string" },
      { key: "companyName", label: "Client", type: "string" },
      { key: "trade", label: "Trade", type: "string" },
      { key: "vendorName", label: "Vendor", type: "string" },
      { key: "subVendorName", label: "Sub-Vendor", type: "string" },
      { key: "contractValue", label: "Contract value", type: "number" },
      { key: "subPrice", label: "Sub price", type: "number" },
      { key: "subVendorPrice", label: "Sub-Vendor price", type: "number" },
      { key: "margin", label: "Margin", type: "number" },
    ],
  },
];

export function getDashboardSource(key: DashboardSourceKey): DashboardSourceDef {
  const source = DASHBOARD_SOURCES.find((s) => s.key === key);
  if (!source) throw new Error(`Unknown dashboard source '${key}'`);
  return source;
}
