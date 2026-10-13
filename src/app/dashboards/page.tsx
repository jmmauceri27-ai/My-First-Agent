export const dynamic = "force-dynamic";

import { DASHBOARD_CATEGORIES, DASHBOARD_DEFINITIONS } from "@/lib/dashboardDefinitions";
import { listContracts } from "@/lib/crmDal";
import { listSites } from "@/lib/networkDal";
import AreaSidebar from "./AreaSidebar";
import DashboardPicker from "./DashboardPicker";
import DashboardViewClient from "./DashboardViewClient";
import RatesClient from "./RatesClient";
import ExpensesClient from "./ExpensesClient";
import AgreementsOverviewClient from "./AgreementsOverviewClient";

/** The Overview, Rate Schedule, and Monthly Expenses views are hand-built pages (stat breakdown / chart +
 * per-site/trade breakdown table), not config-driven dashboards -- they're pinned into this area as extra
 * picker tabs rather than modeled as a DashboardDefinition. */
const RATE_SCHEDULE_AREA = "Agreements";
const OVERVIEW_ID = "agreements-overview";
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
  const isAgreementsArea = selectedArea === RATE_SCHEDULE_AREA;
  // Overview is the default landing tab for Agreements -- there's no config-driven dashboard for this area,
  // so without this, picking "Agreements" in the sidebar used to land on an empty "no cards yet" state.
  const showOverview = isAgreementsArea && (id === OVERVIEW_ID || (!id && areaDashboards.length === 0));
  const showRateSchedule = isAgreementsArea && id === RATE_SCHEDULE_ID;
  const showExpenseSchedule = isAgreementsArea && id === EXPENSE_SCHEDULE_ID;
  const showCustomTab = showOverview || showRateSchedule || showExpenseSchedule;
  const selected =
    !showCustomTab && id && areaDashboards.some((d) => d.id === id)
      ? byId.get(id)
      : !showCustomTab
        ? areaDashboards[0]
        : undefined;

  const pickerItems = [
    ...(isAgreementsArea ? [{ id: OVERVIEW_ID, name: "Overview" }] : []),
    ...areaDashboards.map((d) => ({ id: d.id, name: d.config.name })),
    ...(isAgreementsArea
      ? [
          { id: RATE_SCHEDULE_ID, name: "Rate Schedule" },
          { id: EXPENSE_SCHEDULE_ID, name: "Monthly Expenses" },
        ]
      : []),
  ];

  const [sites, contracts] = await Promise.all([
    showRateSchedule || showExpenseSchedule ? listSites() : Promise.resolve(null),
    showOverview ? listContracts() : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">📊 Dashboards</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        <AreaSidebar selectedArea={selectedArea} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {pickerItems.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No dashboards yet for {selectedArea}.</p>
          )}

          {pickerItems.length > 0 && (
            <>
              <DashboardPicker
                dashboards={pickerItems}
                selectedId={
                  showOverview
                    ? OVERVIEW_ID
                    : showRateSchedule
                      ? RATE_SCHEDULE_ID
                      : showExpenseSchedule
                        ? EXPENSE_SCHEDULE_ID
                        : selected?.id
                }
                area={selectedArea}
              />
              {showOverview ? (
                <AgreementsOverviewClient contracts={contracts ?? []} />
              ) : showRateSchedule ? (
                <RatesClient sites={sites ?? []} />
              ) : showExpenseSchedule ? (
                <ExpensesClient sites={sites ?? []} />
              ) : !selected || selected.config.cards.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">This dashboard has no cards yet.</p>
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
