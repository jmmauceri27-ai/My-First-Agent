import type { Site, SiteInput, SiteMeasurements, SiteTradeAssignment, SiteTradeAssignmentInput } from "./networkTypes";

/** One duplicate-group field's distinct non-blank values, each tagged with the record it came from. */
export interface FieldChoice<T> {
  siteId: string;
  value: T;
}

export interface FieldResolution<T> {
  /** Every distinct non-blank value found across the group's records for this field. */
  choices: FieldChoice<T>[];
  /** True when more than one distinct value exists -- the user must pick one before merging. */
  conflict: boolean;
  /** The single value when there's exactly one distinct choice (no conflict); undefined when there's a conflict or no record has a value at all. */
  resolved: T | undefined;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function resolveField<T>(entries: { siteId: string; value: T | null | undefined }[]): FieldResolution<T> {
  const choices: FieldChoice<T>[] = [];
  for (const e of entries) {
    if (isBlank(e.value)) continue;
    const value = e.value as T;
    if (!choices.some((c) => JSON.stringify(c.value) === JSON.stringify(value))) {
      choices.push({ siteId: e.siteId, value });
    }
  }
  return { choices, conflict: choices.length > 1, resolved: choices.length === 1 ? choices[0].value : undefined };
}

export interface SiteMergeFields {
  name: FieldResolution<string>;
  companyId: FieldResolution<string>;
  opportunityId: FieldResolution<string>;
  address: FieldResolution<string>;
  city: FieldResolution<string>;
  state: FieldResolution<string>;
  zip: FieldResolution<string>;
  lat: FieldResolution<number>;
  lng: FieldResolution<number>;
  measurements: FieldResolution<SiteMeasurements>;
  counts: FieldResolution<SiteMeasurements>;
  lastSeasonSnowfall: FieldResolution<number>;
  notes: FieldResolution<string>;
}

export interface TradeMergeFields {
  trade: string;
  vendorId: FieldResolution<string>;
  subVendorId: FieldResolution<string>;
  contractId: FieldResolution<string>;
  contractValue: FieldResolution<number>;
  rateAmount: FieldResolution<number>;
  rateFrequency: FieldResolution<string>;
  subPrice: FieldResolution<number>;
  subVendorPrice: FieldResolution<number>;
}

export interface SiteMergePlan {
  siteCode: string;
  siteIds: string[];
  fields: SiteMergeFields;
  trades: TradeMergeFields[];
}

/** Builds a merge plan for one group of duplicate site records (same Site ID) -- resolving each field to its single value when every record agrees (or only one has it), and flagging a conflict wherever two records hold different non-blank values. */
export function buildMergePlan(group: Site[]): SiteMergePlan {
  const field = <T,>(pick: (s: Site) => T | null | undefined): FieldResolution<T> =>
    resolveField(group.map((s) => ({ siteId: s.id, value: pick(s) })));

  const fields: SiteMergeFields = {
    name: field((s) => s.name),
    companyId: field((s) => s.companyId),
    opportunityId: field((s) => s.opportunityId),
    address: field((s) => s.address),
    city: field((s) => s.city),
    state: field((s) => s.state),
    zip: field((s) => s.zip),
    lat: field((s) => s.lat),
    lng: field((s) => s.lng),
    measurements: field((s) => (Object.keys(s.measurements).length ? s.measurements : null)),
    counts: field((s) => (Object.keys(s.counts).length ? s.counts : null)),
    lastSeasonSnowfall: field((s) => s.lastSeasonSnowfall),
    notes: field((s) => s.notes),
  };

  const tradeNames = Array.from(new Set(group.flatMap((s) => s.trades)));
  const trades: TradeMergeFields[] = tradeNames.map((trade) => {
    const forTrade: { siteId: string; a: SiteTradeAssignment }[] = [];
    for (const s of group) {
      const a = s.tradeAssignments.find((x) => x.trade === trade);
      if (a) forTrade.push({ siteId: s.id, a });
    }
    const pick = <T,>(sel: (a: SiteTradeAssignment) => T | null | undefined): FieldResolution<T> =>
      resolveField(forTrade.map(({ siteId, a }) => ({ siteId, value: sel(a) })));
    return {
      trade,
      vendorId: pick((a) => a.vendorId),
      subVendorId: pick((a) => a.subVendorId),
      contractId: pick((a) => a.contractId),
      contractValue: pick((a) => a.contractValue),
      rateAmount: pick((a) => a.rateAmount),
      rateFrequency: pick((a) => a.rateFrequency),
      subPrice: pick((a) => a.subPrice),
      subVendorPrice: pick((a) => a.subVendorPrice),
    };
  });

  return { siteCode: group[0].siteCode ?? "", siteIds: group.map((s) => s.id), fields, trades };
}

/** Field keys (site-level `name`/`address`/etc, or `trade:<trade>:<field>`) that have a conflict needing an explicit pick before this group can be merged. */
export function conflictFieldKeys(plan: SiteMergePlan): string[] {
  const keys: string[] = [];
  for (const [key, res] of Object.entries(plan.fields)) {
    if (res.conflict) keys.push(key);
  }
  for (const t of plan.trades) {
    for (const key of [
      "vendorId",
      "subVendorId",
      "contractId",
      "contractValue",
      "rateAmount",
      "rateFrequency",
      "subPrice",
      "subVendorPrice",
    ] as const) {
      if (t[key].conflict) keys.push(`trade:${t.trade}:${key}`);
    }
  }
  return keys;
}

/** Maps a conflict field key to the siteId the user picked to resolve it. Non-conflicting fields don't need an entry. */
export type MergeSelections = Record<string, string>;

function pick<T>(res: FieldResolution<T>, key: string, selections: MergeSelections): T | null {
  if (!res.conflict) return res.resolved ?? null;
  const chosen = selections[key];
  const choice = res.choices.find((c) => c.siteId === chosen);
  return choice ? choice.value : null;
}

/** Assembles the final merged SiteInput + trade assignments from a plan and the user's conflict picks. Every conflict must have a selection first (see conflictFieldKeys). */
export function applyMergeSelections(
  plan: SiteMergePlan,
  selections: MergeSelections,
): { input: Omit<SiteInput, "trades">; trades: string[]; assignments: SiteTradeAssignmentInput[] } {
  const f = plan.fields;
  const input: Omit<SiteInput, "trades"> = {
    name: pick(f.name, "name", selections) ?? "",
    companyId: pick(f.companyId, "companyId", selections),
    opportunityId: pick(f.opportunityId, "opportunityId", selections),
    siteCode: plan.siteCode || null,
    address: pick(f.address, "address", selections),
    city: pick(f.city, "city", selections),
    state: pick(f.state, "state", selections),
    zip: pick(f.zip, "zip", selections),
    lat: pick(f.lat, "lat", selections),
    lng: pick(f.lng, "lng", selections),
    measurements: pick(f.measurements, "measurements", selections) ?? {},
    counts: pick(f.counts, "counts", selections) ?? {},
    lastSeasonSnowfall: pick(f.lastSeasonSnowfall, "lastSeasonSnowfall", selections),
    notes: pick(f.notes, "notes", selections),
  };

  const assignments: SiteTradeAssignmentInput[] = plan.trades.map((t) => ({
    trade: t.trade,
    vendorId: pick(t.vendorId, `trade:${t.trade}:vendorId`, selections),
    subVendorId: pick(t.subVendorId, `trade:${t.trade}:subVendorId`, selections),
    contractId: pick(t.contractId, `trade:${t.trade}:contractId`, selections),
    contractValue: pick(t.contractValue, `trade:${t.trade}:contractValue`, selections),
    rateAmount: pick(t.rateAmount, `trade:${t.trade}:rateAmount`, selections),
    rateFrequency: pick(t.rateFrequency, `trade:${t.trade}:rateFrequency`, selections),
    subPrice: pick(t.subPrice, `trade:${t.trade}:subPrice`, selections),
    subVendorPrice: pick(t.subVendorPrice, `trade:${t.trade}:subVendorPrice`, selections),
  }));

  return { input, trades: plan.trades.map((t) => t.trade), assignments };
}
