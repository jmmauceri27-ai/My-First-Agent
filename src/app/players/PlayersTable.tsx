"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Player } from "@prisma/client";
import { POSITIONS, TAG_STYLES, tierColor } from "@/lib/constants";
import TeamBadge from "@/components/TeamBadge";
import { computeVorp } from "@/lib/vorp";
import PlayerFormModal from "./PlayerFormModal";
import { deletePlayer, toggleWatchlist, reorderPlayers } from "./actions";

type SortKey =
  | "overallRank"
  | "positionRank"
  | "espnAdp"
  | "sleeperAdp"
  | "tier"
  | "name"
  | "projectedPoints"
  | "vorp";

// Higher is better for these — everything else (ranks, ADP, tier) is lower-is-better.
const DESCENDING_SORT_KEYS = new Set<SortKey>(["projectedPoints", "vorp"]);

type PlayerWithVorp = Player & { vorp: number | null };

export default function PlayersTable({
  players,
  replacementLevels,
}: {
  players: Player[];
  replacementLevels: Record<string, number | null>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("overallRank");
  const [hideDrafted, setHideDrafted] = useState(false);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [dragOrderIds, setDragOrderIds] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Dragging reassigns overallRank for the whole board, so it only makes
  // sense against the full, unfiltered list sorted by rank — otherwise
  // "drop it here" would be ambiguous about where it lands among players
  // that aren't currently visible.
  const canReorder =
    sortKey === "overallRank" && positionFilter === "ALL" && !hideDrafted && !watchlistOnly && search.trim() === "";

  // A fresh players prop (after a server reorder round-trips through
  // revalidation) always wins over any stale local drag state.
  useEffect(() => {
    setDragOrderIds(null);
  }, [players]);

  const playersWithVorp = useMemo<PlayerWithVorp[]>(
    () => players.map((p) => ({ ...p, vorp: computeVorp(p, replacementLevels) })),
    [players, replacementLevels]
  );

  const filtered = useMemo(() => {
    let list = playersWithVorp.slice();
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
      const direction = DESCENDING_SORT_KEYS.has(sortKey) ? -1 : 1;
      return ((av as number) - (bv as number)) * direction;
    });
    return list;
  }, [playersWithVorp, search, positionFilter, sortKey, hideDrafted, watchlistOnly]);

  // While actively dragging, show the locally-reordered list instead of
  // re-deriving from `players` — the server write happens on drop.
  const displayList = useMemo(() => {
    if (!canReorder || !dragOrderIds) return filtered;
    const byId = new Map(filtered.map((p) => [p.id, p]));
    return dragOrderIds.map((id) => byId.get(id)).filter((p): p is PlayerWithVorp => Boolean(p));
  }, [filtered, canReorder, dragOrderIds]);

  function persistOrder(orderedIds: string[]) {
    startTransition(async () => {
      await reorderPlayers(orderedIds);
      router.refresh();
    });
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === overId) return;
    const currentOrder = (dragOrderIds ?? filtered.map((p) => p.id)).slice();
    const from = currentOrder.indexOf(draggingId);
    const to = currentOrder.indexOf(overId);
    if (from === -1 || to === -1) return;
    currentOrder.splice(from, 1);
    currentOrder.splice(to, 0, draggingId);
    setDragOrderIds(currentOrder);
  }

  function handleDragEnd() {
    setDraggingId(null);
    if (dragOrderIds) persistOrder(dragOrderIds);
  }

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
          <option value="espnAdp">Sort: ESPN ADP</option>
          <option value="sleeperAdp">Sort: Sleeper ADP</option>
          <option value="tier">Sort: Tier</option>
          <option value="name">Sort: Name</option>
          <option value="projectedPoints">Sort: Projected Points</option>
          <option value="vorp">Sort: VORP</option>
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
        {canReorder
          ? " — drag ⠿ to reorder rankings"
          : " — sort by Overall Rank with no filters/search active to drag-reorder rankings"}
      </p>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-zinc-100 text-left dark:bg-ink-900/60">
            <tr>
              {canReorder && <th className="w-10 px-2 py-2"></th>}
              <th className="px-3 py-2">★</th>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">Bye</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">ESPN ADP</th>
              <th className="px-3 py-2">Sleeper ADP</th>
              <th className="px-3 py-2">Proj Pts</th>
              <th className="px-3 py-2">VORP</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {displayList.map((p, index) => (
              <tr
                key={p.id}
                onDragOver={canReorder ? (e) => handleDragOver(e, p.id) : undefined}
                className={`border-t border-zinc-200 dark:border-ink-800 ${
                  p.draftedBy ? "opacity-50" : ""
                } ${draggingId === p.id ? "opacity-40" : ""}`}
              >
                {canReorder && (
                  <td className="px-2 py-2 text-center">
                    <span
                      draggable
                      onDragStart={() => setDraggingId(p.id)}
                      onDragEnd={handleDragEnd}
                      title="Drag to reorder"
                      className="cursor-grab select-none text-zinc-400 active:cursor-grabbing"
                    >
                      ⠿
                    </span>
                  </td>
                )}
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
                <td className="px-3 py-2">{canReorder ? index + 1 : p.overallRank ?? "—"}</td>
                <td className="px-3 py-2 font-medium">
                  <Link href={`/players/${p.id}`} className="flex items-center gap-2 hover:underline">
                    {p.headshotUrl ? (
                      <Image
                        src={p.headshotUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="h-7 w-7 shrink-0 rounded-full border border-zinc-200 bg-zinc-100 object-cover dark:border-ink-800 dark:bg-ink-800"
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
                <td className="px-3 py-2">{p.espnAdp ?? "—"}</td>
                <td className="px-3 py-2">{p.sleeperAdp ?? "—"}</td>
                <td className="px-3 py-2">{p.projectedPoints ?? "—"}</td>
                <td className="px-3 py-2">
                  {p.vorp != null ? (
                    <span className={p.vorp >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                      {p.vorp >= 0 ? "+" : ""}
                      {p.vorp.toFixed(1)}
                    </span>
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
            {displayList.length === 0 && (
              <tr>
                <td colSpan={canReorder ? 15 : 14} className="px-3 py-8 text-center text-zinc-500">
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
