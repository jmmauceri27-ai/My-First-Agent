"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/siteMapColor";
import type { Company, Contract } from "@/lib/crmTypes";
import ContractModal from "./ContractModal";

const EXPIRING_SOON_DAYS = 60;

function contractStatus(endDate: string | null): { label: string; className: string } {
  if (!endDate) return { label: "Ongoing", className: "bg-slate-500/10 text-slate-300" };

  const daysLeft = Math.floor((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "Expired", className: "bg-critical/10 text-critical" };
  if (daysLeft <= EXPIRING_SOON_DAYS) return { label: "Expiring soon", className: "bg-amber-500/10 text-amber-400" };
  return { label: "Active", className: "bg-emerald-500/10 text-emerald-400" };
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function ContractsClient({ contracts, companies }: { contracts: Contract[]; companies: Company[] }) {
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>+ New contract</Button>
      </div>

      {contracts.length === 0 ? (
        <p className="text-sm text-slate-400">
          No contracts yet. Add your existing signed contracts here — how long they run, their rates, site counts,
          and type of work.
        </p>
      ) : (
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
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
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
                    {formatDate(c.startDate)} – {formatDate(c.endDate)}
                  </span>
                </div>
              </button>
            );
          })}
        </Card>
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
