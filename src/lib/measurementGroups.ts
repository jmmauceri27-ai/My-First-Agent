/** Groups the fixed set of sq. ft measurement labels by which trade they belong to, for display and bulk-upload organization. */
export interface MeasurementGroup {
  label: string;
  fields: readonly string[];
}

export const MEASUREMENT_GROUPS: readonly MeasurementGroup[] = [
  { label: "Snow", fields: ["Parking Lot", "Sidewalk", "Public Walk"] },
  { label: "Land", fields: ["Turf Area", "Bed Space", "Hedges", "Native Mow"] },
  { label: "Misc.", fields: ["Retention Wall", "Rock Bed"] },
] as const;

/** All fixed measurement labels, in group order. */
export const MEASUREMENT_FIELDS: readonly string[] = MEASUREMENT_GROUPS.flatMap((g) => g.fields);

const FIELD_TO_GROUP: ReadonlyMap<string, string> = new Map(
  MEASUREMENT_GROUPS.flatMap((g) => g.fields.map((f) => [f, g.label] as const)),
);

/** Which group a measurement label belongs to, or "Other" for a custom label outside the fixed set. */
export function measurementGroupOf(label: string): string {
  return FIELD_TO_GROUP.get(label) ?? "Other";
}
