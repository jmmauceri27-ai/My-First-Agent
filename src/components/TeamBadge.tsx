import Image from "next/image";
import { getTeamColor, getTeamLogoUrl } from "@/lib/teamColors";

export default function TeamBadge({ team, className = "" }: { team: string | null | undefined; className?: string }) {
  if (!team) return <span className="text-zinc-400 dark:text-zinc-500">&mdash;</span>;
  const { bg, text } = getTeamColor(team);
  const logoUrl = getTeamLogoUrl(team);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold tracking-wide ${className}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {logoUrl && <Image src={logoUrl} alt="" width={14} height={14} className="rounded-sm" unoptimized />}
      {team}
    </span>
  );
}
