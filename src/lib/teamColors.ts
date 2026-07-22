export type TeamColor = { bg: string; text: string; ring: string };

// Primary brand color per team, with a readable text color and a subtle ring/accent.
const TEAM_COLORS: Record<string, TeamColor> = {
  ARI: { bg: "#97233F", text: "#ffffff", ring: "#FFB612" },
  ATL: { bg: "#A71930", text: "#ffffff", ring: "#A5ACAF" },
  BAL: { bg: "#241773", text: "#ffffff", ring: "#9E7C0C" },
  BUF: { bg: "#00338D", text: "#ffffff", ring: "#C60C30" },
  CAR: { bg: "#0085CA", text: "#ffffff", ring: "#101820" },
  CHI: { bg: "#0B162A", text: "#ffffff", ring: "#C83803" },
  CIN: { bg: "#FB4F14", text: "#000000", ring: "#000000" },
  CLE: { bg: "#311D00", text: "#ffffff", ring: "#FF3C00" },
  DAL: { bg: "#041E42", text: "#ffffff", ring: "#869397" },
  DEN: { bg: "#FB4F14", text: "#000000", ring: "#002244" },
  DET: { bg: "#0076B6", text: "#ffffff", ring: "#B0B7BC" },
  GB: { bg: "#203731", text: "#ffffff", ring: "#FFB612" },
  HOU: { bg: "#03202F", text: "#ffffff", ring: "#A71930" },
  IND: { bg: "#002C5F", text: "#ffffff", ring: "#A2AAAD" },
  JAC: { bg: "#101820", text: "#ffffff", ring: "#D7A22A" },
  JAX: { bg: "#101820", text: "#ffffff", ring: "#D7A22A" },
  KC: { bg: "#E31837", text: "#ffffff", ring: "#FFB81C" },
  LV: { bg: "#000000", text: "#ffffff", ring: "#A5ACAF" },
  LAC: { bg: "#0080C6", text: "#ffffff", ring: "#FFC20E" },
  LAR: { bg: "#003594", text: "#ffffff", ring: "#FFA300" },
  MIA: { bg: "#008E97", text: "#ffffff", ring: "#FC4C02" },
  MIN: { bg: "#4F2683", text: "#ffffff", ring: "#FFC62F" },
  NE: { bg: "#002244", text: "#ffffff", ring: "#C60C30" },
  NO: { bg: "#101820", text: "#D3BC8D", ring: "#D3BC8D" },
  NYG: { bg: "#0B2265", text: "#ffffff", ring: "#A71930" },
  NYJ: { bg: "#125740", text: "#ffffff", ring: "#000000" },
  PHI: { bg: "#004C54", text: "#ffffff", ring: "#A5ACAF" },
  PIT: { bg: "#101820", text: "#FFB612", ring: "#FFB612" },
  SF: { bg: "#AA0000", text: "#ffffff", ring: "#B3995D" },
  SEA: { bg: "#002244", text: "#ffffff", ring: "#69BE28" },
  TB: { bg: "#D50A0A", text: "#ffffff", ring: "#34302B" },
  TEN: { bg: "#0C2340", text: "#ffffff", ring: "#4B92DB" },
  WAS: { bg: "#5A1414", text: "#FFB612", ring: "#FFB612" },
  WSH: { bg: "#5A1414", text: "#FFB612", ring: "#FFB612" },
  FA: { bg: "#3f3f46", text: "#d4d4d8", ring: "#71717a" },
};

const FALLBACK: TeamColor = { bg: "#3f3f46", text: "#d4d4d8", ring: "#71717a" };

export function getTeamColor(team: string | null | undefined): TeamColor {
  if (!team) return FALLBACK;
  return TEAM_COLORS[team.toUpperCase()] ?? FALLBACK;
}

// nflverse hosts square team logo crops on GitHub, keyed by team_abbr; a
// couple of our aliases (JAC, WSH) need mapping to their canonical file name.
const LOGO_FILE_OVERRIDES: Record<string, string> = { JAC: "JAX", WSH: "WAS" };

export function getTeamLogoUrl(team: string | null | undefined): string | null {
  if (!team) return null;
  const code = team.toUpperCase();
  if (code === "FA" || !TEAM_COLORS[code]) return null;
  const file = LOGO_FILE_OVERRIDES[code] ?? code;
  return `https://raw.githubusercontent.com/nflverse/nflverse-pbp/master/squared_logos/${file}.png`;
}
