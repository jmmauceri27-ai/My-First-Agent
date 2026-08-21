import Link from "next/link";
import type { DashboardDefinition } from "@/lib/dashboardDefinitions";

export default function DashboardPicker({
  dashboards,
  selectedId,
  area,
}: {
  dashboards: DashboardDefinition[];
  selectedId: string | undefined;
  area: string;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-purple-500/15 pb-2">
      {dashboards.map((d) => {
        const active = d.id === selectedId;
        return (
          <Link
            key={d.id}
            href={`/dashboards?area=${encodeURIComponent(area)}&id=${d.id}`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              active
                ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                : "text-slate-400 hover:bg-purple-500/10 hover:text-slate-50"
            }`}
          >
            {d.config.name}
          </Link>
        );
      })}
    </nav>
  );
}
