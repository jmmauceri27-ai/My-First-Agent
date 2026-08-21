import "server-only";
import { createAdminClient, OWNER_USER_ID } from "./supabase/admin";
import { getDashboardSource } from "./dashboardSources";
import type { DashboardConfig } from "./types";

export async function listDashboards(): Promise<{ id: string; name: string }[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dashboards")
    .select("id, name")
    .eq("user_id", OWNER_USER_ID)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface DashboardSummary {
  id: string;
  name: string;
  /** Derived from the domain (CRM/Network) of the source the dashboard's first card reads from. */
  area: string;
}

/** Dashboards aren't tied to an area directly, so it's derived from the fixed data source their first
 *  card reads from -- good enough for grouping them by CRM/Network in the Dashboards sidebar. */
export async function listDashboardsWithArea(): Promise<DashboardSummary[]> {
  const dashboards = await listDashboards();
  if (dashboards.length === 0) return [];

  const configs = await Promise.all(dashboards.map((d) => loadDashboard(d.id)));

  return dashboards.map((d, i) => {
    const firstCard = configs[i]?.cards[0];
    const area = (firstCard && getDashboardSource(firstCard.source).domain) || "CRM";
    return { id: d.id, name: d.name, area };
  });
}

export async function loadDashboard(id: string): Promise<DashboardConfig | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dashboards")
    .select("name, config")
    .eq("id", id)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const config = data.config as DashboardConfig;
  return { name: data.name as string, cards: config?.cards ?? [], filterColumns: config?.filterColumns ?? [] };
}

export async function saveDashboard(name: string, config: DashboardConfig): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dashboards")
    .upsert(
      {
        user_id: OWNER_USER_ID,
        name,
        config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,name" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteDashboard(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("dashboards").delete().eq("id", id).eq("user_id", OWNER_USER_ID);
  if (error) throw new Error(error.message);
}
