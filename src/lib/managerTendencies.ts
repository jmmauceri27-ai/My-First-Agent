// Shared draft-tendency analysis, used by both the Trends page (client,
// season-filterable) and a manager's own profile page (server, full
// history only). Kept framework-free so it works in either context.

export type TendencyPick = {
  round: number;
  manager: string;
  position: string;
  seasonId: string;
};

export type ManagerTag = { label: string; z: number };

// How many draft-order levels of each position matter — e.g. only the 1st
// QB taken, but the top 3 RBs/WRs.
export const MANAGER_ORDER_CAP: Record<string, number> = { QB: 1, RB: 3, WR: 3, TE: 1, K: 1, DST: 1 };

// Given a set of same-position picks, figures out each pick's draft order
// within its own group (1st taken, 2nd taken, ...) and aggregates by that
// order across groups — so a manager's RB1 and RB2 don't get blended into
// one misleading average round. `groupKey` should scope each independent
// sequence: a manager's own picks within one season for per-manager stats,
// or "manager|season" for league-wide stats (so 12 teams' RBs in one
// season don't get treated as one giant 61-pick sequence).
export function computeOrderStats(items: { groupKey: string; round: number }[]) {
  const byGroup = new Map<string, number[]>();
  for (const it of items) {
    if (!byGroup.has(it.groupKey)) byGroup.set(it.groupKey, []);
    byGroup.get(it.groupKey)!.push(it.round);
  }
  const byOrder = new Map<number, number[]>();
  for (const rounds of byGroup.values()) {
    const sorted = [...rounds].sort((a, b) => a - b);
    sorted.forEach((round, idx) => {
      const order = idx + 1;
      if (!byOrder.has(order)) byOrder.set(order, []);
      byOrder.get(order)!.push(round);
    });
  }
  return Array.from(byOrder.entries())
    .map(([order, rounds]) => ({
      order,
      avgRound: rounds.reduce((s, n) => s + n, 0) / rounds.length,
      count: rounds.length,
    }))
    .sort((a, b) => a.order - b.order);
}

type ManagerMetric = { manager: string; value: number; count: number };

// Converts a set of per-manager metric values into z-scores relative to the
// other managers, so tendencies are judged against this league specifically
// rather than some fixed absolute round number. Requires at least a couple
// data points per manager (avoids one lucky/unlucky season reading as a
// "tendency") and at least 2 managers with data (nothing to compare against
// otherwise).
function zScores(metrics: ManagerMetric[], minCount = 2): Map<string, number> {
  const eligible = metrics.filter((m) => m.count >= minCount);
  if (eligible.length < 2) return new Map();
  const mean = eligible.reduce((s, m) => s + m.value, 0) / eligible.length;
  const variance = eligible.reduce((s, m) => s + (m.value - mean) ** 2, 0) / eligible.length;
  const stdev = Math.sqrt(variance);
  const out = new Map<string, number>();
  if (stdev < 0.01) return out; // everyone does the same thing — no tendency to call out
  for (const m of eligible) out.set(m.manager, (m.value - mean) / stdev);
  return out;
}

const ORDER_TAG_LABELS: Record<string, { early: string; late: string }> = {
  "QB:1": { early: "Drafts QB Early", late: "Waits on QB" },
  "RB:1": { early: "Prioritizes RB1", late: "Slow to First RB" },
  "RB:2": { early: "Secures RB2 Early", late: "Waits on RB2" },
  "RB:3": { early: "Deep RB Bench Early", late: "" },
  "WR:1": { early: "Prioritizes WR1", late: "Slow to First WR" },
  "WR:2": { early: "Secures WR2 Early", late: "Waits on WR2" },
  "WR:3": { early: "Deep WR Bench Early", late: "" },
  "TE:1": { early: "Elite TE Priority", late: "Streams TE" },
  "K:1": { early: "Early Kicker (Non-Standard)", late: "" },
  "DST:1": { early: "Early D/ST (Non-Standard)", late: "" },
};

const VOLUME_TAG_LABELS: Record<string, { high: string; low: string }> = {
  "VOL:RB": { high: "RB-Heavy Roster Builder", low: "RB-Light Roster Builder" },
  "VOL:WR": { high: "WR-Heavy Roster Builder", low: "WR-Light Roster Builder" },
  "VOL:QB": { high: "Drafts Backup QBs", low: "" },
  "VOL:TE": { high: "Drafts Multiple TEs", low: "" },
};

const Z_THRESHOLD = 0.6;

// Computes every manager's full set of tendency tags (unsliced — callers
// decide how many to show) by z-scoring each manager's per-position round
// averages and per-position pick volume against the rest of the league.
export function computeManagerTendencyTags(
  picks: TendencyPick[]
): { managers: string[]; tags: Map<string, ManagerTag[]>; insufficientData: boolean } {
  const perManagerPos = new Map<string, Map<string, { groupKey: string; round: number }[]>>();
  const managerSeasons = new Map<string, Set<string>>();
  const volumeBySeasonManagerPos = new Map<string, Map<string, Map<string, number>>>();

  for (const p of picks) {
    if (!perManagerPos.has(p.manager)) perManagerPos.set(p.manager, new Map());
    const posMap = perManagerPos.get(p.manager)!;
    if (!posMap.has(p.position)) posMap.set(p.position, []);
    posMap.get(p.position)!.push({ groupKey: p.seasonId, round: p.round });

    if (!managerSeasons.has(p.manager)) managerSeasons.set(p.manager, new Set());
    managerSeasons.get(p.manager)!.add(p.seasonId);

    if (!volumeBySeasonManagerPos.has(p.manager)) volumeBySeasonManagerPos.set(p.manager, new Map());
    const posVol = volumeBySeasonManagerPos.get(p.manager)!;
    if (!posVol.has(p.position)) posVol.set(p.position, new Map());
    const seasonCounts = posVol.get(p.position)!;
    seasonCounts.set(p.seasonId, (seasonCounts.get(p.seasonId) ?? 0) + 1);
  }

  const managers = Array.from(perManagerPos.keys()).sort((a, b) => a.localeCompare(b));
  if (managers.length < 3) return { managers: [], tags: new Map(), insufficientData: true };

  const orderMetrics = new Map<string, ManagerMetric[]>();
  for (const [manager, posMap] of perManagerPos.entries()) {
    for (const [pos, items] of posMap.entries()) {
      const cap = MANAGER_ORDER_CAP[pos] ?? 1;
      const stats = computeOrderStats(items).filter((s) => s.order <= cap);
      for (const s of stats) {
        const key = `${pos}:${s.order}`;
        if (!orderMetrics.has(key)) orderMetrics.set(key, []);
        orderMetrics.get(key)!.push({ manager, value: s.avgRound, count: s.count });
      }
    }
  }

  const volumeMetrics = new Map<string, ManagerMetric[]>();
  for (const [manager, posMap] of volumeBySeasonManagerPos.entries()) {
    const seasonsPlayed = managerSeasons.get(manager)?.size || 1;
    for (const [pos, seasonCounts] of posMap.entries()) {
      const total = Array.from(seasonCounts.values()).reduce((s, n) => s + n, 0);
      const key = `VOL:${pos}`;
      if (!volumeMetrics.has(key)) volumeMetrics.set(key, []);
      volumeMetrics.get(key)!.push({ manager, value: total / seasonsPlayed, count: seasonsPlayed });
    }
  }

  const zByKey = new Map<string, Map<string, number>>();
  for (const [key, metrics] of orderMetrics.entries()) zByKey.set(key, zScores(metrics));
  for (const [key, metrics] of volumeMetrics.entries()) zByKey.set(key, zScores(metrics));

  const tags = new Map<string, ManagerTag[]>();
  const suppressed = new Map<string, Set<string>>();
  function addTag(manager: string, label: string, z: number) {
    if (!label) return;
    if (!tags.has(manager)) tags.set(manager, []);
    tags.get(manager)!.push({ label, z });
  }
  function suppress(manager: string, key: string) {
    if (!suppressed.has(manager)) suppressed.set(manager, new Set());
    suppressed.get(manager)!.add(key);
  }
  function isSuppressed(manager: string, key: string): boolean {
    return suppressed.get(manager)?.has(key) ?? false;
  }

  // Combined reads take priority over the two individual reads they're built from.
  function combo(keyA: string, keyB: string, label: string) {
    const zA = zByKey.get(keyA);
    const zB = zByKey.get(keyB);
    if (!zA || !zB) return;
    for (const [manager, za] of zA.entries()) {
      const zb = zB.get(manager);
      if (zb !== undefined && za <= -Z_THRESHOLD && zb <= -Z_THRESHOLD) {
        addTag(manager, label, Math.abs(za) + Math.abs(zb));
        suppress(manager, keyA);
        suppress(manager, keyB);
      }
    }
  }
  combo("RB:1", "RB:2", "Drafts 2 RBs High");
  combo("WR:1", "WR:2", "Drafts 2 WRs High");

  // Zero-RB: waits on the first RB and rosters fewer RBs than most, overall.
  const rb1z = zByKey.get("RB:1");
  const rbVolZ = zByKey.get("VOL:RB");
  if (rb1z && rbVolZ) {
    for (const [manager, z1] of rb1z.entries()) {
      const zVol = rbVolZ.get(manager);
      if (zVol !== undefined && z1 >= Z_THRESHOLD && zVol <= -Z_THRESHOLD) {
        addTag(manager, "Zero-RB Approach", Math.abs(z1) + Math.abs(zVol));
        suppress(manager, "RB:1");
        suppress(manager, "VOL:RB");
      }
    }
  }

  for (const [key, zmap] of zByKey.entries()) {
    const orderLabels = ORDER_TAG_LABELS[key];
    const volumeLabels = VOLUME_TAG_LABELS[key];
    if (!orderLabels && !volumeLabels) continue;
    for (const [manager, z] of zmap.entries()) {
      if (isSuppressed(manager, key)) continue;
      if (orderLabels) {
        if (z <= -Z_THRESHOLD) addTag(manager, orderLabels.early, Math.abs(z));
        else if (z >= Z_THRESHOLD) addTag(manager, orderLabels.late, Math.abs(z));
      } else if (volumeLabels) {
        if (z >= Z_THRESHOLD) addTag(manager, volumeLabels.high, Math.abs(z));
        else if (z <= -Z_THRESHOLD) addTag(manager, volumeLabels.low, Math.abs(z));
      }
    }
  }

  for (const [manager, list] of tags.entries()) {
    list.sort((a, b) => b.z - a.z);
  }

  return { managers, tags, insufficientData: false };
}
