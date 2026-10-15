"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { RECORD_TYPES } from "@/lib/crmTypes";
import type { FieldClass } from "@/lib/crmTypes";
import { createFieldClassAction, deleteFieldClassAction, updateFieldClassAction } from "./actions";

export default function FieldClassModal({
  fieldClass,
  onClose,
}: {
  fieldClass: FieldClass | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(fieldClass?.name ?? "");
  const [recordType, setRecordType] = useState(fieldClass?.recordType ?? RECORD_TYPES[0]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter a class name.");
      return;
    }
    setSaving(true);
    try {
      const result = fieldClass
        ? await updateFieldClassAction(fieldClass.id, name.trim())
        : await createFieldClassAction({ name: name.trim(), recordType });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!fieldClass) return;
    setDeleting(true);
    try {
      const result = await deleteFieldClassAction(fieldClass.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          {fieldClass ? "Edit class" : "New class"}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          A class groups related fields together -- e.g. &ldquo;Contact Info&rdquo;. Every field you add to it
          will show up on every record of the record type you pick below.
        </p>

        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
        </label>

        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Record type</span>
          {fieldClass ? (
            <p className={`${inputClass} flex items-center bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400`}>
              {fieldClass.recordType}
            </p>
          ) : (
            <select value={recordType} onChange={(e) => setRecordType(e.target.value)} className={inputClass}>
              {RECORD_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {fieldClass ? "Fixed once created." : "Which kind of record this class's fields show up on. Fixed once created."}
          </span>
        </label>

        {error && <p className="mt-3 text-sm text-critical">{error}</p>}

        {fieldClass && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Deleting this class also deletes every field in it, and every record&rsquo;s saved value for them.
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
          {fieldClass && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
