import type { DashboardConfig } from "./types";

/** A dashboard's fixed definition -- authored in code (describe what you want in chat, it gets added
 * here) rather than built through a UI. Rendered live against current CRM/Network data every time. */
export interface DashboardDefinition {
  id: string;
  /** Which Dashboards sidebar tab this appears under. */
  area: "CRM" | "Network";
  config: DashboardConfig;
}

export const DASHBOARD_DEFINITIONS: DashboardDefinition[] = [
  {
    id: "sub-vendor-assignment",
    area: "Network",
    config: {
      name: "Sub-Vendor Assignment",
      cards: [
        {
          type: "kpi",
          title: "Sites Assigned to Sub-Vendor",
          source: "sites",
          agg: "count_rows",
          filters: [{ column: "subVendorStatus", op: "eq", value: "Assigned" }],
        },
        {
          type: "kpi",
          title: "Sites Unassigned to Sub-Vendor",
          source: "sites",
          agg: "count_rows",
          filters: [{ column: "subVendorStatus", op: "eq", value: "Unassigned" }],
        },
      ],
    },
  },
];

export function getDashboardDefinition(id: string): DashboardDefinition | undefined {
  return DASHBOARD_DEFINITIONS.find((d) => d.id === id);
}
