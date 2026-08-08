export const dynamic = "force-dynamic";

import Link from "next/link";
import { listDashboards, listDatasets } from "@/lib/dal";
import { listOpportunities } from "@/lib/crmDal";
import { OPPORTUNITY_STAGES } from "@/lib/crmTypes";
import Card from "@/components/ui/Card";

const OPEN_STAGES = new Set(["Lead", "Site Walk/Measuring", "RFP Submitted", "Pricing/Negotiation"]);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function HomePage() {
  const [opportunities, datasets, dashboards] = await Promise.all([
    listOpportunities(),
    listDatasets(),
    listDashboards(),
  ]);

  const stageCounts = new Map<string, number>(OPPORTUNITY_STAGES.map((s) => [s, 0]));
  for (const o of opportunities) stageCounts.set(o.stage, (stageCounts.get(o.stage) ?? 0) + 1);

  const openPipelineValue = opportunities
    .filter((o) => OPEN_STAGES.has(o.stage))
    .reduce((sum, o) => sum + (o.amount ?? 0), 0);

  const openCount = opportunities.filter((o) => OPEN_STAGES.has(o.stage)).length;

  const recentOpportunities = [...opportunities]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">🤝 CRM Pipeline</h1>
        <p className="mt-1 text-sm text-slate-400">Your deals, at a glance.</p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card className="border-t-4 p-5" style={{ borderTopColor: "#1baf7a" }}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Open pipeline value</p>
            <p className="mt-1.5 text-3xl font-extrabold tabular-nums text-slate-50">
              {formatCurrency(openPipelineValue)}
            </p>
          </Card>
          <Card className="border-t-4 p-5" style={{ borderTopColor: "#9055f6" }}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Open opportunities</p>
            <p className="mt-1.5 text-3xl font-extrabold tabular-nums text-slate-50">{openCount}</p>
          </Card>
          <Card className="border-t-4 p-5" style={{ borderTopColor: "#eda100" }}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Awarded</p>
            <p className="mt-1.5 text-3xl font-extrabold tabular-nums text-slate-50">
              {stageCounts.get("Awarded") ?? 0}
            </p>
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-50">Pipeline by stage</h2>
            <Link href="/crm" className="text-sm font-medium text-brand-400 hover:underline">
              View full pipeline →
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {OPPORTUNITY_STAGES.map((stage) => (
              <div
                key={stage}
                className="flex min-w-[7rem] flex-1 flex-col gap-1 rounded-lg border border-purple-400/20 bg-purple-500/5 px-3 py-2"
              >
                <span className="text-xs font-medium text-slate-400">{stage}</span>
                <span className="text-xl font-extrabold tabular-nums text-slate-50">
                  {stageCounts.get(stage) ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold text-slate-50">Recently updated</h2>
          {recentOpportunities.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">
              No opportunities yet. Head to{" "}
              <Link href="/crm" className="font-medium text-brand-400 hover:underline">
                CRM
              </Link>{" "}
              to add your first deal.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-purple-400/10">
              {recentOpportunities.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                  <Link
                    href={`/crm/opportunities/${o.id}`}
                    className="min-w-0 truncate text-sm font-medium text-slate-50 hover:text-brand-400 hover:underline"
                  >
                    {o.name}
                  </Link>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-slate-400">
                    <span>{o.stage}</span>
                    {o.amount != null && <span className="tabular-nums">{formatCurrency(o.amount)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-slate-300">Data tools</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Datasets uploaded</p>
            <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-slate-50">{datasets.length}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Saved dashboards</p>
            <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-slate-50">{dashboards.length}</p>
          </Card>
        </div>

        {datasets.length === 0 ? (
          <p className="text-sm text-slate-400">
            No data yet. Head to{" "}
            <Link href="/upload" className="font-medium text-brand-400 hover:underline">
              Upload Data
            </Link>{" "}
            to add your first Excel or CSV file.
          </p>
        ) : (
          <Card className="overflow-x-auto">
            <table className="min-w-full divide-y divide-purple-400/10 text-sm">
              <thead className="bg-purple-500/5">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-400">Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-400">Category</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-400">Rows</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-400">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-400/10">
                {datasets.map((d) => (
                  <tr key={d.id} className="hover:bg-purple-500/5">
                    <td className="px-4 py-2 font-medium text-slate-50">{d.displayName}</td>
                    <td className="px-4 py-2 text-slate-400">{d.category}</td>
                    <td className="px-4 py-2 tabular-nums text-slate-400">{d.rowCount}</td>
                    <td className="px-4 py-2 text-slate-400">{new Date(d.uploadedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
