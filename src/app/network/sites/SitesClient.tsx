"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/formClasses";
import TradeSelect from "@/components/TradeSelect";
import type { MapPin } from "@/components/SiteMap";
import type { MapLegendProps } from "@/components/MapLegend";
import {
  DEFAULT_PIN_COLOR,
  buildCategoricalPalette,
  computeSiteMargin,
  formatCurrency,
  formatSquareFeet,
  gradientColorForRatio,
} from "@/lib/siteMapColor";
import type { DatasetRecord } from "@/lib/types";
import type { Company, Contract, Opportunity } from "@/lib/crmTypes";
import type { Site, Vendor } from "@/lib/networkTypes";
import NetworkNav from "../NetworkNav";
import SiteModal from "../SiteModal";
import UploadSitesModal from "../UploadSitesModal";
import UpdateSitesModal from "../UpdateSitesModal";
import { bulkAssignTradesAction, exportSitesToExcelAction } from "../actions";

const SiteMap = dynamic(() => import("@/components/SiteMap"), { ssr: false });
const MapLegend = dynamic(() => import("@/components/MapLegend"), { ssr: false });

type ColorMode = "none" | "margin" | "vendor" | "trade";
type AddressField = "address" | "city" | "state" | "zip";
type InfoField = "name" | "id";

const SITE_EXPORT_COLUMNS = [
  "Site ID",
  "Site Name",
  "Client",
  "Vendor",
  "Opportunity",
  "Contract",
  "Trade",
  "Address",
  "City",
  "State",
  "Zip",
  "Latitude",
  "Longitude",
  "Contract Value",
  "Sub Price",
  "Measurements",
  "Notes",
];

function siteToExportRow(s: Site): DatasetRecord {
  return {
    "Site ID": s.id,
    "Site Name": s.name,
    Client: s.companyName ?? "",
    Vendor: s.vendorName ?? "",
    Opportunity: s.opportunityName ?? "",
    Contract: s.contractName ?? "",
    Trade: s.trades.join(", "),
    Address: s.address ?? "",
    City: s.city ?? "",
    State: s.state ?? "",
    Zip: s.zip ?? "",
    Latitude: s.lat,
    Longitude: s.lng,
    "Contract Value": s.contractValue,
    "Sub Price": s.subPrice,
    Measurements: Object.entries(s.measurements)
      .map(([label, value]) => `${label}: ${formatSquareFeet(value)}`)
      .join("; "),
    Notes: s.notes ?? "",
  };
}

function downloadBase64Xlsx(base64: string, filename: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SitesClient({
  sites,
  companies,
  vendors,
  opportunities,
  contracts,
}: {
  sites: Site[];
  companies: Company[];
  vendors: Vendor[];
  opportunities: Opportunity[];
  contracts: Contract[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updatingSheet, setUpdatingSheet] = useState(false);
  const [addressField, setAddressField] = useState<AddressField>("address");
  const [addressSearch, setAddressSearch] = useState("");
  const [infoField, setInfoField] = useState<InfoField>("name");
  const [infoSearch, setInfoSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [tradeFilter, setTradeFilter] = useState<string[]>([]);
  const [colorMode, setColorMode] = useState<ColorMode>("none");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTrades, setBulkTrades] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filteredSites = useMemo(() => {
    const addressTerm = addressSearch.trim().toLowerCase();
    const infoTerm = infoSearch.trim().toLowerCase();
    return sites.filter((s) => {
      if (companyFilter && s.companyId !== companyFilter) return false;
      if (vendorFilter && s.vendorId !== vendorFilter) return false;
      if (contractFilter && s.contractId !== contractFilter) return false;
      if (tradeFilter.length > 0 && !s.trades.some((t) => tradeFilter.includes(t))) return false;
      if (addressTerm) {
        const value =
          addressField === "address"
            ? s.address
            : addressField === "city"
              ? s.city
              : addressField === "state"
                ? s.state
                : s.zip;
        if (!(value ?? "").toLowerCase().includes(addressTerm)) return false;
      }
      if (infoTerm) {
        const value = infoField === "name" ? s.name : s.id;
        if (!value.toLowerCase().includes(infoTerm)) return false;
      }
      return true;
    });
  }, [sites, companyFilter, vendorFilter, contractFilter, tradeFilter, addressField, addressSearch, infoField, infoSearch]);

  const allFilteredSelected = filteredSites.length > 0 && filteredSites.every((s) => selectedIds.has(s.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const s of filteredSites) next.delete(s.id);
        return next;
      }
      const next = new Set(prev);
      for (const s of filteredSites) next.add(s.id);
      return next;
    });
  }

  async function handleBulkAssign() {
    if (selectedIds.size === 0 || bulkTrades.length === 0) return;
    setBulkError(null);
    setAssigning(true);
    try {
      const result = await bulkAssignTradesAction(Array.from(selectedIds), bulkTrades);
      if (result.error) {
        setBulkError(result.error);
        return;
      }
      setSelectedIds(new Set());
      setBulkTrades([]);
      router.refresh();
    } finally {
      setAssigning(false);
    }
  }

  async function handleExport() {
    if (filteredSites.length === 0) return;
    setExporting(true);
    try {
      const rows = filteredSites.map(siteToExportRow);
      const base64 = await exportSitesToExcelAction(rows, SITE_EXPORT_COLUMNS);
      const date = new Date().toISOString().slice(0, 10);
      downloadBase64Xlsx(base64, `sites_export_${date}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  const { pins, legend } = useMemo(() => {
    const plottable = filteredSites.filter((s) => s.lat != null && s.lng != null);

    if (colorMode === "margin") {
      const margins = plottable.map((s) => computeSiteMargin(s.contractValue, s.subPrice)).filter((m): m is number => m !== null);
      const min = margins.length ? Math.min(...margins) : 0;
      const max = margins.length ? Math.max(...margins) : 0;
      const pins: MapPin[] = plottable.map((s) => {
        const margin = computeSiteMargin(s.contractValue, s.subPrice);
        const ratio = margin === null || max === min ? null : (margin - min) / (max - min);
        return {
          id: s.id,
          lat: s.lat as number,
          lng: s.lng as number,
          label: s.name,
          color: ratio === null ? DEFAULT_PIN_COLOR : gradientColorForRatio(ratio),
          fields: margin === null ? [] : [{ key: "Margin", value: formatCurrency(margin) }],
        };
      });
      const legend: MapLegendProps | null = margins.length
        ? { mode: "gradient", min, max, isCurrency: true }
        : null;
      return { pins, legend };
    }

    if (colorMode === "vendor") {
      const palette = buildCategoricalPalette(plottable.map((s) => s.vendorName ?? "Unassigned"));
      const pins: MapPin[] = plottable.map((s) => ({
        id: s.id,
        lat: s.lat as number,
        lng: s.lng as number,
        label: s.name,
        color: palette.get(s.vendorName ?? "Unassigned"),
        fields: s.vendorName ? [{ key: "Vendor", value: s.vendorName }] : [],
      }));
      const legend: MapLegendProps = {
        mode: "categorical",
        entries: Array.from(palette.entries()).map(([label, color]) => ({ label, color })),
      };
      return { pins, legend };
    }

    if (colorMode === "trade") {
      const tradeGroup = (s: Site) =>
        s.trades.length === 0 ? "Unassigned" : s.trades.length === 1 ? s.trades[0] : "Multiple trades";
      const palette = buildCategoricalPalette(plottable.map(tradeGroup));
      const pins: MapPin[] = plottable.map((s) => ({
        id: s.id,
        lat: s.lat as number,
        lng: s.lng as number,
        label: s.name,
        color: palette.get(tradeGroup(s)),
        fields: s.trades.length ? [{ key: "Trade", value: s.trades.join(", ") }] : [],
      }));
      const legend: MapLegendProps = {
        mode: "categorical",
        entries: Array.from(palette.entries()).map(([label, color]) => ({ label, color })),
      };
      return { pins, legend };
    }

    const pins: MapPin[] = plottable.map((s) => ({
      id: s.id,
      lat: s.lat as number,
      lng: s.lng as number,
      label: s.name,
      fields: [],
    }));
    return { pins, legend: null as MapLegendProps | null };
  }, [filteredSites, colorMode]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-400/10 bg-[#150f26] px-4 py-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-bold text-slate-50">🌐 Network</h1>
          <NetworkNav active="sites" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={filteredSites.length === 0 || exporting}
          >
            {exporting ? "Downloading…" : `Download ${filteredSites.length} site${filteredSites.length === 1 ? "" : "s"}`}
          </Button>
          <Button variant="secondary" onClick={() => setUploading(true)}>
            Upload sites
          </Button>
          <Button variant="secondary" onClick={() => setUpdatingSheet(true)}>
            Update sites
          </Button>
          <Button onClick={() => setCreating(true)}>+ New site</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-purple-400/10 bg-[#150f26] px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">Site Address</span>
          <select
            value={addressField}
            onChange={(e) => setAddressField(e.target.value as AddressField)}
            className={`${inputClass} w-auto`}
          >
            <option value="address">Address</option>
            <option value="city">City</option>
            <option value="state">State</option>
            <option value="zip">Zip</option>
          </select>
          <input
            value={addressSearch}
            onChange={(e) => setAddressSearch(e.target.value)}
            placeholder="Search…"
            className={`${inputClass} w-40`}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">Site Info</span>
          <select
            value={infoField}
            onChange={(e) => setInfoField(e.target.value as InfoField)}
            className={`${inputClass} w-auto`}
          >
            <option value="name">Site Name</option>
            <option value="id">Site ID</option>
          </select>
          <input
            value={infoSearch}
            onChange={(e) => setInfoSearch(e.target.value)}
            placeholder="Search…"
            className={`${inputClass} w-40`}
          />
        </div>
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">All clients</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">All vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select
          value={contractFilter}
          onChange={(e) => setContractFilter(e.target.value)}
          className={`${inputClass} w-auto`}
        >
          <option value="">All contracts</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <TradeSelect value={tradeFilter} onChange={setTradeFilter} className="w-44" placeholder="All trades" />
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as ColorMode)}
          className={`${inputClass} w-auto`}
        >
          <option value="none">Color: none</option>
          <option value="margin">Color: by margin</option>
          <option value="vendor">Color: by vendor</option>
          <option value="trade">Color: by trade</option>
        </select>
        {legend && (
          <div className="ml-auto">
            <MapLegend {...legend} />
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-purple-400/10 bg-[#1a1330] px-4 py-2">
          <span className="text-sm text-slate-300">{selectedIds.size} selected</span>
          <TradeSelect value={bulkTrades} onChange={setBulkTrades} className="w-56" placeholder="Add trade(s)…" />
          <Button variant="secondary" onClick={handleBulkAssign} disabled={bulkTrades.length === 0 || assigning}>
            {assigning ? "Assigning…" : "Assign to selected"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedIds(new Set());
              setBulkTrades([]);
              setBulkError(null);
            }}
          >
            Clear selection
          </Button>
          {bulkError && <span className="text-xs text-critical">{bulkError}</span>}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1">
          {pins.length > 0 ? (
            <SiteMap pins={pins} onPinClick={(id) => router.push(`/network/sites/${id}`)} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400">
              No sites match these filters and have a latitude/longitude yet.
            </div>
          )}
        </div>

        <div className="flex w-80 shrink-0 flex-col divide-y divide-purple-400/10 overflow-y-auto border-l border-purple-400/10 bg-[#150f26]">
          {filteredSites.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No sites match these filters.</p>
          ) : (
            <>
              <label className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-400">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  className="rounded border-slate-500 text-brand-500 focus:ring-2 focus:ring-brand-500/40"
                />
                Select all {filteredSites.length} filtered
              </label>
              {filteredSites.map((s) => (
                <div key={s.id} className="flex items-center gap-2 px-4 py-3 hover:bg-purple-500/5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="shrink-0 rounded border-slate-500 text-brand-500 focus:ring-2 focus:ring-brand-500/40"
                  />
                  <button
                    onClick={() => router.push(`/network/sites/${s.id}`)}
                    className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                  >
                    <span className="truncate text-sm font-semibold text-slate-50">{s.name}</span>
                    <span className="truncate text-xs text-slate-400">
                      {[s.companyName, s.vendorName, ...s.trades].filter(Boolean).join(" · ") || "No details"}
                    </span>
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {creating && (
        <SiteModal
          site={null}
          companies={companies}
          vendors={vendors}
          opportunities={opportunities}
          contracts={contracts}
          onClose={() => setCreating(false)}
          onSaved={(id) => router.push(`/network/sites/${id}`)}
        />
      )}

      {uploading && (
        <UploadSitesModal
          companies={companies}
          vendors={vendors}
          opportunities={opportunities}
          contracts={contracts}
          onClose={() => setUploading(false)}
        />
      )}

      {updatingSheet && <UpdateSitesModal companies={companies} onClose={() => setUpdatingSheet(false)} />}
    </div>
  );
}
