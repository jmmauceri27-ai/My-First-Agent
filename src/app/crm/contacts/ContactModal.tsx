"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import type { Company, Contact, FieldClass } from "@/lib/crmTypes";
import type { Site } from "@/lib/networkTypes";
import { deleteContactAction, saveContactAction } from "../actions";
import {
  assignFieldToRecordAction,
  getFieldValuesForRecordAction,
  listAssignedFieldIdsAction,
  saveFieldValuesForRecordAction,
  unassignFieldFromRecordAction,
} from "../fields/actions";
import DynamicFieldsSection from "../fields/DynamicFieldsSection";

export default function ContactModal({
  contact,
  companies,
  sites,
  fieldClasses,
  onClose,
}: {
  contact: Contact | null;
  companies: Company[];
  sites: Site[];
  fieldClasses: FieldClass[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(contact?.name ?? "");
  const [companyId, setCompanyId] = useState(contact?.companyId ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [title, setTitle] = useState(contact?.title ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [canApproveWork, setCanApproveWork] = useState(contact?.canApproveWork ?? false);
  const [approvalLimit, setApprovalLimit] = useState(
    contact?.approvalLimit != null ? String(contact.approvalLimit) : "",
  );
  const [region, setRegion] = useState(contact?.region ?? "");
  const [siteIds, setSiteIds] = useState<string[]>(contact?.siteIds ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [assignedFieldIds, setAssignedFieldIds] = useState<string[]>([]);

  useEffect(() => {
    if (!contact) return;
    getFieldValuesForRecordAction(contact.id).then((values) => {
      const asStrings: Record<string, string> = {};
      for (const [fieldId, value] of Object.entries(values)) {
        if (value != null) asStrings[fieldId] = value;
      }
      setFieldValues(asStrings);
    });
    listAssignedFieldIdsAction(contact.id).then(setAssignedFieldIds);
  }, [contact]);

  async function handleAssignField(fieldId: string) {
    if (!contact) return;
    setAssignedFieldIds((prev) => [...prev, fieldId]);
    await assignFieldToRecordAction(contact.id, fieldId);
  }

  async function handleUnassignField(fieldId: string) {
    if (!contact) return;
    setAssignedFieldIds((prev) => prev.filter((id) => id !== fieldId));
    setFieldValues((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    await unassignFieldFromRecordAction(contact.id, fieldId);
  }

  function toggleSite(id: string) {
    setSiteIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter a contact name.");
      return;
    }
    setSaving(true);
    try {
      const contactId = await saveContactAction(contact?.id ?? null, {
        name: name.trim(),
        companyId: companyId || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        title: title.trim() || null,
        notes: notes.trim() || null,
        canApproveWork,
        approvalLimit: approvalLimit.trim() ? Number(approvalLimit) : null,
        region: region.trim() || null,
        siteIds,
      });
      await saveFieldValuesForRecordAction(
        contactId,
        Object.entries(fieldValues).map(([fieldId, value]) => ({ fieldId, value: value || null })),
      );
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save contact.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!contact) return;
    setDeleting(true);
    try {
      await deleteContactAction(contact.id);
      router.refresh();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          {contact ? "Edit contact" : "New contact"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
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
            <span className="font-medium text-slate-700 dark:text-slate-300">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Region / territory</span>
            <input value={region} onChange={(e) => setRegion(e.target.value)} className={inputClass} placeholder="e.g. Northeast" />
          </label>

          <div className="flex flex-col gap-2 rounded-lg border border-slate-300 p-3 dark:border-slate-700">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={canApproveWork}
                onChange={(e) => setCanApproveWork(e.target.checked)}
                className="accent-brand-600"
              />
              Can approve work
            </label>
            {canApproveWork && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Approval limit ($)</span>
                <input
                  type="number"
                  value={approvalLimit}
                  onChange={(e) => setApprovalLimit(e.target.value)}
                  className={inputClass}
                  placeholder="Leave blank for no set limit"
                />
              </label>
            )}
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Sites responsible for</span>
            <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-300 p-2 dark:border-slate-700">
              {sites.length === 0 ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">No sites yet — add some on the Sites page.</span>
              ) : (
                sites.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={siteIds.includes(s.id)}
                      onChange={() => toggleSite(s.id)}
                      className="accent-brand-600"
                    />
                    {s.name}
                    {s.companyName && <span className="text-xs text-slate-500 dark:text-slate-400">({s.companyName})</span>}
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
            assignedFieldIds={assignedFieldIds}
            onChange={(fieldId, value) => setFieldValues((prev) => ({ ...prev, [fieldId]: value }))}
            onAssign={handleAssignField}
            onUnassign={handleUnassignField}
            canManageCustomFields={!!contact}
          />
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
          {contact && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
