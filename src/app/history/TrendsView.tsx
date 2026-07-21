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

export default function TrendsView({ picks }: { picks: Pick[] }) {
  const [seasonFilter, setSeasonFilter] = useState("ALL");
  const [statMode, setStatMode] = useState<"total" | "average">("total");

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
    const matrix = new Map<string, Map<string, number>>();
    const managerSeasons = new Map<string, Set<string>>();
    for (const p of filtered) {
      if (!matrix.has(p.manager)) matrix.set(p.manager, new Map());
      if (!managerSeasons.has(p.manager)) managerSeasons.set(p.manager, new Set());
      matrix.get(p.manager)!.set(p.position, (matrix.get(p.manager)!.get(p.position) ?? 0) + 1);
      managerSeasons.get(p.manager)!.add(p.seasonId);
    }
    const rows = Array.from(matrix.entries()).map(([manager, counts]) => {
      const total = Array.from(counts.values()).reduce((s, n) => s + n, 0);
      const seasonsPlayed = managerSeasons.get(manager)?.size || 1;
      let favorite = "";
      let favoriteCount = 0;
      for (const [pos, count] of counts.entries()) {
        if (count > favoriteCount) {
          favorite = pos;
          favoriteCount = count;
        }
      }
      return { manager, counts, total, favorite, seasonsPlayed };
    });
    return rows.sort((a, b) => b.total - a.total);
  }, [filtered]);

  const positionStats = useMemo(() => {
    const byPosition = new Map<string, number[]>();
    for (const p of filtered) {
      if (!byPosition.has(p.position)) byPosition.set(p.position, []);
      byPosition.get(p.position)!.push(p.round);
    }
    return Array.from(byPosition.entries())
      .map(([position, rounds]) => ({
        position,
        count: rounds.length,
        avgRound: rounds.reduce((s, n) => s + n, 0) / rounds.length,
        minRound: Math.min(...rounds),
        maxRound: Math.max(...rounds),
      }))
      .sort((a, b) => a.avgRound - b.avgRound);
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

  // Dead zones: for each position, contiguous runs of 2+ rounds with zero
  // picks, sandwiched between rounds where that position WAS drafted (so we
  // catch "disappears for a stretch" gaps, not just "stopped being drafted").
  const deadZones = useMemo(() => {
    const result: { position: string; ranges: { start: number; end: number }[] }[] = [];
    for (const position of POSITIONS) {
      const roundsWithPicks = new Set(
        filtered.filter((p) => p.position === position).map((p) => p.round)
      );
      if (roundsWithPicks.size === 0) {
        result.push({ position, ranges: [] });
        continue;
      }
      const first = Math.min(...roundsWithPicks);
      const last = Math.max(...roundsWithPicks);
      const ranges: { start: number; end: number }[] = [];
      let gapStart: number | null = null;
      for (let round = first; round <= last; round++) {
        if (roundsWithPicks.has(round)) {
          if (gapStart !== null && round - gapStart >= 2) {
            ranges.push({ start: gapStart, end: round - 1 });
          }
          gapStart = null;
        } else if (gapStart === null) {
          gapStart = round;
        }
      }
      result.push({ position, ranges });
    }
    return result;
  }, [filtered]);

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
            What round each position typically comes off the board.
          </p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-left dark:bg-ink-900/60">
                <tr>
                  <th className="px-3 py-2">Pos</th>
                  <th className="px-3 py-2">{effectiveStatMode === "average" ? "Avg/Season" : "Picks"}</th>
                  <th className="px-3 py-2">Avg Rnd</th>
                  <th className="px-3 py-2">Earliest</th>
                  <th className="px-3 py-2">Latest</th>
                </tr>
              </thead>
              <tbody>
                {positionStats.map((s) => (
                  <tr key={s.position} className="border-t border-zinc-200 dark:border-ink-800">
                    <td className="px-3 py-2 font-medium">{s.position}</td>
                    <td className="px-3 py-2">{formatCount(s.count, seasonCount)}</td>
                    <td className="px-3 py-2">{s.avgRound.toFixed(1)}</td>
                    <td className="px-3 py-2">R{s.minRound}</td>
                    <td className="px-3 py-2">R{s.maxRound}</td>
                  </tr>
                ))}
                {positionStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-zinc-500">
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
            How many of each position every manager has historically drafted.
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
                    <td className="px-3 py-2 font-medium">{row.manager}</td>
                    {POSITIONS.map((pos) => (
                      <td key={pos} className="px-2 py-2 text-center">
                        {formatCount(row.counts.get(pos) ?? 0, row.seasonsPlayed)}
                      </td>
                    ))}
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
          Stretches of rounds where a position historically goes untouched, between rounds where it
          was still being drafted.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {deadZones.map(({ position, ranges }) => (
            <div
              key={position}
              className="rounded-lg border border-zinc-200 bg-white/90 p-3 text-sm backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70"
            >
              <div className="font-semibold">{position}</div>
              {ranges.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">No dead zone detected.</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                  {ranges.map((r, i) => (
                    <li key={i}>
                      Rounds {r.start}–{r.end}
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
