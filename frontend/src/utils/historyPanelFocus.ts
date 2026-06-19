export const HISTORY_PANEL_PARAM = "panel";
export const HISTORY_GOLDEN_BOOT_PARAM = "golden-boot";

export const HISTORY_PANEL_NONE = "none";

export const HISTORY_PANEL_IDS = {
  winnersSankey: "winners",
  roundRace: "success",
  winnersMap: "winners-map",
  goldenBoot: "golden-boot",
  podium: "podium",
} as const;

export type HistoryPanelId = (typeof HISTORY_PANEL_IDS)[keyof typeof HISTORY_PANEL_IDS];

export type HistoryPanelFocus =
  | ReadonlySet<HistoryPanelId>
  | typeof HISTORY_PANEL_NONE
  | null;

const PANEL_PARAM_IDS = new Set<HistoryPanelId>([
  HISTORY_PANEL_IDS.winnersSankey,
  HISTORY_PANEL_IDS.roundRace,
  HISTORY_PANEL_IDS.winnersMap,
  HISTORY_PANEL_IDS.podium,
]);

const PANEL_PARAM_VALUE_SET = new Set<string>(PANEL_PARAM_IDS);

const DEFAULT_OPEN_PANELS = new Set<HistoryPanelId>([HISTORY_PANEL_IDS.winnersSankey]);

export function historyPanelHref(panel: HistoryPanelId): string {
  if (panel === HISTORY_PANEL_IDS.goldenBoot) {
    return `/history?${HISTORY_GOLDEN_BOOT_PARAM}`;
  }
  return `/history?${HISTORY_PANEL_PARAM}=${panel}`;
}

export function historyPanelElementId(panel: HistoryPanelId): string {
  return `history-panel-${panel}`;
}

export function parseHistoryPanelFocus(
  searchParams: URLSearchParams
): HistoryPanelFocus {
  const hasGoldenBoot = searchParams.has(HISTORY_GOLDEN_BOOT_PARAM);
  const hasPanelParam = searchParams.has(HISTORY_PANEL_PARAM);

  if (!hasPanelParam && !hasGoldenBoot) {
    return null;
  }

  if (hasPanelParam) {
    const raw = searchParams.getAll(HISTORY_PANEL_PARAM);
    if (raw.length === 1 && raw[0] === HISTORY_PANEL_NONE) {
      return HISTORY_PANEL_NONE;
    }
  }

  const panels = new Set<HistoryPanelId>();

  if (hasPanelParam) {
    for (const value of searchParams.getAll(HISTORY_PANEL_PARAM)) {
      if (PANEL_PARAM_VALUE_SET.has(value)) {
        panels.add(value as HistoryPanelId);
      }
    }
  }

  if (hasGoldenBoot) {
    panels.add(HISTORY_PANEL_IDS.goldenBoot);
  }

  return panels;
}

export function hasExplicitHistoryPanels(
  focus: HistoryPanelFocus
): focus is ReadonlySet<HistoryPanelId> {
  return focus !== null && focus !== HISTORY_PANEL_NONE;
}

export function isHistoryPanelOpen(
  panelId: HistoryPanelId,
  focus: HistoryPanelFocus
): boolean {
  if (focus === HISTORY_PANEL_NONE) {
    return false;
  }

  if (focus === null) {
    return DEFAULT_OPEN_PANELS.has(panelId);
  }

  return focus.has(panelId);
}

function openPanelsFromFocus(focus: HistoryPanelFocus): Set<HistoryPanelId> {
  if (focus === HISTORY_PANEL_NONE) {
    return new Set();
  }

  if (focus === null) {
    return new Set(DEFAULT_OPEN_PANELS);
  }

  return new Set(focus);
}

function panelsMatchDefault(panels: ReadonlySet<HistoryPanelId>): boolean {
  return (
    panels.size === DEFAULT_OPEN_PANELS.size &&
    [...DEFAULT_OPEN_PANELS].every((panel) => panels.has(panel))
  );
}

function writeOpenPanelsToSearchParams(
  params: URLSearchParams,
  panels: Set<HistoryPanelId>,
  useCleanDefaultUrl: boolean
): void {
  params.delete(HISTORY_PANEL_PARAM);
  params.delete(HISTORY_GOLDEN_BOOT_PARAM);

  const panelParamPanels = new Set<HistoryPanelId>();
  let goldenBootOpen = false;

  for (const panel of panels) {
    if (panel === HISTORY_PANEL_IDS.goldenBoot) {
      goldenBootOpen = true;
    } else if (PANEL_PARAM_IDS.has(panel)) {
      panelParamPanels.add(panel);
    }
  }

  if (panelParamPanels.size === 0 && !goldenBootOpen) {
    params.append(HISTORY_PANEL_PARAM, HISTORY_PANEL_NONE);
    return;
  }

  if (useCleanDefaultUrl && panelsMatchDefault(panelParamPanels) && !goldenBootOpen) {
    return;
  }

  for (const panel of [...panelParamPanels].sort()) {
    params.append(HISTORY_PANEL_PARAM, panel);
  }

  if (goldenBootOpen) {
    params.set(HISTORY_GOLDEN_BOOT_PARAM, "");
  }
}

export function updateHistoryPanelSearchParams(
  params: URLSearchParams,
  panelId: HistoryPanelId,
  isOpen: boolean
): URLSearchParams {
  const next = new URLSearchParams(params);
  const hadExplicitPanels =
    next.has(HISTORY_PANEL_PARAM) || next.has(HISTORY_GOLDEN_BOOT_PARAM);
  const openPanels = openPanelsFromFocus(parseHistoryPanelFocus(next));

  if (isOpen) {
    openPanels.add(panelId);
  } else {
    openPanels.delete(panelId);
  }

  writeOpenPanelsToSearchParams(
    next,
    openPanels,
    !hadExplicitPanels && !isOpen
  );

  return next;
}
