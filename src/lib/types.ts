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

export type DashboardCard = KpiCard | ChartCard | AgingCard;

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

export const DATASET_CATEGORIES = [
  "Work Orders",
  "Invoices",
  "Proposals",
  "Vendors",
  "Procurement",
  "Clients",
  "Sites",
  "Materials",
  "Other",
] as const;
