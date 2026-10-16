const KEY = "shellbound-save";
export const SAVE_VERSION = 1;

export type SaveData = {
  version: number;
  bestSeasons: number;
  bestPearl: number;
  bestSpawns: number;
  bestGallons: number;
  runs: number;
  facts: string[];
  shake: boolean;
  muted: boolean;
  music: number;
  sfx: number;
};

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    bestSeasons: 0,
    bestPearl: 0,
    bestSpawns: 0,
    bestGallons: 0,
    runs: 0,
    facts: [],
    shake: true,
    muted: false,
    music: 0.55,
    sfx: 0.85,
  };
}

function migrate(raw: Partial<SaveData> | null): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    ...raw,
    facts: Array.isArray(raw.facts) ? raw.facts.filter((id) => typeof id === "string") : [],
    version: SAVE_VERSION,
    music: clamp01(raw.music, base.music),
    sfx: clamp01(raw.sfx, base.sfx),
    shake: typeof raw.shake === "boolean" ? raw.shake : base.shake,
    muted: typeof raw.muted === "boolean" ? raw.muted : base.muted,
  };
}

function clamp01(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return migrate(JSON.parse(raw) as Partial<SaveData>);
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData) {
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem(`${KEY}-bak`, prev);
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: SAVE_VERSION }));
  } catch {
    /* private mode / quota — keep playing in memory */
  }
}
