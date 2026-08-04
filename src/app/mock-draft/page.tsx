import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { totalRounds } from "@/lib/mockDraftEngine";
import { getOrCreateLeagueSettings, startMockDraft } from "./actions";
import LeagueSettingsForm from "./LeagueSettingsForm";
import DeleteMockDraftButton from "./DeleteMockDraftButton";

export const dynamic = "force-dynamic";

export default async function MockDraftPage() {
  const [settings, mockDrafts] = await Promise.all([
    getOrCreateLeagueSettings(),
    prisma.mockDraft.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { picks: true } } },
    }),
  ]);

  const rounds = totalRounds(settings);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Mock Draft</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Run a full snake draft against computer opponents using your rankings and league settings,
        anytime you want a rep in.
      </p>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white/90 p-4 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
        <div className="text-sm">
          <span className="font-semibold">{settings.numTeams} teams</span>
          <span className="text-zinc-500 dark:text-zinc-400"> · you pick slot </span>
          <span className="font-semibold">{settings.myDraftSlot}</span>
          <span className="text-zinc-500 dark:text-zinc-400"> · {rounds} rounds </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            (QB {settings.qbSlots} / RB {settings.rbSlots} / WR {settings.wrSlots} / TE {settings.teSlots} / FLEX{" "}
            {settings.flexSlots} / K {settings.kSlots} / D-ST {settings.dstSlots} / BENCH {settings.benchSlots})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LeagueSettingsForm settings={settings} />
          <form action={startMockDraft}>
            <button
              type="submit"
              className="rounded-md bg-gridiron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gridiron-600"
            >
              + Start Mock Draft
            </button>
          </form>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold">Past Mock Drafts</h2>
      {mockDrafts.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No mock drafts yet. Start one above to get some draft-day reps in.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {mockDrafts.map((m) => {
            const mRounds = totalRounds(m);
            const totalPicks = mRounds * m.numTeams;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white/90 p-3 text-sm backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70"
              >
                <Link href={`/mock-draft/${m.id}`} className="hover:underline">
                  <div className="font-semibold">
                    {m.createdAt.toLocaleDateString()} — {m.numTeams} teams
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {m.completed ? "Completed" : `Pick ${m._count.picks + 1} of ${totalPicks}`}
                  </div>
                </Link>
                <DeleteMockDraftButton id={m.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
