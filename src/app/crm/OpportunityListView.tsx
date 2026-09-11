"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatContractDate } from "@/lib/contractStatus";
import { OPPORTUNITY_STAGES } from "@/lib/crmTypes";
import type { Opportunity } from "@/lib/crmTypes";
import { formatCurrency } from "@/lib/siteMapColor";

type SortField =
  | "name"
  | "companyName"
  | "stage"
  | "amount"
  | "siteCount"
  | "workType"
  | "expectedCloseDate"
  | "salesManagerName";

type SortDirection = "asc" | "desc";

const COLUMNS: { field: SortField; label: string; align?: "right" }[] = [
  { field: "name", label: "Opportunity" },
  { field: "companyName", label: "Client" },
  { field: "stage", label: "Stage" },
  { field: "amount", label: "Value", align: "right" },
  { field: "siteCount", label: "Site Count", align: "right" },
  { field: "workType", label: "Trade" },
  { field: "expectedCloseDate", label: "Submission Due Date" },
  { field: "salesManagerName", label: "Sales Manager" },
];

/** Stage sorts by pipeline order (Lead -> ... -> Lost), not alphabetically -- everything else is numeric or
 * case-insensitive string comparison. Missing values sort to the end regardless of direction. */
function compareOpportunities(a: Opportunity, b: Opportunity, field: SortField): number {
  if (field === "stage") {
    return OPPORTUNITY_STAGES.indexOf(a.stage) - OPPORTUNITY_STAGES.indexOf(b.stage);
  }
  if (field === "amount" || field === "siteCount") {
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av - bv;
  }
  if (field === "expectedCloseDate") {
    if (a.expectedCloseDate == null && b.expectedCloseDate == null) return 0;
    if (a.expectedCloseDate == null) return 1;
    if (b.expectedCloseDate == null) return -1;
    return new Date(a.expectedCloseDate).getTime() - new Date(b.expectedCloseDate).getTime();
  }
  const av = a[field];
  const bv = b[field];
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return av.toLowerCase().localeCompare(bv.toLowerCase());
}

export default function OpportunityListView({ opportunities }: { opportunities: Opportunity[] }) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortField) return opportunities;
    // Missing values always sort to the end (handled inside the comparator), so only flip the sign for
    // values that are actually present -- otherwise "desc" would push blanks to the top instead.
    const sign = sortDirection === "asc" ? 1 : -1;
    return [...opportunities].sort((a, b) => sign * compareOpportunities(a, b, sortField));
  }, [opportunities, sortField, sortDirection]);

  if (opportunities.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No opportunities yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-purple-400/10 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {COLUMNS.map((c) => (
              <th
                key={c.field}
                onClick={() => handleSort(c.field)}
                className={`cursor-pointer select-none py-2 pr-3 hover:text-slate-900 dark:hover:text-slate-50 ${
                  c.align === "right" ? "text-right" : ""
                }`}
              >
                {c.label}
                {sortField === c.field && (sortDirection === "asc" ? " ▲" : " ▼")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((o) => (
            <tr
              key={o.id}
              onClick={() => router.push(`/crm/opportunities/${o.id}`)}
              className="cursor-pointer border-b border-purple-400/5 hover:bg-purple-500/5"
            >
              <td className="py-2 pr-3 font-medium text-slate-900 dark:text-slate-50">{o.name}</td>
              <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{o.companyName ?? "—"}</td>
              <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{o.stage}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                {o.amount != null ? formatCurrency(o.amount) : "—"}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                {o.siteCount ?? "—"}
              </td>
              <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{o.workType ?? "—"}</td>
              <td className="py-2 pr-3 tabular-nums text-slate-700 dark:text-slate-300">
                {formatContractDate(o.expectedCloseDate)}
              </td>
              <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{o.salesManagerName ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
