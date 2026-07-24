"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Opportunity } from "@/lib/crmTypes";

function formatAmount(amount: number | null): string | null {
  if (amount === null) return null;
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function OpportunityCard({
  opportunity,
  onClick,
}: {
  opportunity: Opportunity;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`cursor-grab rounded-lg border border-purple-400/40 bg-[#3c2b6b] p-3 text-sm shadow-lg shadow-black/40 transition-shadow hover:shadow-xl active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <p className="font-semibold text-slate-50">{opportunity.name}</p>
      {opportunity.companyName && <p className="text-xs text-slate-300">{opportunity.companyName}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {opportunity.amount !== null && (
          <span className="rounded-full bg-brand-500/25 px-2 py-0.5 font-semibold text-brand-300">
            {formatAmount(opportunity.amount)}
          </span>
        )}
        {opportunity.siteCount !== null && (
          <span className="rounded-full bg-black/25 px-2 py-0.5 text-slate-300">
            {opportunity.siteCount} site{opportunity.siteCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {opportunity.workType && <p className="mt-1.5 truncate text-xs text-slate-300">{opportunity.workType}</p>}
    </div>
  );
}
