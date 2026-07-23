"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Opportunity, OpportunityStage } from "@/lib/crmTypes";
import OpportunityCard from "./OpportunityCard";

function formatTotal(opportunities: Opportunity[]): string | null {
  const total = opportunities.reduce((sum, o) => sum + (o.amount ?? 0), 0);
  if (total === 0) return null;
  return total.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function KanbanColumn({
  stage,
  opportunities,
  onCardClick,
}: {
  stage: OpportunityStage;
  opportunities: Opportunity[];
  onCardClick: (o: Opportunity) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = formatTotal(opportunities);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[200px] flex-1 flex-col gap-2 rounded-xl border p-3 transition-colors ${
        isOver
          ? "border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50"
      }`}
    >
      <div className="flex items-baseline justify-between px-1">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{stage}</h3>
        <span className="text-xs text-zinc-400">{opportunities.length}</span>
      </div>
      {total && <p className="px-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">{total}</p>}

      <div className="flex flex-col gap-2">
        {opportunities.map((o) => (
          <OpportunityCard key={o.id} opportunity={o} onClick={() => onCardClick(o)} />
        ))}
        {opportunities.length === 0 && (
          <p className="px-1 py-2 text-center text-xs text-zinc-400">No opportunities</p>
        )}
      </div>
    </div>
  );
}
