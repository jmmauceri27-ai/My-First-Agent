import type { GameLog } from "@prisma/client";
import TeamBadge from "@/components/TeamBadge";

function avg(yards: number | null, attempts: number | null): string {
  if (!attempts) return "—";
  return ((yards ?? 0) / attempts).toFixed(1);
}

function num(n: number | null): string {
  return n == null ? "—" : String(n);
}

export default function GameLogTable({
  position,
  byeWeek,
  logs,
}: {
  position: string;
  byeWeek: number | null;
  logs: GameLog[];
}) {
  const maxWeek = logs.reduce((m, l) => Math.max(m, l.week), 0);

  type Row = { kind: "game"; log: GameLog } | { kind: "bye"; week: number };
  const rows: Row[] = [];
  for (let week = maxWeek; week >= 1; week--) {
    const log = logs.find((l) => l.week === week);
    if (log) rows.push({ kind: "game", log });
    else if (week === byeWeek) rows.push({ kind: "bye", week });
  }

  const showPassing = position === "QB";
  const showRushing = position === "QB" || position === "RB";
  const showReceiving = position === "RB" || position === "WR" || position === "TE";
  // Receiving average isn't part of a RB's game log (matches standard box
  // score layout: RBs get CAR/YDS/AVG/TD then REC/YDS/TD, no receiving AVG).
  const showReceivingAvg = position === "WR" || position === "TE";
  const showTargets = position === "WR" || position === "TE";

  const colCount =
    2 + // week, opp
    (showPassing ? 5 : 0) +
    (showRushing ? 4 : 0) +
    (showReceiving ? 3 + (showTargets ? 1 : 0) + (showReceivingAvg ? 1 : 0) : 0) +
    2; // misc td, fpts

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
      <table className="w-full min-w-[500px] text-sm">
        <thead className="bg-zinc-100 text-left dark:bg-ink-900/60">
          <tr>
            <th className="px-2 py-2">Week</th>
            <th className="px-2 py-2">Opp</th>
            {showPassing && (
              <>
                <th className="px-2 py-2 text-center">Cmp</th>
                <th className="px-2 py-2 text-center">Att</th>
                <th className="px-2 py-2 text-center">Yds</th>
                <th className="px-2 py-2 text-center">TD</th>
                <th className="px-2 py-2 text-center">Int</th>
              </>
            )}
            {showRushing && (
              <>
                <th className="px-2 py-2 text-center">Car</th>
                <th className="px-2 py-2 text-center">Yds</th>
                <th className="px-2 py-2 text-center">Avg</th>
                <th className="px-2 py-2 text-center">TD</th>
              </>
            )}
            {showReceiving && (
              <>
                <th className="px-2 py-2 text-center">Rec</th>
                {showTargets && <th className="px-2 py-2 text-center">Tar</th>}
                <th className="px-2 py-2 text-center">Yds</th>
                {showReceivingAvg && <th className="px-2 py-2 text-center">Avg</th>}
                <th className="px-2 py-2 text-center">TD</th>
              </>
            )}
            <th className="px-2 py-2 text-center">MiscTD</th>
            <th className="px-2 py-2 text-center">FPTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.kind === "bye" ? (
              <tr key={`bye-${row.week}`} className="border-t border-zinc-200 text-zinc-400 dark:border-ink-800">
                <td className="px-2 py-2">{row.week}</td>
                <td colSpan={colCount - 1} className="px-2 py-2 text-center">
                  BYE
                </td>
              </tr>
            ) : (
              <tr key={row.log.id} className="border-t border-zinc-200 dark:border-ink-800">
                <td className="px-2 py-2">{row.log.week}</td>
                <td className="px-2 py-2">
                  {row.log.opponent ? (
                    <span className="inline-flex items-center gap-1">
                      {row.log.isHome === false && <span className="text-zinc-400">@</span>}
                      <TeamBadge team={row.log.opponent} />
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                {showPassing && (
                  <>
                    <td className="px-2 py-2 text-center">{num(row.log.passCompletions)}</td>
                    <td className="px-2 py-2 text-center">{num(row.log.passAttempts)}</td>
                    <td className="px-2 py-2 text-center">{num(row.log.passYards)}</td>
                    <td className="px-2 py-2 text-center">{num(row.log.passTDs)}</td>
                    <td className="px-2 py-2 text-center">{num(row.log.passInt)}</td>
                  </>
                )}
                {showRushing && (
                  <>
                    <td className="px-2 py-2 text-center">{num(row.log.carries)}</td>
                    <td className="px-2 py-2 text-center">{num(row.log.rushYards)}</td>
                    <td className="px-2 py-2 text-center">{avg(row.log.rushYards, row.log.carries)}</td>
                    <td className="px-2 py-2 text-center">{num(row.log.rushTDs)}</td>
                  </>
                )}
                {showReceiving && (
                  <>
                    <td className="px-2 py-2 text-center">{num(row.log.receptions)}</td>
                    {showTargets && <td className="px-2 py-2 text-center">{num(row.log.targets)}</td>}
                    <td className="px-2 py-2 text-center">{num(row.log.recYards)}</td>
                    {showReceivingAvg && (
                      <td className="px-2 py-2 text-center">{avg(row.log.recYards, row.log.receptions)}</td>
                    )}
                    <td className="px-2 py-2 text-center">{num(row.log.recTDs)}</td>
                  </>
                )}
                <td className="px-2 py-2 text-center">{num(row.log.miscTDs)}</td>
                <td className="px-2 py-2 text-center font-medium">{row.log.pointsPPR.toFixed(1)}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
