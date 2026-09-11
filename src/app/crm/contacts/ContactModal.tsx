"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import type { Company, Contact, FieldClass } from "@/lib/crmTypes";
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
  fieldClasses,
  onClose,
}: {
  contact: Contact | null;
  companies: Company[];
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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
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
            <span className="font-medium text-slate-700 dark:text-slate-300">Company</span>
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
