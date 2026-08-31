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
import SiteMeasurementsEditor from "@/components/SiteMeasurementsEditor";
import { formatCurrency } from "@/lib/siteMapColor";
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
  const [counts, setCounts] = useState<SiteMeasurements>(site.counts);
  const [lastSeasonSnowfall, setLastSeasonSnowfall] = useState(
    site.lastSeasonSnowfall != null ? String(site.lastSeasonSnowfall) : "",
  );
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
        lastSeasonSnowfall: lastSeasonSnowfall.trim() ? Number(lastSeasonSnowfall) : null,
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
      router.push("/network/sites");
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="p-5 xl:col-span-3">
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

            <div className="grid grid-cols-3 gap-3">
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
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Vendor & Contract assignments</span>
              <p className="-mt-0.5 text-xs text-slate-500">
                A site often uses a different vendor -- and can be covered under a different signed contract -- per
                trade, e.g. one for Land, another for Snow Removal.
              </p>
              <SiteTradeAssignmentsEditor
                trades={trades}
                vendors={vendors}
                contracts={contractsForCompany}
                value={assignmentDrafts}
                onChange={setAssignmentDrafts}
              />
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Address</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </label>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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

        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card className="p-5">
            <SiteMeasurementsEditor
              measurements={measurements}
              onChangeMeasurements={setMeasurements}
              counts={counts}
              onChangeCounts={setCounts}
            />
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-50">Last Season Snowfall</h2>
            <label className="mt-3 flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Total snowfall (in.)</span>
              <input
                type="number"
                value={lastSeasonSnowfall}
                onChange={(e) => setLastSeasonSnowfall(e.target.value)}
                className={`${inputClass} max-w-[10rem]`}
              />
            </label>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-50">Rates</h2>
            {site.tradeAssignments.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No trades assigned yet.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {site.tradeAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-slate-300">{a.trade}</p>
                      <p className="text-xs text-slate-500">{a.billingType ?? "No billing type (set on the Contract)"}</p>
                    </div>
                    <p className="font-semibold text-slate-50">
                      {a.contractValue != null ? formatCurrency(a.contractValue) : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
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
            </div>

            <div className="mt-2 border-t border-purple-400/10 pt-3">
              <p className="text-xs font-medium text-slate-400">Vendors & Contracts by trade</p>
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
                          <Link
                            href={`/network/vendors/${a.subVendorId}`}
                            className="font-medium text-brand-400 hover:underline"
                          >
                            {a.subVendorName}
                          </Link>
                        </p>
                      )}
                      {a.contractId && (
                        <p className="text-xs text-slate-400">
                          Contract:{" "}
                          <Link href="/crm/contracts" className="font-medium text-brand-400 hover:underline">
                            {a.contractName}
                          </Link>
                        </p>
                      )}
                      {a.billingType && <p className="text-xs text-slate-400">Billing: {a.billingType}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
