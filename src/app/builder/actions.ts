"use server";

import { revalidatePath } from "next/cache";
import { deleteDashboard, loadDashboard, saveDashboard } from "@/lib/dal";
import { getSourceRows } from "@/lib/dashboardData";
import type { DashboardSourceKey } from "@/lib/dashboardSources";
import type { DashboardConfig, DatasetRecord } from "@/lib/types";

export async function saveDashboardAction(config: DashboardConfig): Promise<{ id: string }> {
  const id = await saveDashboard(config.name, config);
  revalidatePath("/");
  revalidatePath("/dashboards");
  revalidatePath("/builder");
  return { id };
}

export async function deleteDashboardAction(id: string): Promise<void> {
  await deleteDashboard(id);
  revalidatePath("/");
  revalidatePath("/dashboards");
  revalidatePath("/builder");
}

export async function loadDashboardAction(id: string): Promise<DashboardConfig | null> {
  return loadDashboard(id);
}

export async function fetchSourceRowsAction(source: DashboardSourceKey): Promise<DatasetRecord[]> {
  return getSourceRows(source);
}
