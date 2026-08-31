"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/siteMapColor";
import { MONTHS, sumRateSchedule } from "@/lib/rateSchedule";
import { CHART_COLORS_DARK } from "@/lib/chartPalette";
import type { Site } from "@/lib/networkTypes";

interface ScheduleRow {
  key: string;
  companyName: string | null;
  siteId: string;
  siteName: string;
  trade: string;
  amounts: Partial<Record<(typeof MONTHS)[number], number>>;
  total: number;
}

export default function RatesClient({ sites }: { sites: Site[] }) {
  const rows: ScheduleRow[] = useMemo(
    () =>
      sites.flatMap((s) =>
        s.tradeAssignments
          .filter((a) => Object.keys(a.rateSchedule).length > 0)
          .map((a) => ({
            key: a.id,
            companyName: s.companyName,
            siteId: s.id,
            siteName: s.name,
            trade: a.trade,
            amounts: a.rateSchedule,
            total: sumRateSchedule(a.rateSchedule),
          })),
      ),
    [sites],
  );

  const monthlyTotals = useMemo(
    () =>
      MONTHS.map((month) => ({
        month,
        total: rows.reduce((sum, r) => sum + (r.amounts[month] ?? 0), 0),
      })),
    [rows],
  );

  const grandTotal = monthlyTotals.reduce((sum, m) => sum + m.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <h2 className="text-lg font-bold text-slate-50">Monthly Revenue</h2>
        <p className="-mt-0.5 text-xs text-slate-500">
          Total rate schedule across every site and trade, recurring every year -- what we expect to be paid each
          month.
        </p>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No rate schedules set yet -- add one from a site&rsquo;s Rate Schedule section.
          </p>
        ) : (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyTotals}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
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
                <Bar dataKey="total" fill={CHART_COLORS_DARK[6]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {rows.length > 0 && (
        <Card className="p-5">
          <h2 className="text-lg font-bold text-slate-50">Rate Schedule by Site</h2>
          <p className="-mt-0.5 text-xs text-slate-500">Every site/trade with a rate schedule set, across the portfolio.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-purple-400/10 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Site</th>
                  <th className="py-2 pr-3">Trade</th>
                  {MONTHS.map((m) => (
                    <th key={m} className="py-2 pr-3 text-right">
                      {m}
                    </th>
                  ))}
                  <th className="py-2 pl-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-purple-400/5">
                    <td className="py-2 pr-3 text-slate-300">{r.companyName ?? "—"}</td>
                    <td className="py-2 pr-3 text-slate-300">{r.siteName}</td>
                    <td className="py-2 pr-3 text-slate-300">{r.trade}</td>
                    {MONTHS.map((m) => (
                      <td key={m} className="py-2 pr-3 text-right text-slate-400">
                        {r.amounts[m] != null ? formatCurrency(r.amounts[m] as number) : "—"}
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right font-semibold text-slate-50">{formatCurrency(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-purple-400/20 font-semibold">
                  <td className="py-2 pr-3 text-slate-50" colSpan={3}>
                    Portfolio Total
                  </td>
                  {monthlyTotals.map((m) => (
                    <td key={m.month} className="py-2 pr-3 text-right text-slate-50">
                      {formatCurrency(m.total)}
                    </td>
                  ))}
                  <td className="py-2 pl-3 text-right text-slate-50">{formatCurrency(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
