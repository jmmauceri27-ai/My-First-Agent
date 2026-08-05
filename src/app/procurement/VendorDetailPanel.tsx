"use client";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { DatasetRecord } from "@/lib/types";

export default function VendorDetailPanel({
  vendorName,
  data,
  loading,
  error,
  onClose,
}: {
  vendorName: string;
  data: DatasetRecord | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card
        className="max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-50">{vendorName}</h2>

        {loading && <p className="mt-4 text-sm text-slate-400">Loading vendor details…</p>}
        {!loading && error && <p className="mt-4 text-sm text-critical">{error}</p>}
        {!loading && !error && !data && (
          <p className="mt-4 text-sm text-slate-400">
            No matching vendor found for &ldquo;{vendorName}&rdquo; in the linked dataset.
          </p>
        )}
        {!loading && !error && data && (
          <div className="mt-4 flex flex-col gap-3">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-0.5 text-sm">
                <span className="font-medium text-slate-400">{key}</span>
                <span className="text-slate-100">{value === null || value === undefined || value === "" ? "—" : String(value)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
