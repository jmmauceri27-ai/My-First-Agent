"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { PRICING_BASIS_OPTIONS } from "@/lib/crmTypes";
import type { RateRule, RateRuleInput } from "@/lib/crmTypes";
import { TRADE_OPTIONS } from "@/lib/trades";
import { deleteRateRuleAction, saveRateRuleAction } from "../actions";

export default function RateRuleModal({ rule, onClose }: { rule: RateRule | null; onClose: () => void }) {
  const router = useRouter();
  const [trade, setTrade] = useState(rule?.trade ?? "");
  const [pricingBasis, setPricingBasis] = useState(rule?.pricingBasis ?? "");
  const [baseRate, setBaseRate] = useState(rule?.baseRate != null ? String(rule.baseRate) : "");
  const [unitLabel, setUnitLabel] = useState(rule?.unitLabel ?? "");
  const [notes, setNotes] = useState(rule?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!trade) {
      setError("Please choose a trade.");
      return;
    }
    if (!pricingBasis) {
      setError("Please choose a pricing basis.");
      return;
    }
    const rate = Number(baseRate);
    if (!baseRate.trim() || !Number.isFinite(rate)) {
      setError("Please enter a base rate.");
      return;
    }
    setSaving(true);
    try {
      const input: RateRuleInput = {
        trade,
        pricingBasis,
        baseRate: rate,
        unitLabel: unitLabel.trim() || null,
        notes: notes.trim() || null,
      };
      await saveRateRuleAction(rule?.id ?? null, input);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rate rule.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!rule) return;
    setDeleting(true);
    try {
      await deleteRateRuleAction(rule.id);
      router.refresh();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-50">{rule ? "Edit rate rule" : "New rate rule"}</h2>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Trade</span>
            <select value={trade} onChange={(e) => setTrade(e.target.value)} className={inputClass} autoFocus>
              <option value="">Choose a trade…</option>
              {TRADE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Pricing basis</span>
            <select value={pricingBasis} onChange={(e) => setPricingBasis(e.target.value)} className={inputClass}>
              <option value="">Choose a pricing basis…</option>
              {PRICING_BASIS_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Base rate ($)</span>
              <input
                type="number"
                step="0.01"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Unit label (optional)</span>
              <input
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="e.g. per 1,000 sq ft/month"
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
          {rule && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
