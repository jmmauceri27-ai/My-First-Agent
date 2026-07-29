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
  datasetId: string;
  datasetName: string;
  agg: KpiAgg;
  column?: string;
  filters?: FilterCondition[];
}

export interface ChartCard {
  type: "chart";
  title: string;
  datasetId: string;
  datasetName: string;
  chartType: ChartType;
  x: string;
  y?: string;
  agg: ChartAgg;
  filters?: FilterCondition[];
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
  datasetId: string;
  datasetName: string;
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
  datasetId: string;
  datasetName: string;
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

export interface DashboardConfig {
  name: string;
  cards: DashboardCard[];
  /** Columns exposed as live filter dropdowns on the Dashboards viewer. */
  filterColumns?: string[];
}

export interface DatasetSummary {
  id: string;
  displayName: string;
  category: string;
  sourceFilename: string | null;
  rowCount: number;
  columns: string[];
  uploadedAt: string;
}

export interface TemplateRole {
  key: string;
  label: string;
}

export interface TemplateChartCard {
  type: "chart";
  title: string;
  chartType: ChartType;
  /** Role key resolved to a real column name once bound to a dataset. */
  xRole: string;
  agg: ChartAgg;
}

export type TemplateCard = TemplateChartCard;

export interface DashboardTemplate {
  key: string;
  name: string;
  /** Which Dashboards sidebar area this template appears under, independent of any dataset's category. */
  area: string;
  roles: TemplateRole[];
  cards: TemplateCard[];
  /** Role keys exposed as live filter dropdowns once resolved against a dataset. */
  filterRoles?: string[];
}

export interface SiteMapBinding {
  latColumn: string;
  lngColumn: string;
  labelColumn: string | null;
  popupColumns: string[];
  contractValueColumn: string | null;
  subPriceColumn: string | null;
}

export interface DatasetRowWithId {
  id: number;
  data: DatasetRecord;
}

/** Sentinel "column" for the computed Contract Value − Sub Price metric. */
export const MARGIN_METRIC_KEY = "__margin__";
export const MARGIN_METRIC_LABEL = "Margin ($)";

export type SiteMapColorMode = "gradient" | "categorical";

export interface SiteMapView {
  id: string;
  name: string;
  colorColumn: string;
  colorMode: SiteMapColorMode;
}

export const DATASET_CATEGORIES = [
  "Work Orders",
  "Invoices",
  "Proposals",
  "Vendors",
  "Clients",
  "Sites",
  "Materials",
  "Other",
] as const;
