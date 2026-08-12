"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { parseCurrencyInput, formatCurrency } from "@/lib/siteMapColor";
import type { Company, Opportunity } from "@/lib/crmTypes";
import type { Site, SiteInput, Vendor } from "@/lib/networkTypes";
import { deleteSiteAction, saveSiteAction } from "./actions";

export default function SiteModal({
  site,
  companies,
  vendors,
  opportunities,
  defaultCompanyId = null,
  defaultOpportunityId = null,
  defaultVendorId = null,
  onClose,
  onSaved,
}: {
  site: Site | null;
  companies: Company[];
  vendors: Vendor[];
  opportunities: Opportunity[];
  defaultCompanyId?: string | null;
  defaultOpportunityId?: string | null;
  defaultVendorId?: string | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(site?.name ?? "");
  const [companyId, setCompanyId] = useState(site?.companyId ?? defaultCompanyId ?? "");
  const [opportunityId, setOpportunityId] = useState(site?.opportunityId ?? defaultOpportunityId ?? "");
  const [vendorId, setVendorId] = useState(site?.vendorId ?? defaultVendorId ?? "");
  const [address, setAddress] = useState(site?.address ?? "");
  const [lat, setLat] = useState(site?.lat != null ? String(site.lat) : "");
  const [lng, setLng] = useState(site?.lng != null ? String(site.lng) : "");
  const [contractValue, setContractValue] = useState(site?.contractValue != null ? formatCurrency(site.contractValue) : "");
  const [subPrice, setSubPrice] = useState(site?.subPrice != null ? formatCurrency(site.subPrice) : "");
  const [notes, setNotes] = useState(site?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opportunitiesForCompany = useMemo(
    () => (companyId ? opportunities.filter((o) => o.companyId === companyId) : opportunities),
    [opportunities, companyId],
  );

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter a site name.");
      return;
    }
    setSaving(true);
    try {
      const input: SiteInput = {
        companyId: companyId || null,
        opportunityId: opportunityId || null,
        vendorId: vendorId || null,
        name: name.trim(),
        address: address.trim() || null,
        lat: lat.trim() ? Number(lat) : null,
        lng: lng.trim() ? Number(lng) : null,
        contractValue: contractValue.trim() ? Number(parseCurrencyInput(contractValue)) : null,
        subPrice: subPrice.trim() ? Number(parseCurrencyInput(subPrice)) : null,
        measurements: site?.measurements ?? {},
        notes: notes.trim() || null,
      };
      const result = await saveSiteAction(site?.id ?? null, input);
      if (result.error || !result.id) {
        setError(result.error ?? "Failed to save site.");
        return;
      }
      router.refresh();
      onSaved?.(result.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!site) return;
    setDeleting(true);
    try {
      const result = await deleteSiteAction(site.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-50">{site ? "Edit site" : "New site"}</h2>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Site name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Client</span>
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setOpportunityId("");
              }}
              className={inputClass}
            >
              <option value="">(none)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Opportunity (optional)</span>
            <select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} className={inputClass}>
              <option value="">(none)</option>
              {opportunitiesForCompany.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Vendor</span>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClass}>
              <option value="">(none)</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Address</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Latitude</span>
              <input type="number" value={lat} onChange={(e) => setLat(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Longitude</span>
              <input type="number" value={lng} onChange={(e) => setLng(e.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Contract value</span>
              <input
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                onBlur={() => {
                  const num = Number(parseCurrencyInput(contractValue));
                  if (contractValue.trim() && Number.isFinite(num)) setContractValue(formatCurrency(num));
                }}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Sub price</span>
              <input
                value={subPrice}
                onChange={(e) => setSubPrice(e.target.value)}
                onBlur={() => {
                  const num = Number(parseCurrencyInput(subPrice));
                  if (subPrice.trim() && Number.isFinite(num)) setSubPrice(formatCurrency(num));
                }}
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-critical">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
          {site && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
