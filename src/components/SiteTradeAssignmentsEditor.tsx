"use client";

import { inputClass } from "@/components/ui/formClasses";
import { computeSiteMargin, formatCurrency, parseCurrencyInput } from "@/lib/siteMapColor";
import type { SiteTradeAssignment, SiteTradeAssignmentInput, Vendor } from "@/lib/networkTypes";

/** One trade's in-progress form values -- currency fields are kept as display strings, like the rest of this app's price inputs. */
export interface AssignmentDraft {
  vendorId: string;
  subVendorId: string;
  contractValue: string;
  subPrice: string;
  subVendorPrice: string;
}

function emptyDraft(): AssignmentDraft {
  return { vendorId: "", subVendorId: "", contractValue: "", subPrice: "", subVendorPrice: "" };
}

export function assignmentsToDrafts(assignments: SiteTradeAssignment[]): Record<string, AssignmentDraft> {
  const map: Record<string, AssignmentDraft> = {};
  for (const a of assignments) {
    map[a.trade] = {
      vendorId: a.vendorId ?? "",
      subVendorId: a.subVendorId ?? "",
      contractValue: a.contractValue != null ? formatCurrency(a.contractValue) : "",
      subPrice: a.subPrice != null ? formatCurrency(a.subPrice) : "",
      subVendorPrice: a.subVendorPrice != null ? formatCurrency(a.subVendorPrice) : "",
    };
  }
  return map;
}

export function draftsToAssignmentInputs(
  trades: string[],
  drafts: Record<string, AssignmentDraft>,
): SiteTradeAssignmentInput[] {
  return trades.map((trade) => {
    const d = drafts[trade] ?? emptyDraft();
    return {
      trade,
      vendorId: d.vendorId || null,
      subVendorId: d.subVendorId || null,
      contractValue: d.contractValue.trim() ? Number(parseCurrencyInput(d.contractValue)) : null,
      subPrice: d.subPrice.trim() ? Number(parseCurrencyInput(d.subPrice)) : null,
      subVendorPrice: d.subVendorPrice.trim() ? Number(parseCurrencyInput(d.subVendorPrice)) : null,
    };
  });
}

/** Editable Vendor/Sub-Vendor + pricing for each of a site's trades -- a site commonly uses a different vendor per trade (e.g. Land vs. Snow Removal). */
export default function SiteTradeAssignmentsEditor({
  trades,
  vendors,
  value,
  onChange,
}: {
  trades: string[];
  vendors: Vendor[];
  value: Record<string, AssignmentDraft>;
  onChange: (next: Record<string, AssignmentDraft>) => void;
}) {
  function updateTrade(trade: string, patch: Partial<AssignmentDraft>) {
    const current = value[trade] ?? emptyDraft();
    onChange({ ...value, [trade]: { ...current, ...patch } });
  }

  if (trades.length === 0) {
    return <p className="text-xs text-slate-500">Add a Trade above to assign a Vendor and pricing to it.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {trades.map((trade) => {
        const draft = value[trade] ?? emptyDraft();
        const ourMargin = computeSiteMargin(
          draft.contractValue.trim() ? Number(parseCurrencyInput(draft.contractValue)) : null,
          draft.subPrice.trim() ? Number(parseCurrencyInput(draft.subPrice)) : null,
        );
        const vendorMargin = computeSiteMargin(
          draft.subPrice.trim() ? Number(parseCurrencyInput(draft.subPrice)) : null,
          draft.subVendorPrice.trim() ? Number(parseCurrencyInput(draft.subVendorPrice)) : null,
        );
        return (
          <div key={trade} className="rounded-lg border border-purple-400/20 p-3">
            <p className="text-sm font-semibold text-slate-50">{trade}</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Vendor</span>
                <select
                  value={draft.vendorId}
                  onChange={(e) => updateTrade(trade, { vendorId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">(none)</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Sub-Vendor</span>
                <select
                  value={draft.subVendorId}
                  onChange={(e) => updateTrade(trade, { subVendorId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">(none)</option>
                  {vendors
                    .filter((v) => v.id !== draft.vendorId)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Contract value</span>
                <input
                  value={draft.contractValue}
                  onChange={(e) => updateTrade(trade, { contractValue: e.target.value })}
                  onBlur={() => {
                    const num = Number(parseCurrencyInput(draft.contractValue));
                    if (draft.contractValue.trim() && Number.isFinite(num)) {
                      updateTrade(trade, { contractValue: formatCurrency(num) });
                    }
                  }}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Sub price (to Vendor)</span>
                <input
                  value={draft.subPrice}
                  onChange={(e) => updateTrade(trade, { subPrice: e.target.value })}
                  onBlur={() => {
                    const num = Number(parseCurrencyInput(draft.subPrice));
                    if (draft.subPrice.trim() && Number.isFinite(num)) updateTrade(trade, { subPrice: formatCurrency(num) });
                  }}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Sub-Vendor price</span>
                <input
                  value={draft.subVendorPrice}
                  onChange={(e) => updateTrade(trade, { subVendorPrice: e.target.value })}
                  onBlur={() => {
                    const num = Number(parseCurrencyInput(draft.subVendorPrice));
                    if (draft.subVendorPrice.trim() && Number.isFinite(num)) {
                      updateTrade(trade, { subVendorPrice: formatCurrency(num) });
                    }
                  }}
                  className={inputClass}
                />
              </label>
            </div>

            {(ourMargin !== null || vendorMargin !== null) && (
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                {ourMargin !== null && (
                  <span>
                    Our margin: <span className="font-semibold text-slate-50">{formatCurrency(ourMargin)}</span>
                  </span>
                )}
                {vendorMargin !== null && (
                  <span>
                    Vendor margin: <span className="font-semibold text-slate-50">{formatCurrency(vendorMargin)}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
