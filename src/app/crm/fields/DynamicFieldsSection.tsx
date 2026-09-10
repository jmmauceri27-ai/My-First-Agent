"use client";

import { inputClass } from "@/components/ui/formClasses";
import type { FieldClass } from "@/lib/crmTypes";

/** Renders every class/field defined for an object type as extra form fields, grouped under their class
 * heading -- the payoff of the Fields admin screen: a Company (for now) edit form grows these sections
 * automatically as classes/fields are added, with no code change per field. */
export default function DynamicFieldsSection({
  classes,
  values,
  onChange,
}: {
  classes: FieldClass[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
}) {
  const classesWithFields = classes.filter((c) => c.fields.length > 0);
  if (classesWithFields.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {classesWithFields.map((c) => (
        <div key={c.id} className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {c.name}
          </h3>
          {c.fields.map((f) => {
            const value = values[f.id] ?? "";
            return (
              <label key={f.id} className="flex flex-col gap-1 text-sm">
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
                  <input
                    type="date"
                    value={value}
                    onChange={(e) => onChange(f.id, e.target.value)}
                    className={inputClass}
                  />
                ) : f.fieldType === "Number" ? (
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(f.id, e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(f.id, e.target.value)}
                    className={inputClass}
                  />
                )}
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}
