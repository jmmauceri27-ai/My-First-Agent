"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { formatCurrency, formatSquareFeet, parseCurrencyInput, parseMeasurementInput } from "@/lib/siteMapColor";
import type { DatasetRecord } from "@/lib/types";

function initialFieldValue(
  key: string,
  value: DatasetRecord[string],
  currencyFields: string[],
  measurementFields: string[],
): string {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (value !== "" && Number.isFinite(num)) {
    if (currencyFields.includes(key)) return formatCurrency(num);
    if (measurementFields.includes(key)) return formatSquareFeet(num);
  }
  return String(value);
}

export default function EditSitePanel({
  title,
  data,
  readOnlyFields = [],
  currencyFields = [],
  measurementFields = [],
  linkColumn = null,
  onOpenLink,
  onClose,
  onSave,
}: {
  title: string;
  data: DatasetRecord;
  readOnlyFields?: { key: string; value: string }[];
  /** Field keys to display/edit as currency (e.g. Contract Value, Sub Price) -- formatted on load and blur, parsed back to a plain number on save. */
  currencyFields?: string[];
  /** Field keys to display/edit as square footage (e.g. Turf Area, Parking Lot) -- formatted on load and blur, parsed back to a plain number on save. */
  measurementFields?: string[];
  /** Field key whose value can be clicked to open a linked record (e.g. Vendor Name -> vendor details). */
  linkColumn?: string | null;
  onOpenLink?: (value: string) => void;
  onClose: () => void;
  onSave: (data: DatasetRecord) => Promise<void>;
}) {
  const [fields, setFields] = useState<{ key: string; value: string }[]>(
    Object.entries(data).map(([key, value]) => ({
      key,
      value: initialFieldValue(key, value, currencyFields, measurementFields),
    })),
  );
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateValue(index: number, value: string) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, value } : f)));
  }

  function formatOnBlur(index: number, key: string) {
    const isCurrency = currencyFields.includes(key);
    const isMeasurement = measurementFields.includes(key);
    if (!isCurrency && !isMeasurement) return;
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const cleaned = isCurrency ? parseCurrencyInput(f.value) : parseMeasurementInput(f.value);
        const num = Number(cleaned);
        if (f.value === "" || !Number.isFinite(num)) return f;
        return { ...f, value: isCurrency ? formatCurrency(num) : formatSquareFeet(num) };
      }),
    );
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
      for (const f of fields) {
        if (currencyFields.includes(f.key)) result[f.key] = parseCurrencyInput(f.value);
        else if (measurementFields.includes(f.key)) result[f.key] = parseMeasurementInput(f.value);
        else result[f.key] = f.value;
      }
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

        {readOnlyFields.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 rounded-lg bg-purple-500/10 px-3 py-2">
            {readOnlyFields.map((field) => (
              <div key={field.key} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{field.key}</span>
                <span className="font-semibold text-slate-100">{field.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {fields.map((field, i) => (
            <label key={field.key} className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">{field.key}</span>
              <input
                value={field.value}
                onChange={(e) => updateValue(i, e.target.value)}
                onBlur={() => formatOnBlur(i, field.key)}
                className={inputClass}
              />
              {field.key === linkColumn && field.value.trim() && onOpenLink && (
                <button
                  type="button"
                  onClick={() => onOpenLink(field.value.trim())}
                  className="w-fit text-xs font-medium text-brand-400 hover:text-brand-300 hover:underline"
                >
                  View vendor details →
                </button>
              )}
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
