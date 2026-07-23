"use server";

import { getDatasetRows } from "@/lib/dal";
import type { DatasetRecord } from "@/lib/types";

export async function fetchDatasetRowsAction(datasetId: string): Promise<DatasetRecord[]> {
  return getDatasetRows(datasetId);
}
