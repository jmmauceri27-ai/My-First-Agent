export const dynamic = "force-dynamic";

import Link from "next/link";
import { listDashboards, listDatasets } from "@/lib/dal";
import Card from "@/components/ui/Card";

export default async function HomePage() {
  const [datasets, dashboards] = await Promise.all([listDatasets(), listDashboards()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          🛠️ Facility Maintenance Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload work order, invoice, and proposal exports, then build KPI dashboards from them.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card className="border-t-4 p-5" style={{ borderTopColor: "#2a78d6" }}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Datasets uploaded
          </p>
          <p className="mt-1.5 text-3xl font-extrabold tabular-nums text-slate-900 dark:text-slate-50">
            {datasets.length}
          </p>
        </Card>
        <Card className="border-t-4 p-5" style={{ borderTopColor: "#1baf7a" }}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Saved dashboards
          </p>
          <p className="mt-1.5 text-3xl font-extrabold tabular-nums text-slate-900 dark:text-slate-50">
            {dashboards.length}
          </p>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Your datasets</h2>
        {datasets.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No data yet. Head to{" "}
            <Link href="/upload" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Upload Data
            </Link>{" "}
            to add your first Excel or CSV file.
          </p>
        ) : (
          <Card className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-500">Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-500">Category</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-500">Rows</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-500">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {datasets.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-50">{d.displayName}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{d.category}</td>
                    <td className="px-4 py-2 tabular-nums text-slate-600 dark:text-slate-400">{d.rowCount}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      {new Date(d.uploadedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Your dashboards</h2>
        {dashboards.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No dashboards yet. Use{" "}
            <Link href="/builder" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Dashboard Builder
            </Link>{" "}
            once you have uploaded data.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {dashboards.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboards?id=${d.id}`}
                  className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
