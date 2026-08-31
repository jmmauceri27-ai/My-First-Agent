"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/siteMapColor";
import { contractStatus, formatContractDate } from "@/lib/contractStatus";
import type { Company, Contract } from "@/lib/crmTypes";
import ContractModal from "./ContractModal";
import ContractsTimeline from "./ContractsTimeline";

type View = "list" | "timeline";

export default function ContractsClient({ contracts, companies }: { contracts: Contract[]; companies: Company[] }) {
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<View>("list");

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
        <Card className="flex flex-col divide-y divide-purple-400/10 overflow-hidden">
          {contracts.map((c) => {
            const status = contractStatus(c.endDate);
            return (
              <button
                key={c.id}
                onClick={() => setEditingContract(c)}
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
          })}
        </Card>
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
