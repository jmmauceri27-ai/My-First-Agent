"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { FIELD_TYPES } from "@/lib/crmTypes";
import type { CrmField, CrmFieldInput, FieldClass } from "@/lib/crmTypes";
import { createFieldAction, deleteFieldAction, updateFieldAction } from "./actions";

export default function FieldModal({
  field,
  objectType,
  classId,
  classes,
  onClose,
}: {
  field: CrmField | null;
  objectType: string;
  classId: string;
  classes: FieldClass[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(field?.label ?? "");
  const [fieldType, setFieldType] = useState(field?.fieldType ?? "Text");
  const [selectedClassId, setSelectedClassId] = useState(field?.classId ?? classId);
  const [optionsText, setOptionsText] = useState((field?.options ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!label.trim()) {
      setError("Please enter a field label.");
      return;
    }
    if (!selectedClassId) {
      setError("Please choose a class.");
      return;
    }
    const options =
      fieldType === "Dropdown"
        ? optionsText
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
        : null;
    if (fieldType === "Dropdown" && (!options || options.length === 0)) {
      setError("Please list at least one option, one per line.");
      return;
    }

    setSaving(true);
    try {
      const input: CrmFieldInput = {
        objectType,
        classId: selectedClassId,
        label: label.trim(),
        fieldType,
        options,
        isStandard: false,
      };
      const result = field ? await updateFieldAction(field.id, input) : await createFieldAction(input);
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
    if (!field) return;
    setDeleting(true);
    try {
      const result = await deleteFieldAction(field.id);
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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          {field ? "Edit field" : "New field"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={inputClass}
              autoFocus
              placeholder="e.g. Phone Number"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Field type</span>
              <select value={fieldType} onChange={(e) => setFieldType(e.target.value)} className={inputClass}>
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Class</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className={inputClass}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {fieldType === "Dropdown" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Options (one per line)</span>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                className={inputClass}
              />
            </label>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-500">
            Hidden by default -- attach it to individual records from their edit screen.
          </p>
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
          {field && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
