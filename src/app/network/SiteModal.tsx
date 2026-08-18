"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import TradeSelect from "@/components/TradeSelect";
import { computeSiteMargin, parseCurrencyInput, formatCurrency } from "@/lib/siteMapColor";
import { matchTrade } from "@/lib/trades";
import type { Company, Contract, Opportunity } from "@/lib/crmTypes";
import type { Site, SiteInput, Vendor } from "@/lib/networkTypes";
import { saveCompanyAction, saveContractAction } from "@/app/crm/actions";
import { deleteSiteAction, saveSiteAction } from "./actions";

export default function SiteModal({
  site,
  companies,
  vendors,
  opportunities,
  contracts,
  defaultCompanyId = null,
  defaultOpportunityId = null,
  defaultContractId = null,
  defaultVendorId = null,
  onClose,
  onSaved,
}: {
  site: Site | null;
  companies: Company[];
  vendors: Vendor[];
  opportunities: Opportunity[];
  contracts: Contract[];
  defaultCompanyId?: string | null;
  defaultOpportunityId?: string | null;
  defaultContractId?: string | null;
  defaultVendorId?: string | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const [siteCode, setSiteCode] = useState(site?.siteCode ?? "");
  const [name, setName] = useState(site?.name ?? "");
  const [companyId, setCompanyId] = useState(site?.companyId ?? defaultCompanyId ?? "");
  const [opportunityId, setOpportunityId] = useState(site?.opportunityId ?? defaultOpportunityId ?? "");
  const [contractId, setContractId] = useState(site?.contractId ?? defaultContractId ?? "");
  const [vendorId, setVendorId] = useState(site?.vendorId ?? defaultVendorId ?? "");
  const [subVendorId, setSubVendorId] = useState(site?.subVendorId ?? "");
  const [address, setAddress] = useState(site?.address ?? "");
  const [city, setCity] = useState(site?.city ?? "");
  const [state, setState] = useState(site?.state ?? "");
  const [zip, setZip] = useState(site?.zip ?? "");
  const [lat, setLat] = useState(site?.lat != null ? String(site.lat) : "");
  const [lng, setLng] = useState(site?.lng != null ? String(site.lng) : "");
  const [trades, setTrades] = useState<string[]>(site?.trades ?? []);
  const [contractValue, setContractValue] = useState(site?.contractValue != null ? formatCurrency(site.contractValue) : "");
  const [subPrice, setSubPrice] = useState(site?.subPrice != null ? formatCurrency(site.subPrice) : "");
  const [subVendorPrice, setSubVendorPrice] = useState(
    site?.subVendorPrice != null ? formatCurrency(site.subVendorPrice) : "",
  );
  const [notes, setNotes] = useState(site?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [localCompanies, setLocalCompanies] = useState(companies);
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  const [localContracts, setLocalContracts] = useState(contracts);
  const [addingContract, setAddingContract] = useState(false);
  const [newContractName, setNewContractName] = useState("");

  const opportunitiesForCompany = useMemo(
    () => (companyId ? opportunities.filter((o) => o.companyId === companyId) : opportunities),
    [opportunities, companyId],
  );

  const contractsForCompany = useMemo(
    () => (companyId ? localContracts.filter((c) => c.companyId === companyId) : localContracts),
    [localContracts, companyId],
  );

  async function handleAddCompany() {
    if (!newCompanyName.trim()) return;
    const id = await saveCompanyAction(null, {
      name: newCompanyName.trim(),
      address: null,
      city: null,
      state: null,
      website: null,
      notes: null,
    });
    setLocalCompanies((prev) => [
      ...prev,
      {
        id,
        name: newCompanyName.trim(),
        address: null,
        city: null,
        state: null,
        website: null,
        notes: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    setCompanyId(id);
    setNewCompanyName("");
    setAddingCompany(false);
  }

  async function handleAddContract() {
    if (!newContractName.trim()) return;
    const id = await saveContractAction(null, {
      companyId: companyId || null,
      name: newContractName.trim(),
      workType: null,
      siteCount: null,
      rateAmount: null,
      rateFrequency: null,
      startDate: null,
      endDate: null,
      notes: null,
    });
    const company = localCompanies.find((c) => c.id === companyId);
    setLocalContracts((prev) => [
      ...prev,
      {
        id,
        companyId: companyId || null,
        companyName: company?.name ?? null,
        name: newContractName.trim(),
        workType: null,
        siteCount: null,
        rateAmount: null,
        rateFrequency: null,
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    setContractId(id);
    setNewContractName("");
    setAddingContract(false);
  }

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
        contractId: contractId || null,
        vendorId: vendorId || null,
        subVendorId: subVendorId || null,
        siteCode: siteCode.trim() || null,
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zip: zip.trim() || null,
        lat: lat.trim() ? Number(lat) : null,
        lng: lng.trim() ? Number(lng) : null,
        trades,
        contractValue: contractValue.trim() ? Number(parseCurrencyInput(contractValue)) : null,
        subPrice: subPrice.trim() ? Number(parseCurrencyInput(subPrice)) : null,
        subVendorPrice: subVendorPrice.trim() ? Number(parseCurrencyInput(subVendorPrice)) : null,
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
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Site name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Site ID</span>
              <input
                value={siteCode}
                onChange={(e) => setSiteCode(e.target.value)}
                placeholder="Your own code, e.g. TDC0234"
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Client</span>
            {addingCompany ? (
              <div className="flex gap-2">
                <input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="New client name"
                  className={inputClass}
                />
                <Button type="button" variant="secondary" onClick={handleAddCompany}>
                  Add
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={companyId}
                  onChange={(e) => {
                    setCompanyId(e.target.value);
                    setOpportunityId("");
                    setContractId("");
                  }}
                  className={inputClass}
                >
                  <option value="">(none)</option>
                  {localCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={() => setAddingCompany(true)}>
                  + New
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Contract (optional)</span>
            {addingContract ? (
              <div className="flex gap-2">
                <input
                  value={newContractName}
                  onChange={(e) => setNewContractName(e.target.value)}
                  placeholder="New contract name"
                  className={inputClass}
                />
                <Button type="button" variant="secondary" onClick={handleAddContract}>
                  Add
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={contractId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setContractId(nextId);
                    const contract = localContracts.find((c) => c.id === nextId);
                    const matched = matchTrade(contract?.workType);
                    if (matched && trades.length === 0) setTrades([matched]);
                  }}
                  className={inputClass}
                >
                  <option value="">(none)</option>
                  {contractsForCompany.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={() => setAddingContract(true)}>
                  + New
                </Button>
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Opportunity (optional)</span>
            <select
              value={opportunityId}
              onChange={(e) => {
                const nextId = e.target.value;
                setOpportunityId(nextId);
                const opportunity = opportunities.find((o) => o.id === nextId);
                const matched = matchTrade(opportunity?.workType);
                if (matched && trades.length === 0) setTrades([matched]);
              }}
              className={inputClass}
            >
              <option value="">(none)</option>
              {opportunitiesForCompany.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Trade</span>
            <TradeSelect value={trades} onChange={setTrades} />
          </label>

          <div className="grid grid-cols-2 gap-3">
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
              <span className="font-medium text-slate-300">Sub-Vendor</span>
              <select value={subVendorId} onChange={(e) => setSubVendorId(e.target.value)} className={inputClass}>
                <option value="">(none)</option>
                {vendors
                  .filter((v) => v.id !== vendorId)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <p className="-mt-2 text-xs text-slate-500">
            Vendor is who we contract to directly; Sub-Vendor is who the Vendor further subcontracts the work to.
          </p>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Address</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">City</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">State</span>
              <input value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Zip</span>
              <input value={zip} onChange={(e) => setZip(e.target.value)} className={inputClass} />
            </label>
          </div>

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

          <div className="grid grid-cols-3 gap-3">
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
              <span className="font-medium text-slate-300">Sub price (to Vendor)</span>
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
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Sub-Vendor price</span>
              <input
                value={subVendorPrice}
                onChange={(e) => setSubVendorPrice(e.target.value)}
                onBlur={() => {
                  const num = Number(parseCurrencyInput(subVendorPrice));
                  if (subVendorPrice.trim() && Number.isFinite(num)) setSubVendorPrice(formatCurrency(num));
                }}
                className={inputClass}
              />
            </label>
          </div>

          {(() => {
            const ourMargin = computeSiteMargin(
              contractValue.trim() ? Number(parseCurrencyInput(contractValue)) : null,
              subPrice.trim() ? Number(parseCurrencyInput(subPrice)) : null,
            );
            const vendorMargin = computeSiteMargin(
              subPrice.trim() ? Number(parseCurrencyInput(subPrice)) : null,
              subVendorPrice.trim() ? Number(parseCurrencyInput(subVendorPrice)) : null,
            );
            if (ourMargin === null && vendorMargin === null) return null;
            return (
              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                {ourMargin !== null && (
                  <span>
                    Our margin: <span className="font-semibold text-slate-50">{formatCurrency(ourMargin)}</span>
                  </span>
                )}
                {vendorMargin !== null && (
                  <span>
                    Vendor margin: <span className="font-semibold text-slate-50">{formatCurrency(vendorMargin)}</span>
                  </span>
                )}
              </div>
            );
          })()}

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
