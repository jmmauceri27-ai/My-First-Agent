import type { AgingBucketDef, ChartAgg, ChartType, DatasetRecord, FilterCondition, KpiAgg } from "./types";

export const KPI_AGG_LABELS: Record<KpiAgg, string> = {
  count_rows: "Count of rows",
  pct_match: "% of rows matching filter",
  sum: "Sum of column",
  avg: "Average of column",
  min: "Minimum of column",
  max: "Maximum of column",
  count_distinct: "Count of distinct values",
};

export const CHART_AGG_LABELS: Record<ChartAgg, string> = {
  sum: "Sum",
  avg: "Average",
  count: "Count",
  min: "Minimum",
  max: "Maximum",
};

export const CHART_TYPES: ChartType[] = ["bar", "line", "pie", "area", "scatter"];

export const FILTER_OPS: { value: FilterCondition["op"]; label: string }[] = [
  { value: "eq", label: "= equals" },
  { value: "neq", label: "≠ not equals" },
  { value: "gt", label: "> greater than" },
  { value: "gte", label: "≥ greater or equal" },
  { value: "lt", label: "< less than" },
  { value: "lte", label: "≤ less or equal" },
  { value: "contains", label: "contains" },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isNumeric(value: DatasetRecord[string]): boolean {
  if (typeof value === "number") return true;
  if (value === null || value === "") return false;
  return !Number.isNaN(Number(value));
}

function matchesFilter(row: DatasetRecord, filter: FilterCondition): boolean {
  const raw = row[filter.column];
  if (raw === undefined || raw === null) return false;

  switch (filter.op) {
    case "eq":
      return String(raw) === filter.value;
    case "neq":
      return String(raw) !== filter.value;
    case "contains":
      return String(raw).toLowerCase().includes(filter.value.toLowerCase());
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (!isNumeric(raw)) return false;
      const numericRaw = Number(raw);
      const numericValue = Number(filter.value);
      if (filter.op === "gt") return numericRaw > numericValue;
      if (filter.op === "gte") return numericRaw >= numericValue;
      if (filter.op === "lt") return numericRaw < numericValue;
      return numericRaw <= numericValue;
    }
    default:
      return true;
  }
}

export function applyFilters(rows: DatasetRecord[], filters?: FilterCondition[]): DatasetRecord[] {
  if (!filters || filters.length === 0) return rows;
  return rows.filter((row) => filters.every((f) => matchesFilter(row, f)));
}

export function computeKpi(
  rows: DatasetRecord[],
  agg: KpiAgg,
  column?: string,
  filters?: FilterCondition[],
): number {
  const total = rows.length;

  if (agg === "pct_match") {
    const matched = applyFilters(rows, filters);
    return total ? round2((matched.length / total) * 100) : 0;
  }

  const working = applyFilters(rows, filters);

  if (agg === "count_rows") return working.length;

  if (!column) throw new Error(`Aggregation '${agg}' requires a column.`);

  if (agg === "count_distinct") {
    const distinct = new Set(working.map((r) => String(r[column])));
    return distinct.size;
  }

  const values = working
    .map((r) => r[column])
    .filter((v) => isNumeric(v))
    .map((v) => Number(v));

  switch (agg) {
    case "sum":
      return round2(values.reduce((a, b) => a + b, 0));
    case "avg":
      return values.length ? round2(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    case "min":
      return values.length ? Math.min(...values) : 0;
    case "max":
      return values.length ? Math.max(...values) : 0;
    default:
      throw new Error(`Unknown aggregation '${agg}'`);
  }
}

export interface ChartPoint {
  key: string;
  value: number;
}

export function computeChartData(
  rows: DatasetRecord[],
  x: string,
  y: string | undefined,
  agg: ChartAgg,
  filters?: FilterCondition[],
): ChartPoint[] {
  const working = applyFilters(rows, filters);
  const groups = new Map<string, number[]>();

  for (const row of working) {
    const key = String(row[x] ?? "(blank)");
    const num = y ? Number(row[y]) : 1;
    if (y && Number.isNaN(num)) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(num);
  }

  const points: ChartPoint[] = [];
  for (const [key, values] of groups) {
    let value: number;
    switch (agg) {
      case "sum":
        value = values.reduce((a, b) => a + b, 0);
        break;
      case "avg":
        value = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "min":
        value = Math.min(...values);
        break;
      case "max":
        value = Math.max(...values);
        break;
      case "count":
      default:
        value = values.length;
        break;
    }
    points.push({ key, value: round2(value) });
  }

  return points.sort((a, b) => b.value - a.value);
}

export interface AgingResult {
  label: string;
  count: number;
}

/**
 * Buckets rows by how many days a date column is in the past relative to
 * `now`. Rows whose date is missing, unparseable, or not yet due are
 * excluded. `filters` typically excludes closed/complete statuses so only
 * still-open records are aged.
 */
export function computeAging(
  rows: DatasetRecord[],
  dateColumn: string,
  buckets: AgingBucketDef[],
  filters?: FilterCondition[],
  now: Date = new Date(),
): AgingResult[] {
  const working = applyFilters(rows, filters);
  const counts = new Array(buckets.length).fill(0);
  const nowMs = now.getTime();

  for (const row of working) {
    const raw = row[dateColumn];
    if (raw === null || raw === undefined || raw === "") continue;
    const date = new Date(String(raw));
    if (Number.isNaN(date.getTime())) continue;

    const daysPastDue = Math.floor((nowMs - date.getTime()) / 86_400_000);
    if (daysPastDue < 1) continue;

    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      if (daysPastDue >= b.minDays && (b.maxDays === null || daysPastDue <= b.maxDays)) {
        counts[i]++;
        break;
      }
    }
  }

  return buckets.map((b, i) => ({ label: b.label, count: counts[i] }));
}

function parseDate(value: DatasetRecord[string]): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface ScorecardRow {
  group: string;
  count: number;
  /** % of this group's rows whose status is in `completedValues`. Null if no status column configured. */
  completionRate: number | null;
  /** % of completed rows whose completion date is on/before the due date. Null if date columns missing. */
  onTimeRate: number | null;
  /** Average days between start and completion date, across completed rows. Null if date columns missing. */
  avgDurationDays: number | null;
}

export interface ScorecardOptions {
  groupColumn: string;
  statusColumn?: string;
  completedValues?: string[];
  startDateColumn?: string;
  completionDateColumn?: string;
  dueDateColumn?: string;
  filters?: FilterCondition[];
}

/**
 * Groups rows by `groupColumn` (e.g. vendor name) and computes per-group
 * completion/on-time rates and average duration. When a status column with
 * completed values is configured, rates and durations are computed only
 * over rows whose status counts as "completed"; otherwise all rows in the
 * group are used.
 */
export function computeScorecard(rows: DatasetRecord[], opts: ScorecardOptions): ScorecardRow[] {
  const working = applyFilters(rows, opts.filters);
  const completedSet = new Set(opts.completedValues ?? []);
  const hasStatus = Boolean(opts.statusColumn) && completedSet.size > 0;

  const groups = new Map<string, DatasetRecord[]>();
  for (const row of working) {
    const raw = row[opts.groupColumn];
    if (raw === null || raw === undefined || raw === "") continue;
    const key = String(raw);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const results: ScorecardRow[] = [];
  for (const [group, groupRows] of groups) {
    const count = groupRows.length;
    const completedRows = hasStatus
      ? groupRows.filter((r) => completedSet.has(String(r[opts.statusColumn!])))
      : groupRows;

    const completionRate = hasStatus ? round2((completedRows.length / count) * 100) : null;

    let onTimeRate: number | null = null;
    if (opts.completionDateColumn && opts.dueDateColumn) {
      let withBoth = 0;
      let onTime = 0;
      for (const r of completedRows) {
        const completion = parseDate(r[opts.completionDateColumn]);
        const due = parseDate(r[opts.dueDateColumn]);
        if (!completion || !due) continue;
        withBoth++;
        if (completion.getTime() <= due.getTime()) onTime++;
      }
      onTimeRate = withBoth ? round2((onTime / withBoth) * 100) : null;
    }

    let avgDurationDays: number | null = null;
    if (opts.startDateColumn && opts.completionDateColumn) {
      const durations: number[] = [];
      for (const r of completedRows) {
        const start = parseDate(r[opts.startDateColumn]);
        const end = parseDate(r[opts.completionDateColumn]);
        if (!start || !end) continue;
        durations.push((end.getTime() - start.getTime()) / 86_400_000);
      }
      avgDurationDays = durations.length
        ? round2(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;
    }

    results.push({ group, count, completionRate, onTimeRate, avgDurationDays });
  }

  return results.sort((a, b) => b.count - a.count);
}

/** Sorted, unique, non-empty string values for a column — used to populate filter dropdowns. */
export function getDistinctValues(rows: DatasetRecord[], column: string): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const raw = row[column];
    if (raw === null || raw === undefined || raw === "") continue;
    values.add(String(raw));
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
