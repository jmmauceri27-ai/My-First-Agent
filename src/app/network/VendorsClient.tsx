"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import type { MapPin } from "@/components/SiteMap";
import type { FieldClass } from "@/lib/crmTypes";
import type { DatasetRecord } from "@/lib/types";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import type { Vendor } from "@/lib/networkTypes";
import VendorModal from "./VendorModal";
import UploadVendorsModal from "./UploadVendorsModal";
import UpdateVendorsModal from "./UpdateVendorsModal";
import { exportVendorsToExcelAction } from "./actions";

const SiteMap = dynamic(() => import("@/components/SiteMap"), { ssr: false });

const VENDOR_EXPORT_COLUMNS = [
  "Record ID",
  "Vendor Name",
  "Services",
  "Contact Name",
  "Email",
  "Phone",
  "Website",
  "Address",
  "City",
  "State",
  "Latitude",
  "Longitude",
  "Notes",
];

function vendorToExportRow(v: Vendor): DatasetRecord {
  return {
    "Record ID": v.id,
    "Vendor Name": v.name,
    Services: v.services,
    "Contact Name": v.contactName,
    Email: v.email,
    Phone: v.phone,
    Website: v.website,
    Address: v.address,
    City: v.city,
    State: v.state,
    Latitude: v.lat,
    Longitude: v.lng,
    Notes: v.notes,
  };
}

export default function VendorsClient({ vendors, fieldClasses }: { vendors: Vendor[]; fieldClasses: FieldClass[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const pins: MapPin[] = useMemo(
    () =>
      vendors
        .filter((v) => v.lat != null && v.lng != null)
        .map((v) => ({
          id: v.id,
          lat: v.lat as number,
          lng: v.lng as number,
          label: v.name,
          fields: v.services ? [{ key: "Services", value: v.services }] : [],
        })),
    [vendors],
  );

  async function handleExport() {
    if (vendors.length === 0) return;
    setExporting(true);
    try {
      const rows = vendors.map(vendorToExportRow);
      const base64 = await exportVendorsToExcelAction(rows, VENDOR_EXPORT_COLUMNS);
      const date = new Date().toISOString().slice(0, 10);
      downloadBase64Xlsx(base64, `vendors_export_${date}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-400/10 bg-slate-50 dark:bg-[#150f26] px-4 py-3">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">🌐 Network · Vendors</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport} disabled={vendors.length === 0 || exporting}>
            {exporting ? "Downloading…" : `Download ${vendors.length} vendor${vendors.length === 1 ? "" : "s"}`}
          </Button>
          <Button variant="secondary" onClick={() => setUploading(true)}>
            Upload vendors
          </Button>
          <Button variant="secondary" onClick={() => setUpdating(true)}>
            Update vendors
          </Button>
          <Button onClick={() => setCreating(true)}>+ New vendor</Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1">
          {pins.length > 0 ? (
            <SiteMap pins={pins} onPinClick={(id) => router.push(`/network/vendors/${id}`)} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No vendors have a latitude/longitude yet — add one from the list to see it on the map.
            </div>
          )}
        </div>

        <div className="flex w-80 shrink-0 flex-col divide-y divide-purple-400/10 overflow-y-auto border-l border-purple-400/10 bg-slate-50 dark:bg-[#150f26]">
          {vendors.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">No vendors yet.</p>
          ) : (
            vendors.map((v) => (
              <button
                key={v.id}
                onClick={() => router.push(`/network/vendors/${v.id}`)}
                className="flex flex-col gap-0.5 px-4 py-3 text-left hover:bg-purple-500/5"
              >
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{v.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {[v.services, [v.city, v.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") ||
                    "No details"}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {creating && (
        <VendorModal
          vendor={null}
          fieldClasses={fieldClasses}
          onClose={() => setCreating(false)}
          onSaved={(id) => router.push(`/network/vendors/${id}`)}
        />
      )}

      {uploading && <UploadVendorsModal onClose={() => setUploading(false)} />}

      {updating && <UpdateVendorsModal onClose={() => setUpdating(false)} />}
    </div>
  );
}
