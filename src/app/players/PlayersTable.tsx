"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Player } from "@prisma/client";
import { POSITIONS, tierColor } from "@/lib/constants";
import TeamBadge from "@/components/TeamBadge";
import { computeVorp } from "@/lib/vorp";
import { adpValue } from "@/lib/value";
import PlayerFormModal from "./PlayerFormModal";
import { deletePlayer, toggleWatchlist, reorderPlayers } from "./actions";

type SortKey =
  | "overallRank"
  | "byeWeek"
  | "espnAdp"
  | "sleeperAdp"
  | "tier"
  | "name"
  | "projectedPoints"
  | "vorp"
  | "value";

type SortDir = "asc" | "desc";

// Higher is better for these — everything else (ranks, ADP, tier, bye) is
// lower-is-better — so clicking a new header for the first time should
// start in whichever direction shows the "best" players first.
const DESCENDING_DEFAULT_KEYS = new Set<SortKey>(["projectedPoints", "vorp", "value"]);

type PlayerWithVorp = Player & { vorp: number | null; value: number | null };

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
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [hideDrafted, setHideDrafted] = useState(false);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [dragOrderIds, setDragOrderIds] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(DESCENDING_DEFAULT_KEYS.has(key) ? "desc" : "asc");
    }
  }

  function sortHeader(label: string, sortKeyName: SortKey) {
    const active = sortKey === sortKeyName;
    return (
      <button
        type="button"
        onClick={() => toggleSort(sortKeyName)}
        className={`flex items-center gap-1 hover:underline ${active ? "font-semibold" : ""}`}
      >
        {label}
        <span className="text-[10px] text-zinc-400">{active ? (sortDir === "asc" ? "▲" : "▼") : ""}</span>
      </button>
    );
  }

  // Dragging reassigns overallRank for the whole board, so it only makes
  // sense against the full, unfiltered list in natural rank order —
  // otherwise "drop it here" would be ambiguous (or backwards).
  const canReorder =
    sortKey === "overallRank" &&
    sortDir === "asc" &&
    positionFilter === "ALL" &&
    !hideDrafted &&
    !watchlistOnly &&
    search.trim() === "";

  // A fresh players prop (after a server reorder round-trips through
  // revalidation) always wins over any stale local drag state.
  useEffect(() => {
    setDragOrderIds(null);
  }, [players]);

  const playersWithVorp = useMemo<PlayerWithVorp[]>(
    () => players.map((p) => ({ ...p, vorp: computeVorp(p, replacementLevels), value: adpValue(p) })),
    [players, replacementLevels]
  );

  const filtered = useMemo(() => {
    let list = playersWithVorp.slice();
    if (positionFilter !== "ALL") list = list.filter((p) => p.position === positionFilter);
    if (hideDrafted) list = list.filter((p) => !p.draftedBy);
    if (watchlistOnly) list = list.filter((p) => p.watchlisted);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.team ?? "").toLowerCase().includes(q));
    }
    const direction = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * direction;
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return ((av as number) - (bv as number)) * direction;
    });
    return list;
  }, [playersWithVorp, search, positionFilter, sortKey, sortDir, hideDrafted, watchlistOnly]);

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
          placeholder="Search name, team..."
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
        Showing {filtered.length} of {players.length} players — click a column header to sort
        {canReorder ? ", or drag ⠿ to reorder rankings" : ""}
      </p>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-zinc-100 text-left dark:bg-ink-900/60">
            <tr>
              {canReorder && <th className="w-10 px-2 py-2"></th>}
              <th className="px-3 py-2">★</th>
              <th className="px-3 py-2">{sortHeader("Rank", "overallRank")}</th>
              <th className="px-3 py-2">{sortHeader("Name", "name")}</th>
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">{sortHeader("Bye", "byeWeek")}</th>
              <th className="px-3 py-2">{sortHeader("Tier", "tier")}</th>
              <th className="px-3 py-2">{sortHeader("ESPN ADP", "espnAdp")}</th>
              <th className="px-3 py-2">{sortHeader("Sleeper ADP", "sleeperAdp")}</th>
              <th className="px-3 py-2">{sortHeader("Proj Pts", "projectedPoints")}</th>
              <th className="px-3 py-2">{sortHeader("VORP", "vorp")}</th>
              <th className="px-3 py-2">{sortHeader("Value", "value")}</th>
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
                  {p.value != null ? (
                    <span className={p.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                      {p.value >= 0 ? "+" : ""}
                      {p.value.toFixed(1)}
                    </span>
                  ) : (
                    "—"
                  )}
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
