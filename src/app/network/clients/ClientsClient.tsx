"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CompanyModal from "@/app/crm/companies/CompanyModal";
import UploadCompaniesModal from "@/app/crm/companies/UploadCompaniesModal";
import { getFieldValuesForRecordsAction } from "@/app/crm/fields/actions";
import type { Company, FieldClass } from "@/lib/crmTypes";

export default function ClientsClient({
  companies,
  fieldClasses,
}: {
  companies: Company[];
  fieldClasses: FieldClass[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const websiteFieldId = useMemo(
    () => fieldClasses.find((c) => c.recordType === "Company")?.fields.find((f) => f.name === "website")?.id,
    [fieldClasses],
  );
  const [websiteByCompany, setWebsiteByCompany] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!websiteFieldId || companies.length === 0) return;
    getFieldValuesForRecordsAction(companies.map((c) => c.id)).then((values) => {
      const byCompany: Record<string, string> = {};
      for (const [companyId, fields] of Object.entries(values)) {
        const website = fields[websiteFieldId];
        if (website) byCompany[companyId] = website;
      }
      setWebsiteByCompany(byCompany);
    });
  }, [companies, websiteFieldId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setUploading(true)}>
          Upload clients
        </Button>
        <Button onClick={() => setCreating(true)}>+ New client</Button>
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No clients yet.</p>
      ) : (
        <Card className="flex flex-col divide-y divide-surface-border overflow-hidden">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/network/clients/${c.id}`)}
              className="flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-900/5 dark:hover:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-slate-50 dark:bg-slate-900">
                  {c.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logoUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{c.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{c.name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {[c.city, c.state].filter(Boolean).join(", ") || websiteByCompany[c.id] || c.address || "No details"}
                  </p>
                </div>
              </div>
              {websiteByCompany[c.id] && (
                <span className="shrink-0 text-xs text-brand-600 dark:text-brand-400">{websiteByCompany[c.id]}</span>
              )}
            </button>
          ))}
        </Card>
      )}

      {creating && (
        <CompanyModal
          company={null}
          fieldClasses={fieldClasses}
          onClose={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      {uploading && <UploadCompaniesModal fieldClasses={fieldClasses} onClose={() => setUploading(false)} />}
    </div>
  );
}
