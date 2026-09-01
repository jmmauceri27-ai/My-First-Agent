import Link from "next/link";
import { tierColor } from "@/lib/constants";
import TeamBadge from "@/components/TeamBadge";

export default function ValueRow({
  player: p,
  value,
}: {
  player: { id: string; name: string; position: string; team: string | null; tier: number | null; overallRank: number | null; espnAdp: number | null };
  value: number;
}) {
  return (
    <Link
      href={`/players/${p.id}`}
      className={`flex items-center justify-between gap-2 rounded-lg border-l-4 bg-white p-2 text-sm shadow-sm backdrop-blur-md hover:shadow dark:bg-ink-900/70 ${tierColor(p.tier)}`}
    >
      <div>
        <span className="font-medium">{p.name}</span>
        <span className="ml-2 inline-flex items-center gap-1 text-xs text-zinc-500">
          {p.position}
          <TeamBadge team={p.team} />
        </span>
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Rank {p.overallRank} · ADP {p.espnAdp}
        </div>
      </div>
      <span className={`text-sm font-semibold ${value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        {value >= 0 ? "+" : ""}
        {value.toFixed(1)}
      </span>
    </Link>
  );
}
