export const dynamic = "force-dynamic";

import { DASHBOARD_CATEGORIES, DASHBOARD_DEFINITIONS } from "@/lib/dashboardDefinitions";
import { listSites } from "@/lib/networkDal";
import AreaSidebar from "./AreaSidebar";
import DashboardPicker from "./DashboardPicker";
import DashboardViewClient from "./DashboardViewClient";
import RatesClient from "./RatesClient";
import ExpensesClient from "./ExpensesClient";

/** The Rate Schedule and Monthly Expenses views are hand-built pages (chart + per-site/trade breakdown table),
 * not config-driven dashboards -- they're pinned into this area as extra picker tabs rather than modeled as a
 * DashboardDefinition. */
const RATE_SCHEDULE_AREA = "Contract Value & Financials";
const RATE_SCHEDULE_ID = "rate-schedule";
const EXPENSE_SCHEDULE_ID = "expense-schedule";

export default async function DashboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; id?: string }>;
}) {
  const { area, id } = await searchParams;

  const byId = new Map(DASHBOARD_DEFINITIONS.map((d) => [d.id, d]));
  const selectedArea = area ?? (id && byId.get(id)?.area) ?? DASHBOARD_DEFINITIONS[0]?.area ?? DASHBOARD_CATEGORIES[0];

  const areaDashboards = DASHBOARD_DEFINITIONS.filter((d) => d.area === selectedArea);
  const showRateSchedule = selectedArea === RATE_SCHEDULE_AREA && id === RATE_SCHEDULE_ID;
  const showExpenseSchedule = selectedArea === RATE_SCHEDULE_AREA && id === EXPENSE_SCHEDULE_ID;
  const showCustomTab = showRateSchedule || showExpenseSchedule;
  const selected =
    !showCustomTab && id && areaDashboards.some((d) => d.id === id)
      ? byId.get(id)
      : !showCustomTab
        ? areaDashboards[0]
        : undefined;

  const pickerItems = [
    ...areaDashboards.map((d) => ({ id: d.id, name: d.config.name })),
    ...(selectedArea === RATE_SCHEDULE_AREA
      ? [
          { id: RATE_SCHEDULE_ID, name: "Rate Schedule" },
          { id: EXPENSE_SCHEDULE_ID, name: "Monthly Expenses" },
        ]
      : []),
  ];

  const sites = showCustomTab ? await listSites() : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">📊 Dashboards</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        <AreaSidebar selectedArea={selectedArea} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {pickerItems.length === 0 && (
            <p className="text-sm text-slate-400">No dashboards yet for {selectedArea}.</p>
          )}

          {pickerItems.length > 0 && (
            <>
              <DashboardPicker
                dashboards={pickerItems}
                selectedId={showRateSchedule ? RATE_SCHEDULE_ID : showExpenseSchedule ? EXPENSE_SCHEDULE_ID : selected?.id}
                area={selectedArea}
              />
              {showRateSchedule ? (
                <RatesClient sites={sites ?? []} />
              ) : showExpenseSchedule ? (
                <ExpensesClient sites={sites ?? []} />
              ) : !selected || selected.config.cards.length === 0 ? (
                <p className="text-sm text-slate-400">This dashboard has no cards yet.</p>
              ) : (
                <DashboardViewClient key={selected.id} config={selected.config} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
