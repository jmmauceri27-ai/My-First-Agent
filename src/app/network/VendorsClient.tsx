"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import type { MapPin } from "@/components/SiteMap";
import type { Vendor } from "@/lib/networkTypes";
import NetworkNav from "./NetworkNav";
import VendorModal from "./VendorModal";

const SiteMap = dynamic(() => import("@/components/SiteMap"), { ssr: false });

export default function VendorsClient({ vendors }: { vendors: Vendor[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-400/10 bg-[#150f26] px-4 py-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-bold text-slate-50">🌐 Network</h1>
          <NetworkNav active="vendors" />
        </div>
        <Button onClick={() => setCreating(true)}>+ New vendor</Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1">
          {pins.length > 0 ? (
            <SiteMap pins={pins} onPinClick={(id) => router.push(`/network/vendors/${id}`)} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400">
              No vendors have a latitude/longitude yet — add one from the list to see it on the map.
            </div>
          )}
        </div>

        <div className="flex w-80 shrink-0 flex-col divide-y divide-purple-400/10 overflow-y-auto border-l border-purple-400/10 bg-[#150f26]">
          {vendors.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No vendors yet.</p>
          ) : (
            vendors.map((v) => (
              <button
                key={v.id}
                onClick={() => router.push(`/network/vendors/${v.id}`)}
                className="flex flex-col gap-0.5 px-4 py-3 text-left hover:bg-purple-500/5"
              >
                <span className="text-sm font-semibold text-slate-50">{v.name}</span>
                <span className="text-xs text-slate-400">
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
          onClose={() => setCreating(false)}
          onSaved={(id) => router.push(`/network/vendors/${id}`)}
        />
      )}
    </div>
  );
}
