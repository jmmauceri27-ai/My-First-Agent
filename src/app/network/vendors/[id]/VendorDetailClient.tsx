"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { computeSiteMargin, formatCurrency } from "@/lib/siteMapColor";
import type { Site, Vendor, VendorInput } from "@/lib/networkTypes";
import { deleteVendorAction, saveVendorAction } from "../../actions";

export default function VendorDetailClient({
  vendor,
  sitesAsVendor,
  sitesAsSubVendor,
}: {
  vendor: Vendor;
  sitesAsVendor: Site[];
  sitesAsSubVendor: Site[];
}) {
  const router = useRouter();
  const [name, setName] = useState(vendor.name);
  const [services, setServices] = useState(vendor.services ?? "");
  const [contactName, setContactName] = useState(vendor.contactName ?? "");
  const [email, setEmail] = useState(vendor.email ?? "");
  const [phone, setPhone] = useState(vendor.phone ?? "");
  const [website, setWebsite] = useState(vendor.website ?? "");
  const [address, setAddress] = useState(vendor.address ?? "");
  const [city, setCity] = useState(vendor.city ?? "");
  const [state, setState] = useState(vendor.state ?? "");
  const [lat, setLat] = useState(vendor.lat != null ? String(vendor.lat) : "");
  const [lng, setLng] = useState(vendor.lng != null ? String(vendor.lng) : "");
  const [notes, setNotes] = useState(vendor.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter a vendor name.");
      return;
    }
    setSaving(true);
    try {
      const input: VendorInput = {
        name: name.trim(),
        services: services.trim() || null,
        contactName: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        lat: lat.trim() ? Number(lat) : null,
        lng: lng.trim() ? Number(lng) : null,
        notes: notes.trim() || null,
      };
      const result = await saveVendorAction(vendor.id, input);
      if (result.error) {
        setError(result.error);
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
      const result = await deleteVendorAction(vendor.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/network");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/network" className="text-sm font-medium text-brand-400 hover:underline">
          ← Back to Network
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-50">{vendor.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-50">Details</h2>

          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Vendor name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Services</span>
              <input value={services} onChange={(e) => setServices(e.target.value)} className={inputClass} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Contact name</span>
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Website</span>
                <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Address</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">City</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">State</span>
                <input value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
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

          {error && <p className="mt-3 text-sm text-critical">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete vendor"}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <h2 className="text-lg font-bold text-slate-50">Sites serviced directly</h2>
          <p className="mt-1 text-xs text-slate-400">Sites where this vendor is contracted to directly.</p>

          <div className="mt-4 flex flex-col divide-y divide-purple-400/10">
            {sitesAsVendor.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">No sites assigned yet.</p>
            ) : (
              sitesAsVendor.map((s) => {
                const vendorMargin = computeSiteMargin(s.subPrice, s.subVendorPrice);
                return (
                  <Link
                    key={s.id}
                    href={`/network/sites/${s.id}`}
                    className="flex items-center justify-between gap-2 py-2 hover:text-brand-400"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-50">{s.name}</p>
                      <p className="text-xs text-slate-400">
                        {s.companyName ?? "No client"}
                        {s.subVendorName ? ` · Sub-Vendor: ${s.subVendorName}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs tabular-nums text-slate-400">
                      {s.subPrice != null && <p>{formatCurrency(s.subPrice)}</p>}
                      {vendorMargin != null && <p className="text-slate-50">Margin {formatCurrency(vendorMargin)}</p>}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        <Card className="flex flex-col p-5 lg:col-start-3">
          <h2 className="text-lg font-bold text-slate-50">Sites serviced as Sub-Vendor</h2>
          <p className="mt-1 text-xs text-slate-400">Sites where another vendor subcontracts work to this vendor.</p>

          <div className="mt-4 flex flex-col divide-y divide-purple-400/10">
            {sitesAsSubVendor.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">Not used as a sub-vendor yet.</p>
            ) : (
              sitesAsSubVendor.map((s) => (
                <Link
                  key={s.id}
                  href={`/network/sites/${s.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:text-brand-400"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-50">{s.name}</p>
                    <p className="text-xs text-slate-400">Via {s.vendorName ?? "unknown vendor"}</p>
                  </div>
                  {s.subVendorPrice != null && (
                    <span className="shrink-0 text-xs tabular-nums text-slate-400">
                      {formatCurrency(s.subVendorPrice)}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
