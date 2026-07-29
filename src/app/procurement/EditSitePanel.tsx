"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import type { DatasetRecord } from "@/lib/types";

export default function EditSitePanel({
  title,
  data,
  onClose,
  onSave,
}: {
  title: string;
  data: DatasetRecord;
  onClose: () => void;
  onSave: (data: DatasetRecord) => Promise<void>;
}) {
  const [fields, setFields] = useState<{ key: string; value: string }[]>(
    Object.entries(data).map(([key, value]) => ({
      key,
      value: value === null || value === undefined ? "" : String(value),
    })),
  );
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateValue(index: number, value: string) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, value } : f)));
  }

  function addField() {
    const key = newKey.trim();
    if (!key) return;
    if (fields.some((f) => f.key === key)) {
      setError(`"${key}" already exists below.`);
      return;
    }
    setFields((prev) => [...prev, { key, value: newValue }]);
    setNewKey("");
    setNewValue("");
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result: DatasetRecord = {};
      for (const f of fields) result[f.key] = f.value;
      await onSave(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card
        className="max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-50">{title}</h2>

        <div className="mt-4 flex flex-col gap-3">
          {fields.map((field, i) => (
            <label key={field.key} className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">{field.key}</span>
              <input value={field.value} onChange={(e) => updateValue(i, e.target.value)} className={inputClass} />
            </label>
          ))}
          {fields.length === 0 && <p className="text-sm text-slate-400">No fields yet — add one below.</p>}
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-purple-400/30 p-3">
          <p className="text-sm font-medium text-slate-300">Add a field</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Field name (e.g. Contract Value)"
              className={`${inputClass} min-w-[140px] flex-1`}
            />
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value"
              className={`${inputClass} min-w-[100px] flex-1`}
            />
            <Button onClick={addField} variant="secondary" className="w-fit">
              Add
            </Button>
          </div>
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
