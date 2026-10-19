"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/siteMapColor";
import { contractStatus } from "@/lib/contractStatus";
import { CHART_COLORS_DARK } from "@/lib/chartPalette";
import type { Contract } from "@/lib/crmTypes";

/** Only Monthly and Annual billing can be turned into a yearly figure without guessing how often the client
 * is actually billed -- One-time/Per visit/Seasonal agreements are kept out of this sum and reported as their
 * own "other" bucket instead of being silently folded in as if they meant the same thing. */
const ANNUALIZE_MULTIPLIER: Partial<Record<string, number>> = { Monthly: 12, Annual: 1 };

function annualizedValue(c: Contract): number | null {
  if (c.rateAmount == null || !c.rateFrequency) return null;
  const multiplier = ANNUALIZE_MULTIPLIER[c.rateFrequency];
  return multiplier != null ? c.rateAmount * multiplier : null;
}

interface GroupRow {
  key: string;
  label: string;
  agreements: number;
  sites: number;
  annualValue: number;
  otherValue: number;
  otherCount: number;
}

function emptyRow(key: string, label: string): GroupRow {
  return { key, label, agreements: 0, sites: 0, annualValue: 0, otherValue: 0, otherCount: 0 };
}

function addContractToRow(row: GroupRow, c: Contract): void {
  row.agreements += 1;
  row.sites += c.siteCount ?? 0;
  const av = annualizedValue(c);
  if (av != null) {
    row.annualValue += av;
  } else if (c.rateAmount != null) {
    row.otherValue += c.rateAmount;
    row.otherCount += 1;
  }
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </Card>
  );
}

const STATUS_BADGES: { label: string; className: string }[] = [
  { label: "Active", className: "bg-emerald-500/10 text-emerald-400" },
  { label: "Expiring soon", className: "bg-amber-500/10 text-amber-400" },
  { label: "Expired", className: "bg-critical/10 text-critical" },
  { label: "Ongoing", className: "bg-slate-500/10 text-slate-300" },
];

function GroupTable({ title, caption, rows }: { title: string; caption: string; rows: GroupRow[] }) {
  const hasOther = rows.some((r) => r.otherCount > 0);
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</h2>
      <p className="-mt-0.5 text-xs text-slate-600 dark:text-slate-500">{caption}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <th className="py-2 pr-3">{title.replace("By ", "")}</th>
              <th className="py-2 pr-3 text-right">Agreements</th>
              <th className="py-2 pr-3 text-right">Sites</th>
              <th className="py-2 pr-3 text-right">Annualized Value</th>
              {hasOther && <th className="py-2 pl-3 text-right">Other-billed</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-surface-border">
                <td className="py-2 pr-3 font-medium text-slate-900 dark:text-slate-50">{r.label}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{r.agreements}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{r.sites}</td>
                <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-50">
                  {r.annualValue > 0 ? formatCurrency(r.annualValue) : "—"}
                </td>
                {hasOther && (
                  <td className="py-2 pl-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                    {r.otherCount > 0 ? `${r.otherCount} (${formatCurrency(r.otherValue)})` : "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function AgreementsOverviewClient({ contracts }: { contracts: Contract[] }) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { Active: 0, "Expiring soon": 0, Expired: 0, Ongoing: 0 };
    for (const c of contracts) {
      const label = contractStatus(c.endDate).label;
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return counts;
  }, [contracts]);

  const { totalAnnualValue, otherValue, otherCount } = useMemo(() => {
    let totalAnnualValue = 0;
    let otherValue = 0;
    let otherCount = 0;
    for (const c of contracts) {
      const av = annualizedValue(c);
      if (av != null) totalAnnualValue += av;
      else if (c.rateAmount != null) {
        otherValue += c.rateAmount;
        otherCount += 1;
      }
    }
    return { totalAnnualValue, otherValue, otherCount };
  }, [contracts]);

  const byTrade = useMemo(() => {
    const map = new Map<string, GroupRow>();
    for (const c of contracts) {
      const trades = c.trades.length > 0 ? c.trades : ["(No trade)"];
      for (const trade of trades) {
        const row = map.get(trade) ?? emptyRow(trade, trade);
        addContractToRow(row, c);
        map.set(trade, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.annualValue - a.annualValue);
  }, [contracts]);

  const byClient = useMemo(() => {
    const map = new Map<string, GroupRow>();
    for (const c of contracts) {
      const key = c.companyId ?? "none";
      const row = map.get(key) ?? emptyRow(key, c.companyName ?? "(No client)");
      addContractToRow(row, c);
      map.set(key, row);
    }
    return Array.from(map.values()).sort((a, b) => b.annualValue - a.annualValue);
  }, [contracts]);

  if (contracts.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No agreements yet -- add one from the Agreements list to see a breakdown here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total Agreements" value={String(contracts.length)} />
        <StatTile
          label="Annualized Value"
          value={formatCurrency(totalAnnualValue)}
          hint="Monthly ×12 + Annual billing only"
        />
        <StatTile label="Expiring Soon" value={String(statusCounts["Expiring soon"] ?? 0)} hint="Within 60 days" />
        <StatTile label="Expired" value={String(statusCounts.Expired ?? 0)} />
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">By Status</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {STATUS_BADGES.map((s) => (
            <div key={s.label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${s.className}`}>
              <span className="text-lg font-extrabold tabular-nums">{statusCounts[s.label] ?? 0}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
        {otherCount > 0 && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {otherCount} agreement{otherCount === 1 ? "" : "s"} billed One-time/Per visit/Seasonal, totaling{" "}
            {formatCurrency(otherValue)} -- not included in Annualized Value above since those frequencies aren&rsquo;t a
            fixed yearly amount.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Annualized Value by Trade</h2>
        <p className="-mt-0.5 text-xs text-slate-600 dark:text-slate-500">
          Monthly ×12 + Annual agreements only, summed per Trade.
        </p>
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byTrade}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v)}
                width={80}
              />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v))}
                contentStyle={{
                  background: "#150f26",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: 8,
                  fontSize: 13,
                }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="annualValue" fill={CHART_COLORS_DARK[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <GroupTable
        title="By Trade"
        caption="Every Trade covered by at least one agreement. An agreement covering more than one Trade (e.g. Land and Snow Removal on the same agreement) counts under each."
        rows={byTrade}
      />
      <GroupTable title="By Client" caption="Every Client with at least one agreement." rows={byClient} />
    </div>
  );
}
