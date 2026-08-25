import type { DashboardConfig } from "./types";

/** Fixed set of business categories dashboards are grouped into on the Dashboards sidebar. */
export const DASHBOARD_CATEGORIES = [
  "Sourcing & Coverage",
  "Contract Value & Financials",
  "Client-Focused",
  "Vendor Performance",
  "Assignments & Operations",
  "Executive / High-Level Rollups",
] as const;

export type DashboardCategory = (typeof DASHBOARD_CATEGORIES)[number];

/** A dashboard's fixed definition -- authored in code (describe what you want in chat, it gets added
 * here) rather than built through a UI. Rendered live against current CRM/Network data every time. */
export interface DashboardDefinition {
  id: string;
  /** Which Dashboards sidebar category this appears under. */
  area: DashboardCategory;
  config: DashboardConfig;
}

export const DASHBOARD_DEFINITIONS: DashboardDefinition[] = [
  {
    id: "sourcing-status-by-state",
    area: "Sourcing & Coverage",
    config: {
      name: "Sourcing Status by State",
      // Live "Trade" dropdown scopes every card below to one trade at a time (e.g. Snow Removal);
      // left on "All" it covers every trade's site+trade assignments together.
      filterColumns: ["trade"],
      cards: [
        {
          type: "kpi",
          title: "Sourced (Sub-Vendor Assigned)",
          source: "siteTradeAssignments",
          agg: "count_rows",
          filters: [{ column: "sourcingStatus", op: "eq", value: "Sourced" }],
        },
        {
          type: "kpi",
          title: "Unsourced (No Sub-Vendor)",
          source: "siteTradeAssignments",
          agg: "count_rows",
          filters: [{ column: "sourcingStatus", op: "eq", value: "Unsourced" }],
        },
        {
          type: "chart",
          title: "Sourced vs. Unsourced by State",
          source: "siteTradeAssignments",
          chartType: "bar",
          x: "state",
          series: "sourcingStatus",
          agg: "count",
        },
      ],
    },
  },
  {
    id: "contract-value-by-region",
    area: "Contract Value & Financials",
    config: {
      name: "Total Contract Value by Region",
      // Live "Trade" dropdown scopes both cards below to one trade at a time (e.g. Snow Removal);
      // left on "All" it covers every trade's site+trade assignments together.
      filterColumns: ["trade"],
      cards: [
        {
          type: "kpi",
          title: "Total Contract Value",
          source: "siteTradeAssignments",
          agg: "sum",
          column: "contractValue",
        },
        {
          type: "chart",
          title: "Total Contract Value by Region",
          source: "siteTradeAssignments",
          chartType: "bar",
          x: "state",
          y: "contractValue",
          agg: "sum",
          regionOptions: [
            { label: "State", column: "state" },
            { label: "Metro (City)", column: "city" },
            { label: "Zip Cluster", column: "zip3" },
          ],
        },
      ],
    },
  },
];

export function getDashboardDefinition(id: string): DashboardDefinition | undefined {
  return DASHBOARD_DEFINITIONS.find((d) => d.id === id);
}
