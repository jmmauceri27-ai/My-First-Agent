import { OPPORTUNITY_STAGES } from "./crmTypes";
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
          valueFormat: "currency",
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
          valueFormat: "currency",
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
          type: "gauge",
          title: "Win Rate",
          source: "opportunities",
          matchFilters: [{ column: "stage", op: "eq", value: "Awarded" }],
          baseFilters: [{ column: "stage", op: "in", value: "Awarded,Lost" }],
        },
        {
          type: "funnel",
          title: "Pipeline by Stage",
          source: "opportunities",
          x: "stage",
          xOrder: OPPORTUNITY_STAGES.filter((s) => s !== "Lost"),
          y: "amount",
          agg: "sum",
          valueFormat: "currency",
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          type: "chart",
          title: "Highest Value Opportunities",
          source: "opportunities",
          chartType: "leaderboard",
          x: "name",
          y: "amount",
          agg: "sum",
          limit: 8,
          valueFormat: "currency",
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          type: "chart",
          title: "Pipeline by Client",
          source: "opportunities",
          chartType: "leaderboard",
          x: "companyName",
          y: "amount",
          agg: "sum",
          limit: 8,
          valueFormat: "currency",
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          // A leaderboard rather than a pie -- a trade can have well over the ~7 categories a pie stays
          // legible at, and a ranked list scales to however many trades are in play without redrawing slices.
          type: "chart",
          title: "Pipeline by Trade",
          source: "opportunities",
          chartType: "leaderboard",
          x: "trades",
          xMulti: true,
          y: "amount",
          agg: "sum",
          valueFormat: "currency",
          filters: [{ column: "stage", op: "neq", value: "Lost" }],
        },
        {
          // Deal size buckets are naturally ordered small -> large, so a funnel (fixed order, one hue) reads
          // as a real progression instead of a pie's unordered wedges.
          type: "funnel",
          title: "Pipeline by Deal Size",
          source: "opportunities",
          x: "dealSizeBucket",
          xOrder: ["Small (< $10K)", "Medium ($10K–$50K)", "Large ($50K+)", "Unspecified"],
          y: "amount",
          agg: "sum",
          valueFormat: "currency",
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
