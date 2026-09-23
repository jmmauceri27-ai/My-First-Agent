"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import type { MapPin } from "@/components/SiteMap";
import type { MapLegendProps } from "@/components/MapLegend";
import { NEUTRAL_PIN_COLOR } from "@/lib/siteMapColor";
import { CHART_COLORS_LIGHT } from "@/lib/chartPalette";
import type { FieldClass } from "@/lib/crmTypes";
import type { DatasetRecord } from "@/lib/types";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import type { Site, Vendor } from "@/lib/networkTypes";
import VendorModal from "./VendorModal";
import UploadVendorsModal from "./UploadVendorsModal";
import UpdateVendorsModal from "./UpdateVendorsModal";
import { exportVendorsToExcelAction } from "./actions";

const SiteMap = dynamic(() => import("@/components/SiteMap"), { ssr: false });
const MapLegend = dynamic(() => import("@/components/MapLegend"), { ssr: false });

const SHOW_SITES_STORAGE_KEY = "network-vendors-show-sites";

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

/** Every vendor needs its own genuinely distinct color, not just the first 8 -- the shared
 * buildCategoricalPalette (used elsewhere for CVD-audited dataviz colors) folds anything past 8 into a flat
 * gray, which defeats the point here once there are more than a handful of vendors. Reuses those 8 validated
 * colors first, then fills in with hues spread evenly around the rest of the color wheel so every vendor still
 * gets a color of its own instead of disappearing into "unassigned" gray. */
function buildVendorPalette(names: string[]): Map<string, string> {
  const distinct: string[] = [];
  for (const n of names) {
    if (!distinct.includes(n)) distinct.push(n);
  }

  const map = new Map<string, string>();
  const overflowCount = Math.max(distinct.length - CHART_COLORS_LIGHT.length, 0);
  distinct.forEach((n, i) => {
    if (i < CHART_COLORS_LIGHT.length) {
      map.set(n, CHART_COLORS_LIGHT[i]);
    } else {
      const hue = ((i - CHART_COLORS_LIGHT.length) * 360) / overflowCount;
      map.set(n, `hsl(${hue.toFixed(0)}, 65%, 50%)`);
    }
  });
  return map;
}

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

export default function VendorsClient({
  vendors,
  sites,
  fieldClasses,
}: {
  vendors: Vendor[];
  sites: Site[];
  fieldClasses: FieldClass[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showSites, setShowSites] = useState(false);

  useEffect(() => {
    // Client-only setting can't be known during SSR -- this just restores whatever the user last chose,
    // same pattern as the theme toggle.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSites(localStorage.getItem(SHOW_SITES_STORAGE_KEY) === "1");
    } catch {
      // Private browsing / storage disabled -- the toggle still works for this page load.
    }
  }, []);

  function toggleShowSites() {
    setShowSites((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SHOW_SITES_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Private browsing / storage disabled -- the toggle still works for this page load.
      }
      return next;
    });
  }

  const vendorNames = useMemo(() => vendors.map((v) => v.name), [vendors]);
  const palette = useMemo(() => buildVendorPalette(vendorNames), [vendorNames]);

  /** Every vendor gets its own color (a triangle pin), always -- with the sites overlay on, each site tied to
   * that vendor shows as a circle in the same color, so the association reads visually on the map instead of
   * needing a separate list. Vendor pins never cluster (cluster: false) -- there are always few enough of them
   * to stay individually visible even while their (possibly hundreds of) sites do cluster. */
  const { pins, legend } = useMemo(() => {
    const vendorPins: MapPin[] = vendors
      .filter((v) => v.lat != null && v.lng != null)
      .map((v) => ({
        id: `vendor:${v.id}`,
        lat: v.lat as number,
        lng: v.lng as number,
        label: v.name,
        shape: "triangle",
        cluster: false,
        color: palette.get(v.name) ?? NEUTRAL_PIN_COLOR,
        fields: v.services ? [{ key: "Services", value: v.services }] : [],
      }));

    if (!showSites) {
      return { pins: vendorPins, legend: null as MapLegendProps | null };
    }

    const usedNames = new Set<string>(vendors.filter((v) => v.lat != null && v.lng != null).map((v) => v.name));

    const sitePins: MapPin[] = sites
      .filter((s) => s.lat != null && s.lng != null)
      .map((s): MapPin | null => {
        const names = Array.from(
          new Set(s.tradeAssignments.flatMap((a) => [a.vendorName, a.subVendorName]).filter((n): n is string => !!n)),
        );
        if (names.length === 0) return null;
        names.forEach((n) => usedNames.add(n));
        return {
          id: `site:${s.id}`,
          lat: s.lat as number,
          lng: s.lng as number,
          label: s.name,
          colors: names.map((n) => palette.get(n) ?? NEUTRAL_PIN_COLOR),
          fields: s.tradeAssignments
            .filter((a) => a.vendorId || a.subVendorId)
            .map((a) => ({
              key: a.trade,
              value: [a.vendorName, a.subVendorName ? `Sub: ${a.subVendorName}` : null]
                .filter((v): v is string => !!v)
                .join(" · "),
            })),
        };
      })
      .filter((p): p is MapPin => p !== null);

    const legend: MapLegendProps = {
      mode: "categorical",
      entries: vendorNames.filter((n) => usedNames.has(n)).map((n) => ({ label: n, color: palette.get(n) ?? NEUTRAL_PIN_COLOR })),
    };

    return { pins: [...vendorPins, ...sitePins], legend };
  }, [vendors, sites, showSites, palette, vendorNames]);

  function handlePinClick(id: string) {
    if (id.startsWith("vendor:")) router.push(`/network/vendors/${id.slice("vendor:".length)}`);
    else if (id.startsWith("site:")) router.push(`/network/sites/${id.slice("site:".length)}`);
  }

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
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <input type="checkbox" checked={showSites} onChange={toggleShowSites} className="accent-brand-600" />
            Show sites on map
          </label>
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
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 flex-1">
          {pins.length > 0 ? (
            <SiteMap pins={pins} onPinClick={handlePinClick} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No vendors have a latitude/longitude yet — add one from the list to see it on the map.
            </div>
          )}
          {legend && (
            <div className="absolute bottom-3 left-3 z-[1000] flex max-w-[calc(100%-1.5rem)] flex-col gap-1.5 rounded-lg border border-purple-400/20 bg-white/90 px-3 py-2 shadow-md backdrop-blur dark:bg-[#150f26]/90">
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-0 w-0 border-x-[5px] border-b-[8px] border-x-transparent border-b-slate-500 dark:border-b-slate-400"
                  />
                  Vendor
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500 dark:bg-slate-400" />
                  Site
                </span>
              </div>
              <MapLegend {...legend} />
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
