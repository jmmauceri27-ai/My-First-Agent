"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { Company } from "@/lib/crmTypes";
import CompanyModal from "./CompanyModal";
import UploadCompaniesModal from "./UploadCompaniesModal";

export default function CompaniesClient({ companies }: { companies: Company[] }) {
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setUploading(true)}>
          Upload companies
        </Button>
        <Button onClick={() => setCreating(true)}>+ New company</Button>
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No companies yet.</p>
      ) : (
        <Card className="flex flex-col divide-y divide-slate-100 overflow-hidden dark:divide-slate-900">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => setEditingCompany(c)}
              className="flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{c.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {[c.city, c.state].filter(Boolean).join(", ") || c.website || c.address || "No details"}
                </p>
              </div>
              {c.website && <span className="text-xs text-brand-600 dark:text-brand-400">{c.website}</span>}
            </button>
          ))}
        </Card>
      )}

      {(editingCompany || creating) && (
        <CompanyModal
          company={editingCompany}
          onClose={() => {
            setEditingCompany(null);
            setCreating(false);
          }}
        />
      )}

      {uploading && <UploadCompaniesModal onClose={() => setUploading(false)} />}
    </div>
  );
}
