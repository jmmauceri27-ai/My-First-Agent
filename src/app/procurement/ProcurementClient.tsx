"use client";

import { useState } from "react";
import type { DatasetSummary } from "@/lib/types";
import SiteMapClient from "./SiteMapClient";
import VendorMapClient from "./VendorMapClient";

type ActiveMap = "sites" | "vendors";

export default function ProcurementClient({ datasets }: { datasets: DatasetSummary[] }) {
  const [activeMap, setActiveMap] = useState<ActiveMap>("sites");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-purple-400/20 bg-[#150f26] px-4 py-2">
        <span className="mr-2 text-sm font-bold text-slate-50">🧾 Procurement</span>
        {(
          [
            { key: "sites", label: "Site Map" },
            { key: "vendors", label: "Vendor Prospecting Network" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveMap(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
              activeMap === tab.key
                ? "bg-brand-600 text-white shadow-sm shadow-brand-600/40"
                : "text-slate-400 hover:bg-purple-500/10 hover:text-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {activeMap === "sites" ? <SiteMapClient datasets={datasets} /> : <VendorMapClient datasets={datasets} />}
      </div>
    </div>
  );
}
