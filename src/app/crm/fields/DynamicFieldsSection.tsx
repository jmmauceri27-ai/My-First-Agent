"use client";

import { inputClass } from "@/components/ui/formClasses";
import type { CrmField, FieldClass } from "@/lib/crmTypes";

/** Renders every class/field defined for an object type as extra form fields, grouped under their class
 * heading. Standard fields always render, matching how Company's fields have always behaved. Custom fields
 * only render once attached to this record (assignedFieldIds) -- each class that still has unattached
 * custom fields gets a "+ Add field" picker to attach one, and an attached custom field gets a "Remove"
 * control to detach it from just this record. */
export default function DynamicFieldsSection({
  classes,
  values,
  assignedFieldIds,
  onChange,
  onAssign,
  onUnassign,
  canManageCustomFields = true,
}: {
  classes: FieldClass[];
  values: Record<string, string>;
  assignedFieldIds: string[];
  onChange: (fieldId: string, value: string) => void;
  onAssign: (fieldId: string) => void;
  onUnassign: (fieldId: string) => void;
  /** Custom fields need an existing record id to attach to -- pass false while creating a new record (before
   * it's been saved) to show only standard fields until then. */
  canManageCustomFields?: boolean;
}) {
  const classesWithFields = classes.filter((c) => c.fields.length > 0);
  if (classesWithFields.length === 0) return null;

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

  return (
    <div className="flex flex-col gap-4">
      {classesWithFields.map((c) => {
        const standardFields = c.fields.filter((f) => f.isStandard);
        const customFields = canManageCustomFields ? c.fields.filter((f) => !f.isStandard) : [];
        const attachedCustomFields = customFields.filter((f) => assignedFieldIds.includes(f.id));
        const availableCustomFields = customFields.filter((f) => !assignedFieldIds.includes(f.id));

        if (standardFields.length === 0 && attachedCustomFields.length === 0 && availableCustomFields.length === 0) {
          return null;
        }

        return (
          <div key={c.id} className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {c.name}
            </h3>
            {standardFields.map(renderFieldInput)}
            {attachedCustomFields.map((f) => (
              <div key={f.id} className="flex items-end gap-2">
                {renderFieldInput(f)}
                <button
                  type="button"
                  onClick={() => onUnassign(f.id)}
                  className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-critical hover:bg-critical/10"
                  title="Remove this field from this record"
                >
                  Remove
                </button>
              </div>
            ))}
            {availableCustomFields.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) onAssign(e.target.value);
                }}
                className={inputClass}
              >
                <option value="" disabled>
                  + Add a field from this class…
                </option>
                {availableCustomFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}
