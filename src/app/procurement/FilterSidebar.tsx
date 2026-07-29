"use client";

import Button from "@/components/ui/Button";

export default function FilterSidebar({ columns }: { columns: string[] }) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-purple-400/20 bg-[#1c1430]">
      <div className="border-b border-purple-400/20 px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Filter Sets</h2>
        <p className="mt-1 text-xs text-slate-500">Layout preview — filtering isn&rsquo;t wired up yet.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {columns.length === 0 ? (
          <p className="px-2 py-4 text-sm text-slate-500">Pick a dataset to see filter groups here.</p>
        ) : (
          columns.map((column) => (
            <details key={column} className="group border-b border-purple-400/10 px-2 py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-300 hover:text-slate-50">
                {column}
                <span className="text-slate-500 transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <p className="mt-2 text-xs text-slate-500">Filtering by &ldquo;{column}&rdquo; is coming soon.</p>
            </details>
          ))
        )}
      </div>

      <div className="flex gap-2 border-t border-purple-400/20 p-3">
        <Button disabled variant="primary" className="flex-1" title="Coming soon">
          Run Filters
        </Button>
        <Button disabled variant="secondary" title="Coming soon">
          Save
        </Button>
        <Button disabled variant="ghost" title="Coming soon">
          Clear
        </Button>
      </div>
    </aside>
  );
}
