/** World Cup 2026 planner group colours — single source of truth for app accents. */
export type GroupColor = {
  bg: string;
  text: string;
};

export const WC26_GROUP_COLORS: Record<string, GroupColor> = {
  A: { bg: "#5E2D8E", text: "#ffffff" },
  B: { bg: "#7A1E3A", text: "#ffffff" },
  C: { bg: "#D64565", text: "#ffffff" },
  D: { bg: "#E85D4C", text: "#ffffff" },
  E: { bg: "#F7941D", text: "#ffffff" },
  F: { bg: "#F9D423", text: "#1a1a1a" },
  G: { bg: "#8BC34A", text: "#1a1a1a" },
  H: { bg: "#2BBBAD", text: "#ffffff" },
  I: { bg: "#29B6F6", text: "#ffffff" },
  J: { bg: "#3949AB", text: "#ffffff" },
  K: { bg: "#BA68C8", text: "#ffffff" },
  L: { bg: "#7986CB", text: "#ffffff" },
};

/** Semantic app palette derived from the planner table. */
export const PLANNER_PALETTE = {
  purple: WC26_GROUP_COLORS.A.bg,
  maroon: WC26_GROUP_COLORS.B.bg,
  rose: WC26_GROUP_COLORS.C.bg,
  coral: WC26_GROUP_COLORS.D.bg,
  orange: WC26_GROUP_COLORS.E.bg,
  gold: WC26_GROUP_COLORS.F.bg,
  green: WC26_GROUP_COLORS.G.bg,
  teal: WC26_GROUP_COLORS.H.bg,
  blue: WC26_GROUP_COLORS.I.bg,
  navy: WC26_GROUP_COLORS.J.bg,
  lavender: WC26_GROUP_COLORS.K.bg,
  periwinkle: WC26_GROUP_COLORS.L.bg,
  slate: "#49516f",
  muted: "#6d7794",
} as const;

export const PLANNER_ACCENTS = {
  primary: PLANNER_PALETTE.teal,
  primaryHover: "#24a89c",
  secondary: PLANNER_PALETTE.blue,
  highlight: PLANNER_PALETTE.orange,
} as const;
