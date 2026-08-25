// Pure display helpers for turning a draft slot number into a manager
// name/label. Deliberately has zero runtime dependencies (only a
// type-only import, erased at compile time) so client components can
// import it without accidentally pulling in server-only code (Prisma)
// the way importing from lib/leagueSettings.ts would.
import type { LeagueSettings } from "@prisma/client";

// Plain name, suitable as an actual data value (e.g. the "drafted by"
// stored on a player) — never a display-only decoration.
export function managerName(slot: number, settings: LeagueSettings): string {
  const name = settings.managerNames[slot - 1]?.trim();
  if (slot === settings.myDraftSlot) return name || "Me";
  return name || `Team ${slot}`;
}

// Same, but with a "(Me)" marker for on-screen display only.
export function managerLabel(slot: number, settings: LeagueSettings): string {
  const name = managerName(slot, settings);
  return slot === settings.myDraftSlot && name !== "Me" ? `${name} (Me)` : name;
}

// Resolves who actually holds a given (round, baseSlot) pick after
// trades — baseSlot is the untraded snake position from teamSlotForPick;
// the return value is the effective slot to resolve a name from.
export function resolvePickOwnerSlot(
  round: number,
  baseSlot: number,
  trades: { round: number; fromSlot: number; toSlot: number }[]
): number {
  const trade = trades.find((t) => t.round === round && t.fromSlot === baseSlot);
  return trade ? trade.toSlot : baseSlot;
}
