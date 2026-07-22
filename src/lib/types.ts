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

export type DashboardCard = KpiCard | ChartCard;

export interface DashboardConfig {
  name: string;
  cards: DashboardCard[];
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
  "Properties",
  "Other",
] as const;
