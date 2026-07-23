"use client";

import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui/formClasses";

export default function DashboardPicker({
  dashboards,
  selectedId,
}: {
  dashboards: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <label className="flex w-fit flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">Choose a dashboard</span>
      <select
        value={selectedId}
        onChange={(e) => router.push(`/dashboards?id=${e.target.value}`)}
        className={inputClass}
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
