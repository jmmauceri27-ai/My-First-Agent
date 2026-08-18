"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import TradeSelect from "@/components/TradeSelect";
import { matchTrade } from "@/lib/trades";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import { buildTemplateXlsxAction } from "@/lib/sheetActions";
import type { Company, Contract, Opportunity } from "@/lib/crmTypes";
import type { SiteImportRow, Vendor } from "@/lib/networkTypes";
import { saveCompanyAction, saveContractAction } from "@/app/crm/actions";
import { bulkCreateSitesAction, parseSiteSheetAction } from "./actions";

type ParsedRow = Record<string, string | number | boolean | null>;

const NONE = "";

const SITE_TEMPLATE_COLUMNS = [
  "Site ID",
  "Site Name",
  "Latitude",
  "Longitude",
  "Address",
  "City",
  "State",
  "Zip",
  "Contract Value",
  "Sub Price",
];

const SITE_TEMPLATE_EXAMPLE = {
  "Site ID": "TDC0234",
  "Site Name": "Example Site",
  Latitude: 39.7392,
  Longitude: -104.9903,
  Address: "123 Main St",
  City: "Denver",
  State: "CO",
  Zip: "80202",
  "Contract Value": 12000,
  "Sub Price": 9000,
};

async function handleDownloadSiteTemplate() {
  const base64 = await buildTemplateXlsxAction([SITE_TEMPLATE_EXAMPLE], SITE_TEMPLATE_COLUMNS);
  downloadBase64Xlsx(base64, "site_upload_template.xlsx");
}

export default function UploadSitesModal({
  companies,
  vendors,
  opportunities,
  contracts,
  onClose,
}: {
  companies: Company[];
  vendors: Vendor[];
  opportunities: Opportunity[];
  contracts: Contract[];
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    siteCode: NONE,
    name: NONE,
    lat: NONE,
    lng: NONE,
    address: NONE,
    city: NONE,
    state: NONE,
    zip: NONE,
    contractValue: NONE,
    subPrice: NONE,
    clientName: NONE,
  });

  const [localCompanies, setLocalCompanies] = useState(companies);
  const [companyId, setCompanyId] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  const [localContracts, setLocalContracts] = useState(contracts);
  const [contractId, setContractId] = useState("");
  const [addingContract, setAddingContract] = useState(false);
  const [newContractName, setNewContractName] = useState("");

  const [opportunityId, setOpportunityId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [subVendorId, setSubVendorId] = useState("");
  const [trades, setTrades] = useState<string[]>([]);

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [unmatchedClientNames, setUnmatchedClientNames] = useState<string[]>([]);

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

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Please choose a file.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await parseSiteSheetAction(formData);
      if (result.error || !result.rows || !result.columns) {
        setUploadError(result.error ?? "Failed to parse file.");
        return;
      }
      setParsedRows(result.rows);
      setParsedColumns(result.columns);
      setMapping({
        siteCode: result.columns.find((c) => /site.?id/i.test(c)) ?? NONE,
        name: result.columns.find((c) => /name/i.test(c)) ?? result.columns[0] ?? NONE,
        lat: result.columns.find((c) => /^lat/i.test(c)) ?? NONE,
        lng: result.columns.find((c) => /^(lng|lon)/i.test(c)) ?? NONE,
        address: result.columns.find((c) => /address/i.test(c)) ?? NONE,
        city: result.columns.find((c) => /^city/i.test(c)) ?? NONE,
        state: result.columns.find((c) => /^state|^st$/i.test(c)) ?? NONE,
        zip: result.columns.find((c) => /zip|postal/i.test(c)) ?? NONE,
        contractValue: result.columns.find((c) => /contract/i.test(c)) ?? NONE,
        subPrice: result.columns.find((c) => /sub.?price/i.test(c)) ?? NONE,
        clientName: result.columns.find((c) => /client|company/i.test(c)) ?? NONE,
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to upload sites.");
    } finally {
      setUploading(false);
    }
  }

  async function handleImport() {
    if (!parsedRows || !mapping.name || !mapping.lat || !mapping.lng) return;
    setImportError(null);
    setImporting(true);
    try {
      const companyByName = new Map(localCompanies.map((c) => [c.name.trim().toLowerCase(), c.id]));
      const unmatched: string[] = [];
      const rows: SiteImportRow[] = parsedRows.map((row) => {
        const lat = Number(row[mapping.lat]);
        const lng = Number(row[mapping.lng]);
        const contractValue = mapping.contractValue ? Number(row[mapping.contractValue]) : NaN;
        const subPrice = mapping.subPrice ? Number(row[mapping.subPrice]) : NaN;

        let rowCompanyId: string | null | undefined;
        if (mapping.clientName) {
          const rawClientName = String(row[mapping.clientName] ?? "").trim();
          if (rawClientName) {
            const matchedId = companyByName.get(rawClientName.toLowerCase());
            if (matchedId) rowCompanyId = matchedId;
            else unmatched.push(rawClientName);
          }
        }

        return {
          siteCode: mapping.siteCode ? String(row[mapping.siteCode] ?? "").trim() || null : null,
          name: String(row[mapping.name] ?? "").trim() || "Untitled site",
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
          address: mapping.address ? String(row[mapping.address] ?? "").trim() || null : null,
          city: mapping.city ? String(row[mapping.city] ?? "").trim() || null : null,
          state: mapping.state ? String(row[mapping.state] ?? "").trim() || null : null,
          zip: mapping.zip ? String(row[mapping.zip] ?? "").trim() || null : null,
          contractValue: Number.isFinite(contractValue) ? contractValue : null,
          subPrice: Number.isFinite(subPrice) ? subPrice : null,
          subVendorPrice: null,
          companyId: rowCompanyId,
        };
      });
      const result = await bulkCreateSitesAction(
        {
          companyId: companyId || null,
          contractId: contractId || null,
          opportunityId: opportunityId || null,
          vendorId: vendorId || null,
          subVendorId: subVendorId || null,
          trades,
        },
        rows,
      );
      if (result.error || result.inserted == null) {
        setImportError(result.error ?? "Failed to import sites.");
        return;
      }
      setUnmatchedClientNames(Array.from(new Set(unmatched)));
      setImportedCount(result.inserted);
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  if (importedCount != null) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <Card className="w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-slate-50">Sites imported</h2>
          <p className="mt-2 text-sm text-slate-300">
            Added {importedCount} site{importedCount === 1 ? "" : "s"} to Network → Sites.
          </p>
          {unmatchedClientNames.length > 0 && (
            <p className="mt-2 text-xs text-critical">
              {unmatchedClientNames.length} client name{unmatchedClientNames.length === 1 ? "" : "s"} from the sheet
              didn&rsquo;t match any existing client (those sites used the selected Client above, or were left
              unassigned): {unmatchedClientNames.slice(0, 10).join(", ")}
              {unmatchedClientNames.length > 10 ? `, +${unmatchedClientNames.length - 10} more` : ""}
            </p>
          )}
          <div className="mt-6">
            <Button onClick={onClose}>Done</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-50">Upload sites</h2>
        <p className="mt-1 text-xs text-slate-400">
          Upload an .xlsx or .csv sheet of sites — every row shares the Client/Contract/Vendor/Opportunity links you
          pick below.{" "}
          <button type="button" onClick={handleDownloadSiteTemplate} className="text-brand-400 hover:underline">
            Download example template
          </button>
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            className="text-xs text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-800 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand-400"
          />
          <Button type="button" variant="secondary" onClick={handleUpload} disabled={uploading} className="w-fit">
            {uploading ? "Parsing…" : "Choose file"}
          </Button>
          {uploadError && <p className="text-xs text-critical">{uploadError}</p>}
        </div>

        {parsedRows && (
          <>
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-3">
              <p className="text-sm text-slate-300">
                Map this sheet&rsquo;s columns — {parsedRows.length} row{parsedRows.length === 1 ? "" : "s"} found.
              </p>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    ["siteCode", "Site ID column (optional)"],
                    ["name", "Name column"],
                    ["lat", "Latitude column"],
                    ["lng", "Longitude column"],
                    ["address", "Address column (optional)"],
                    ["city", "City column (optional)"],
                    ["state", "State column (optional)"],
                    ["zip", "Zip column (optional)"],
                    ["contractValue", "Contract value column (optional)"],
                    ["subPrice", "Sub price column (optional)"],
                    ["clientName", "Client Name column (optional, matched per-row)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-300">{label}</span>
                    <select
                      value={mapping[key]}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value }))}
                      className={inputClass}
                    >
                      <option value={NONE}>
                        {key === "name" || key === "lat" || key === "lng" ? "Choose a column…" : "None"}
                      </option>
                      {parsedColumns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-3">
              <p className="text-sm text-slate-300">
                {mapping.clientName
                  ? "Applied to every imported site, except Client — each row uses its matched Client Name (this is the fallback for rows that don't match)"
                  : "Apply to every imported site"}
              </p>

              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Client{mapping.clientName ? " (fallback)" : ""}</span>
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
                        const contract = contractsForCompany.find((c) => c.id === nextId);
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
                    const opportunity = opportunitiesForCompany.find((o) => o.id === nextId);
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
                <span className="font-medium text-slate-300">Trade (optional)</span>
                <TradeSelect value={trades} onChange={setTrades} placeholder="(none)" />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Vendor (optional)</span>
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
                <span className="font-medium text-slate-300">Sub-Vendor (optional)</span>
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

            <Button
              type="button"
              onClick={handleImport}
              disabled={importing || !mapping.name || !mapping.lat || !mapping.lng}
              className="mt-4 w-fit"
            >
              {importing ? "Importing…" : `Import ${parsedRows.length} site${parsedRows.length === 1 ? "" : "s"}`}
            </Button>
            {importError && <p className="mt-2 text-xs text-critical">{importError}</p>}
          </>
        )}

        <div className="mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
