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

  const seasons = useMemo(() => {
    const map = new Map<string, string>();
    picks.forEach((p) => map.set(p.seasonId, p.seasonLabel));
    return Array.from(map.entries()).sort((a, b) => b[1].localeCompare(a[1]));
  }, [picks]);

  const filtered = useMemo(
    () => (seasonFilter === "ALL" ? picks : picks.filter((p) => p.seasonId === seasonFilter)),
    [picks, seasonFilter]
  );

  const managerRows = useMemo(() => {
    const matrix = new Map<string, Map<string, number>>();
    for (const p of filtered) {
      if (!matrix.has(p.manager)) matrix.set(p.manager, new Map());
      const row = matrix.get(p.manager)!;
      row.set(p.position, (row.get(p.position) ?? 0) + 1);
    }
    const rows = Array.from(matrix.entries()).map(([manager, counts]) => {
      const total = Array.from(counts.values()).reduce((s, n) => s + n, 0);
      let favorite = "";
      let favoriteCount = 0;
      for (const [pos, count] of counts.entries()) {
        if (count > favoriteCount) {
          favorite = pos;
          favoriteCount = count;
        }
      }
      return { manager, counts, total, favorite };
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

  return (
    <div>
      <div className="mb-4">
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
                  <th className="px-3 py-2">Picks</th>
                  <th className="px-3 py-2">Avg Rnd</th>
                  <th className="px-3 py-2">Earliest</th>
                  <th className="px-3 py-2">Latest</th>
                </tr>
              </thead>
              <tbody>
                {positionStats.map((s) => (
                  <tr key={s.position} className="border-t border-zinc-200 dark:border-ink-800">
                    <td className="px-3 py-2 font-medium">{s.position}</td>
                    <td className="px-3 py-2">{s.count}</td>
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
                        {row.counts.get(pos) ?? 0}
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
    </div>
  );
}
