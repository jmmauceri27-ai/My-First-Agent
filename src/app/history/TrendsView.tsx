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

  const positionStats = useMemo(() => {
    // Group by manager+season (not just season!) so each team's own RB1,
    // RB2, ... is its own sequence — otherwise 12 teams' RBs in one season
    // get treated as one 40+ pick sequence instead of twelve short ones.
    const byPosition = new Map<string, { groupKey: string; round: number }[]>();
    for (const p of filtered) {
      if (!byPosition.has(p.position)) byPosition.set(p.position, []);
      byPosition.get(p.position)!.push({ groupKey: `${p.manager}|${p.seasonId}`, round: p.round });
    }
    const rows: { position: string; order: number; count: number; avgRound: number; minRound: number; maxRound: number }[] = [];
    for (const [position, items] of byPosition.entries()) {
      const byGroupRounds = new Map<string, number[]>();
      for (const it of items) {
        if (!byGroupRounds.has(it.groupKey)) byGroupRounds.set(it.groupKey, []);
        byGroupRounds.get(it.groupKey)!.push(it.round);
      }
      const byOrder = new Map<number, number[]>();
      for (const rounds of byGroupRounds.values()) {
        [...rounds].sort((a, b) => a - b).forEach((round, idx) => {
          const order = idx + 1;
          if (!byOrder.has(order)) byOrder.set(order, []);
          byOrder.get(order)!.push(round);
        });
      }
      for (const [order, rounds] of byOrder.entries()) {
        rows.push({
          position,
          order,
          count: rounds.length,
          avgRound: rounds.reduce((s, n) => s + n, 0) / rounds.length,
          minRound: Math.min(...rounds),
          maxRound: Math.max(...rounds),
        });
      }
    }
    return rows.sort((a, b) => a.avgRound - b.avgRound);
  }, [filtered]);

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

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-1 font-bold">Position Draft Timing</h3>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            What round each position typically comes off the board — broken out by whether it's the
            1st, 2nd, 3rd... of that position taken in a given season, since a manager's 2nd RB goes
            much later than their 1st.
          </p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-left dark:bg-ink-900/60">
                <tr>
                  <th className="px-3 py-2">Pos</th>
                  <th className="px-3 py-2">Pick #</th>
                  <th className="px-3 py-2">{effectiveStatMode === "average" ? "Avg/Season" : "Picks"}</th>
                  <th className="px-3 py-2">Avg Rnd</th>
                  <th className="px-3 py-2">Earliest</th>
                  <th className="px-3 py-2">Latest</th>
                </tr>
              </thead>
              <tbody>
                {positionStats.map((s) => (
                  <tr key={`${s.position}-${s.order}`} className="border-t border-zinc-200 dark:border-ink-800">
                    <td className="px-3 py-2 font-medium">{s.position}</td>
                    <td className="px-3 py-2">{s.order === 1 ? "1st" : s.order === 2 ? "2nd" : s.order === 3 ? "3rd" : `${s.order}th`}</td>
                    <td className="px-3 py-2">{formatCount(s.count, seasonCount)}</td>
                    <td className="px-3 py-2">{s.avgRound.toFixed(1)}</td>
                    <td className="px-3 py-2">R{s.minRound}</td>
                    <td className="px-3 py-2">R{s.maxRound}</td>
                  </tr>
                ))}
                {positionStats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-zinc-500">
                      No picks for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
