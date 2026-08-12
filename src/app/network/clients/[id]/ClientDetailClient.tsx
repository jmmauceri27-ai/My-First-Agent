"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CompanyModal from "@/app/crm/companies/CompanyModal";
import { formatCurrency } from "@/lib/siteMapColor";
import type { Company, Contact, Contract, Opportunity } from "@/lib/crmTypes";
import type { Site } from "@/lib/networkTypes";

export default function ClientDetailClient({
  company,
  contacts,
  opportunities,
  contracts,
  sites,
}: {
  company: Company;
  contacts: Contact[];
  opportunities: Opportunity[];
  contracts: Contract[];
  sites: Site[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/network/clients" className="text-sm font-medium text-brand-400 hover:underline">
            ← Back to Clients
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-50">{company.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {[company.address, company.city, company.state].filter(Boolean).join(", ") || "No address on file"}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-50">Contacts</h2>
            <Link href="/crm/contacts" className="text-xs font-medium text-brand-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-purple-400/10">
            {contacts.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">No contacts yet.</p>
            ) : (
              contacts.map((c) => (
                <div key={c.id} className="py-2">
                  <p className="text-sm font-medium text-slate-50">{c.name}</p>
                  <p className="text-xs text-slate-400">{[c.title, c.email, c.phone].filter(Boolean).join(" · ")}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-50">Opportunities</h2>
            <Link href="/crm" className="text-xs font-medium text-brand-400 hover:underline">
              View pipeline →
            </Link>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-purple-400/10">
            {opportunities.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">No opportunities yet.</p>
            ) : (
              opportunities.map((o) => (
                <Link
                  key={o.id}
                  href={`/crm/opportunities/${o.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:text-brand-400"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-50">{o.name}</p>
                    <p className="text-xs text-slate-400">{o.stage}</p>
                  </div>
                  {o.amount != null && (
                    <span className="shrink-0 text-xs tabular-nums text-slate-400">{formatCurrency(o.amount)}</span>
                  )}
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-50">Contracts</h2>
            <Link href="/crm/contracts" className="text-xs font-medium text-brand-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-purple-400/10">
            {contracts.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">No contracts yet.</p>
            ) : (
              contracts.map((c) => (
                <div key={c.id} className="py-2">
                  <p className="text-sm font-medium text-slate-50">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.workType ?? "No work type set"}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-50">Sites</h2>
            <Link href="/network/sites" className="text-xs font-medium text-brand-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-purple-400/10">
            {sites.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">No sites yet.</p>
            ) : (
              sites.map((s) => (
                <Link
                  key={s.id}
                  href={`/network/sites/${s.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:text-brand-400"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-50">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.vendorName ?? "No vendor assigned"}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {editing && (
        <CompanyModal
          company={company}
          onClose={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
