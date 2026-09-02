"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { OVERRIDE_TYPE_OPTIONS } from "@/lib/crmTypes";
import type { ClientRateOverride, ClientRateOverrideInput, Company } from "@/lib/crmTypes";
import { TRADE_OPTIONS } from "@/lib/trades";
import { deleteClientRateOverrideAction, saveClientRateOverrideAction } from "../actions";

export default function ClientRateOverrideModal({
  override,
  companies,
  onClose,
}: {
  override: ClientRateOverride | null;
  companies: Company[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(override?.companyId ?? "");
  const [trade, setTrade] = useState(override?.trade ?? "");
  const [overrideType, setOverrideType] = useState(override?.overrideType ?? "");
  const [overrideValue, setOverrideValue] = useState(
    override?.overrideValue != null ? String(override.overrideValue) : "",
  );
  const [notes, setNotes] = useState(override?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!companyId) {
      setError("Please choose a client.");
      return;
    }
    if (!trade) {
      setError("Please choose a trade.");
      return;
    }
    if (!overrideType) {
      setError("Please choose an override type.");
      return;
    }
    const value = Number(overrideValue);
    if (!overrideValue.trim() || !Number.isFinite(value)) {
      setError("Please enter an override value.");
      return;
    }
    setSaving(true);
    try {
      const input: ClientRateOverrideInput = {
        companyId,
        trade,
        overrideType,
        overrideValue: value,
        notes: notes.trim() || null,
      };
      await saveClientRateOverrideAction(override?.id ?? null, input);
      router.refresh();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to save override -- this client may already have an override for this trade.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!override) return;
    setDeleting(true);
    try {
      await deleteClientRateOverrideAction(override.id);
      router.refresh();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-50">{override ? "Edit client override" : "New client override"}</h2>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Client</span>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass} autoFocus>
              <option value="">Choose a client…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

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

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Override type</span>
              <select value={overrideType} onChange={(e) => setOverrideType(e.target.value)} className={inputClass}>
                <option value="">Choose a type…</option>
                {OVERRIDE_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Percent (%)</span>
              <input
                type="number"
                step="0.01"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
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
          {override && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
