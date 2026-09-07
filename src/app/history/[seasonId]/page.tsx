import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TeamBadge from "@/components/TeamBadge";
import PickForm from "./PickForm";
import DeletePickButton from "./DeletePickButton";
import ImportPicksForm from "./ImportPicksForm";

export const dynamic = "force-dynamic";

export default async function SeasonDetailPage({ params }: { params: { seasonId: string } }) {
  const season = await prisma.draftSeason.findUnique({
    where: { id: params.seasonId },
    include: { picks: { orderBy: [{ round: "asc" }, { pickInRound: "asc" }] } },
  });

  if (!season) notFound();

  return (
    <div>
      <Link href="/history" className="mb-3 inline-block text-sm text-zinc-500 hover:underline">
        ← Back to Draft History
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {season.year}
          {season.name ? ` — ${season.name}` : ""}
        </h1>
        <PickForm seasonId={season.id} />
      </div>

      <ImportPicksForm seasonId={season.id} />

      <h2 className="mb-3 text-lg font-bold">Picks ({season.picks.length})</h2>
      {season.picks.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No picks logged yet. Add one above or bulk-import this draft's results.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-zinc-100 text-left dark:bg-ink-900/60">
              <tr>
                <th className="px-3 py-2">Rnd</th>
                <th className="px-3 py-2">Pick</th>
                <th className="px-3 py-2">Manager</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Pos</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {season.picks.map((p) => (
                <tr key={p.id} className="border-t border-zinc-200 dark:border-ink-800">
                  <td className="px-3 py-2">{p.round}</td>
                  <td className="px-3 py-2">{p.pickInRound}</td>
                  <td className="px-3 py-2 font-medium">{p.manager}</td>
                  <td className="px-3 py-2">{p.playerName}</td>
                  <td className="px-3 py-2">{p.position}</td>
                  <td className="px-3 py-2">
                    <TeamBadge team={p.nflTeam} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <PickForm seasonId={season.id} pick={p} />
                      <DeletePickButton
                        id={p.id}
                        seasonId={season.id}
                        label={`R${p.round}.${p.pickInRound} ${p.playerName}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
