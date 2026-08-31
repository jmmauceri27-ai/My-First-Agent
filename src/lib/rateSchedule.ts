/** The 12 recurring calendar months a trade's rate schedule can be paid in -- the same pattern repeats every year until changed, so entries aren't tied to a specific year. */
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export type Month = (typeof MONTHS)[number];

/** A trade's paid months and the amount for each -- a month absent from the map isn't paid. */
export type RateSchedule = Partial<Record<Month, number>>;

export function sumRateSchedule(schedule: RateSchedule): number {
  return MONTHS.reduce((sum, m) => sum + (schedule[m] ?? 0), 0);
}
