"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CompanyModal from "@/app/crm/companies/CompanyModal";
import type { Company } from "@/lib/crmTypes";

export default function ClientsClient({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>+ New client</Button>
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-slate-400">No clients yet.</p>
      ) : (
        <Card className="flex flex-col divide-y divide-purple-400/10 overflow-hidden">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/network/clients/${c.id}`)}
              className="flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-purple-500/5"
            >
              <div>
                <p className="text-sm font-semibold text-slate-50">{c.name}</p>
                <p className="text-xs text-slate-400">
                  {[c.city, c.state].filter(Boolean).join(", ") || c.website || c.address || "No details"}
                </p>
              </div>
              {c.website && <span className="text-xs text-brand-400">{c.website}</span>}
            </button>
          ))}
        </Card>
      )}

      {creating && (
        <CompanyModal
          company={null}
          onClose={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
