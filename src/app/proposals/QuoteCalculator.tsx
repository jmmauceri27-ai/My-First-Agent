"use client";

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { formatCurrency } from "@/lib/siteMapColor";
import { findOverrideForTrade, priceTradeSelections, resolveTradeRateItems } from "@/lib/pricingEngine";
import type { ClientRateOverride, Company, Contract, RateItem } from "@/lib/crmTypes";

/** Manually exercises the pricing engine against real rate items -- pick a client/contract/trade, enter
 * quantities, and see exactly how a trade's price gets composed (line by line) and adjusted by a client
 * override. Nothing here is saved; this is a calculator, not a proposal (that's a later step). */
export default function QuoteCalculator({
  rateItems,
  overrides,
  companies,
  contracts,
}: {
  rateItems: RateItem[];
  overrides: ClientRateOverride[];
  companies: Company[];
  contracts: Contract[];
}) {
  const [companyId, setCompanyId] = useState("");
  const [contractId, setContractId] = useState("");
  const [trade, setTrade] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const tradesWithItems = useMemo(
    () => Array.from(new Set(rateItems.map((r) => r.trade))).sort((a, b) => a.localeCompare(b)),
    [rateItems],
  );

  const contractsForClient = useMemo(
    () => (companyId ? contracts.filter((c) => c.companyId === companyId) : contracts),
    [contracts, companyId],
  );

  const tradeItems = useMemo(
    () => (trade ? resolveTradeRateItems(rateItems, trade, contractId || null) : []),
    [rateItems, trade, contractId],
  );
  const usingContractRateCard = tradeItems.length > 0 && tradeItems[0].contractId != null;

  const itemsByCategory = useMemo(() => {
    const categories = new Map<string, RateItem[]>();
    for (const item of tradeItems) {
      if (!categories.has(item.category)) categories.set(item.category, []);
      categories.get(item.category)!.push(item);
    }
    return Array.from(categories.entries());
  }, [tradeItems]);

  const override = useMemo(
    () => findOverrideForTrade(overrides, companyId || null, trade),
    [overrides, companyId, trade],
  );

  const result = useMemo(() => {
    if (!trade) return null;
    const selections = Object.entries(quantities)
      .map(([rateItemId, qty]) => ({ rateItemId, quantity: Number(qty) }))
      .filter((s) => Number.isFinite(s.quantity) && s.quantity > 0);
    return priceTradeSelections(trade, rateItems, selections, override);
  }, [trade, rateItems, quantities, override]);

  function updateQuantity(rateItemId: string, value: string) {
    setQuantities((prev) => ({ ...prev, [rateItemId]: value }));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap gap-4 p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Client (optional, for override)</span>
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setContractId("");
            }}
            className={inputClass}
          >
            <option value="">No client</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Contract (optional, for its own rate card)</span>
          <select value={contractId} onChange={(e) => setContractId(e.target.value)} className={inputClass}>
            <option value="">No contract</option>
            {contractsForClient.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {!companyId && c.companyName ? ` · ${c.companyName}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Trade</span>
          <select
            value={trade}
            onChange={(e) => {
              setTrade(e.target.value);
              setQuantities({});
            }}
            className={inputClass}
          >
            <option value="">Choose a trade…</option>
            {tradesWithItems.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {!trade ? (
        <p className="text-sm text-slate-400">Choose a trade to start building a quote.</p>
      ) : itemsByCategory.length === 0 ? (
        <p className="text-sm text-slate-400">No rate items for {trade} yet.</p>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <Card className="flex flex-1 flex-col divide-y divide-purple-400/10 overflow-hidden">
            <p className="bg-purple-500/5 px-4 py-1.5 text-xs font-semibold text-slate-400">
              {usingContractRateCard
                ? `Using ${contracts.find((c) => c.id === contractId)?.name ?? "this contract"}'s rate card for ${trade}`
                : `Using the generic rate card for ${trade}`}
            </p>
            {itemsByCategory.map(([category, items]) => (
              <div key={category}>
                <p className="bg-purple-500/5 px-4 py-1.5 text-xs font-semibold text-slate-400">{category}</p>
                <div className="flex flex-col divide-y divide-purple-400/10">
                  {items.map((item) => {
                    const qty = quantities[item.id] ?? "";
                    const num = Number(qty);
                    const extended = qty.trim() && Number.isFinite(num) ? num * item.rate : 0;
                    return (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-50">
                            {item.itemName}
                            {item.rateTier !== "Standard" && (
                              <span className="ml-2 rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-300">
                                {item.rateTier}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {formatCurrency(item.rate)} {item.pricingBasis}
                            {item.unitLabel ? ` -- ${item.unitLabel}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={qty}
                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                            placeholder="Qty"
                            className={`${inputClass} w-20 text-right`}
                          />
                          <p className="w-24 text-right text-sm font-semibold tabular-nums text-slate-50">
                            {extended > 0 ? formatCurrency(extended) : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </Card>

          <Card className="flex h-fit w-full flex-col gap-2 p-4 lg:w-72">
            <h3 className="text-sm font-bold text-slate-50">{trade} Quote</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-semibold tabular-nums text-slate-50">
                {formatCurrency(result?.subtotal ?? 0)}
              </span>
            </div>
            {result?.override && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  {result.override.overrideType} ({result.override.overrideValue}%)
                </span>
                <span className="font-semibold tabular-nums text-slate-50">
                  {result.overrideAdjustment >= 0 ? "+" : ""}
                  {formatCurrency(result.overrideAdjustment)}
                </span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-purple-400/10 pt-2 text-sm">
              <span className="font-semibold text-slate-300">Total</span>
              <span className="text-base font-bold tabular-nums text-slate-50">
                {formatCurrency(result?.total ?? 0)}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
