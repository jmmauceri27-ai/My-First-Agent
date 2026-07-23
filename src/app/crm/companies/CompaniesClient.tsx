"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { Company } from "@/lib/crmTypes";
import CompanyModal from "./CompanyModal";

export default function CompaniesClient({ companies }: { companies: Company[] }) {
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>+ New company</Button>
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No companies yet.</p>
      ) : (
        <Card className="flex flex-col divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-900">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => setEditingCompany(c)}
              className="flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{c.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
    </div>
  );
}
