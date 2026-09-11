"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { FIELD_OBJECT_TYPES } from "@/lib/crmTypes";
import type { CrmField, FieldClass } from "@/lib/crmTypes";
import FieldClassModal from "./FieldClassModal";
import FieldModal from "./FieldModal";

export default function FieldsClient({ classes }: { classes: FieldClass[] }) {
  const [objectType, setObjectType] = useState<string>(FIELD_OBJECT_TYPES[0]);
  const [editingClass, setEditingClass] = useState<FieldClass | null>(null);
  const [creatingClass, setCreatingClass] = useState(false);
  const [editingField, setEditingField] = useState<CrmField | null>(null);
  const [creatingFieldInClass, setCreatingFieldInClass] = useState<string | null>(null);

  const classesForType = useMemo(() => classes.filter((c) => c.objectType === objectType), [classes, objectType]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Fields</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Custom fields for your CRM records, organized into classes -- e.g. the field &ldquo;Phone
          Number&rdquo; in the class &ldquo;Contact Info&rdquo;.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-purple-400/20 p-1">
          {FIELD_OBJECT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setObjectType(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
                objectType === t
                  ? "bg-brand-600 text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <Button onClick={() => setCreatingClass(true)}>+ New class</Button>
      </div>

      {classesForType.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No classes yet for {objectType}. Add one to start grouping fields (e.g. &ldquo;Contact Info&rdquo;).
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {classesForType.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setEditingClass(c)}
                className="flex w-fit items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
              >
                {c.name}{" "}
                <span className="font-normal normal-case text-slate-400 dark:text-slate-500">
                  ({c.fields.length})
                </span>
              </button>
              <Card className="flex flex-col divide-y divide-purple-400/10 overflow-hidden">
                {c.fields.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setEditingField(f)}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-purple-500/5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{f.label}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            f.isStandard
                              ? "bg-brand-600/10 text-brand-600 dark:text-brand-400"
                              : "bg-purple-500/10 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {f.isStandard ? "Standard" : "Custom"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {f.fieldType}
                        {f.fieldType === "Dropdown" && f.options ? ` -- ${f.options.join(", ")}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCreatingFieldInClass(c.id)}
                  className="px-4 py-2.5 text-left text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-purple-500/5"
                >
                  + New field
                </button>
              </Card>
            </div>
          ))}
        </div>
      )}

      {(editingClass || creatingClass) && (
        <FieldClassModal
          fieldClass={editingClass}
          objectType={objectType}
          onClose={() => {
            setEditingClass(null);
            setCreatingClass(false);
          }}
        />
      )}

      {(editingField || creatingFieldInClass) && (
        <FieldModal
          field={editingField}
          objectType={objectType}
          classId={editingField?.classId ?? creatingFieldInClass ?? ""}
          classes={classesForType}
          onClose={() => {
            setEditingField(null);
            setCreatingFieldInClass(null);
          }}
        />
      )}
    </div>
  );
}
