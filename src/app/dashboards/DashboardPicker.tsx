import Link from "next/link";

export default function DashboardPicker({
  dashboards,
  selectedId,
}: {
  dashboards: { id: string; name: string }[];
  selectedId: string;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-zinc-200 pb-2 dark:border-zinc-800">
      {dashboards.map((d) => {
        const active = d.id === selectedId;
        return (
          <Link
            key={d.id}
            href={`/dashboards?id=${d.id}`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              active
                ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30 dark:bg-brand-500"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            {d.name}
          </Link>
        );
      })}
      <Link
        href="/builder"
        className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
      >
        + New dashboard
      </Link>
    </nav>
  );
}
