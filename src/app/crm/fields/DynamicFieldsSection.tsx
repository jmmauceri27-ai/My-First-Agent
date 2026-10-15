"use client";

import { inputClass } from "@/components/ui/formClasses";
import type { CrmField, FieldClass } from "@/lib/crmTypes";

/** Renders every class/field defined for this record's type as extra form fields, grouped under their class
 * heading -- every field on a record-type-scoped class always shows, blank until a value is entered, same as
 * any other property (HubSpot-style: a property exists on every record of its object type once created). */
export default function DynamicFieldsSection({
  classes,
  recordType,
  values,
  onChange,
}: {
  classes: FieldClass[];
  /** This record's type (e.g. "Site", "Contact") -- a class belonging to a different record type is left out
   * entirely, so a Site-only class like "Snow" never shows up on a Contact. */
  recordType: string;
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
}) {
  function renderFieldInput(f: CrmField) {
    const value = values[f.id] ?? "";
    return (
      <label key={f.id} className="flex flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{f.label}</span>
        {f.fieldType === "Checkbox" ? (
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => onChange(f.id, e.target.checked ? "true" : "false")}
            className="h-4 w-4 self-start"
          />
        ) : f.fieldType === "Dropdown" ? (
          <select value={value} onChange={(e) => onChange(f.id, e.target.value)} className={inputClass}>
            <option value="">(none)</option>
            {(f.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : f.fieldType === "Date" ? (
          <input type="date" value={value} onChange={(e) => onChange(f.id, e.target.value)} className={inputClass} />
        ) : f.fieldType === "Number" ? (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(f.id, e.target.value)}
            className={inputClass}
          />
        ) : (
          <input type="text" value={value} onChange={(e) => onChange(f.id, e.target.value)} className={inputClass} />
        )}
      </label>
    );
  }

  const scopedClasses = classes.filter((c) => c.recordType === recordType && c.fields.length > 0);

  if (scopedClasses.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {scopedClasses.map((c) => (
        <div key={c.id} className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{c.name}</h3>
          {c.fields.map(renderFieldInput)}
        </div>
      ))}
    </div>
  );
}
