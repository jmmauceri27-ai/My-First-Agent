"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { OPPORTUNITY_STAGES } from "@/lib/crmTypes";
import type { Company, Contact, Employee, Opportunity, OpportunityInput, OpportunityStage } from "@/lib/crmTypes";
import {
  deleteEmployeeAction,
  deleteOpportunityAction,
  saveCompanyAction,
  saveEmployeeAction,
  saveOpportunityAction,
} from "./actions";

export default function OpportunityModal({
  opportunity,
  companies,
  contacts,
  employees,
  defaultStage,
  onClose,
}: {
  opportunity: Opportunity | null;
  companies: Company[];
  contacts: Contact[];
  employees: Employee[];
  defaultStage: OpportunityStage;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(opportunity?.name ?? "");
  const [companyId, setCompanyId] = useState(opportunity?.companyId ?? "");
  const [stage, setStage] = useState<OpportunityStage>(opportunity?.stage ?? defaultStage);
  const [amount, setAmount] = useState(opportunity?.amount != null ? String(opportunity.amount) : "");
  const [siteCount, setSiteCount] = useState(
    opportunity?.siteCount != null ? String(opportunity.siteCount) : "",
  );
  const [workType, setWorkType] = useState(opportunity?.workType ?? "");
  const [expectedCloseDate, setExpectedCloseDate] = useState(opportunity?.expectedCloseDate ?? "");
  const [notes, setNotes] = useState(opportunity?.notes ?? "");
  const [contactIds, setContactIds] = useState<string[]>(opportunity?.contactIds ?? []);
  const [salesManagerId, setSalesManagerId] = useState(opportunity?.salesManagerId ?? "");

  const [newCompanyName, setNewCompanyName] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);
  const [localCompanies, setLocalCompanies] = useState(companies);

  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [localEmployees, setLocalEmployees] = useState(employees);
  const [removingEmployee, setRemovingEmployee] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleContact(id: string) {
    setContactIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleAddCompany() {
    if (!newCompanyName.trim()) return;
    const id = await saveCompanyAction(null, {
      name: newCompanyName.trim(),
      address: null,
      city: null,
      state: null,
      website: null,
      notes: null,
    });
    setLocalCompanies((prev) => [...prev, { id, name: newCompanyName.trim(), address: null, city: null, state: null, website: null, notes: null, createdAt: new Date().toISOString() }]);
    setCompanyId(id);
    setNewCompanyName("");
    setAddingCompany(false);
  }

  async function handleAddEmployee() {
    if (!newEmployeeName.trim()) return;
    const id = await saveEmployeeAction(newEmployeeName.trim());
    setLocalEmployees((prev) => [
      ...prev,
      { id, name: newEmployeeName.trim(), email: null, phone: null, title: null, createdAt: new Date().toISOString() },
    ]);
    setSalesManagerId(id);
    setNewEmployeeName("");
    setAddingEmployee(false);
  }

  async function handleRemoveEmployee() {
    if (!salesManagerId) return;
    setRemovingEmployee(true);
    try {
      await deleteEmployeeAction(salesManagerId);
      setLocalEmployees((prev) => prev.filter((e) => e.id !== salesManagerId));
      setSalesManagerId("");
    } finally {
      setRemovingEmployee(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter an opportunity name.");
      return;
    }
    setSaving(true);
    try {
      const input: OpportunityInput = {
        name: name.trim(),
        companyId: companyId || null,
        stage,
        amount: amount.trim() ? Number(amount) : null,
        siteCount: siteCount.trim() ? Number(siteCount) : null,
        workType: workType.trim() || null,
        expectedCloseDate: expectedCloseDate || null,
        notes: notes.trim() || null,
        contactIds,
        salesManagerId: salesManagerId || null,
      };
      await saveOpportunityAction(opportunity?.id ?? null, input);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save opportunity.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!opportunity) return;
    setDeleting(true);
    try {
      await deleteOpportunityAction(opportunity.id);
      router.refresh();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          {opportunity ? "Edit opportunity" : "New opportunity"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Opportunity name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
          </label>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Company</span>
            {addingCompany ? (
              <div className="flex gap-2">
                <input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="New company name"
                  className={inputClass}
                />
                <Button type="button" variant="secondary" onClick={handleAddCompany}>
                  Add
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
                  <option value="">(none)</option>
                  {localCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={() => setAddingCompany(true)}>
                  + New
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Sales manager</span>
            {addingEmployee ? (
              <div className="flex gap-2">
                <input
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  placeholder="New employee name"
                  className={inputClass}
                />
                <Button type="button" variant="secondary" onClick={handleAddEmployee}>
                  Add
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={salesManagerId}
                  onChange={(e) => setSalesManagerId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">(none)</option>
                  {localEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={() => setAddingEmployee(true)}>
                  + New
                </Button>
                {salesManagerId && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleRemoveEmployee}
                    disabled={removingEmployee}
                    title="Remove this employee from the list"
                  >
                    {removingEmployee ? "…" : "Remove"}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Stage</span>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as OpportunityStage)}
                className={inputClass}
              >
                {OPPORTUNITY_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Amount ($)</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300"># of sites</span>
              <input
                type="number"
                value={siteCount}
                onChange={(e) => setSiteCount(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Expected close date</span>
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Type of work</span>
            <input
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              placeholder="e.g. HVAC installation, roofing, electrical"
              className={inputClass}
            />
          </label>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Contacts involved</span>
            <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-300 p-2 dark:border-slate-700">
              {contacts.length === 0 ? (
                <span className="text-xs text-slate-400">No contacts yet — add some on the Contacts page.</span>
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
                    {c.companyName && <span className="text-xs text-slate-400">({c.companyName})</span>}
                  </label>
                ))
              )}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={inputClass}
            />
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
          {opportunity && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
