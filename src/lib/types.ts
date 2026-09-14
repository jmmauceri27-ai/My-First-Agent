import type { DashboardSourceKey } from "./dashboardSources";

export type DatasetRecord = Record<string, string | number | boolean | null>;

export type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains";

export interface FilterCondition {
  column: string;
  op: FilterOp;
  value: string;
}

export type KpiAgg =
  | "count_rows"
  | "pct_match"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "count_distinct";

export type ChartAgg = "sum" | "avg" | "count" | "min" | "max";

export type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

export interface KpiCard {
  type: "kpi";
  title: string;
  source: DashboardSourceKey;
  agg: KpiAgg;
  column?: string;
  filters?: FilterCondition[];
}

export interface ChartCard {
  type: "chart";
  title: string;
  source: DashboardSourceKey;
  chartType: ChartType;
  x: string;
  /** True when the x column holds a comma-joined list (e.g. "trades") -- each row is credited to every
   * token instead of being grouped under the whole joined string as one bucket. Not combinable with `series`. */
  xMulti?: boolean;
  /** Optional column that further breaks each x-group into side-by-side series (e.g. "sourcingStatus" -> Sourced/Unsourced bars per state). */
  series?: string;
  y?: string;
  agg: ChartAgg;
  filters?: FilterCondition[];
  /** Caps the chart to its top N groups by value (data is already sorted descending) -- e.g. "Top 8 opportunities by value" instead of every row. */
  limit?: number;
}

export interface AgingBucketDef {
  label: string;
  minDays: number;
  /** null = unbounded ("61+ days") */
  maxDays: number | null;
}

export interface AgingCard {
  type: "aging";
  title: string;
  source: DashboardSourceKey;
  /** Column holding the due/target-completion date to age against today. */
  dateColumn: string;
  buckets: AgingBucketDef[];
  /** Typically excludes closed statuses so only still-open records age. */
  filters?: FilterCondition[];
}

export type ScorecardMetric = "count" | "completion_rate" | "on_time_rate" | "avg_duration";

export const SCORECARD_METRIC_LABELS: Record<ScorecardMetric, string> = {
  count: "Work order count",
  completion_rate: "Completion rate",
  on_time_rate: "On-time rate",
  avg_duration: "Avg response/completion time",
};

export interface ScorecardCard {
  type: "scorecard";
  title: string;
  source: DashboardSourceKey;
  /** Column to group rows by, e.g. vendor name. */
  groupColumn: string;
  /** Which metrics to show as columns. */
  metrics: ScorecardMetric[];
  /** Status column + which of its values count as "completed" (needed for completion/on-time rate). */
  statusColumn?: string;
  completedValues?: string[];
  /** Start date for duration (e.g. dispatch date). */
  startDateColumn?: string;
  /** Actual completion date (e.g. checkout date). */
  completionDateColumn?: string;
  /** Target/due date to compare the completion date against for on-time rate. */
  dueDateColumn?: string;
  filters?: FilterCondition[];
}

export type DashboardCard = KpiCard | ChartCard | AgingCard | ScorecardCard;

export const DEFAULT_AGING_BUCKETS: AgingBucketDef[] = [
  { label: "1-7 days", minDays: 1, maxDays: 7 },
  { label: "8-14 days", minDays: 8, maxDays: 14 },
  { label: "15-30 days", minDays: 15, maxDays: 30 },
  { label: "31-60 days", minDays: 31, maxDays: 60 },
  { label: "61+ days", minDays: 61, maxDays: null },
];

export interface FilterColumnDef {
  column: string;
  /** Dropdown label; defaults to the column key. */
  label?: string;
  /** True when the column holds a comma-joined list (e.g. "trades") -- dropdown options are the individual
   * tokens rather than whole joined combos, and matching a token uses "contains" instead of exact "eq". */
  multi?: boolean;
}

export interface DashboardConfig {
  name: string;
  cards: DashboardCard[];
  /** Columns exposed as live filter dropdowns on the Dashboards viewer. A bare string is shorthand for
   * `{ column }` (single-value, exact match). */
  filterColumns?: (string | FilterColumnDef)[];
}
