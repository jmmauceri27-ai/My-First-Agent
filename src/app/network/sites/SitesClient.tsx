"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/formClasses";
import TradeSelect from "@/components/TradeSelect";
import TagInput from "@/components/TagInput";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";
import type { MapPin } from "@/components/SiteMap";
import type { MapLegendProps } from "@/components/MapLegend";
import {
  DEFAULT_PIN_COLOR,
  NEUTRAL_PIN_COLOR,
  buildCategoricalPalette,
  computeSiteMargin,
  formatCurrency,
  formatSquareFeet,
  gradientColorForRatio,
} from "@/lib/siteMapColor";
import { TRADE_COLORS, TRADE_OPTIONS } from "@/lib/trades";
import type { Trade } from "@/lib/trades";
import type { DatasetRecord } from "@/lib/types";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import type { Company, Contract, Opportunity } from "@/lib/crmTypes";
import type { Site, SiteFilterTemplate, SiteFilters, Vendor } from "@/lib/networkTypes";
import NetworkNav from "../NetworkNav";
import SiteModal from "../SiteModal";
import UploadSitesModal from "../UploadSitesModal";
import UpdateSitesModal from "../UpdateSitesModal";
import UpdateSiteTradeAssignmentsModal from "../UpdateSiteTradeAssignmentsModal";
import {
  bulkAssignTradesAction,
  deleteSiteFilterTemplateAction,
  exportSitesToExcelAction,
  saveSiteFilterTemplateAction,
} from "../actions";

const SiteMap = dynamic(() => import("@/components/SiteMap"), { ssr: false });
const MapLegend = dynamic(() => import("@/components/MapLegend"), { ssr: false });

type ColorMode = "none" | "margin" | "vendor" | "trade";
type AddressField = "address" | "city" | "state" | "zip";
type InfoField = "name" | "code" | "id";

const SITE_EXPORT_COLUMNS = [
  "Site ID",
  "Record ID",
  "Site Name",
  "Client",
  "Vendor",
  "Sub-Vendor",
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
  "Sub-Vendor Price",
  "Measurements",
  "Notes",
];

function sumOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? present.reduce((a, b) => a + b, 0) : null;
}

function siteToExportRow(s: Site): DatasetRecord {
  return {
    "Site ID": s.siteCode ?? "",
    "Record ID": s.id,
    "Site Name": s.name,
    Client: s.companyName ?? "",
    Vendor: s.tradeAssignments.map((a) => `${a.trade}: ${a.vendorName ?? "(none)"}`).join("; "),
    "Sub-Vendor": s.tradeAssignments
      .filter((a) => a.subVendorName)
      .map((a) => `${a.trade}: ${a.subVendorName}`)
      .join("; "),
    Opportunity: s.opportunityName ?? "",
    Contract: s.contractName ?? "",
    Trade: s.trades.join(", "),
    Address: s.address ?? "",
    City: s.city ?? "",
    State: s.state ?? "",
    Zip: s.zip ?? "",
    Latitude: s.lat,
    Longitude: s.lng,
    "Contract Value": sumOrNull(s.tradeAssignments.map((a) => a.contractValue)),
    "Sub Price": sumOrNull(s.tradeAssignments.map((a) => a.subPrice)),
    "Sub-Vendor Price": sumOrNull(s.tradeAssignments.map((a) => a.subVendorPrice)),
    Measurements: Object.entries(s.measurements)
      .map(([label, value]) => `${label}: ${formatSquareFeet(value)}`)
      .join("; "),
    Notes: s.notes ?? "",
  };
}

function distinctValues(sites: Site[], pick: (s: Site) => string | null): string[] {
  return Array.from(new Set(sites.map(pick).filter((v): v is string => !!v))).sort();
}

function infoValueOf(s: Site, field: InfoField): string {
  return field === "name" ? s.name : field === "code" ? (s.siteCode ?? "") : s.id;
}

export default function SitesClient({
  sites,
  companies,
  vendors,
  opportunities,
  contracts,
  filterTemplates,
}: {
  sites: Site[];
  companies: Company[];
  vendors: Vendor[];
  opportunities: Opportunity[];
  contracts: Contract[];
  filterTemplates: SiteFilterTemplate[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updatingSheet, setUpdatingSheet] = useState(false);
  const [updatingAssignments, setUpdatingAssignments] = useState(false);
  const [addressField, setAddressField] = useState<AddressField>("address");
  const [addressValues, setAddressValues] = useState<string[]>([]);
  const [infoField, setInfoField] = useState<InfoField>("name");
  const [infoValues, setInfoValues] = useState<string[]>([]);
  const [companyFilters, setCompanyFilters] = useState<string[]>([]);
  const [vendorFilter, setVendorFilter] = useState("");
  const [subVendorFilter, setSubVendorFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [tradeFilter, setTradeFilter] = useState<string[]>([]);
  const [colorMode, setColorMode] = useState<ColorMode>("none");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTrades, setBulkTrades] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [localFilterTemplates, setLocalFilterTemplates] = useState(filterTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

  const addressOptions = useMemo(() => distinctValues(sites, (s) => s.address), [sites]);
  const cityOptions = useMemo(() => distinctValues(sites, (s) => s.city), [sites]);
  const stateOptions = useMemo(() => distinctValues(sites, (s) => s.state), [sites]);
  const zipOptions = useMemo(() => distinctValues(sites, (s) => s.zip), [sites]);
  const nameOptions = useMemo(() => distinctValues(sites, (s) => s.name), [sites]);
  const codeOptions = useMemo(() => distinctValues(sites, (s) => s.siteCode), [sites]);
  const idOptions = useMemo(() => distinctValues(sites, (s) => s.id), [sites]);

  const addressSuggestions =
    addressField === "address"
      ? addressOptions
      : addressField === "city"
        ? cityOptions
        : addressField === "state"
          ? stateOptions
          : zipOptions;

  const infoSuggestions = infoField === "name" ? nameOptions : infoField === "code" ? codeOptions : idOptions;

  const addressUnmatched = useMemo(() => {
    if (addressValues.length === 0) return [];
    const existingValues = new Set(addressSuggestions.map((v) => v.toLowerCase()));
    return addressValues.filter((v) => !existingValues.has(v.trim().toLowerCase()));
  }, [addressValues, addressSuggestions]);

  const infoUnmatched = useMemo(() => {
    if (infoValues.length === 0) return [];
    const existingValues = new Set(sites.map((s) => infoValueOf(s, infoField).toLowerCase()));
    return infoValues.filter((v) => !existingValues.has(v.trim().toLowerCase()));
  }, [infoValues, sites, infoField]);

  const filteredSites = useMemo(() => {
    const addressSet = new Set(addressValues.map((v) => v.trim().toLowerCase()));
    const infoSet = new Set(infoValues.map((v) => v.trim().toLowerCase()));
    return sites.filter((s) => {
      if (companyFilters.length > 0 && !companyFilters.includes(s.companyId ?? "")) return false;
      if (vendorFilter && !s.tradeAssignments.some((a) => a.vendorId === vendorFilter)) return false;
      if (subVendorFilter && !s.tradeAssignments.some((a) => a.subVendorId === subVendorFilter)) return false;
      if (contractFilter && s.contractId !== contractFilter) return false;
      if (tradeFilter.length > 0 && !s.trades.some((t) => tradeFilter.includes(t))) return false;
      if (addressSet.size > 0) {
        const value =
          addressField === "address"
            ? s.address
            : addressField === "city"
              ? s.city
              : addressField === "state"
                ? s.state
                : s.zip;
        if (!addressSet.has((value ?? "").toLowerCase())) return false;
      }
      if (infoSet.size > 0) {
        const value = infoValueOf(s, infoField).toLowerCase();
        if (!infoSet.has(value)) return false;
      }
      return true;
    });
  }, [
    sites,
    companyFilters,
    vendorFilter,
    subVendorFilter,
    contractFilter,
    tradeFilter,
    addressField,
    addressValues,
    infoField,
    infoValues,
  ]);

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

  function currentFilters(): SiteFilters {
    return {
      companyFilters,
      vendorFilter,
      subVendorFilter,
      contractFilter,
      tradeFilter,
      colorMode,
      addressField,
      addressValues,
      infoField,
      infoValues,
    };
  }

  function applyTemplate(id: string) {
    setSelectedTemplateId(id);
    const template = localFilterTemplates.find((t) => t.id === id);
    if (!template) return;
    const f = template.filters;
    setCompanyFilters(f.companyFilters);
    setVendorFilter(f.vendorFilter);
    setSubVendorFilter(f.subVendorFilter);
    setContractFilter(f.contractFilter);
    setTradeFilter(f.tradeFilter);
    setColorMode((["none", "margin", "vendor", "trade"].includes(f.colorMode) ? f.colorMode : "none") as ColorMode);
    setAddressField((["address", "city", "state", "zip"].includes(f.addressField) ? f.addressField : "address") as AddressField);
    setAddressValues(f.addressValues);
    setInfoField((["name", "code", "id"].includes(f.infoField) ? f.infoField : "name") as InfoField);
    setInfoValues(f.infoValues);
  }

  async function handleSaveTemplate() {
    if (!newTemplateName.trim()) return;
    setTemplateError(null);
    setSavingTemplate(true);
    try {
      const result = await saveSiteFilterTemplateAction(null, newTemplateName.trim(), currentFilters());
      if (result.error || !result.id) {
        setTemplateError(result.error ?? "Failed to save filter template.");
        return;
      }
      setLocalFilterTemplates((prev) =>
        [
          ...prev,
          {
            id: result.id as string,
            name: newTemplateName.trim(),
            filters: currentFilters(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSelectedTemplateId(result.id);
      setNewTemplateName("");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplateId) return;
    setTemplateError(null);
    setDeletingTemplate(true);
    try {
      const result = await deleteSiteFilterTemplateAction(selectedTemplateId);
      if (result.error) {
        setTemplateError(result.error);
        return;
      }
      setLocalFilterTemplates((prev) => prev.filter((t) => t.id !== selectedTemplateId));
      setSelectedTemplateId("");
    } finally {
      setDeletingTemplate(false);
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
      const siteMargin = (s: Site) =>
        computeSiteMargin(
          sumOrNull(s.tradeAssignments.map((a) => a.contractValue)),
          sumOrNull(s.tradeAssignments.map((a) => a.subPrice)),
        );
      const margins = plottable.map(siteMargin).filter((m): m is number => m !== null);
      const min = margins.length ? Math.min(...margins) : 0;
      const max = margins.length ? Math.max(...margins) : 0;
      const pins: MapPin[] = plottable.map((s) => {
        const margin = siteMargin(s);
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
      // A site can use a different vendor per trade, so pins show one wedge per distinct vendor
      // across the site's trade assignments (like "Color: by trade" does for trades).
      const vendorNamesOf = (s: Site) => {
        const names = Array.from(new Set(s.tradeAssignments.map((a) => a.vendorName ?? "Unassigned")));
        return names.length ? names : ["Unassigned"];
      };
      const allVendorNames = plottable.flatMap(vendorNamesOf);
      const palette = buildCategoricalPalette(allVendorNames);
      const pins: MapPin[] = plottable.map((s) => {
        const names = vendorNamesOf(s);
        return {
          id: s.id,
          lat: s.lat as number,
          lng: s.lng as number,
          label: s.name,
          colors: names.map((n) => palette.get(n) ?? NEUTRAL_PIN_COLOR),
          fields: s.tradeAssignments.map((a) => ({ key: a.trade, value: a.vendorName ?? "Unassigned" })),
        };
      });
      const presentNames = Array.from(new Set(allVendorNames));
      const legend: MapLegendProps = {
        mode: "categorical",
        entries: presentNames.map((n) => ({ label: n, color: palette.get(n) ?? NEUTRAL_PIN_COLOR })),
      };
      return { pins, legend };
    }

    if (colorMode === "trade") {
      // If the Trade filter is narrowed to specific trades, a pin only shows wedges for those
      // trades (not every trade the site has) -- so filtering to "Snow Removal" colors a
      // Snow Removal + Fire & Life Safety site solid blue instead of half red.
      const shownTrades = (s: Site) => (tradeFilter.length > 0 ? s.trades.filter((t) => tradeFilter.includes(t)) : s.trades);

      const pins: MapPin[] = plottable.map((s) => {
        const trades = shownTrades(s);
        return {
          id: s.id,
          lat: s.lat as number,
          lng: s.lng as number,
          label: s.name,
          colors: trades.length ? trades.map((t) => TRADE_COLORS[t as Trade] ?? NEUTRAL_PIN_COLOR) : [NEUTRAL_PIN_COLOR],
          fields: s.trades.length ? [{ key: "Trade", value: s.trades.join(", ") }] : [],
        };
      });
      const presentTrades = TRADE_OPTIONS.filter((t) => plottable.some((s) => shownTrades(s).includes(t)));
      const entries: { label: string; color: string }[] = presentTrades.map((t) => ({ label: t, color: TRADE_COLORS[t] }));
      if (plottable.some((s) => shownTrades(s).length === 0)) {
        entries.push({ label: "Unassigned", color: NEUTRAL_PIN_COLOR });
      }
      const legend: MapLegendProps = { mode: "categorical", entries };
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
  }, [filteredSites, colorMode, tradeFilter]);

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
          <Button variant="secondary" onClick={() => setUpdatingAssignments(true)}>
            Update trade assignments
          </Button>
          <Button onClick={() => setCreating(true)}>+ New site</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-purple-400/10 bg-[#150f26] px-4 py-2">
        <div className="flex items-start gap-1.5">
          <span className="pt-2 text-xs font-medium text-slate-400">Site Address</span>
          <select
            value={addressField}
            onChange={(e) => {
              setAddressField(e.target.value as AddressField);
              setAddressValues([]);
            }}
            className={`${inputClass} w-auto`}
          >
            <option value="address">Address</option>
            <option value="city">City</option>
            <option value="state">State</option>
            <option value="zip">Zip</option>
          </select>
          <TagInput
            values={addressValues}
            onChange={setAddressValues}
            suggestions={addressSuggestions}
            placeholder="Type to see matches…"
            className="w-56"
            footer={
              addressUnmatched.length > 0 ? (
                <p className="border-t border-purple-400/10 px-2 py-1.5 text-xs text-critical">
                  {addressUnmatched.length} didn&rsquo;t match any site: {addressUnmatched.slice(0, 5).join(", ")}
                  {addressUnmatched.length > 5 ? `, +${addressUnmatched.length - 5} more` : ""}
                </p>
              ) : null
            }
          />
        </div>
        <div className="flex items-start gap-1.5">
          <span className="pt-2 text-xs font-medium text-slate-400">Site Info</span>
          <select
            value={infoField}
            onChange={(e) => {
              setInfoField(e.target.value as InfoField);
              setInfoValues([]);
            }}
            className={`${inputClass} w-auto`}
          >
            <option value="name">Site Name</option>
            <option value="code">Site ID</option>
            <option value="id">Record ID</option>
          </select>
          <TagInput
            values={infoValues}
            onChange={setInfoValues}
            suggestions={infoSuggestions}
            placeholder="Type to see matches…"
            className="w-64"
            footer={
              infoUnmatched.length > 0 ? (
                <p className="border-t border-purple-400/10 px-2 py-1.5 text-xs text-critical">
                  {infoUnmatched.length} didn&rsquo;t match any site: {infoUnmatched.slice(0, 5).join(", ")}
                  {infoUnmatched.length > 5 ? `, +${infoUnmatched.length - 5} more` : ""}
                </p>
              ) : null
            }
          />
        </div>
        {(addressValues.length > 0 || infoValues.length > 0) && (
          <Button
            variant="ghost"
            onClick={() => {
              setAddressValues([]);
              setInfoValues([]);
            }}
          >
            Clear searches
          </Button>
        )}
        <MultiSelectDropdown
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
          values={companyFilters}
          onChange={setCompanyFilters}
          className="w-44"
          placeholder="All clients"
          noun="clients selected"
        />
        <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">All vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select
          value={subVendorFilter}
          onChange={(e) => setSubVendorFilter(e.target.value)}
          className={`${inputClass} w-auto`}
        >
          <option value="">All sub-vendors</option>
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

        <div className="flex items-center gap-1.5">
          <select
            value={selectedTemplateId}
            onChange={(e) => {
              setTemplateError(null);
              if (e.target.value) applyTemplate(e.target.value);
              else setSelectedTemplateId("");
            }}
            className={`${inputClass} w-auto`}
          >
            <option value="">Load filter template…</option>
            {localFilterTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {selectedTemplateId && (
            <Button variant="ghost" onClick={handleDeleteTemplate} disabled={deletingTemplate}>
              {deletingTemplate ? "Deleting…" : "Delete"}
            </Button>
          )}
          {!savingTemplate && (
            <Button variant="secondary" onClick={() => setSavingTemplate(true)}>
              Save filters…
            </Button>
          )}
        </div>
        {savingTemplate && (
          <div className="flex items-center gap-2">
            <input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Template name"
              className={`${inputClass} w-48`}
              autoFocus
            />
            <Button type="button" onClick={handleSaveTemplate} disabled={!newTemplateName.trim()}>
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSavingTemplate(false);
                setNewTemplateName("");
              }}
            >
              Cancel
            </Button>
          </div>
        )}
        {templateError && <span className="text-xs text-critical">{templateError}</span>}
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
                    <span className="truncate text-sm font-semibold text-slate-50">
                      {s.name}
                      {s.siteCode ? <span className="font-normal text-slate-400"> · {s.siteCode}</span> : null}
                    </span>
                    <span className="truncate text-xs text-slate-400">
                      {[
                        s.companyName,
                        ...Array.from(new Set(s.tradeAssignments.map((a) => a.vendorName).filter((v): v is string => !!v))),
                        ...s.trades,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No details"}
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
          opportunities={opportunities}
          contracts={contracts}
          onClose={() => setUploading(false)}
        />
      )}

      {updatingSheet && <UpdateSitesModal companies={companies} onClose={() => setUpdatingSheet(false)} />}

      {updatingAssignments && (
        <UpdateSiteTradeAssignmentsModal
          companies={companies}
          vendors={vendors}
          onClose={() => setUpdatingAssignments(false)}
        />
      )}
    </div>
  );
}
