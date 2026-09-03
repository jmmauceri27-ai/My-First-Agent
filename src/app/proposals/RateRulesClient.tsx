"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/siteMapColor";
import type { ClientRateOverride, Company, Contract, RateItem } from "@/lib/crmTypes";
import RateItemModal from "./RateItemModal";
import UploadRateItemsModal from "./UploadRateItemsModal";
import ClientRateOverrideModal from "./ClientRateOverrideModal";
import QuoteCalculator from "./QuoteCalculator";
import ChatAssistant from "./ChatAssistant";

type View = "assistant" | "rate-card" | "calculator";

export default function RateRulesClient({
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
  const [view, setView] = useState<View>("assistant");
  const [editingItem, setEditingItem] = useState<RateItem | null>(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingOverride, setEditingOverride] = useState<ClientRateOverride | null>(null);
  const [creatingOverride, setCreatingOverride] = useState(false);

  const GENERIC_LABEL = "Generic (no contract)";

  const byTrade = useMemo(() => {
    const trades = new Map<string, Map<string, RateItem[]>>();
    for (const item of rateItems) {
      if (!trades.has(item.trade)) trades.set(item.trade, new Map());
      const byContract = trades.get(item.trade)!;
      const contractLabel = item.contractName
        ? item.companyName
          ? `${item.contractName} · ${item.companyName}`
          : item.contractName
        : GENERIC_LABEL;
      if (!byContract.has(contractLabel)) byContract.set(contractLabel, []);
      byContract.get(contractLabel)!.push(item);
    }
    return Array.from(trades.entries()).map(([trade, byContract]) => {
      const contractGroups = Array.from(byContract.entries())
        .sort(([a], [b]) => (a === GENERIC_LABEL ? -1 : b === GENERIC_LABEL ? 1 : a.localeCompare(b)))
        .map(([contractLabel, items]) => {
          const categories = new Map<string, RateItem[]>();
          for (const item of items) {
            if (!categories.has(item.category)) categories.set(item.category, []);
            categories.get(item.category)!.push(item);
          }
          return { contractLabel, categories: Array.from(categories.entries()), count: items.length };
        });
      return {
        trade,
        contractGroups,
        count: contractGroups.reduce((sum, g) => sum + g.count, 0),
      };
    });
  }, [rateItems]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 rounded-lg border border-purple-400/20 p-1">
        <button
          type="button"
          onClick={() => setView("assistant")}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
            view === "assistant" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-50"
          }`}
        >
          Assistant
        </button>
        <button
          type="button"
          onClick={() => setView("rate-card")}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
            view === "rate-card" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-50"
          }`}
        >
          Rate Card
        </button>
        <button
          type="button"
          onClick={() => setView("calculator")}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
            view === "calculator" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-50"
          }`}
        >
          Calculator
        </button>
      </div>

      {view === "assistant" ? (
        <ChatAssistant companies={companies} contracts={contracts} hasRateItems={rateItems.length > 0} />
      ) : view === "calculator" ? (
        <QuoteCalculator rateItems={rateItems} overrides={overrides} companies={companies} contracts={contracts} />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-50">Rate Card by Trade</h2>
                <p className="text-xs text-slate-400">
                  Labor, equipment, materials, and flat-rate service items -- a proposal&rsquo;s price for a trade
                  is composed from these, not a single number.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" onClick={() => setUploading(true)}>
                  Upload
                </Button>
                <Button onClick={() => setCreatingItem(true)}>+ New rate item</Button>
              </div>
            </div>

            {rateItems.length === 0 ? (
              <p className="text-sm text-slate-400">No rate items yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {byTrade.map(({ trade, contractGroups, count }) => (
                  <div key={trade} className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                      {trade} <span className="font-normal text-slate-500">({count})</span>
                    </h3>
                    <div className="flex flex-col gap-3">
                      {contractGroups.map(({ contractLabel, categories }) => (
                        <div key={contractLabel} className="flex flex-col gap-1">
                          {(contractGroups.length > 1 || contractLabel !== GENERIC_LABEL) && (
                            <p className="text-xs font-semibold text-purple-300">{contractLabel}</p>
                          )}
                          <Card className="flex flex-col divide-y divide-purple-400/10 overflow-hidden">
                            {categories.map(([category, items]) => (
                              <div key={category}>
                                <p className="bg-purple-500/5 px-4 py-1.5 text-xs font-semibold text-slate-400">
                                  {category}
                                </p>
                                <div className="flex flex-col divide-y divide-purple-400/10">
                                  {items.map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => setEditingItem(item)}
                                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-purple-500/5"
                                    >
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
                                          {item.pricingBasis}
                                          {item.unitLabel ? ` -- ${item.unitLabel}` : ""}
                                        </p>
                                      </div>
                                      <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-50">
                                        {formatCurrency(item.rate)}
                                      </p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-50">Client Overrides</h2>
                <p className="text-xs text-slate-400">
                  A specific client&rsquo;s blanket discount or markup on one trade&rsquo;s computed total --
                  applied on top of that trade&rsquo;s rate items above.
                </p>
              </div>
              <Button onClick={() => setCreatingOverride(true)} disabled={companies.length === 0}>
                + New override
              </Button>
            </div>

            {overrides.length === 0 ? (
              <p className="text-sm text-slate-400">No client overrides yet.</p>
            ) : (
              <Card className="flex flex-col divide-y divide-purple-400/10 overflow-hidden">
                {overrides.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setEditingOverride(o)}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-purple-500/5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-50">
                        {o.companyName ?? "Unknown client"}{" "}
                        <span className="font-normal text-slate-500">&middot;</span> {o.trade}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{o.overrideType}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-50">{o.overrideValue}%</p>
                  </button>
                ))}
              </Card>
            )}
          </div>

          {(editingItem || creatingItem) && (
            <RateItemModal
              item={editingItem}
              contracts={contracts}
              onClose={() => {
                setEditingItem(null);
                setCreatingItem(false);
              }}
            />
          )}

          {uploading && <UploadRateItemsModal contracts={contracts} onClose={() => setUploading(false)} />}

          {(editingOverride || creatingOverride) && (
            <ClientRateOverrideModal
              override={editingOverride}
              companies={companies}
              onClose={() => {
                setEditingOverride(null);
                setCreatingOverride(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
