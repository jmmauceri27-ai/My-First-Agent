import type { DashboardConfig } from "./types";

/** Dashboards are grouped to match the site's own sections, not a separate business taxonomy -- so a
 * dashboard about agreements lives under "Agreements", one about vendor sourcing under "Vendors", etc. */
export const DASHBOARD_CATEGORIES = ["Pipeline", "Agreements", "Contacts", "Sites", "Clients", "Vendors", "Employees"] as const;

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
    id: "pipeline-overview",
    area: "Pipeline",
    config: {
      name: "Pipeline Overview",
      // Live Client/Trade/Deal size dropdowns scope every card below to a drill-down slice of the pipeline;
      // left on "All" they cover every open opportunity together. "Lost" opportunities are excluded from
      // every card here since this dashboard tracks the *open* pipeline, not historical win/loss.
      filterColumns: [
        { column: "companyName", label: "Client" },
        { column: "trades", label: "Trade", multi: true },
        { column: "dealSizeBucket", label: "Deal size" },
      ],
      cards: [
        {
          type: "kpi",
          title: "Open Pipeline Value",
          source: "opportunities",
          agg: "sum",
          column: "amount",
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          type: "kpi",
          title: "Open Opportunities",
          source: "opportunities",
          agg: "count_rows",
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          type: "kpi",
          title: "Average Deal Value",
          source: "opportunities",
          agg: "avg",
          column: "amount",
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          type: "kpi",
          title: "Sites in Pipeline",
          source: "opportunities",
          agg: "sum",
          column: "siteCount",
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          type: "chart",
          title: "Pipeline Value by Stage",
          source: "opportunities",
          chartType: "bar",
          x: "stage",
          y: "amount",
          agg: "sum",
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          type: "chart",
          title: "Pipeline Value by Client",
          source: "opportunities",
          chartType: "bar",
          x: "companyName",
          y: "amount",
          agg: "sum",
          limit: 10,
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          type: "chart",
          title: "Pipeline Value by Trade",
          source: "opportunities",
          chartType: "bar",
          x: "trades",
          xMulti: true,
          y: "amount",
          agg: "sum",
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          type: "chart",
          title: "Pipeline Value by Deal Size",
          source: "opportunities",
          chartType: "bar",
          x: "dealSizeBucket",
          y: "amount",
          agg: "sum",
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          type: "chart",
          title: "Top Opportunities by Value",
          source: "opportunities",
          chartType: "bar",
          x: "name",
          y: "amount",
          agg: "sum",
          limit: 8,
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
      ],
    },
  },
  {
    id: "sourcing-status-by-state",
    area: "Vendors",
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
    id: "contract-value-by-state",
    area: "Agreements",
    config: {
      name: "Total Agreement Value by State",
      // Live "Trade" dropdown scopes both cards below to one trade at a time (e.g. Snow Removal);
      // left on "All" it covers every trade's site+trade assignments together.
      filterColumns: ["trade"],
      cards: [
        {
          type: "kpi",
          title: "Total Agreement Value",
          source: "siteTradeAssignments",
          agg: "sum",
          column: "contractValue",
        },
        {
          type: "chart",
          title: "Total Agreement Value by State",
          source: "siteTradeAssignments",
          chartType: "bar",
          x: "state",
          y: "contractValue",
          agg: "sum",
        },
      ],
    },
  },
];

export function getDashboardDefinition(id: string): DashboardDefinition | undefined {
  return DASHBOARD_DEFINITIONS.find((d) => d.id === id);
}
