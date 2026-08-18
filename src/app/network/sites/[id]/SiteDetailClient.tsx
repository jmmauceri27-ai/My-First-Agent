"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import TradeSelect from "@/components/TradeSelect";
import SiteTradeAssignmentsEditor, {
  assignmentsToDrafts,
  draftsToAssignmentInputs,
  type AssignmentDraft,
} from "@/components/SiteTradeAssignmentsEditor";
import { formatSquareFeet, parseMeasurementInput } from "@/lib/siteMapColor";
import { matchTrade } from "@/lib/trades";
import type { Company, Contract, Opportunity } from "@/lib/crmTypes";
import type { Site, SiteInput, SiteMeasurements, Vendor } from "@/lib/networkTypes";
import { deleteSiteAction, saveSiteAction, saveSiteTradeAssignmentsAction } from "../../actions";

export default function SiteDetailClient({
  site,
  companies,
  vendors,
  opportunities,
  contracts,
}: {
  site: Site;
  companies: Company[];
  vendors: Vendor[];
  opportunities: Opportunity[];
  contracts: Contract[];
}) {
  const router = useRouter();
  const [siteCode, setSiteCode] = useState(site.siteCode ?? "");
  const [name, setName] = useState(site.name);
  const [companyId, setCompanyId] = useState(site.companyId ?? "");
  const [opportunityId, setOpportunityId] = useState(site.opportunityId ?? "");
  const [contractId, setContractId] = useState(site.contractId ?? "");
  const [address, setAddress] = useState(site.address ?? "");
  const [city, setCity] = useState(site.city ?? "");
  const [state, setState] = useState(site.state ?? "");
  const [zip, setZip] = useState(site.zip ?? "");
  const [lat, setLat] = useState(site.lat != null ? String(site.lat) : "");
  const [lng, setLng] = useState(site.lng != null ? String(site.lng) : "");
  const [trades, setTrades] = useState<string[]>(site.trades ?? []);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, AssignmentDraft>>(
    assignmentsToDrafts(site.tradeAssignments),
  );
  const [notes, setNotes] = useState(site.notes ?? "");
  const [measurements, setMeasurements] = useState<SiteMeasurements>(site.measurements);
  const [newMeasurementLabel, setNewMeasurementLabel] = useState("");
  const [newMeasurementValue, setNewMeasurementValue] = useState("");
  const [counts, setCounts] = useState<SiteMeasurements>(site.counts);
  const [newCountLabel, setNewCountLabel] = useState("");
  const [newCountValue, setNewCountValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opportunitiesForCompany = useMemo(
    () => (companyId ? opportunities.filter((o) => o.companyId === companyId) : opportunities),
    [opportunities, companyId],
  );

  const contractsForCompany = useMemo(
    () => (companyId ? contracts.filter((c) => c.companyId === companyId) : contracts),
    [contracts, companyId],
  );

  function addMeasurement() {
    const label = newMeasurementLabel.trim();
    if (!label) return;
    const value = Number(parseMeasurementInput(newMeasurementValue));
    if (!Number.isFinite(value)) return;
    setMeasurements((prev) => ({ ...prev, [label]: value }));
    setNewMeasurementLabel("");
    setNewMeasurementValue("");
  }

  function removeMeasurement(label: string) {
    setMeasurements((prev) => {
      const next = { ...prev };
      delete next[label];
      return next;
    });
  }

  function addCount() {
    const label = newCountLabel.trim();
    if (!label) return;
    const value = Number(newCountValue);
    if (!Number.isFinite(value)) return;
    setCounts((prev) => ({ ...prev, [label]: value }));
    setNewCountLabel("");
    setNewCountValue("");
  }

  function removeCount(label: string) {
    setCounts((prev) => {
      const next = { ...prev };
      delete next[label];
      return next;
    });
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
        siteCode: siteCode.trim() || null,
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zip: zip.trim() || null,
        lat: lat.trim() ? Number(lat) : null,
        lng: lng.trim() ? Number(lng) : null,
        trades,
        measurements,
        counts,
        notes: notes.trim() || null,
      };
      const result = await saveSiteAction(site.id, input);
      if (result.error) {
        setError(result.error);
        return;
      }
      const assignmentsResult = await saveSiteTradeAssignmentsAction(
        site.id,
        draftsToAssignmentInputs(trades, assignmentDrafts),
      );
      if (assignmentsResult.error) {
        setError(assignmentsResult.error);
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await deleteSiteAction(site.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/network/sites");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/network/sites" className="text-sm font-medium text-brand-400 hover:underline">
          ← Back to Sites
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-50">{site.name}</h1>
        {site.siteCode && <p className="text-sm text-slate-400">Site ID: {site.siteCode}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-50">Details</h2>

          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Site name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
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

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Client</span>
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
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Contract</span>
              <select
                value={contractId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setContractId(nextId);
                  const contract = contracts.find((c) => c.id === nextId);
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
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Opportunity</span>
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

            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Vendor assignments</span>
              <p className="-mt-0.5 text-xs text-slate-500">
                A site often uses a different vendor per trade -- e.g. one for Land, another for Snow Removal.
              </p>
              <SiteTradeAssignmentsEditor
                trades={trades}
                vendors={vendors}
                value={assignmentDrafts}
                onChange={setAssignmentDrafts}
              />
            </div>

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

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
            </label>
          </div>

          <div className="mt-6 border-t border-purple-400/10 pt-4">
            <h3 className="text-sm font-bold text-slate-50">Measurements</h3>
            <div className="mt-2 flex flex-col gap-1">
              {Object.entries(measurements).length === 0 ? (
                <p className="text-xs text-slate-400">No measurements yet.</p>
              ) : (
                Object.entries(measurements).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-300">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-slate-50">{formatSquareFeet(value)}</span>
                      <button
                        onClick={() => removeMeasurement(label)}
                        className="text-xs font-semibold text-critical hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={newMeasurementLabel}
                onChange={(e) => setNewMeasurementLabel(e.target.value)}
                placeholder="e.g. Turf Area"
                className={`${inputClass} min-w-[140px] flex-1`}
              />
              <input
                value={newMeasurementValue}
                onChange={(e) => setNewMeasurementValue(e.target.value)}
                placeholder="Value (sq. ft)"
                className={`${inputClass} min-w-[100px] flex-1`}
              />
              <Button type="button" variant="secondary" onClick={addMeasurement} className="w-fit">
                Add
              </Button>
            </div>
          </div>

          <div className="mt-6 border-t border-purple-400/10 pt-4">
            <h3 className="text-sm font-bold text-slate-50">Counts</h3>
            <div className="mt-2 flex flex-col gap-1">
              {Object.entries(counts).length === 0 ? (
                <p className="text-xs text-slate-400">No counts yet.</p>
              ) : (
                Object.entries(counts).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-300">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-slate-50">{value.toLocaleString("en-US")}</span>
                      <button
                        onClick={() => removeCount(label)}
                        className="text-xs font-semibold text-critical hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={newCountLabel}
                onChange={(e) => setNewCountLabel(e.target.value)}
                placeholder="e.g. Palm Trees"
                className={`${inputClass} min-w-[140px] flex-1`}
              />
              <input
                value={newCountValue}
                onChange={(e) => setNewCountValue(e.target.value)}
                placeholder="Count"
                className={`${inputClass} min-w-[100px] flex-1`}
              />
              <Button type="button" variant="secondary" onClick={addCount} className="w-fit">
                Add
              </Button>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-critical">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete site"}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-lg font-bold text-slate-50">Connections</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-400">Client</p>
              {site.companyId ? (
                <Link href={`/network/clients/${site.companyId}`} className="font-medium text-brand-400 hover:underline">
                  {site.companyName}
                </Link>
              ) : (
                <p className="text-slate-500">Not linked</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400">Opportunity</p>
              {site.opportunityId ? (
                <Link
                  href={`/crm/opportunities/${site.opportunityId}`}
                  className="font-medium text-brand-400 hover:underline"
                >
                  {site.opportunityName}
                </Link>
              ) : (
                <p className="text-slate-500">Not linked</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400">Contract</p>
              {site.contractId ? (
                <Link href="/crm/contracts" className="font-medium text-brand-400 hover:underline">
                  {site.contractName}
                </Link>
              ) : (
                <p className="text-slate-500">Not linked</p>
              )}
            </div>
          </div>

          <div className="mt-2 border-t border-purple-400/10 pt-3">
            <p className="text-xs font-medium text-slate-400">Vendors by trade</p>
            {site.tradeAssignments.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">No vendor assignments yet.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {site.tradeAssignments.map((a) => (
                  <div key={a.id} className="text-sm">
                    <p className="text-slate-300">{a.trade}</p>
                    {a.vendorId ? (
                      <Link href={`/network/vendors/${a.vendorId}`} className="font-medium text-brand-400 hover:underline">
                        {a.vendorName}
                      </Link>
                    ) : (
                      <p className="text-slate-500">Not assigned</p>
                    )}
                    {a.subVendorId && (
                      <p className="text-xs text-slate-400">
                        Sub-Vendor:{" "}
                        <Link href={`/network/vendors/${a.subVendorId}`} className="font-medium text-brand-400 hover:underline">
                          {a.subVendorName}
                        </Link>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
