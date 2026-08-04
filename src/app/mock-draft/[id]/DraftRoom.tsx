"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MockDraft, MockDraftPick, Player } from "@prisma/client";
import { POSITIONS } from "@/lib/constants";
import TeamBadge from "@/components/TeamBadge";
import { totalRounds } from "@/lib/mockDraftEngine";
import { makeMockPick } from "../actions";

type Props = {
  mockDraft: MockDraft;
  picks: MockDraftPick[];
  availablePlayers: Player[];
  totalPicks: number;
  nextOverallPick: number;
  onTheClockRound: number | null;
  onTheClockTeamSlot: number | null;
  isUserTurn: boolean;
};

function teamLabel(teamSlot: number, myDraftSlot: number): string {
  return teamSlot === myDraftSlot ? "You" : `Team ${teamSlot}`;
}

// Assigns a manager's picks (in draft order) to starting-slot labels, falling
// back to FLEX (if position-eligible) and then bench — purely for display,
// so you can see your build take shape as a lineup rather than a flat list.
function buildRosterSlots(myPicks: MockDraftPick[], mockDraft: MockDraft) {
  const slots: { label: string; pick?: MockDraftPick }[] = [];
  const push = (count: number, prefix: string) => {
    for (let i = 0; i < count; i++) slots.push({ label: count > 1 ? `${prefix}${i + 1}` : prefix });
  };
  push(mockDraft.qbSlots, "QB");
  push(mockDraft.rbSlots, "RB");
  push(mockDraft.wrSlots, "WR");
  push(mockDraft.teSlots, "TE");
  push(mockDraft.flexSlots, "FLEX");
  push(mockDraft.kSlots, "K");
  push(mockDraft.dstSlots, "DST");
  push(mockDraft.benchSlots, "BN");

  const flexEligible = ["RB", "WR", "TE"];
  const ordered = [...myPicks].sort((a, b) => a.overallPick - b.overallPick);
  for (const pick of ordered) {
    let target = slots.find((s) => !s.pick && s.label.startsWith(pick.position));
    if (!target && flexEligible.includes(pick.position)) {
      target = slots.find((s) => !s.pick && s.label.startsWith("FLEX"));
    }
    if (!target) target = slots.find((s) => !s.pick && s.label.startsWith("BN"));
    if (target) target.pick = pick;
  }
  return slots;
}

export default function DraftRoom({
  mockDraft,
  picks,
  availablePlayers,
  totalPicks,
  nextOverallPick,
  onTheClockRound,
  onTheClockTeamSlot,
  isUserTurn,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");

  const filteredPlayers = useMemo(() => {
    let list = availablePlayers;
    if (positionFilter !== "ALL") list = list.filter((p) => p.position === positionFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.team ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [availablePlayers, search, positionFilter]);

  const myPicks = useMemo(() => picks.filter((p) => p.isUser), [picks]);
  const rosterSlots = useMemo(() => buildRosterSlots(myPicks, mockDraft), [myPicks, mockDraft]);
  const recentPicks = useMemo(() => [...picks].sort((a, b) => b.overallPick - a.overallPick), [picks]);

  function handleDraft(playerId: string) {
    const fd = new FormData();
    fd.set("mockDraftId", mockDraft.id);
    fd.set("playerId", playerId);
    setDraftingId(playerId);
    startTransition(async () => {
      await makeMockPick(fd);
      setDraftingId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 rounded-lg border border-zinc-200 bg-white/90 p-4 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
        {mockDraft.completed ? (
          <p className="font-semibold">
            🏁 Draft complete — {totalPicks} picks across {totalRounds(mockDraft)} rounds.
          </p>
        ) : (
          <p className="font-semibold">
            Pick {nextOverallPick} of {totalPicks} — Round {onTheClockRound} — On the clock:{" "}
            <span className={isUserTurn ? "text-gridiron-600 dark:text-gridiron-300" : ""}>
              {onTheClockTeamSlot != null ? teamLabel(onTheClockTeamSlot, mockDraft.myDraftSlot) : "—"}
            </span>
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isUserTurn && (
            <div className="mb-4">
              <h2 className="mb-2 text-lg font-bold">You're on the clock</h2>
              <div className="mb-2 flex flex-wrap gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, team..."
                  className="min-w-[160px] flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-ink-800"
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
              </div>
              <div className="max-h-[420px] overflow-y-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-100 text-left dark:bg-ink-900">
                    <tr>
                      <th className="px-3 py-2">Rank</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Pos</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="px-3 py-2">Bye</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.slice(0, 100).map((p) => (
                      <tr key={p.id} className="border-t border-zinc-200 dark:border-ink-800">
                        <td className="px-3 py-2">{p.overallRank ?? "—"}</td>
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2">{p.position}</td>
                        <td className="px-3 py-2">
                          <TeamBadge team={p.team} />
                        </td>
                        <td className="px-3 py-2">{p.byeWeek ?? "—"}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleDraft(p.id)}
                            disabled={pending}
                            className="rounded-md bg-gridiron-500 px-3 py-1 text-xs font-semibold text-white hover:bg-gridiron-600 disabled:opacity-60"
                          >
                            {draftingId === p.id ? "Drafting..." : "Draft"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredPlayers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                          No players match.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredPlayers.length > 100 && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Showing top 100 of {filteredPlayers.length} — search or filter to narrow it down.
                </p>
              )}
            </div>
          )}

          <h2 className="mb-2 text-lg font-bold">Picks So Far</h2>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-100 text-left dark:bg-ink-900">
                <tr>
                  <th className="px-3 py-2">Pick</th>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2">Pos</th>
                  <th className="px-3 py-2">NFL</th>
                </tr>
              </thead>
              <tbody>
                {recentPicks.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t border-zinc-200 dark:border-ink-800 ${p.isUser ? "bg-gridiron-50 dark:bg-gridiron-900/20" : ""}`}
                  >
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      R{p.round}.{String(((p.overallPick - 1) % mockDraft.numTeams) + 1).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-2 font-medium">{teamLabel(p.teamSlot, mockDraft.myDraftSlot)}</td>
                    <td className="px-3 py-2">{p.playerName}</td>
                    <td className="px-3 py-2">{p.position}</td>
                    <td className="px-3 py-2">
                      <TeamBadge team={p.nflTeam} />
                    </td>
                  </tr>
                ))}
                {recentPicks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                      No picks yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-bold">Your Roster</h2>
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
            {rosterSlots.map((s, i) => (
              <div
                key={i}
                className={`flex items-center justify-between border-t border-zinc-200 px-3 py-2 text-sm first:border-t-0 dark:border-ink-800 ${
                  s.label.startsWith("BN") ? "text-zinc-500 dark:text-zinc-400" : ""
                }`}
              >
                <span className="w-14 shrink-0 font-mono text-xs text-zinc-400">{s.label}</span>
                {s.pick ? (
                  <span className="flex-1 truncate text-right">
                    {s.pick.playerName} <span className="text-xs text-zinc-400">({s.pick.position})</span>
                  </span>
                ) : (
                  <span className="flex-1 text-right text-zinc-400">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
