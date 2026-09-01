"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { formatCurrency } from "@/lib/siteMapColor";
import { MONTHS, sumRateSchedule } from "@/lib/rateSchedule";
import { CHART_COLORS_DARK } from "@/lib/chartPalette";
import type { Site } from "@/lib/networkTypes";

type Payee = "Vendor" | "Sub-Vendor";

interface ExpenseRow {
  key: string;
  companyName: string | null;
  siteId: string;
  siteName: string;
  trade: string;
  payee: Payee;
  payeeName: string | null;
  amounts: Partial<Record<(typeof MONTHS)[number], number>>;
  total: number;
}

export default function ExpensesClient({ sites }: { sites: Site[] }) {
  const [tradeFilter, setTradeFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [payeeFilter, setPayeeFilter] = useState<Payee | "">("");

  const allRows: ExpenseRow[] = useMemo(
    () =>
      sites.flatMap((s) =>
        s.tradeAssignments.flatMap((a) => {
          const rows: ExpenseRow[] = [];
          if (Object.keys(a.vendorExpenseSchedule).length > 0) {
            rows.push({
              key: `${a.id}-vendor`,
              companyName: s.companyName,
              siteId: s.id,
              siteName: s.name,
              trade: a.trade,
              payee: "Vendor",
              payeeName: a.vendorName,
              amounts: a.vendorExpenseSchedule,
              total: sumRateSchedule(a.vendorExpenseSchedule),
            });
          }
          if (Object.keys(a.subVendorExpenseSchedule).length > 0) {
            rows.push({
              key: `${a.id}-subVendor`,
              companyName: s.companyName,
              siteId: s.id,
              siteName: s.name,
              trade: a.trade,
              payee: "Sub-Vendor",
              payeeName: a.subVendorName,
              amounts: a.subVendorExpenseSchedule,
              total: sumRateSchedule(a.subVendorExpenseSchedule),
            });
          }
          return rows;
        }),
      ),
    [sites],
  );

  const tradeOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.trade))).sort((a, b) => a.localeCompare(b)),
    [allRows],
  );
  const clientOptions = useMemo(
    () =>
      Array.from(new Set(allRows.map((r) => r.companyName).filter((v): v is string => !!v))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [allRows],
  );

  const rows = useMemo(
    () =>
      allRows.filter(
        (r) =>
          (!tradeFilter || r.trade === tradeFilter) &&
          (!clientFilter || r.companyName === clientFilter) &&
          (!payeeFilter || r.payee === payeeFilter),
      ),
    [allRows, tradeFilter, clientFilter, payeeFilter],
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
      {allRows.length > 0 && (
        <Card className="flex flex-wrap gap-4 p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Trade</span>
            <select value={tradeFilter} onChange={(e) => setTradeFilter(e.target.value)} className={inputClass}>
              <option value="">All</option>
              {tradeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Client</span>
            <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className={inputClass}>
              <option value="">All</option>
              {clientOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Payee</span>
            <select
              value={payeeFilter}
              onChange={(e) => setPayeeFilter(e.target.value as Payee | "")}
              className={inputClass}
            >
              <option value="">All</option>
              <option value="Vendor">Vendor</option>
              <option value="Sub-Vendor">Sub-Vendor</option>
            </select>
          </label>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-lg font-bold text-slate-50">Monthly Expenses</h2>
        <p className="-mt-0.5 text-xs text-slate-500">
          Total Vendor and Sub-Vendor expense schedule across every site and trade, recurring every year -- what we
          expect to pay out each month.
        </p>
        {allRows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No expense schedules set yet -- add one from a site&rsquo;s Expense Schedule section.
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No expense schedules match these filters.</p>
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
                <Bar dataKey="total" fill={CHART_COLORS_DARK[7]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {rows.length > 0 && (
        <Card className="p-5">
          <h2 className="text-lg font-bold text-slate-50">Expense Schedule by Site</h2>
          <p className="-mt-0.5 text-xs text-slate-500">
            Every site/trade/payee with an expense schedule set, across the portfolio.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-purple-400/10 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Site</th>
                  <th className="py-2 pr-3">Trade</th>
                  <th className="py-2 pr-3">Payee</th>
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
                    <td className="py-2 pr-3 text-slate-300">
                      {r.payee}
                      {r.payeeName ? <span className="text-slate-500"> ({r.payeeName})</span> : ""}
                    </td>
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
                  <td className="py-2 pr-3 text-slate-50" colSpan={4}>
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
