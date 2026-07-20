"use client";

import { useMemo, useState } from "react";
import type { Player } from "@prisma/client";
import { POSITIONS, TAG_STYLES, tierColor } from "@/lib/constants";

export default function BoardView({ players }: { players: Player[] }) {
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [hideDrafted, setHideDrafted] = useState(true);

  const tiers = useMemo(() => {
    let list = players.slice();
    if (positionFilter !== "ALL") list = list.filter((p) => p.position === positionFilter);
    if (hideDrafted) list = list.filter((p) => !p.draftedBy);

    const grouped = new Map<number | "unranked", Player[]>();
    for (const p of list) {
      const key = p.tier ?? "unranked";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(p);
    }
    for (const arr of grouped.values()) {
      arr.sort((a, b) => (a.overallRank ?? 9999) - (b.overallRank ?? 9999));
    }
    const keys = Array.from(grouped.keys()).sort((a, b) => {
      if (a === "unranked") return 1;
      if (b === "unranked") return -1;
      return a - b;
    });
    return keys.map((key) => ({ key, players: grouped.get(key)! }));
  }, [players, positionFilter, hideDrafted]);

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <button
            onClick={() => setPositionFilter("ALL")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              positionFilter === "ALL" ? "bg-gridiron-500 text-white" : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            ALL
          </button>
          {POSITIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPositionFilter(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                positionFilter === p ? "bg-gridiron-500 text-white" : "bg-zinc-100 dark:bg-zinc-800"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={hideDrafted} onChange={(e) => setHideDrafted(e.target.checked)} />
          Hide drafted
        </label>
        <button
          onClick={() => window.print()}
          className="ml-auto rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          🖨️ Print Cheat Sheet
        </button>
      </div>

      <div className="space-y-4">
        {tiers.map(({ key, players: tierPlayers }) => (
          <div key={key} className={`rounded-lg border-l-4 bg-white p-3 shadow-sm dark:bg-zinc-900 ${tierColor(key === "unranked" ? null : key)}`}>
            <h3 className="mb-2 font-bold">{key === "unranked" ? "Unranked" : `Tier ${key}`}</h3>
            <div className="flex flex-wrap gap-2">
              {tierPlayers.map((p) => (
                <div
                  key={p.id}
                  className="min-w-[160px] rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700"
                >
                  <div className="font-medium">
                    {p.overallRank ? `${p.overallRank}. ` : ""}
                    {p.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {p.position} · {p.team ?? "FA"} {p.byeWeek ? `· Bye ${p.byeWeek}` : ""}
                  </div>
                  {p.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <span key={t} className={`rounded px-1 text-[10px] ${TAG_STYLES[t] ?? "bg-zinc-200"}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {tiers.length === 0 && <p className="text-zinc-500">No players match this filter.</p>}
      </div>
    </div>
  );
}
