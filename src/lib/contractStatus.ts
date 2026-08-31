const EXPIRING_SOON_DAYS = 60;

export interface ContractStatusInfo {
  label: string;
  /** Badge classes -- soft background + text, used in the list view. */
  badgeClassName: string;
  /** Solid fill, used for the Gantt bar in the timeline view. */
  barClassName: string;
}

export function contractStatus(endDate: string | null): ContractStatusInfo {
  if (!endDate) {
    return { label: "Ongoing", badgeClassName: "bg-slate-500/10 text-slate-300", barClassName: "bg-slate-500" };
  }

  const daysLeft = Math.floor((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) {
    return { label: "Expired", badgeClassName: "bg-critical/10 text-critical", barClassName: "bg-critical" };
  }
  if (daysLeft <= EXPIRING_SOON_DAYS) {
    return { label: "Expiring soon", badgeClassName: "bg-amber-500/10 text-amber-400", barClassName: "bg-amber-500" };
  }
  return { label: "Active", badgeClassName: "bg-emerald-500/10 text-emerald-400", barClassName: "bg-emerald-500" };
}

export function formatContractDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
