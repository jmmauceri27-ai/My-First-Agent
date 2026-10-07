"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { RATE_FREQUENCIES } from "@/lib/crmTypes";
import { BILLING_TYPE_OPTIONS } from "@/lib/billingTypes";
import TradeSelect from "@/components/TradeSelect";
import type { Company, Contact, Contract, ContractInput, FieldClass, Opportunity } from "@/lib/crmTypes";
import { saveContractAction } from "../actions";
import { saveFieldValuesForRecordAction } from "../fields/actions";
import DynamicFieldsSection from "../fields/DynamicFieldsSection";

/** Creates a new agreement. Editing an existing one now happens on its own page
 * (/crm/contracts/[id]) instead of here -- this modal is only ever opened with contract={null}. */
export default function ContractModal({
  contract,
  companies,
  opportunities,
  contacts,
  fieldClasses,
  prefill,
  onSaved,
  onClose,
}: {
  contract: Contract | null;
  companies: Company[];
  opportunities: Opportunity[];
  contacts: Contact[];
  fieldClasses: FieldClass[];
  /** Prefills a blank creation form (e.g. from an opportunity's "Convert to Agreement" button). */
  prefill?: Partial<ContractInput> | null;
  /** Called with the new agreement's id right after a successful create, so the caller can navigate to its
   * own page. */
  onSaved?: (id: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(contract?.name ?? prefill?.name ?? "");
  const [companyId, setCompanyId] = useState(contract?.companyId ?? prefill?.companyId ?? "");
  const [opportunityId, setOpportunityId] = useState(contract?.opportunityId ?? prefill?.opportunityId ?? "");
  const [trades, setTrades] = useState<string[]>(contract?.trades ?? prefill?.trades ?? []);
  const [rateAmount, setRateAmount] = useState(
    (contract?.rateAmount ?? prefill?.rateAmount) != null ? String(contract?.rateAmount ?? prefill?.rateAmount) : "",
  );
  const [rateFrequency, setRateFrequency] = useState(contract?.rateFrequency ?? "");
  const [billingType, setBillingType] = useState(contract?.billingType ?? "");
  const [startDate, setStartDate] = useState(contract?.startDate ?? "");
  const [endDate, setEndDate] = useState(contract?.endDate ?? "");
  const [notes, setNotes] = useState(contract?.notes ?? "");
  const [contactIds, setContactIds] = useState<string[]>(contract?.contactIds ?? prefill?.contactIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  function toggleContact(id: string) {
    setContactIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter an agreement name.");
      return;
    }
    setSaving(true);
    try {
      const input: ContractInput = {
        companyId: companyId || null,
        opportunityId: opportunityId || null,
        name: name.trim(),
        trades,
        rateAmount: rateAmount.trim() ? Number(rateAmount) : null,
        rateFrequency: rateFrequency || null,
        billingType: billingType || null,
        startDate: startDate || null,
        endDate: endDate || null,
        notes: notes.trim() || null,
        contactIds,
      };
      const contractId = await saveContractAction(null, input);
      await saveFieldValuesForRecordAction(
        contractId,
        Object.entries(fieldValues).map(([fieldId, value]) => ({ fieldId, value: value || null })),
      );
      router.refresh();
      onSaved?.(contractId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save agreement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">New agreement</h2>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Agreement name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ABC Corp — Snow Removal 2026"
              className={inputClass}
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Client</span>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
              <option value="">(none)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Source opportunity (optional)</span>
            <select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} className={inputClass}>
              <option value="">(none)</option>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.trackingNumber} — {o.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-600 dark:text-slate-500">
              Picking one links this agreement to that opportunity&rsquo;s tracking number, permanently.
            </span>
          </label>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Trades</span>
            <TradeSelect value={trades} onChange={setTrades} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300"># of sites</span>
              <span className="rounded-md border border-transparent px-3 py-2 text-slate-600 dark:text-slate-400">
                0 (from linked sites)
              </span>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Rate ($)</span>
              <input
                type="number"
                value={rateAmount}
                onChange={(e) => setRateAmount(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Rate frequency</span>
            <select value={rateFrequency} onChange={(e) => setRateFrequency(e.target.value)} className={inputClass}>
              <option value="">(none)</option>
              {RATE_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Billing type</span>
            <select value={billingType} onChange={(e) => setBillingType(e.target.value)} className={inputClass}>
              <option value="">(none)</option>
              {BILLING_TYPE_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-600 dark:text-slate-500">Applies to every site/trade linked to this agreement.</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">End date</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
          </label>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Contacts involved</span>
            <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-300 p-2 dark:border-slate-700">
              {contacts.length === 0 ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">No contacts yet — add some on the Contacts page.</span>
              ) : (
                contacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={contactIds.includes(c.id)}
                      onChange={() => toggleContact(c.id)}
                      className="accent-brand-600"
                    />
                    {c.name}
                    {c.companyName && <span className="text-xs text-slate-500 dark:text-slate-400">({c.companyName})</span>}
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <DynamicFieldsSection
            classes={fieldClasses}
            values={fieldValues}
            assignedFieldIds={[]}
            onChange={(fieldId, value) => setFieldValues((prev) => ({ ...prev, [fieldId]: value }))}
            onAssign={() => {}}
            onUnassign={() => {}}
            canManageCustomFields={false}
          />
        </div>

        {error && <p className="mt-3 text-sm text-critical">{error}</p>}

        <div className="mt-6 flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
