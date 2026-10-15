"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import type { Company, Contact, FieldClass } from "@/lib/crmTypes";
import type { Site } from "@/lib/networkTypes";
import { deleteContactAction, saveContactAction } from "../actions";
import { getFieldValuesForRecordAction, saveFieldValuesForRecordAction } from "../fields/actions";
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
  const [siteIds, setSiteIds] = useState<string[]>(contact?.siteIds ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!contact) return;
    getFieldValuesForRecordAction(contact.id).then((values) => {
      const asStrings: Record<string, string> = {};
      for (const [fieldId, value] of Object.entries(values)) {
        if (value != null) asStrings[fieldId] = value;
      }
      setFieldValues(asStrings);
    });
  }, [contact]);

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
            recordType="Contact"
            values={fieldValues}
            onChange={(fieldId, value) => setFieldValues((prev) => ({ ...prev, [fieldId]: value }))}
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
