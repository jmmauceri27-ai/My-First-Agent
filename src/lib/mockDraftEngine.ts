// Pure snake-draft math and computer-opponent logic for mock drafts. No DB
// access here — callers pass in whatever state they've already loaded, which
// keeps this testable and keeps the Prisma round-trips in one place (actions.ts).

export type RosterSettings = {
  numTeams: number;
  myDraftSlot: number;
  qbSlots: number;
  rbSlots: number;
  wrSlots: number;
  teSlots: number;
  flexSlots: number;
  kSlots: number;
  dstSlots: number;
  benchSlots: number;
};

export function totalRounds(s: RosterSettings): number {
  return s.qbSlots + s.rbSlots + s.wrSlots + s.teSlots + s.flexSlots + s.kSlots + s.dstSlots + s.benchSlots;
}

// Which team is on the clock for a given overall pick number (1-indexed),
// snake order: round 1 goes 1..N, round 2 goes N..1, round 3 goes 1..N, etc.
export function teamSlotForPick(overallPick: number, numTeams: number): { round: number; teamSlot: number } {
  const round = Math.ceil(overallPick / numTeams);
  const posInRound = overallPick - (round - 1) * numTeams; // 1..numTeams
  const teamSlot = round % 2 === 1 ? posInRound : numTeams + 1 - posInRound;
  return { round, teamSlot };
}

export type CandidatePlayer = {
  id: string;
  name: string;
  position: string;
  team: string | null;
  overallRank: number | null;
  adp: number | null;
};

const FLEX_ELIGIBLE = ["RB", "WR", "TE"];
// Once a position's starter (or flex-group) slots are already spoken for,
// taking another one isn't equally unlikely across positions — real
// managers happily keep stacking bench RB/WR, occasionally grab a 2nd
// QB/TE, and essentially never draft a backup K or DST. These penalties
// (added to effective rank) model that gradient rather than treating every
// "extra" pick the same.
const OVERFLOW_PENALTY: Record<string, number> = {
  RB: 5,
  WR: 5,
  TE: 20,
  QB: 40,
  K: 500,
  DST: 500,
};

function effectiveRankValue(p: CandidatePlayer): number {
  if (p.overallRank != null) return p.overallRank;
  if (p.adp != null) return p.adp;
  return 9999; // unranked players sort to the back
}

// Picks a computer opponent's next player: best-available by rank, with a
// penalty applied once a position's starter (or flex-group) slots are
// already spoken for, so teams don't stockpile 3 QBs or a backup kicker by
// round 5. A little randomness among the top few eligible options keeps
// mocks from being identical every run.
export function pickForTeam(
  available: CandidatePlayer[],
  rosterSoFar: { position: string }[],
  settings: RosterSettings
): CandidatePlayer | null {
  if (available.length === 0) return null;

  const have: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  for (const p of rosterSoFar) {
    have[p.position] = (have[p.position] ?? 0) + 1;
  }

  // Each of RB/WR/TE must fill its own strict starter count first — only
  // once a position is past that does its overflow start competing for the
  // shared FLEX slots, which get consumed by whichever position(s) went over.
  const strictSlots: Record<string, number> = { RB: settings.rbSlots, WR: settings.wrSlots, TE: settings.teSlots };
  const flexRemaining =
    settings.flexSlots -
    FLEX_ELIGIBLE.reduce((sum, pos) => sum + Math.max(0, have[pos] - strictSlots[pos]), 0);

  function needed(position: string): boolean {
    if (position === "QB") return have.QB < settings.qbSlots;
    if (position === "K") return have.K < settings.kSlots;
    if (position === "DST") return have.DST < settings.dstSlots;
    if (FLEX_ELIGIBLE.includes(position)) {
      return have[position] < strictSlots[position] || flexRemaining > 0;
    }
    return false;
  }

  const scored = available
    .map((p) => ({ p, score: effectiveRankValue(p) + (needed(p.position) ? 0 : (OVERFLOW_PENALTY[p.position] ?? 30)) }))
    .sort((a, b) => a.score - b.score);

  const pool = scored.slice(0, Math.min(3, scored.length));
  const roll = Math.random();
  const idx = roll < 0.6 ? 0 : roll < 0.85 ? Math.min(1, pool.length - 1) : Math.min(2, pool.length - 1);
  return pool[idx].p;
}
