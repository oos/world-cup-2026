export type KnockoutSlotLabels = {
  team1: string;
  team2: string;
};

export const WORLD_CUP_2026_KNOCKOUT_SLOTS: Record<number, KnockoutSlotLabels> = {
  73: { team1: "2A", team2: "2B" },
  74: { team1: "1E", team2: "3A/B/C/D/F" },
  75: { team1: "1F", team2: "2C" },
  76: { team1: "1C", team2: "2F" },
  77: { team1: "1I", team2: "3C/D/F/G/H" },
  78: { team1: "2E", team2: "2I" },
  79: { team1: "1A", team2: "3C/E/F/H/I" },
  80: { team1: "1L", team2: "3E/H/I/J/K" },
  81: { team1: "1D", team2: "3B/E/F/I/J" },
  82: { team1: "1G", team2: "3A/E/H/I/J" },
  83: { team1: "2K", team2: "2L" },
  84: { team1: "1H", team2: "2J" },
  85: { team1: "1B", team2: "3E/F/G/I/J" },
  86: { team1: "1J", team2: "2H" },
  87: { team1: "1K", team2: "3D/E/I/J/L" },
  88: { team1: "2D", team2: "2G" },
  89: { team1: "W74", team2: "W77" },
  90: { team1: "W73", team2: "W75" },
  91: { team1: "W76", team2: "W78" },
  92: { team1: "W79", team2: "W80" },
  93: { team1: "W83", team2: "W84" },
  94: { team1: "W81", team2: "W82" },
  95: { team1: "W86", team2: "W88" },
  96: { team1: "W85", team2: "W87" },
  97: { team1: "W89", team2: "W90" },
  98: { team1: "W93", team2: "W94" },
  99: { team1: "W91", team2: "W92" },
  100: { team1: "W95", team2: "W96" },
  101: { team1: "W97", team2: "W98" },
  102: { team1: "W99", team2: "W100" },
  103: { team1: "L101", team2: "L102" },
  104: { team1: "W101", team2: "W102" },
};

export function knockoutSlotLabels(matchNumber: number | null | undefined): KnockoutSlotLabels | null {
  if (!matchNumber) return null;
  return WORLD_CUP_2026_KNOCKOUT_SLOTS[matchNumber] ?? null;
}
