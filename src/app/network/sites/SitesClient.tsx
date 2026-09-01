"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  computeSiteMarginPercent,
  formatCurrency,
  formatPercent,
  formatSquareFeet,
  gradientColorForRatio,
} from "@/lib/siteMapColor";
import { TRADE_COLORS, TRADE_OPTIONS } from "@/lib/trades";
import type { Trade } from "@/lib/trades";
import { MONTHS, sumRateSchedule } from "@/lib/rateSchedule";
import type { DatasetRecord } from "@/lib/types";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import type { Company, Contract, Opportunity } from "@/lib/crmTypes";
import type { Site, SiteFilterTemplate, SiteFilters, Vendor } from "@/lib/networkTypes";
import NetworkNav from "../NetworkNav";
import SiteModal from "../SiteModal";
import UploadSitesModal from "../UploadSitesModal";
import UpdateSitesModal from "../UpdateSitesModal";
import UpdateSiteTradeAssignmentsModal from "../UpdateSiteTradeAssignmentsModal";
import UpdateSiteMeasurementsModal from "../UpdateSiteMeasurementsModal";
import UpdateSiteRateScheduleModal from "../UpdateSiteRateScheduleModal";
import UpdateSiteExpenseScheduleModal from "../UpdateSiteExpenseScheduleModal";
import {
  bulkAssignContractAction,
  bulkAssignTradesAction,
  bulkAssignVendorForTradeAction,
  bulkDeleteSitesAction,
  bulkUnassignContractAction,
  bulkUnassignTradesAction,
  bulkUnassignVendorAction,
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
  "Billing Type",
  "Trade",
  "Address",
  "City",
  "State",
  "Zip",
  "Latitude",
  "Longitude",
  "Contract Value",
  "Rate Schedule",
  "Annual Rate Total",
  "Sub Price",
  "Sub-Vendor Price",
  "Vendor Expense Schedule",
  "Annual Vendor Expense Total",
  "Sub-Vendor Expense Schedule",
  "Annual Sub-Vendor Expense Total",
  "Measurements",
  "Counts",
  "Last Season Snowfall",
  "Notes",
];

function sumOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? present.reduce((a, b) => a + b, 0) : null;
}

function scheduleExportSummary(assignments: Site["tradeAssignments"], pick: (a: Site["tradeAssignments"][number]) => Record<string, number>): string {
  return assignments
    .filter((a) => Object.keys(pick(a)).length)
    .map((a) => {
      const schedule = pick(a);
      return `${a.trade}: ${MONTHS.filter((m) => schedule[m] != null)
        .map((m) => `${m} ${formatCurrency(schedule[m])}`)
        .join(", ")}`;
    })
    .join("; ");
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
    Contract: s.tradeAssignments
      .filter((a) => a.contractName)
      .map((a) => `${a.trade}: ${a.contractName}`)
      .join("; "),
    "Billing Type": s.tradeAssignments
      .filter((a) => a.billingType)
      .map((a) => `${a.trade}: ${a.billingType}`)
      .join("; "),
    Trade: s.trades.join(", "),
    Address: s.address ?? "",
    City: s.city ?? "",
    State: s.state ?? "",
    Zip: s.zip ?? "",
    Latitude: s.lat,
    Longitude: s.lng,
    "Contract Value": sumOrNull(s.tradeAssignments.map((a) => a.contractValue)),
    "Rate Schedule": scheduleExportSummary(s.tradeAssignments, (a) => a.rateSchedule),
    "Annual Rate Total": sumOrNull(s.tradeAssignments.map((a) => sumRateSchedule(a.rateSchedule))),
    "Sub Price": sumOrNull(s.tradeAssignments.map((a) => a.subPrice)),
    "Sub-Vendor Price": sumOrNull(s.tradeAssignments.map((a) => a.subVendorPrice)),
    "Vendor Expense Schedule": scheduleExportSummary(s.tradeAssignments, (a) => a.vendorExpenseSchedule),
    "Annual Vendor Expense Total": sumOrNull(s.tradeAssignments.map((a) => sumRateSchedule(a.vendorExpenseSchedule))),
    "Sub-Vendor Expense Schedule": scheduleExportSummary(s.tradeAssignments, (a) => a.subVendorExpenseSchedule),
    "Annual Sub-Vendor Expense Total": sumOrNull(
      s.tradeAssignments.map((a) => sumRateSchedule(a.subVendorExpenseSchedule)),
    ),
    Measurements: Object.entries(s.measurements)
      .map(([label, value]) => `${label}: ${formatSquareFeet(value)}`)
      .join("; "),
    Counts: Object.entries(s.counts)
      .map(([label, value]) => `${label}: ${value}`)
      .join("; "),
    "Last Season Snowfall": s.lastSeasonSnowfall,
    Notes: s.notes ?? "",
  };
}

function distinctValues(sites: Site[], pick: (s: Site) => string | null): string[] {
  return Array.from(new Set(sites.map(pick).filter((v): v is string => !!v))).sort();
}

function infoValueOf(s: Site, field: InfoField): string {
  return field === "name" ? s.name : field === "code" ? (s.siteCode ?? "") : s.id;
}

/** A compact, labeled section of the vertical filter sidebar. */
function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-purple-400/10 pb-3 last:border-b-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

/** A small labeled wrapper around one filter control, for consistent spacing in the sidebar. */
function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-400">{label}</span>
      {children}
    </div>
  );
}

const FILTERS_STORAGE_KEY = "network-sites-filters";

const DEFAULT_FILTERS: SiteFilters = {
  companyFilters: [],
  vendorFilter: "",
  subVendorFilter: "",
  contractFilter: "",
  tradeFilter: [],
  assignmentTrade: "",
  assignmentVendorStatus: "",
  assignmentSubVendorStatus: "",
  colorMode: "none",
  addressField: "address",
  addressValues: [],
  infoField: "name",
  infoValues: [],
};

/** Restores the filter bar's last state (saved to sessionStorage on every change) so navigating to a site's
 * detail page and back doesn't reset the Sites screen's filters/search/selected color mode. */
function loadPersistedFilters(): SiteFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const raw = window.sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<SiteFilters>;
    return {
      ...DEFAULT_FILTERS,
      ...parsed,
      colorMode: (["none", "margin", "vendor", "trade"].includes(parsed.colorMode ?? "") ? parsed.colorMode : "none") as string,
      addressField: (["address", "city", "state", "zip"].includes(parsed.addressField ?? "")
        ? parsed.addressField
        : "address") as string,
      infoField: (["name", "code", "id"].includes(parsed.infoField ?? "") ? parsed.infoField : "name") as string,
    };
  } catch {
    return DEFAULT_FILTERS;
  }
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
  const [updatingMeasurements, setUpdatingMeasurements] = useState(false);
  const [updatingRateSchedule, setUpdatingRateSchedule] = useState(false);
  const [updatingExpenseSchedule, setUpdatingExpenseSchedule] = useState(false);
  const [showUpdateMenu, setShowUpdateMenu] = useState(false);
  const updateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (updateMenuRef.current && !updateMenuRef.current.contains(e.target as Node)) {
        setShowUpdateMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [initialFilters] = useState<SiteFilters>(loadPersistedFilters);
  const [addressField, setAddressField] = useState<AddressField>(initialFilters.addressField as AddressField);
  const [addressValues, setAddressValues] = useState<string[]>(initialFilters.addressValues);
  const [infoField, setInfoField] = useState<InfoField>(initialFilters.infoField as InfoField);
  const [infoValues, setInfoValues] = useState<string[]>(initialFilters.infoValues);
  const [companyFilters, setCompanyFilters] = useState<string[]>(initialFilters.companyFilters);
  const [vendorFilter, setVendorFilter] = useState(initialFilters.vendorFilter);
  const [subVendorFilter, setSubVendorFilter] = useState(initialFilters.subVendorFilter);
  const [contractFilter, setContractFilter] = useState(initialFilters.contractFilter);
  const [tradeFilter, setTradeFilter] = useState<string[]>(initialFilters.tradeFilter);
  const [assignmentTrade, setAssignmentTrade] = useState(initialFilters.assignmentTrade);
  const [assignmentVendorStatus, setAssignmentVendorStatus] = useState(initialFilters.assignmentVendorStatus);
  const [assignmentSubVendorStatus, setAssignmentSubVendorStatus] = useState(initialFilters.assignmentSubVendorStatus);
  const [colorMode, setColorMode] = useState<ColorMode>(initialFilters.colorMode as ColorMode);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTrades, setBulkTrades] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkRemoveTrades, setBulkRemoveTrades] = useState<string[]>([]);
  const [unassigningTrades, setUnassigningTrades] = useState(false);
  const [bulkRemoveTradesError, setBulkRemoveTradesError] = useState<string | null>(null);
  const [bulkVendorTrade, setBulkVendorTrade] = useState("");
  const [bulkVendorId, setBulkVendorId] = useState("");
  const [bulkSubVendorId, setBulkSubVendorId] = useState("");
  const [assigningVendor, setAssigningVendor] = useState(false);
  const [bulkVendorError, setBulkVendorError] = useState<string | null>(null);
  const [unassigningVendor, setUnassigningVendor] = useState(false);
  const [bulkContractTrade, setBulkContractTrade] = useState("");
  const [bulkContractId, setBulkContractId] = useState("");
  const [assigningContract, setAssigningContract] = useState(false);
  const [bulkContractError, setBulkContractError] = useState<string | null>(null);
  const [unassigningContract, setUnassigningContract] = useState(false);
  const [deletingSites, setDeletingSites] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
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
      if (contractFilter && !s.tradeAssignments.some((a) => a.contractId === contractFilter)) return false;
      if (tradeFilter.length > 0 && !s.trades.some((t) => tradeFilter.includes(t))) return false;
      if (assignmentTrade && assignmentVendorStatus) {
        const hasVendor = s.tradeAssignments.some((a) => a.trade === assignmentTrade && a.vendorId);
        if (assignmentVendorStatus === "assigned" && !hasVendor) return false;
        if (assignmentVendorStatus === "unassigned" && hasVendor) return false;
      }
      if (assignmentTrade && assignmentSubVendorStatus) {
        const hasSubVendor = s.tradeAssignments.some((a) => a.trade === assignmentTrade && a.subVendorId);
        if (assignmentSubVendorStatus === "assigned" && !hasSubVendor) return false;
        if (assignmentSubVendorStatus === "unassigned" && hasSubVendor) return false;
      }
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
    assignmentTrade,
    assignmentVendorStatus,
    assignmentSubVendorStatus,
    addressField,
    addressValues,
    infoField,
    infoValues,
  ]);

  useEffect(() => {
    const filters: SiteFilters = {
      companyFilters,
      vendorFilter,
      subVendorFilter,
      contractFilter,
      tradeFilter,
      assignmentTrade,
      assignmentVendorStatus,
      assignmentSubVendorStatus,
      colorMode,
      addressField,
      addressValues,
      infoField,
      infoValues,
    };
    window.sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [
    companyFilters,
    vendorFilter,
    subVendorFilter,
    contractFilter,
    tradeFilter,
    assignmentTrade,
    assignmentVendorStatus,
    assignmentSubVendorStatus,
    colorMode,
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

  async function handleBulkUnassignTrades() {
    if (selectedIds.size === 0 || bulkRemoveTrades.length === 0) return;
    if (
      !window.confirm(
        `Remove ${bulkRemoveTrades.join(", ")} from ${selectedIds.size} site${selectedIds.size === 1 ? "" : "s"}? This also deletes that trade's Vendor/Sub-Vendor/Contract/pricing on those sites.`,
      )
    ) {
      return;
    }
    setBulkRemoveTradesError(null);
    setUnassigningTrades(true);
    try {
      const result = await bulkUnassignTradesAction(Array.from(selectedIds), bulkRemoveTrades);
      if (result.error) {
        setBulkRemoveTradesError(result.error);
        return;
      }
      setSelectedIds(new Set());
      setBulkRemoveTrades([]);
      router.refresh();
    } finally {
      setUnassigningTrades(false);
    }
  }

  async function handleBulkAssignVendor() {
    if (selectedIds.size === 0 || !bulkVendorTrade || !bulkVendorId) return;
    setBulkVendorError(null);
    setAssigningVendor(true);
    try {
      const result = await bulkAssignVendorForTradeAction(
        Array.from(selectedIds),
        bulkVendorTrade,
        bulkVendorId,
        bulkSubVendorId || null,
      );
      if (result.error) {
        setBulkVendorError(result.error);
        return;
      }
      setSelectedIds(new Set());
      setBulkVendorTrade("");
      setBulkVendorId("");
      setBulkSubVendorId("");
      router.refresh();
    } finally {
      setAssigningVendor(false);
    }
  }

  async function handleBulkUnassignVendor() {
    if (selectedIds.size === 0 || !bulkVendorTrade) return;
    setBulkVendorError(null);
    setUnassigningVendor(true);
    try {
      const result = await bulkUnassignVendorAction(Array.from(selectedIds), bulkVendorTrade);
      if (result.error) {
        setBulkVendorError(result.error);
        return;
      }
      setSelectedIds(new Set());
      setBulkVendorTrade("");
      setBulkVendorId("");
      setBulkSubVendorId("");
      router.refresh();
    } finally {
      setUnassigningVendor(false);
    }
  }

  async function handleBulkAssignContract() {
    if (selectedIds.size === 0 || !bulkContractTrade || !bulkContractId) return;
    setBulkContractError(null);
    setAssigningContract(true);
    try {
      const result = await bulkAssignContractAction(Array.from(selectedIds), bulkContractTrade, bulkContractId);
      if (result.error) {
        setBulkContractError(result.error);
        return;
      }
      setSelectedIds(new Set());
      setBulkContractTrade("");
      setBulkContractId("");
      router.refresh();
    } finally {
      setAssigningContract(false);
    }
  }

  async function handleBulkUnassignContract() {
    if (selectedIds.size === 0 || !bulkContractTrade) return;
    setBulkContractError(null);
    setUnassigningContract(true);
    try {
      const result = await bulkUnassignContractAction(Array.from(selectedIds), bulkContractTrade);
      if (result.error) {
        setBulkContractError(result.error);
        return;
      }
      setSelectedIds(new Set());
      setBulkContractTrade("");
      setBulkContractId("");
      router.refresh();
    } finally {
      setUnassigningContract(false);
    }
  }


  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Delete ${count} site${count === 1 ? "" : "s"}? This can't be undone.`)) return;
    setBulkDeleteError(null);
    setDeletingSites(true);
    try {
      const result = await bulkDeleteSitesAction(Array.from(selectedIds));
      if (result.error) {
        setBulkDeleteError(result.error);
        return;
      }
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setDeletingSites(false);
    }
  }

  function currentFilters(): SiteFilters {
    return {
      companyFilters,
      vendorFilter,
      subVendorFilter,
      contractFilter,
      tradeFilter,
      assignmentTrade,
      assignmentVendorStatus,
      assignmentSubVendorStatus,
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
    setAssignmentTrade(f.assignmentTrade);
    setAssignmentVendorStatus(f.assignmentVendorStatus);
    setAssignmentSubVendorStatus(f.assignmentSubVendorStatus);
    setColorMode((["none", "margin", "vendor", "trade"].includes(f.colorMode) ? f.colorMode : "none") as ColorMode);
    setAddressField((["address", "city", "state", "zip"].includes(f.addressField) ? f.addressField : "address") as AddressField);
    setAddressValues(f.addressValues);
    setInfoField((["name", "code", "id"].includes(f.infoField) ? f.infoField : "name") as InfoField);
    setInfoValues(f.infoValues);
  }

  const hasActiveFilters =
    addressValues.length > 0 ||
    infoValues.length > 0 ||
    companyFilters.length > 0 ||
    vendorFilter !== "" ||
    subVendorFilter !== "" ||
    contractFilter !== "" ||
    tradeFilter.length > 0 ||
    assignmentTrade !== "" ||
    assignmentVendorStatus !== "" ||
    assignmentSubVendorStatus !== "";

  function clearAllFilters() {
    setAddressField("address");
    setAddressValues([]);
    setInfoField("name");
    setInfoValues([]);
    setCompanyFilters([]);
    setVendorFilter("");
    setSubVendorFilter("");
    setContractFilter("");
    setTradeFilter([]);
    setAssignmentTrade("");
    setAssignmentVendorStatus("");
    setAssignmentSubVendorStatus("");
    setSelectedTemplateId("");
    setTemplateError(null);
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
      // Colored (and legend-ranked) by margin as a % of Contract Value, not raw dollar margin -- a $500
      // spread on a $1,000 contract is a very different story than the same $500 spread on a $50,000
      // contract, and percentage is what makes those comparable across differently-sized sites.
      const siteMarginPercent = (s: Site) =>
        computeSiteMarginPercent(
          sumOrNull(s.tradeAssignments.map((a) => a.contractValue)),
          sumOrNull(s.tradeAssignments.map((a) => a.subPrice)),
        );
      const siteMarginDollar = (s: Site) =>
        computeSiteMargin(
          sumOrNull(s.tradeAssignments.map((a) => a.contractValue)),
          sumOrNull(s.tradeAssignments.map((a) => a.subPrice)),
        );
      const percents = plottable.map(siteMarginPercent).filter((m): m is number => m !== null);
      const min = percents.length ? Math.min(...percents) : 0;
      const max = percents.length ? Math.max(...percents) : 0;
      const pins: MapPin[] = plottable.map((s) => {
        const percent = siteMarginPercent(s);
        const dollar = siteMarginDollar(s);
        const ratio = percent === null || max === min ? null : (percent - min) / (max - min);
        const fields: { key: string; value: string }[] = [];
        if (percent !== null) fields.push({ key: "Margin %", value: formatPercent(percent) });
        if (dollar !== null) fields.push({ key: "Margin $", value: formatCurrency(dollar) });
        return {
          id: s.id,
          lat: s.lat as number,
          lng: s.lng as number,
          label: s.name,
          color: ratio === null ? DEFAULT_PIN_COLOR : gradientColorForRatio(ratio),
          fields,
        };
      });
      const legend: MapLegendProps | null = percents.length ? { mode: "gradient", min, max, format: "percent" } : null;
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
            Upload
          </Button>
          <div ref={updateMenuRef} className="relative">
            <Button variant="secondary" onClick={() => setShowUpdateMenu((prev) => !prev)}>
              Update
            </Button>
            {showUpdateMenu && (
              <div className="absolute right-0 z-[2000] mt-1 w-56 rounded-lg border border-purple-400/40 bg-[#3c2b6b] p-1.5 shadow-xl shadow-black/50">
                <button
                  type="button"
                  onClick={() => {
                    setUpdatingSheet(true);
                    setShowUpdateMenu(false);
                  }}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-slate-100 hover:bg-purple-500/10"
                >
                  Sites
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUpdatingAssignments(true);
                    setShowUpdateMenu(false);
                  }}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-slate-100 hover:bg-purple-500/10"
                >
                  Trade assignments
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUpdatingMeasurements(true);
                    setShowUpdateMenu(false);
                  }}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-slate-100 hover:bg-purple-500/10"
                >
                  Measurements
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUpdatingRateSchedule(true);
                    setShowUpdateMenu(false);
                  }}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-slate-100 hover:bg-purple-500/10"
                >
                  Rate schedule
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUpdatingExpenseSchedule(true);
                    setShowUpdateMenu(false);
                  }}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-slate-100 hover:bg-purple-500/10"
                >
                  Expense schedule
                </button>
              </div>
            )}
          </div>
          <Button variant="secondary" onClick={() => router.push("/network/sites/duplicates")}>
            Duplicate sites
          </Button>
          <Button onClick={() => setCreating(true)}>+ New site</Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-2 border-b border-purple-400/10 bg-[#1a1330] px-4 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-300">{selectedIds.size} selected</span>
            <TradeSelect value={bulkTrades} onChange={setBulkTrades} className="w-56" placeholder="Add trade(s)…" />
            <Button variant="secondary" onClick={handleBulkAssign} disabled={bulkTrades.length === 0 || assigning}>
              {assigning ? "Assigning…" : "Assign to selected"}
            </Button>
            <TradeSelect
              value={bulkRemoveTrades}
              onChange={setBulkRemoveTrades}
              className="w-56"
              placeholder="Remove trade(s)…"
            />
            <Button
              variant="secondary"
              onClick={handleBulkUnassignTrades}
              disabled={bulkRemoveTrades.length === 0 || unassigningTrades}
            >
              {unassigningTrades ? "Removing…" : "Remove from selected"}
            </Button>
            <Button variant="danger" onClick={handleBulkDelete} disabled={deletingSites}>
              {deletingSites ? "Deleting…" : "Delete selected"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedIds(new Set());
                setBulkTrades([]);
                setBulkError(null);
                setBulkRemoveTrades([]);
                setBulkRemoveTradesError(null);
                setBulkVendorTrade("");
                setBulkVendorId("");
                setBulkSubVendorId("");
                setBulkVendorError(null);
                setBulkContractTrade("");
                setBulkContractId("");
                setBulkContractError(null);
                setBulkDeleteError(null);
              }}
            >
              Clear selection
            </Button>
            {bulkError && <span className="text-xs text-critical">{bulkError}</span>}
            {bulkRemoveTradesError && <span className="text-xs text-critical">{bulkRemoveTradesError}</span>}
            {bulkDeleteError && <span className="text-xs text-critical">{bulkDeleteError}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400">Assign/unassign vendor for one trade:</span>
            <select
              value={bulkVendorTrade}
              onChange={(e) => setBulkVendorTrade(e.target.value)}
              className={`${inputClass} w-48`}
            >
              <option value="">Trade…</option>
              {TRADE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={bulkVendorId}
              onChange={(e) => setBulkVendorId(e.target.value)}
              className={`${inputClass} w-48`}
            >
              <option value="">Vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <select
              value={bulkSubVendorId}
              onChange={(e) => setBulkSubVendorId(e.target.value)}
              className={`${inputClass} w-48`}
            >
              <option value="">Sub-Vendor (optional)…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={handleBulkAssignVendor}
              disabled={!bulkVendorTrade || !bulkVendorId || assigningVendor}
            >
              {assigningVendor ? "Assigning…" : "Assign vendor to selected"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleBulkUnassignVendor}
              disabled={!bulkVendorTrade || unassigningVendor}
            >
              {unassigningVendor ? "Unassigning…" : "Unassign vendor from selected"}
            </Button>
            {bulkVendorError && <span className="text-xs text-critical">{bulkVendorError}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400">Assign/unassign contract for one trade:</span>
            <select
              value={bulkContractTrade}
              onChange={(e) => setBulkContractTrade(e.target.value)}
              className={`${inputClass} w-48`}
            >
              <option value="">Trade…</option>
              {TRADE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={bulkContractId}
              onChange={(e) => setBulkContractId(e.target.value)}
              className={`${inputClass} w-48`}
            >
              <option value="">Contract…</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={handleBulkAssignContract}
              disabled={!bulkContractTrade || !bulkContractId || assigningContract}
            >
              {assigningContract ? "Assigning…" : "Assign to selected"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleBulkUnassignContract}
              disabled={!bulkContractTrade || unassigningContract}
            >
              {unassigningContract ? "Unassigning…" : "Unassign contract from selected"}
            </Button>
            {bulkContractError && <span className="text-xs text-critical">{bulkContractError}</span>}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-purple-400/10 bg-[#150f26] p-3">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-slate-50">Filters</h2>
            <Button variant="secondary" onClick={clearAllFilters} disabled={!hasActiveFilters} className="w-full">
              Clear all filters
            </Button>
          </div>

          <FilterGroup title="Search">
            <FilterField label="Site Address">
              <div className="flex flex-col gap-1.5">
                <select
                  value={addressField}
                  onChange={(e) => {
                    setAddressField(e.target.value as AddressField);
                    setAddressValues([]);
                  }}
                  className={`${inputClass} w-full`}
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
                  className="w-full"
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
            </FilterField>
            <FilterField label="Site Info">
              <div className="flex flex-col gap-1.5">
                <select
                  value={infoField}
                  onChange={(e) => {
                    setInfoField(e.target.value as InfoField);
                    setInfoValues([]);
                  }}
                  className={`${inputClass} w-full`}
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
                  className="w-full"
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
            </FilterField>
          </FilterGroup>

          <FilterGroup title="Client & Vendor">
            <FilterField label="Clients">
              <MultiSelectDropdown
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
                values={companyFilters}
                onChange={setCompanyFilters}
                className="w-full"
                placeholder="All clients"
                noun="clients selected"
              />
            </FilterField>
            <FilterField label="Vendor">
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className={`${inputClass} w-full`}
              >
                <option value="">All vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Sub-Vendor">
              <select
                value={subVendorFilter}
                onChange={(e) => setSubVendorFilter(e.target.value)}
                className={`${inputClass} w-full`}
              >
                <option value="">All sub-vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterGroup>

          <FilterGroup title="Trade & Assignment">
            <FilterField label="Contract">
              <select
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className={`${inputClass} w-full`}
              >
                <option value="">All contracts</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Trade">
              <TradeSelect value={tradeFilter} onChange={setTradeFilter} className="w-full" placeholder="All trades" />
            </FilterField>
            <FilterField label="Assignment trade">
              <select
                value={assignmentTrade}
                onChange={(e) => setAssignmentTrade(e.target.value)}
                className={`${inputClass} w-full`}
              >
                <option value="">Any trade</option>
                {TRADE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Vendor status">
              <select
                value={assignmentVendorStatus}
                onChange={(e) => setAssignmentVendorStatus(e.target.value)}
                disabled={!assignmentTrade}
                className={`${inputClass} w-full disabled:opacity-50`}
              >
                <option value="">Any</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </FilterField>
            <FilterField label="Sub-Vendor status">
              <select
                value={assignmentSubVendorStatus}
                onChange={(e) => setAssignmentSubVendorStatus(e.target.value)}
                disabled={!assignmentTrade}
                className={`${inputClass} w-full disabled:opacity-50`}
              >
                <option value="">Any</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </FilterField>
          </FilterGroup>

          <FilterGroup title="Display">
            <FilterField label="Pin color">
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as ColorMode)}
                className={`${inputClass} w-full`}
              >
                <option value="none">None</option>
                <option value="margin">By margin %</option>
                <option value="vendor">By vendor</option>
                <option value="trade">By trade</option>
              </select>
            </FilterField>
            {legend && <MapLegend {...legend} />}
          </FilterGroup>

          <FilterGroup title="Saved Filters">
            <FilterField label="Load template">
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  setTemplateError(null);
                  if (e.target.value) applyTemplate(e.target.value);
                  else setSelectedTemplateId("");
                }}
                className={`${inputClass} w-full`}
              >
                <option value="">None</option>
                {localFilterTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <div className="flex flex-wrap items-center gap-2">
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
              <div className="flex flex-col gap-2">
                <input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Template name"
                  className={`${inputClass} w-full`}
                  autoFocus
                />
                <div className="flex gap-2">
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
              </div>
            )}
            {templateError && <span className="text-xs text-critical">{templateError}</span>}
          </FilterGroup>
        </div>

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
        <UploadSitesModal companies={companies} opportunities={opportunities} onClose={() => setUploading(false)} />
      )}

      {updatingSheet && <UpdateSitesModal companies={companies} onClose={() => setUpdatingSheet(false)} />}

      {updatingAssignments && (
        <UpdateSiteTradeAssignmentsModal
          companies={companies}
          vendors={vendors}
          contracts={contracts}
          onClose={() => setUpdatingAssignments(false)}
        />
      )}

      {updatingMeasurements && (
        <UpdateSiteMeasurementsModal companies={companies} onClose={() => setUpdatingMeasurements(false)} />
      )}

      {updatingRateSchedule && (
        <UpdateSiteRateScheduleModal companies={companies} onClose={() => setUpdatingRateSchedule(false)} />
      )}

      {updatingExpenseSchedule && (
        <UpdateSiteExpenseScheduleModal companies={companies} onClose={() => setUpdatingExpenseSchedule(false)} />
      )}
    </div>
  );
}
