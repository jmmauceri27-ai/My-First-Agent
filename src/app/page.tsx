export const dynamic = "force-dynamic";

import Link from "next/link";
import { listDashboards, listDatasets } from "@/lib/dal";

export default async function HomePage() {
  const [datasets, dashboards] = await Promise.all([listDatasets(), listDashboards()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          🛠️ Facility Maintenance Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Upload work order, invoice, and proposal exports, then build KPI dashboards from them.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Datasets uploaded</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{datasets.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Saved dashboards</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{dashboards.length}</p>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Your datasets</h2>
        {datasets.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No data yet. Head to{" "}
            <Link href="/upload" className="underline">
              Upload Data
            </Link>{" "}
            to add your first Excel or CSV file.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Category</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Rows</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {datasets.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-50">{d.displayName}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d.category}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d.rowCount}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {new Date(d.uploadedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Your dashboards</h2>
        {dashboards.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No dashboards yet. Use{" "}
            <Link href="/builder" className="underline">
              Dashboard Builder
            </Link>{" "}
            once you have uploaded data.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {dashboards.map((d) => (
              <li key={d.id}>
                <Link href={`/dashboards?id=${d.id}`} className="text-sm underline">
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
