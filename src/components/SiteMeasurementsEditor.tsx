"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/formClasses";
import { formatSquareFeet, parseMeasurementInput } from "@/lib/siteMapColor";
import { MEASUREMENT_FIELDS, MEASUREMENT_GROUPS } from "@/lib/measurementGroups";
import type { SiteMeasurements } from "@/lib/networkTypes";

/** Shared Measurements + Counts editor used by both the Site quick-edit modal and the Site detail page. */
export default function SiteMeasurementsEditor({
  measurements,
  onChangeMeasurements,
  counts,
  onChangeCounts,
  className = "",
}: {
  measurements: SiteMeasurements;
  onChangeMeasurements: (next: SiteMeasurements) => void;
  counts: SiteMeasurements;
  onChangeCounts: (next: SiteMeasurements) => void;
  className?: string;
}) {
  const [newMeasurementLabel, setNewMeasurementLabel] = useState("");
  const [newMeasurementValue, setNewMeasurementValue] = useState("");
  const [newCountLabel, setNewCountLabel] = useState("");
  const [newCountValue, setNewCountValue] = useState("");

  const groupedMeasurements = useMemo(() => {
    const knownLabels = new Set(MEASUREMENT_FIELDS);
    const groups = MEASUREMENT_GROUPS.map((g) => ({
      label: g.label,
      entries: g.fields
        .filter((f) => f in measurements)
        .map((f): [string, number] => [f, measurements[f]]),
    }));
    const other = Object.entries(measurements).filter(([label]) => !knownLabels.has(label));
    if (other.length > 0) groups.push({ label: "Other", entries: other });
    return groups;
  }, [measurements]);

  function addMeasurement() {
    const label = newMeasurementLabel.trim();
    if (!label) return;
    const value = Number(parseMeasurementInput(newMeasurementValue));
    if (!Number.isFinite(value)) return;
    onChangeMeasurements({ ...measurements, [label]: value });
    setNewMeasurementLabel("");
    setNewMeasurementValue("");
  }

  function removeMeasurement(label: string) {
    const next = { ...measurements };
    delete next[label];
    onChangeMeasurements(next);
  }

  function addCount() {
    const label = newCountLabel.trim();
    if (!label) return;
    const value = Number(newCountValue);
    if (!Number.isFinite(value)) return;
    onChangeCounts({ ...counts, [label]: value });
    setNewCountLabel("");
    setNewCountValue("");
  }

  function removeCount(label: string) {
    const next = { ...counts };
    delete next[label];
    onChangeCounts(next);
  }

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${className}`}>
      <div>
        <h3 className="text-sm font-bold text-slate-50">Measurements</h3>
        <div className="mt-2 flex flex-col gap-3">
          {groupedMeasurements.every((g) => g.entries.length === 0) ? (
            <p className="text-xs text-slate-400">No measurements yet.</p>
          ) : (
            groupedMeasurements
              .filter((g) => g.entries.length > 0)
              .map((group) => (
                <div key={group.label} className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                  {group.entries.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-300">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-slate-50">{formatSquareFeet(value)}</span>
                        <button
                          type="button"
                          onClick={() => removeMeasurement(label)}
                          className="text-xs font-semibold text-critical hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newMeasurementLabel}
            onChange={(e) => setNewMeasurementLabel(e.target.value)}
            placeholder="e.g. Turf Area"
            className={`${inputClass} min-w-[120px] flex-1`}
          />
          <input
            value={newMeasurementValue}
            onChange={(e) => setNewMeasurementValue(e.target.value)}
            placeholder="Value (sq. ft)"
            className={`${inputClass} min-w-[100px] flex-1`}
          />
          <Button type="button" variant="secondary" onClick={addMeasurement} className="w-fit">
            Add
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-50">Counts</h3>
        <div className="mt-2 flex flex-col gap-1">
          {Object.entries(counts).length === 0 ? (
            <p className="text-xs text-slate-400">No counts yet.</p>
          ) : (
            Object.entries(counts).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-300">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-slate-50">{value.toLocaleString("en-US")}</span>
                  <button
                    type="button"
                    onClick={() => removeCount(label)}
                    className="text-xs font-semibold text-critical hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newCountLabel}
            onChange={(e) => setNewCountLabel(e.target.value)}
            placeholder="e.g. Palm Trees"
            className={`${inputClass} min-w-[120px] flex-1`}
          />
          <input
            value={newCountValue}
            onChange={(e) => setNewCountValue(e.target.value)}
            placeholder="Count"
            className={`${inputClass} min-w-[100px] flex-1`}
          />
          <Button type="button" variant="secondary" onClick={addCount} className="w-fit">
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
