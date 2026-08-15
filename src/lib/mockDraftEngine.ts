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
  espnAdp: number | null;
  sleeperAdp: number | null;
  tier: number | null;
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
  if (p.espnAdp != null && p.sleeperAdp != null) return (p.espnAdp + p.sleeperAdp) / 2;
  if (p.espnAdp != null) return p.espnAdp;
  if (p.sleeperAdp != null) return p.sleeperAdp;
  return 9999; // unranked players sort to the back
}

// Players you've grouped into the same tier are ones you've judged roughly
// interchangeable — a real drafter treats them as a toss-up rather than
// strictly by rank order within the group, so tiered players get wider
// jitter than untiered ones (where we have less basis for treating nearby
// ranks as equivalent).
const TIER_JITTER = 6;
const NO_TIER_JITTER = 3;

// Average of three uniforms approximates a bounded, bell-shaped spread —
// small swings are common, big reaches are rare but possible — instead of
// a flat uniform range.
function bellJitter(magnitude: number): number {
  const u = (Math.random() + Math.random() + Math.random()) / 3;
  return (u - 0.5) * 2 * magnitude;
}

const MANDATORY_POSITIONS = ["QB", "K", "DST", "TE"] as const;

// Picks a computer opponent's next player. Base value is rank/ADP, adjusted
// by three things real drafters actually do:
//  1. Overflow penalty once a position's starters (or shared FLEX) are
//     filled — small for RB/WR bench depth, steep for a 2nd K/DST.
//  2. Late-draft panic: with only a couple picks left, a still-empty
//     mandatory slot (QB/TE/K/DST) gets a growing pull to fill it before
//     the draft ends, mirroring how managers scramble for their kicker in
//     the last round instead of taking another bench WR.
//  3. Tier-aware randomness, so equivalent-tier players aren't drafted in
//     rigid rank order every single time.
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

  const requiredCount: Record<string, number> = {
    QB: settings.qbSlots,
    K: settings.kSlots,
    DST: settings.dstSlots,
    TE: settings.teSlots,
  };
  const roundsLeft = totalRounds(settings) - rosterSoFar.length; // this pick counts as the last of them
  function urgencyBonus(position: string): number {
    if (roundsLeft > 3 || !MANDATORY_POSITIONS.includes(position as (typeof MANDATORY_POSITIONS)[number])) return 0;
    if (have[position] >= requiredCount[position]) return 0;
    // Strong enough to outweigh even a big rank gap — by the final couple of
    // rounds, leaving a mandatory starter slot empty isn't a real option.
    return -(4 - roundsLeft) * 150;
  }

  const scored = available.map((p) => {
    const overflow = needed(p.position) ? 0 : (OVERFLOW_PENALTY[p.position] ?? 30);
    const jitter = bellJitter(p.tier != null ? TIER_JITTER : NO_TIER_JITTER);
    return { p, score: effectiveRankValue(p) + overflow + urgencyBonus(p.position) + jitter };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0]?.p ?? null;
}
