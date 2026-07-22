"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Player } from "@prisma/client";
import { POSITIONS, TAG_STYLES, tierColor } from "@/lib/constants";
import TeamBadge from "@/components/TeamBadge";
import PlayerFormModal from "./PlayerFormModal";
import { deletePlayer, toggleWatchlist } from "./actions";

type SortKey = "overallRank" | "positionRank" | "adp" | "tier" | "name" | "actualPointsPPR";

export default function PlayersTable({ players }: { players: Player[] }) {
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("overallRank");
  const [hideDrafted, setHideDrafted] = useState(false);
  const [watchlistOnly, setWatchlistOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = players.slice();
    if (positionFilter !== "ALL") list = list.filter((p) => p.position === positionFilter);
    if (hideDrafted) list = list.filter((p) => !p.draftedBy);
    if (watchlistOnly) list = list.filter((p) => p.watchlisted);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.team ?? "").toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      // Higher is better for actual points scored; lower is better for ranks/ADP/tier.
      const direction = sortKey === "actualPointsPPR" ? -1 : 1;
      return ((av as number) - (bv as number)) * direction;
    });
    return list;
  }, [players, search, positionFilter, sortKey, hideDrafted, watchlistOnly]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, team, tag..."
          className="min-w-[180px] flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-ink-800"
        />
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-ink-800"
        >
          <option value="ALL">All positions</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-ink-800"
        >
          <option value="overallRank">Sort: Overall Rank</option>
          <option value="positionRank">Sort: Position Rank</option>
          <option value="adp">Sort: ADP</option>
          <option value="tier">Sort: Tier</option>
          <option value="name">Sort: Name</option>
          <option value="actualPointsPPR">Sort: 2025 PPR Points</option>
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={hideDrafted} onChange={(e) => setHideDrafted(e.target.checked)} />
          Hide drafted
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={watchlistOnly} onChange={(e) => setWatchlistOnly(e.target.checked)} />
          ⭐ Watchlist only
        </label>
        <PlayerFormModal />
      </div>

      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
        Showing {filtered.length} of {players.length} players
      </p>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-zinc-100 text-left dark:bg-ink-900/60">
            <tr>
              <th className="px-3 py-2">★</th>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">Bye</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">ADP</th>
              <th className="px-3 py-2">2025 PPR</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className={`border-t border-zinc-200 dark:border-ink-800 ${
                  p.draftedBy ? "opacity-50" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <form
                    action={async (fd) => {
                      await toggleWatchlist(fd);
                    }}
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="next" value={(!p.watchlisted).toString()} />
                    <button type="submit" title="Toggle watchlist">
                      {p.watchlisted ? "⭐" : "☆"}
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2">{p.overallRank ?? "—"}</td>
                <td className="px-3 py-2 font-medium">
                  <Link href={`/players/${p.id}`} className="flex items-center gap-2 hover:underline">
                    {p.headshotUrl ? (
                      <Image
                        src={p.headshotUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="h-7 w-7 shrink-0 rounded-full border border-zinc-200 bg-zinc-100 object-cover dark:border-ink-800 dark:bg-ink-800"
                        unoptimized
                      />
                    ) : (
                      <span className="h-7 w-7 shrink-0 rounded-full bg-zinc-100 dark:bg-ink-800" />
                    )}
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{p.position}</td>
                <td className="px-3 py-2">
                  <TeamBadge team={p.team} />
                </td>
                <td className="px-3 py-2">{p.byeWeek ?? "—"}</td>
                <td className="px-3 py-2">
                  {p.tier ? (
                    <span className={`border-l-4 pl-2 ${tierColor(p.tier)}`}>T{p.tier}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">{p.adp ?? "—"}</td>
                <td className="px-3 py-2">
                  {p.actualPointsPPR != null ? (
                    <>
                      {p.actualPointsPPR.toFixed(1)}
                      {p.actualGamesPlayed ? (
                        <span className="text-zinc-400"> ({p.actualGamesPlayed}gp)</span>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className={`rounded px-1.5 py-0.5 text-xs ${TAG_STYLES[t] ?? "bg-zinc-200 text-zinc-700"}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {p.draftedBy ? `Drafted: ${p.draftedBy}` : "Available"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <PlayerFormModal player={p} />
                    <form
                      action={async (fd) => {
                        await deletePlayer(fd);
                      }}
                      onSubmit={(e) => {
                        if (!confirm(`Delete ${p.name}?`)) e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded-md px-2 py-1 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-zinc-500">
                  No players match your filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
