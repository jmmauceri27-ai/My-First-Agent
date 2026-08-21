"use server";

import { getSourceRows } from "@/lib/dashboardData";
import type { DashboardSourceKey } from "@/lib/dashboardSources";
import type { DatasetRecord } from "@/lib/types";

export async function fetchSourceRowsAction(source: DashboardSourceKey): Promise<DatasetRecord[]> {
  return getSourceRows(source);
}
