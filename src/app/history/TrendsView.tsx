"use client";

import { useMemo, useState } from "react";
import { POSITIONS } from "@/lib/constants";

type Pick = {
  round: number;
  pickInRound: number;
  manager: string;
  playerName: string;
  position: string;
  nflTeam: string | null;
  seasonId: string;
  seasonLabel: string;
};

// How many draft-order levels of each position matter for the Manager
// Tendencies table — e.g. only the 1st QB taken, but the top 3 RBs/WRs.
const MANAGER_ORDER_CAP: Record<string, number> = { QB: 1, RB: 3, WR: 3, TE: 1, K: 1, DST: 1 };

// Given a set of same-position picks, figures out each pick's draft order
// within its own group (1st taken, 2nd taken, ...) and aggregates by that
// order across groups — so a manager's RB1 and RB2 don't get blended into
// one misleading average round. `groupKey` should scope each independent
// sequence: a manager's own picks within one season for per-manager stats,
// or "manager|season" for league-wide stats (so 12 teams' RBs in one
// season don't get treated as one giant 61-pick sequence).
function computeOrderStats(items: { groupKey: string; round: number }[]) {
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

export default function TrendsView({ picks }: { picks: Pick[] }) {
  const [seasonFilter, setSeasonFilter] = useState("ALL");
  const [statMode, setStatMode] = useState<"total" | "average">("average");

  const seasons = useMemo(() => {
    const map = new Map<string, string>();
    picks.forEach((p) => map.set(p.seasonId, p.seasonLabel));
    return Array.from(map.entries()).sort((a, b) => b[1].localeCompare(a[1]));
  }, [picks]);

  const filtered = useMemo(
    () => (seasonFilter === "ALL" ? picks : picks.filter((p) => p.seasonId === seasonFilter)),
    [picks, seasonFilter]
  );

  // Averaging only means something when pooling multiple seasons together.
  const effectiveStatMode = seasonFilter === "ALL" ? statMode : "total";
  const seasonCount = useMemo(() => new Set(filtered.map((p) => p.seasonId)).size || 1, [filtered]);

  function formatCount(count: number, divisor: number): string {
    if (!count) return "—";
    return effectiveStatMode === "average" ? (count / divisor).toFixed(1) : String(count);
  }

  const managerRows = useMemo(() => {
    const matrix = new Map<string, Map<string, { groupKey: string; round: number }[]>>();
    const managerSeasons = new Map<string, Set<string>>();
    for (const p of filtered) {
      if (!matrix.has(p.manager)) matrix.set(p.manager, new Map());
      if (!managerSeasons.has(p.manager)) managerSeasons.set(p.manager, new Set());
      const posMap = matrix.get(p.manager)!;
      if (!posMap.has(p.position)) posMap.set(p.position, []);
      posMap.get(p.position)!.push({ groupKey: p.seasonId, round: p.round });
      managerSeasons.get(p.manager)!.add(p.seasonId);
    }
    const rows = Array.from(matrix.entries()).map(([manager, posMap]) => {
      const stats = new Map<string, { order: number; avgRound: number; count: number }[]>();
      let totalPicks = 0;
      let favorite = "";
      let favoriteCount = 0;
      for (const [pos, items] of posMap.entries()) {
        totalPicks += items.length;
        stats.set(pos, computeOrderStats(items));
        if (items.length > favoriteCount) {
          favorite = pos;
          favoriteCount = items.length;
        }
      }
      return { manager, stats, total: totalPicks, favorite, seasonsPlayed: managerSeasons.get(manager)?.size || 1 };
    });
    return rows.sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Plain-English tendency tags, always computed from the full draft history
  // (not the season filter above) since a "tendency" is a career-wide read,
  // not a single-season one. Each manager's per-position round averages and
  // per-position volume get z-scored against the other managers, and the
  // biggest standouts become tags like "Drafts QB Early" or "Waits on RB2".
  const managerSummaries = useMemo(() => {
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
    if (managers.length < 3) return { managers: [], tags: new Map<string, { label: string; z: number }[]>(), insufficientData: true };

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

    const tags = new Map<string, { label: string; z: number }[]>();
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
      tags.set(manager, list.slice(0, 3));
    }

    return { managers, tags, insufficientData: false };
  }, [picks]);

  const maxRound = useMemo(
    () => filtered.reduce((max, p) => Math.max(max, p.round), 0),
    [filtered]
  );

  // Round x position pick counts, plus each round's most-frequently-taken position.
  const roundBreakdown = useMemo(() => {
    const rows: { round: number; counts: Map<string, number>; total: number; plurality: string }[] = [];
    for (let round = 1; round <= maxRound; round++) {
      const counts = new Map<string, number>();
      let total = 0;
      for (const p of filtered) {
        if (p.round !== round) continue;
        counts.set(p.position, (counts.get(p.position) ?? 0) + 1);
        total++;
      }
      let plurality = "";
      let pluralityCount = 0;
      for (const [pos, count] of counts.entries()) {
        if (count > pluralityCount) {
          plurality = pos;
          pluralityCount = count;
        }
      }
      rows.push({ round, counts, total, plurality });
    }
    return rows;
  }, [filtered, maxRound]);

  // Momentum-loss zones: for each position, contiguous rounds (within the
  // rounds it's actively drafted in) where its average picks-per-season
  // rate drops well below its own typical rate for that stretch — a
  // "cooling off" period, not just literal zero picks (which rarely happens
  // once you're averaging across several 10-12 team drafts).
  const MOMENTUM_THRESHOLD = 0.5; // below 50% of the position's own average rate
  const momentumZones = useMemo(() => {
    const result: {
      position: string;
      typicalRate: number;
      ranges: { start: number; end: number; rate: number }[];
    }[] = [];
    for (const position of POSITIONS) {
      const rates = roundBreakdown.map((r) => (r.counts.get(position) ?? 0) / seasonCount);
      const activeIdx = rates.reduce<number[]>((acc, r, i) => (r > 0 ? [...acc, i] : acc), []);
      if (activeIdx.length === 0) {
        result.push({ position, typicalRate: 0, ranges: [] });
        continue;
      }
      const firstIdx = Math.min(...activeIdx);
      const lastIdx = Math.max(...activeIdx);
      const windowRates = rates.slice(firstIdx, lastIdx + 1);
      const typicalRate = windowRates.reduce((s, n) => s + n, 0) / windowRates.length;
      const threshold = typicalRate * MOMENTUM_THRESHOLD;

      const ranges: { start: number; end: number; rate: number }[] = [];
      let rangeStartRound: number | null = null;
      let rangeRates: number[] = [];
      for (let idx = firstIdx; idx <= lastIdx; idx++) {
        const round = roundBreakdown[idx].round;
        const rate = rates[idx];
        if (rate < threshold) {
          if (rangeStartRound === null) rangeStartRound = round;
          rangeRates.push(rate);
        } else if (rangeStartRound !== null) {
          ranges.push({
            start: rangeStartRound,
            end: round - 1,
            rate: rangeRates.reduce((s, n) => s + n, 0) / rangeRates.length,
          });
          rangeStartRound = null;
          rangeRates = [];
        }
      }
      if (rangeStartRound !== null) {
        ranges.push({
          start: rangeStartRound,
          end: roundBreakdown[lastIdx].round,
          rate: rangeRates.reduce((s, n) => s + n, 0) / rangeRates.length,
        });
      }
      result.push({ position, typicalRate, ranges });
    }
    return result;
  }, [roundBreakdown, seasonCount]);

  function heatBg(count: number, total: number): string {
    if (!count || !total) return "transparent";
    const intensity = Math.min(count / total, 1);
    return `rgba(34, 197, 94, ${(intensity * 0.55).toFixed(2)})`;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          className="rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-ink-800"
        >
          <option value="ALL">All Seasons</option>
          {seasons.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statMode}
          onChange={(e) => setStatMode(e.target.value as "total" | "average")}
          disabled={seasonFilter !== "ALL"}
          title={seasonFilter !== "ALL" ? "Averaging only applies when viewing All Seasons" : undefined}
          className="rounded-md border border-zinc-300 px-2 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-ink-800"
        >
          <option value="total">Totals</option>
          <option value="average">Average per season</option>
        </select>
        {effectiveStatMode === "average" && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Averaged across {seasonCount} season{seasonCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div>
        <h3 className="mb-1 font-bold">Manager Tendencies</h3>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          Each manager's typical round for their 1st QB/TE/K/D-ST and their top 3 RBs/WRs.
        </p>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-left dark:bg-ink-900/60">
              <tr>
                <th className="px-3 py-2">Manager</th>
                {POSITIONS.map((pos) => (
                  <th key={pos} className="px-2 py-2 text-center">
                    {pos}
                  </th>
                ))}
                <th className="px-3 py-2">Favorite</th>
              </tr>
            </thead>
            <tbody>
              {managerRows.map((row) => (
                <tr key={row.manager} className="border-t border-zinc-200 dark:border-ink-800">
                  <td className="px-3 py-2 align-top font-medium">{row.manager}</td>
                  {POSITIONS.map((pos) => {
                    const cap = MANAGER_ORDER_CAP[pos] ?? 1;
                    const orderStats = (row.stats.get(pos) ?? []).filter((s) => s.order <= cap);
                    return (
                      <td key={pos} className="px-2 py-2 text-center align-top">
                        {orderStats.length > 0 ? (
                          <div className="space-y-0.5">
                            {orderStats.map((s) => (
                              <div key={s.order} className="whitespace-nowrap text-xs">
                                {cap > 1 && (
                                  <span className="text-zinc-400">
                                    {s.order === 1 ? "1st" : s.order === 2 ? "2nd" : s.order === 3 ? "3rd" : `${s.order}th`}
                                    :{" "}
                                  </span>
                                )}
                                R{s.avgRound.toFixed(1)}
                                <span className="text-zinc-400"> ({s.count}x)</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 font-semibold">{row.favorite || "—"}</td>
                </tr>
              ))}
              {managerRows.length === 0 && (
                <tr>
                  <td colSpan={POSITIONS.length + 2} className="px-3 py-4 text-center text-zinc-500">
                    No picks for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-1 font-bold">Manager Scouting Report</h3>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          What stands out about each manager compared to everyone else in the league, based on their
          full draft history (not affected by the season filter above).
        </p>
        {managerSummaries.insufficientData ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Need at least 3 managers with logged draft history to compare tendencies.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {managerSummaries.managers.map((manager) => {
              const tags = managerSummaries.tags.get(manager) ?? [];
              return (
                <div
                  key={manager}
                  className="rounded-lg border border-zinc-200 bg-white/90 p-3 text-sm backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70"
                >
                  <div className="mb-1.5 font-semibold">{manager}</div>
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t, i) => (
                        <span
                          key={i}
                          className="rounded bg-gridiron-100 px-1.5 py-0.5 text-xs font-medium text-gridiron-800 dark:bg-gridiron-900/40 dark:text-gridiron-200"
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">No strong standout — balanced approach.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="mb-1 font-bold">Round-by-Round Position Breakdown</h3>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          How many of each position got picked in every round. Darker cells = a bigger share of that
          round; the bolded cell is that round's most common position.
        </p>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-left dark:bg-ink-900/60">
              <tr>
                <th className="px-3 py-2">Rnd</th>
                {POSITIONS.map((pos) => (
                  <th key={pos} className="px-2 py-2 text-center">
                    {pos}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roundBreakdown.map((row) => (
                <tr key={row.round} className="border-t border-zinc-200 dark:border-ink-800">
                  <td className="px-3 py-2 font-medium">{row.round}</td>
                  {POSITIONS.map((pos) => {
                    const count = row.counts.get(pos) ?? 0;
                    const isPlurality = pos === row.plurality && count > 0;
                    return (
                      <td
                        key={pos}
                        className={`px-2 py-2 text-center ${isPlurality ? "font-bold" : ""}`}
                        style={{ backgroundColor: heatBg(count, row.total) }}
                      >
                        {formatCount(count, seasonCount)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {roundBreakdown.length === 0 && (
                <tr>
                  <td colSpan={POSITIONS.length + 1} className="px-3 py-4 text-center text-zinc-500">
                    No picks for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-1 font-bold">Position Dead Zones</h3>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          Round ranges where a position's draft rate drops to less than half its own typical pace —
          the stretch where it usually cools off between runs.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {momentumZones.map(({ position, ranges, typicalRate }) => (
            <div
              key={position}
              className="rounded-lg border border-zinc-200 bg-white/90 p-3 text-sm backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70"
            >
              <div className="font-semibold">{position}</div>
              {ranges.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">No cold stretch detected.</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                  {ranges.map((r, i) => (
                    <li key={i}>
                      Rounds {r.start}
                      {r.end > r.start ? `–${r.end}` : ""}{" "}
                      <span className="text-zinc-400">
                        ({r.rate.toFixed(2)}/season vs {typicalRate.toFixed(2)} typical)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
