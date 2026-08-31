"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/siteMapColor";
import { contractStatus, formatContractDate } from "@/lib/contractStatus";
import type { Company, Contract } from "@/lib/crmTypes";
import ContractModal from "./ContractModal";
import ContractsTimeline from "./ContractsTimeline";

type View = "list" | "timeline";

const UNSPECIFIED_TRADE = "Unspecified";

function ContractRow({ contract: c, onSelect }: { contract: Contract; onSelect: (c: Contract) => void }) {
  const status = contractStatus(c.endDate);
  return (
    <button
      onClick={() => onSelect(c)}
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-purple-500/5"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-50">{c.name}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.badgeClassName}`}>
            {status.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          {[c.companyName, c.workType].filter(Boolean).join(" · ") || "No details"}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-4 text-xs text-slate-400">
        {c.siteCount != null && <span>{c.siteCount} sites</span>}
        {c.rateAmount != null && (
          <span className="tabular-nums">
            {formatCurrency(c.rateAmount)}
            {c.rateFrequency ? ` / ${c.rateFrequency}` : ""}
          </span>
        )}
        <span className="tabular-nums">
          {formatContractDate(c.startDate)} – {formatContractDate(c.endDate)}
        </span>
      </div>
    </button>
  );
}

export default function ContractsClient({ contracts, companies }: { contracts: Contract[]; companies: Company[] }) {
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<View>("list");

  const byTrade = useMemo(() => {
    const groups = new Map<string, Contract[]>();
    for (const c of contracts) {
      const trade = c.workType?.trim() || UNSPECIFIED_TRADE;
      groups.set(trade, [...(groups.get(trade) ?? []), c]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === UNSPECIFIED_TRADE) return 1;
      if (b === UNSPECIFIED_TRADE) return -1;
      return a.localeCompare(b);
    });
  }, [contracts]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-purple-400/20 p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
              view === "list" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-50"
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setView("timeline")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
              view === "timeline" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-50"
            }`}
          >
            Timeline
          </button>
        </div>
        <Button onClick={() => setCreating(true)}>+ New contract</Button>
      </div>

      {contracts.length === 0 ? (
        <p className="text-sm text-slate-400">
          No contracts yet. Add your existing signed contracts here — how long they run, their rates, site counts,
          and type of work.
        </p>
      ) : view === "list" ? (
        <div className="flex flex-col gap-6">
          {byTrade.map(([trade, list]) => (
            <div key={trade} className="flex flex-col gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                {trade} <span className="font-normal text-slate-500">({list.length})</span>
              </h2>
              <Card className="flex flex-col divide-y divide-purple-400/10 overflow-hidden">
                {list.map((c) => (
                  <ContractRow key={c.id} contract={c} onSelect={setEditingContract} />
                ))}
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <ContractsTimeline contracts={contracts} onSelect={setEditingContract} />
      )}

      {(editingContract || creating) && (
        <ContractModal
          contract={editingContract}
          companies={companies}
          onClose={() => {
            setEditingContract(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}
