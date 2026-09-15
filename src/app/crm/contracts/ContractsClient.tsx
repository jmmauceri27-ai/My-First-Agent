"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import SearchableSelect from "@/components/SearchableSelect";
import TradeSelect from "@/components/TradeSelect";
import { formatCurrency } from "@/lib/siteMapColor";
import { contractStatus, formatContractDate } from "@/lib/contractStatus";
import type { Company, Contact, Contract, ContractInput, FieldClass, Opportunity } from "@/lib/crmTypes";
import ContractModal from "./ContractModal";
import ContractsTimeline from "./ContractsTimeline";

type View = "list" | "timeline";
type SortBy = "name" | "expiration";

function ContractRow({ contract: c, onSelect }: { contract: Contract; onSelect: (c: Contract) => void }) {
  const status = contractStatus(c.endDate);
  return (
    <button
      onClick={() => onSelect(c)}
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-purple-500/5"
    >
      <div className="flex min-w-0 items-center gap-3">
        {c.companyLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.companyLogoUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full border border-purple-400/20 object-contain"
          />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {c.trackingNumber && (
              <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">{c.trackingNumber}</span>
            )}
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{c.name}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.badgeClassName}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {[c.companyName, c.trades.length > 0 ? c.trades.join(", ") : null].filter(Boolean).join(" · ") ||
              "No details"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
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

export default function ContractsClient({
  contracts,
  companies,
  opportunities,
  contacts,
  fieldClasses,
  openContractId,
  convertFromOpportunityId,
}: {
  contracts: Contract[];
  companies: Company[];
  opportunities: Opportunity[];
  contacts: Contact[];
  fieldClasses: FieldClass[];
  openContractId: string | null;
  convertFromOpportunityId: string | null;
}) {
  const router = useRouter();
  // Lazy initializers so these only ever resolve from the URL params this page loaded with, once -- not an
  // effect, since there's no external system to synchronize with, just an initial state derivation.
  const [editingContract, setEditingContract] = useState<Contract | null>(() =>
    openContractId ? (contracts.find((c) => c.id === openContractId) ?? null) : null,
  );
  const [prefill, setPrefill] = useState<Partial<ContractInput> | null>(() => {
    if (openContractId || !convertFromOpportunityId) return null;
    const source = opportunities.find((o) => o.id === convertFromOpportunityId);
    if (!source) return null;
    return {
      companyId: source.companyId,
      opportunityId: source.id,
      name: source.name,
      trades: source.trades,
      siteCount: source.siteCount,
      rateAmount: source.amount,
      contactIds: source.contactIds,
    };
  });
  const [creating, setCreating] = useState(() => prefill != null);
  const [view, setView] = useState<View>("list");
  const [clientFilter, setClientFilter] = useState("");
  const [tradeFilter, setTradeFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("name");

  useEffect(() => {
    if (openContractId || convertFromOpportunityId) {
      router.replace("/crm/contracts");
    }
    // Only meant to fire once, to clean up the URL this page loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const c of contracts) {
      if (c.companyId && c.companyName) byId.set(c.companyId, c.companyName);
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ value: id, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [contracts]);

  const filtered = useMemo(
    () =>
      contracts.filter(
        (c) =>
          (!clientFilter || c.companyId === clientFilter) &&
          (tradeFilter.length === 0 || c.trades.some((t) => tradeFilter.includes(t))),
      ),
    [contracts, clientFilter, tradeFilter],
  );

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === "expiration") {
      list.sort((a, b) => {
        if (a.endDate == null && b.endDate == null) return 0;
        if (a.endDate == null) return 1;
        if (b.endDate == null) return -1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [filtered, sortBy]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-purple-400/20 p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
              view === "list" ? "bg-brand-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setView("timeline")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
              view === "timeline" ? "bg-brand-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
            }`}
          >
            Timeline
          </button>
        </div>
        <Button onClick={() => setCreating(true)}>+ New agreement</Button>
      </div>

      {contracts.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No agreements yet. Add your existing signed agreements here — how long they run, their rates, site counts,
          and type of work.
        </p>
      ) : view === "list" ? (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-wrap gap-4 p-4">
            {/* A plain div, not a <label> -- see SearchableSelect's own note on why. */}
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Client</span>
              <SearchableSelect options={clientOptions} value={clientFilter} onChange={setClientFilter} className="w-52" />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Trade</span>
              <TradeSelect value={tradeFilter} onChange={setTradeFilter} className="w-52" placeholder="All trades" />
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Sort by</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className={inputClass}>
                <option value="name">Name (A–Z)</option>
                <option value="expiration">Expiration date (soonest first)</option>
              </select>
            </label>
          </Card>

          {sorted.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No agreements match these filters.</p>
          ) : (
            <Card className="flex flex-col divide-y divide-purple-400/10 overflow-hidden">
              {sorted.map((c) => (
                <ContractRow key={c.id} contract={c} onSelect={setEditingContract} />
              ))}
            </Card>
          )}
        </div>
      ) : (
        <ContractsTimeline contracts={contracts} onSelect={setEditingContract} />
      )}

      {(editingContract || creating) && (
        <ContractModal
          contract={editingContract}
          companies={companies}
          opportunities={opportunities}
          contacts={contacts}
          fieldClasses={fieldClasses}
          prefill={editingContract ? null : prefill}
          onClose={() => {
            setEditingContract(null);
            setCreating(false);
            setPrefill(null);
          }}
        />
      )}
    </div>
  );
}
