"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { PRICING_BASIS_OPTIONS, RATE_ITEM_CATEGORIES, RATE_TIER_OPTIONS } from "@/lib/crmTypes";
import type { Company, RateItem, RateItemInput } from "@/lib/crmTypes";
import { TRADE_OPTIONS } from "@/lib/trades";
import { deleteRateItemAction, saveRateItemAction } from "./actions";

export default function RateItemModal({
  item,
  companies,
  onClose,
}: {
  item: RateItem | null;
  companies: Company[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(item?.companyId ?? "");
  const [trade, setTrade] = useState(item?.trade ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [itemName, setItemName] = useState(item?.itemName ?? "");
  const [pricingBasis, setPricingBasis] = useState(item?.pricingBasis ?? "");
  const [rateTier, setRateTier] = useState(item?.rateTier ?? "Standard");
  const [rate, setRate] = useState(item?.rate != null ? String(item.rate) : "");
  const [unitLabel, setUnitLabel] = useState(item?.unitLabel ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!trade) {
      setError("Please choose a trade.");
      return;
    }
    if (!category) {
      setError("Please choose a category.");
      return;
    }
    if (!itemName.trim()) {
      setError("Please enter an item name.");
      return;
    }
    if (!pricingBasis) {
      setError("Please choose a pricing basis.");
      return;
    }
    const rateValue = Number(rate);
    if (!rate.trim() || !Number.isFinite(rateValue)) {
      setError("Please enter a rate.");
      return;
    }
    setSaving(true);
    try {
      const input: RateItemInput = {
        trade,
        category,
        itemName: itemName.trim(),
        pricingBasis,
        rateTier,
        rate: rateValue,
        unitLabel: unitLabel.trim() || null,
        notes: notes.trim() || null,
        companyId: companyId || null,
      };
      await saveRateItemAction(item?.id ?? null, input);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rate item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    setDeleting(true);
    try {
      await deleteRateItemAction(item.id);
      router.refresh();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-50">{item ? "Edit rate item" : "New rate item"}</h2>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Client (optional)</span>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass} autoFocus>
              <option value="">Generic (all clients)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              Leave as Generic for the default catalog, or pick a client if this rate comes from their own
              negotiated rate card -- it&rsquo;ll be used instead of the generic rate for this trade.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Trade</span>
              <select value={trade} onChange={(e) => setTrade(e.target.value)} className={inputClass}>
                <option value="">Choose a trade…</option>
                {TRADE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="">Choose a category…</option>
                {RATE_ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Item name</span>
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Landscape Laborer, 1.5&quot; Valve Replaced, Gold Mop #2"
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Pricing basis</span>
              <select value={pricingBasis} onChange={(e) => setPricingBasis(e.target.value)} className={inputClass}>
                <option value="">Choose a basis…</option>
                {PRICING_BASIS_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Rate tier</span>
              <select value={rateTier} onChange={(e) => setRateTier(e.target.value)} className={inputClass}>
                {RATE_TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Rate ($)</span>
              <input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Unit label (optional)</span>
              <input
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="e.g. per 1,000 sq ft"
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-critical">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
          {item && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
