"use client";

import { useRouter } from "next/navigation";

export default function DashboardPicker({
  dashboards,
  selectedId,
}: {
  dashboards: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">Choose a dashboard</span>
      <select
        value={selectedId}
        onChange={(e) => router.push(`/dashboards?id=${e.target.value}`)}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {dashboards.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </label>
  );
}
