import type { DashboardTemplate } from "./types";

/**
 * Reusable dashboard templates: chart layouts defined by column roles (e.g.
 * "vendor") instead of a fixed dataset/column, so the same template can be
 * pointed at any dataset that has the right kind of columns. Which real
 * column plays each role is chosen once per dataset in the Dashboards UI
 * and remembered via template_bindings (see lib/dal.ts).
 */
export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    key: "vendor-status-overview",
    name: "Vendor Status Overview",
    area: "Vendors",
    roles: [
      { key: "vendor", label: "Vendor column" },
      { key: "status", label: "Status column" },
    ],
    cards: [
      { type: "chart", title: "Trips by Vendor", chartType: "bar", xRole: "vendor", agg: "count" },
      { type: "chart", title: "Trips by Status", chartType: "bar", xRole: "status", agg: "count" },
    ],
    filterRoles: ["vendor"],
  },
];

export function templatesForArea(area: string): DashboardTemplate[] {
  return DASHBOARD_TEMPLATES.filter((t) => t.area === area);
}
