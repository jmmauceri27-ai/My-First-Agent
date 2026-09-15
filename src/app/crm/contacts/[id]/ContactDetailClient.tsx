"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/siteMapColor";
import type { Company, Contact, Contract, FieldClass, Opportunity } from "@/lib/crmTypes";
import type { Site } from "@/lib/networkTypes";
import ContactModal from "../ContactModal";

export default function ContactDetailClient({
  contact,
  companies,
  opportunities,
  contracts,
  sites,
  fieldClasses,
}: {
  contact: Contact;
  companies: Company[];
  opportunities: Opportunity[];
  contracts: Contract[];
  sites: Site[];
  fieldClasses: FieldClass[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const responsibleSites = sites.filter((s) => contact.siteIds.includes(s.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/crm/contacts" className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
            ← Back to Contacts
          </Link>
          <div className="mt-2 flex items-center gap-3">
            {contact.companyLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={contact.companyLogoUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-slate-50 object-contain dark:border-slate-800 dark:bg-slate-900"
              />
            )}
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{contact.name}</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {[contact.title, contact.companyName, contact.email, contact.phone].filter(Boolean).join(" · ") ||
              "No details on file"}
          </p>
          {(contact.region || contact.canApproveWork) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {contact.region && (
                <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {contact.region}
                </span>
              )}
              {contact.canApproveWork && (
                <span className="rounded-full bg-good/10 px-2.5 py-1 text-xs font-medium text-good">
                  Can approve work
                  {contact.approvalLimit != null ? ` up to ${formatCurrency(contact.approvalLimit)}` : ""}
                </span>
              )}
            </div>
          )}
        </div>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Opportunities</h2>
            <Link href="/crm" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
              View pipeline →
            </Link>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-purple-400/10">
            {opportunities.length === 0 ? (
              <p className="py-2 text-xs text-slate-500 dark:text-slate-400">
                No opportunities tied to this contact yet.
              </p>
            ) : (
              opportunities.map((o) => (
                <Link
                  key={o.id}
                  href={`/crm/opportunities/${o.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{o.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{o.stage}</p>
                  </div>
                  {o.amount != null && (
                    <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {formatCurrency(o.amount)}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Agreements</h2>
            <Link href="/crm/contracts" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-purple-400/10">
            {contracts.length === 0 ? (
              <p className="py-2 text-xs text-slate-500 dark:text-slate-400">
                No agreements tied to this contact yet.
              </p>
            ) : (
              contracts.map((c) => (
                <Link
                  key={c.id}
                  href={`/crm/contracts?open=${c.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{c.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {c.trades.length > 0 ? c.trades.join(", ") : "No trade set"}
                    </p>
                  </div>
                  {c.rateAmount != null && (
                    <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {formatCurrency(c.rateAmount)}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Sites responsible for</h2>
            <Link href="/network/sites" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-purple-400/10">
            {responsibleSites.length === 0 ? (
              <p className="py-2 text-xs text-slate-500 dark:text-slate-400">No sites assigned to this contact yet.</p>
            ) : (
              responsibleSites.map((s) => (
                <Link
                  key={s.id}
                  href={`/network/sites/${s.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{s.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {[s.city, s.state].filter(Boolean).join(", ") || "No location set"}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {editing && (
        <ContactModal
          contact={contact}
          companies={companies}
          sites={sites}
          fieldClasses={fieldClasses}
          onClose={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
