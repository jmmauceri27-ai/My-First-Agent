import Link from "next/link";
import Card from "@/components/ui/Card";
import { DATASET_CATEGORIES } from "@/lib/types";

const AREAS = ["CRM", ...DATASET_CATEGORIES] as const;

export default function AreaSidebar({ selectedArea }: { selectedArea: string }) {
  return (
    <Card className="flex shrink-0 flex-col gap-1 p-2 lg:w-52">
      <nav className="flex flex-col gap-1">
        {AREAS.map((area) => {
          const active = area === selectedArea;
          return (
            <Link
              key={area}
              href={`/dashboards?area=${encodeURIComponent(area)}`}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                active
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-600/40"
                  : "text-slate-400 hover:bg-purple-500/10 hover:text-slate-50"
              }`}
            >
              {area}
            </Link>
          );
        })}
      </nav>
    </Card>
  );
}
