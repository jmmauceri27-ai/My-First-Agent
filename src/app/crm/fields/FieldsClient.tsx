"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { CrmField, FieldClass } from "@/lib/crmTypes";
import FieldClassModal from "./FieldClassModal";
import FieldModal from "./FieldModal";

export default function FieldsClient({ classes }: { classes: FieldClass[] }) {
  const [editingClass, setEditingClass] = useState<FieldClass | null>(null);
  const [creatingClass, setCreatingClass] = useState(false);
  const [editingField, setEditingField] = useState<CrmField | null>(null);
  const [creatingFieldInClass, setCreatingFieldInClass] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Fields</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Custom fields for your CRM records, organized into classes -- e.g. the field &ldquo;Phone
          Number&rdquo; in the class &ldquo;Contact Info&rdquo;. Every class and field is available anywhere
          -- opportunities, agreements, sites, clients, and contacts alike.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setCreatingClass(true)}>+ New class</Button>
      </div>

      {classes.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No classes yet. Add one to start grouping fields (e.g. &ldquo;Contact Info&rdquo;).
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {classes.map((c) => (
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
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{f.label}</p>
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
          onClose={() => {
            setEditingClass(null);
            setCreatingClass(false);
          }}
        />
      )}

      {(editingField || creatingFieldInClass) && (
        <FieldModal
          field={editingField}
          classId={editingField?.classId ?? creatingFieldInClass ?? ""}
          classes={classes}
          onClose={() => {
            setEditingField(null);
            setCreatingFieldInClass(null);
          }}
        />
      )}
    </div>
  );
}
