"use client";

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/siteMapColor";
import { contractStatus, formatContractDate } from "@/lib/contractStatus";
import type { Contract } from "@/lib/crmTypes";

const DAY_MS = 24 * 60 * 60 * 1000;

const LEGEND = [
  { label: "Active", swatchClassName: "bg-emerald-500" },
  { label: "Expiring soon", swatchClassName: "bg-amber-500" },
  { label: "Expired", swatchClassName: "bg-critical" },
  { label: "Ongoing (no end date)", swatchClassName: "bg-slate-500" },
] as const;

function pct(time: number, domainMin: number, domainMax: number): number {
  return ((time - domainMin) / (domainMax - domainMin)) * 100;
}

export default function ContractsTimeline({
  contracts,
  onSelect,
}: {
  contracts: Contract[];
  onSelect: (contract: Contract) => void;
}) {
  const [today] = useState(() => Date.now());

  const { rows, yearTicks, todayPct, undated } = useMemo(() => {
    const dated = contracts.filter((c) => c.startDate);
    const undatedCount = contracts.length - dated.length;

    const starts = dated.map((c) => new Date(c.startDate as string).getTime());
    const ends = dated.filter((c) => c.endDate).map((c) => new Date(c.endDate as string).getTime());

    if (starts.length === 0) {
      return { rows: [], yearTicks: [], todayPct: null, undated: undatedCount };
    }

    const rawMin = Math.min(...starts);
    const rawMax = Math.max(...ends, today);
    const span = Math.max(rawMax - rawMin, DAY_MS);
    const pad = span * 0.04;
    const domainMin = rawMin - pad;
    const domainMax = rawMax + pad;

    const sorted = [...dated].sort(
      (a, b) => new Date(a.startDate as string).getTime() - new Date(b.startDate as string).getTime(),
    );

    const rows = sorted.map((c) => {
      const startTime = new Date(c.startDate as string).getTime();
      const endTime = c.endDate ? new Date(c.endDate as string).getTime() : domainMax;
      const leftPct = pct(startTime, domainMin, domainMax);
      const widthPct = Math.max(pct(endTime, domainMin, domainMax) - leftPct, 0.6);
      return { contract: c, leftPct, widthPct, status: contractStatus(c.endDate) };
    });

    const startYear = new Date(domainMin).getFullYear();
    const endYear = new Date(domainMax).getFullYear();
    const yearTicks = [];
    for (let y = startYear; y <= endYear; y++) {
      const time = new Date(y, 0, 1).getTime();
      if (time < domainMin || time > domainMax) continue;
      yearTicks.push({ label: String(y), pct: pct(time, domainMin, domainMax) });
    }

    const todayPct = today >= domainMin && today <= domainMax ? pct(today, domainMin, domainMax) : null;

    return { rows, yearTicks, todayPct, undated: undatedCount };
  }, [contracts, today]);

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">No contracts have a start date set yet, so there&rsquo;s nothing to plot.</p>;
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className={`h-2.5 w-2.5 rounded-full ${l.swatchClassName}`} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2.5 border-l border-dashed border-brand-400" />
          Today
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="flex min-w-[720px]">
          <div className="flex w-56 shrink-0 flex-col">
            <div className="h-6" />
            {rows.map(({ contract: c }) => (
              <div key={c.id} className="flex h-14 flex-col justify-center border-t border-purple-400/5 pr-3">
                <p className="truncate text-xs font-semibold text-slate-100">{c.name}</p>
                <p className="truncate text-[11px] text-slate-400">{c.companyName ?? "No client"}</p>
              </div>
            ))}
          </div>

          <div className="relative flex-1">
            {yearTicks.map((t) => (
              <div
                key={t.label}
                className="absolute top-0 bottom-0 w-px bg-purple-400/10"
                style={{ left: `${t.pct}%` }}
              />
            ))}
            {todayPct !== null && (
              <div
                className="absolute top-0 bottom-0 border-l border-dashed border-brand-400"
                style={{ left: `${todayPct}%` }}
              />
            )}

            <div className="relative h-6 border-b border-purple-400/10">
              {yearTicks.map((t) => (
                <span
                  key={t.label}
                  className="absolute top-0 -translate-x-1/2 text-[11px] text-slate-500"
                  style={{ left: `${t.pct}%` }}
                >
                  {t.label}
                </span>
              ))}
            </div>

            {rows.map(({ contract: c, leftPct, widthPct, status }) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c)}
                className="group relative block h-14 w-full border-t border-purple-400/5 text-left hover:bg-purple-500/5"
              >
                <span
                  className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full ${status.barClassName}`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
                <span
                  className="pointer-events-none absolute top-1/2 z-10 hidden w-60 -translate-y-full rounded-lg border border-purple-400/30 bg-[#241a44] p-3 text-xs shadow-xl group-hover:block"
                  style={{ left: `${Math.min(leftPct, 60)}%` }}
                >
                  <p className="font-semibold text-slate-50">{c.name}</p>
                  <p className="mt-0.5 text-slate-400">{c.companyName ?? "No client"}</p>
                  <p className="mt-1.5 text-slate-300">
                    {formatContractDate(c.startDate)} – {formatContractDate(c.endDate)}
                  </p>
                  {c.rateAmount != null && (
                    <p className="text-slate-300">
                      {formatCurrency(c.rateAmount)}
                      {c.rateFrequency ? ` / ${c.rateFrequency}` : ""}
                    </p>
                  )}
                  <p className={`mt-1.5 inline-block rounded-full px-2 py-0.5 font-medium ${status.badgeClassName}`}>
                    {status.label}
                  </p>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {undated > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          {undated} contract{undated === 1 ? "" : "s"} without a start date {undated === 1 ? "isn't" : "aren't"} shown
          here.
        </p>
      )}
    </Card>
  );
}
