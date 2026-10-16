import { SEASON_LINES, pearlTitle } from "./content";

export const TIDE_PERIOD = 13;
export const SEASON_LENGTH = 26;
const SPAWN_NEED = 2.15;
const SPAWN_WINDOW = 7;

export type Phase = "menu" | "play" | "pause" | "dying" | "dead";
export type ThreatKind = "crab" | "star" | "gull" | "hand" | "silt" | "runoff";
export type Cause = "crab" | "star" | "gull" | "dry" | "starve" | "runoff" | "old" | "hand" | "";
export type Ping =
  | "open"
  | "clamp"
  | "hurt"
  | "safe"
  | "warn"
  | "feed"
  | "pearl"
  | "spawn"
  | "dry";

type MoteKind = "plank" | "spark" | "larva";

type Mote = {
  on: boolean;
  kind: MoteKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  gold: boolean;
};

type Fish = {
  x: number;
  y: number;
  dir: number;
  speed: number;
  scale: number;
  gold: boolean;
  wob: number;
};

type Bubble = { x: number; y: number; r: number; v: number; life: number };

export type Floater = {
  on: boolean;
  text: string;
  x: number;
  y: number;
  life: number;
  max: number;
  tone: "good" | "bad" | "info";
};

export type Threat = {
  kind: ThreatKind;
  side: 1 | -1;
  age: number;
  travel: number;
  leave: number;
  urged: boolean;
  resolved: boolean;
};

export type Crack = { a: number; len: number };

export type Game = {
  phase: Phase;
  anim: number;
  age: number;
  energy: number;
  shell: number;
  stress: number;
  pearlMm: number;
  gallons: number;
  gape: number;
  gapeVel: number;
  wasWide: boolean;
  openPinged: boolean;
  female: boolean;
  eggSpawns: number;
  miltSpawns: number;
  cause: Cause;
  lastHit: Cause;
  recentHurt: number;
  senescence: boolean;
  oldSaid: boolean;
  emptyFor: number;
  hungrySaid: boolean;
  dry: number;
  lowAnnounced: boolean;
  wasLow: boolean;
  lowBad: boolean;
  tideLesson: boolean;
  bannerText: string;
  bannerLife: number;
  threat: Threat | null;
  gap: number;
  spawning: boolean;
  spawnLeft: number;
  spawnHold: number;
  spawnKind: "egg" | "milt" | null;
  spawnedSeason: number;
  seasonSeen: number;
  pearlMark: number;
  feedTick: number;
  dryTick: number;
  bubbleTimer: number;
  bubbleCursor: number;
  dieIn: number;
  hitstop: number;
  recorded: boolean;
  trauma: number;
  hurtFlash: number;
  safeFlash: number;
  shakeOn: boolean;
  facts: string[];
  factSet: Set<string>;
  factsDirty: boolean;
  didOpen: boolean;
  pings: Ping[];
  motes: Mote[];
  fish: Fish[];
  bubbles: Bubble[];
  floaters: Floater[];
  cracks: Crack[];
};

export type Input = { hold: boolean; portrait: boolean; frozen: boolean };

export type HudModel = {
  phase: Phase;
  year: number;
  season: string;
  seasonIndex: number;
  tide: number;
  energy: number;
  shell: number;
  stress: number;
  pearl: number;
  pearlTitle: string;
  gallons: number;
  gape: number;
  banner: string;
  alert: boolean;
  female: boolean;
  eggSpawns: number;
  miltSpawns: number;
  cause: Cause;
  age: number;
  facts: string[];
  spawning: boolean;
  spawnKind: "egg" | "milt" | null;
  spawnProgress: number;
  threat: ThreatKind | "";
};

const SPECS: Record<ThreatKind, { travel: number; leave: number }> = {
  crab: { travel: 3.25, leave: 1.05 },
  star: { travel: 4.7, leave: 1.25 },
  gull: { travel: 2.15, leave: 0.85 },
  hand: { travel: 3.05, leave: 1 },
  silt: { travel: 5.1, leave: 0.45 },
  runoff: { travel: 4.7, leave: 0.45 },
};

const INTRO: Record<ThreatKind, string> = {
  crab: "A mud crab is crossing the rock.",
  star: "An ochre star is coming. It is slow. Do not be open when it arrives.",
  gull: "A gull is circling. Low tide makes you reachable.",
  hand: "A diver's hand is reaching down.",
  silt: "Silt in the water. Open gills will clog.",
  runoff: "Runoff. Stay shut until the sheen passes.",
};

const DAYS_PER_SEASON = 91;

export function tide01(anim: number) {
  const u = (((anim % TIDE_PERIOD) + TIDE_PERIOD) % TIDE_PERIOD) / TIDE_PERIOD;
  return 0.5 - 0.5 * Math.cos(u * Math.PI * 2);
}

export function seasonIndexOf(age: number) {
  return Math.max(0, Math.floor(age));
}

export const SEASON_NAMES = ["Spring", "Summer", "Autumn", "Winter"] as const;

export function seasonNameOf(age: number) {
  return SEASON_NAMES[seasonIndexOf(age) % 4];
}

export function layoutNorm(portrait: boolean, tide: number) {
  const anchorY = portrait ? 0.68 : 0.64;
  const highY = portrait ? 0.2 : 0.16;
  const lowY = anchorY - 0.02;
  const waterY = lowY + (highY - lowY) * tide;
  return { anchorX: 0.5, anchorY, waterY };
}

export function bodyScale(age: number) {
  return Math.min(1.08, 0.58 + Math.max(0, age) * 0.055);
}

export function createGame(opts: { shake: boolean; facts: string[] }): Game {
  const facts = [...new Set(opts.facts)];
  const motes: Mote[] = [];
  for (let i = 0; i < 42; i++) motes.push(makePlankton());
  const fish: Fish[] = [];
  for (let i = 0; i < 7; i++) {
    fish.push({
      x: Math.random(),
      y: 0.35 + Math.random() * 0.4,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 0.035 + Math.random() * 0.04,
      scale: 0.7 + Math.random() * 0.7,
      gold: i === 3,
      wob: Math.random() * 6,
    });
  }
  const bubbles: Bubble[] = [];
  for (let i = 0; i < 8; i++) {
    bubbles.push({
      x: Math.random(),
      y: 0.4 + Math.random() * 0.5,
      r: 0.004 + Math.random() * 0.006,
      v: 0.02 + Math.random() * 0.03,
      life: Math.random() * 3,
    });
  }
  const floaters: Floater[] = [];
  for (let i = 0; i < 10; i++) {
    floaters.push({ on: false, text: "", x: 0, y: 0, life: 0, max: 1, tone: "info" });
  }
  return {
    phase: "menu",
    anim: TIDE_PERIOD * 0.72,
    age: 0,
    energy: 80,
    shell: 100,
    stress: 0,
    pearlMm: 0,
    gallons: 0,
    gape: 0.08,
    gapeVel: 0,
    wasWide: false,
    openPinged: false,
    female: false,
    eggSpawns: 0,
    miltSpawns: 0,
    cause: "",
    lastHit: "",
    recentHurt: 0,
    senescence: false,
    oldSaid: false,
    emptyFor: 0,
    hungrySaid: false,
    dry: 0,
    lowAnnounced: false,
    wasLow: false,
    lowBad: false,
    tideLesson: false,
    bannerText: "",
    bannerLife: 0,
    threat: null,
    gap: 8,
    spawning: false,
    spawnLeft: 0,
    spawnHold: 0,
    spawnKind: null,
    spawnedSeason: -1,
    seasonSeen: -1,
    pearlMark: 0,
    feedTick: 0,
    dryTick: 0,
    bubbleTimer: 0.4,
    bubbleCursor: 0,
    dieIn: 0,
    hitstop: 0,
    recorded: false,
    trauma: 0,
    hurtFlash: 0,
    safeFlash: 0,
    shakeOn: opts.shake,
    facts,
    factSet: new Set(facts),
    factsDirty: false,
    didOpen: false,
    pings: [],
    motes,
    fish,
    bubbles,
    floaters,
    cracks: [],
  };
}

export function beginLife(sim: Game) {
  const facts = sim.facts.slice();
  const shake = sim.shakeOn;
  const next = createGame({ shake, facts });
  next.phase = "play";
  next.gape = 0;
  next.energy = 80;
  next.shell = 100;
  next.gap = 8.5;
  next.bannerText = "Hold to open. Let go to shut. The tide is rising.";
  next.bannerLife = 4.6;
  next.anim = TIDE_PERIOD * 0.7;
  Object.assign(sim, next);
}

export function drainPings(sim: Game): Ping[] {
  if (sim.pings.length === 0) return [];
  const out = sim.pings.slice();
  sim.pings.length = 0;
  return out;
}

export function view(sim: Game): HudModel {
  const seasonIndex = seasonIndexOf(sim.age);
  const alert =
    !!sim.threat ||
    sim.spawning ||
    (sim.phase === "play" && tide01(sim.anim) < 0.22 && sim.gape > 0.12);
  return {
    phase: sim.phase,
    year: Math.floor(seasonIndex / 4) + 1,
    season: seasonNameOf(sim.age),
    seasonIndex,
    tide: tide01(sim.anim),
    energy: sim.energy,
    shell: sim.shell,
    stress: sim.stress,
    pearl: sim.pearlMm,
    pearlTitle: pearlTitle(sim.pearlMm),
    gallons: sim.gallons,
    gape: sim.gape,
    banner: sim.bannerLife > 0 ? sim.bannerText : "",
    alert,
    female: sim.female,
    eggSpawns: sim.eggSpawns,
    miltSpawns: sim.miltSpawns,
    cause: sim.cause,
    age: sim.age,
    facts: sim.facts,
    spawning: sim.spawning,
    spawnKind: sim.spawnKind,
    spawnProgress: sim.spawning ? Math.min(1, sim.spawnHold / SPAWN_NEED) : 0,
    threat: sim.threat?.kind ?? "",
  };
}

export function step(sim: Game, input: Input, rawDt: number) {
  const dt = Math.min(0.05, Math.max(0, rawDt));
  if (dt <= 0) return;

  sim.trauma = Math.max(0, sim.trauma - dt * 1.7);
  sim.hurtFlash = Math.max(0, sim.hurtFlash - dt * 2.4);
  sim.safeFlash = Math.max(0, sim.safeFlash - dt * 1.6);
  sim.recentHurt = Math.max(0, sim.recentHurt - dt);

  if (sim.phase === "menu") {
    sim.anim += dt;
    springGape(sim, 0.075 + Math.sin(sim.anim * 0.75) * 0.03, dt, false);
    ambience(sim, dt, input.portrait, false);
    return;
  }

  if (sim.phase === "pause" || (input.frozen && sim.phase === "play")) {
    sim.anim += dt * 0.35;
    ambience(sim, dt * 0.35, input.portrait, false);
    return;
  }

  if (sim.phase === "dying") {
    sim.anim += dt;
    sim.dieIn -= dt;
    springGape(sim, 0, dt, true);
    ambience(sim, dt, input.portrait, false);
    if (sim.dieIn <= 0) sim.phase = "dead";
    return;
  }

  if (sim.phase === "dead") {
    sim.anim += dt * 0.25;
    ambience(sim, dt * 0.25, input.portrait, false);
    return;
  }

  sim.hitstop = Math.max(0, sim.hitstop - dt);
  const frozenHit = sim.hitstop > 0;
  const sdt = frozenHit ? 0 : dt;
  sim.anim += sdt > 0 ? sdt : dt * 0.15;
  if (sim.bannerLife > 0) sim.bannerLife -= dt;

  const target = input.hold ? 1 : 0;
  if (!frozenHit) springGape(sim, target, dt, true);

  if (sdt === 0) {
    ambience(sim, dt * 0.2, input.portrait, false);
    return;
  }

  const tide = tide01(sim.anim);
  const name = seasonNameOf(sim.age);
  const mods = seasonMods(name);
  const lay = layoutNorm(input.portrait, tide);

  sim.age += sdt / SEASON_LENGTH;
  noteSeason(sim);

  const underwater = tide > 0.18 && lay.anchorY > lay.waterY;
  const clog = sim.stress > 55 ? 0.28 : sim.stress > 25 ? 0.62 : 1;
  if (underwater && sim.gape > 0.08) {
    const bloom = 0.32 + 0.68 * tide;
    const gain = 16 * sim.gape * bloom * mods.food * clog;
    sim.energy = Math.min(100, sim.energy + gain * sdt);
    sim.gallons +=
      50 * (DAYS_PER_SEASON / SEASON_LENGTH) * sim.gape * clog * (tide > 0.22 ? 1 : 0) * sdt;
    if (sim.energy > 36 && sim.stress < 32 && sim.gape > 0.48) {
      sim.pearlMm += 0.145 * sim.gape * mods.food * (sim.stress > 12 ? 0.45 : 1) * sdt;
    }
    sim.feedTick -= sdt;
    if (sim.feedTick <= 0 && sim.gape > 0.45 && clog > 0.5) {
      sim.feedTick = 0.55;
      ping(sim, "feed");
    }
    if (!sim.didOpen && sim.gape > 0.62) {
      sim.didOpen = true;
      unlock(sim, "filter");
    }
  }

  const mark = Math.floor(sim.pearlMm * 2);
  if (mark > sim.pearlMark && sim.pearlMm >= 0.35) {
    sim.pearlMark = mark;
    floatAt(sim, "+ nacre", lay.anchorX + 0.06, lay.anchorY - 0.08, "good");
    if (mark % 2 === 0) ping(sim, "pearl");
  }
  if (sim.pearlMm >= 0.8 && !sim.factSet.has("nacre")) {
    unlock(sim, "nacre");
    say(sim, "Grit in the mantle is getting a coat of nacre. That is a pearl starting.", 4.2, true);
  }

  const drain = (sim.gape < 0.12 ? 1.8 : 0.62) * mods.drain;
  sim.energy = Math.max(0, sim.energy - drain * sdt);

  if (sim.energy < 18 && !sim.hungrySaid && sim.age > 0.25) {
    sim.hungrySaid = true;
    say(sim, "Reserves are low. You need a high tide with your shell open.", 3.2, false);
  }
  if (sim.energy > 42) sim.hungrySaid = false;

  if (sim.energy <= 0) {
    sim.emptyFor += sdt;
    if (sim.emptyFor > 1.2 && sim.bannerLife < 0.3) {
      say(sim, "Nothing left in the tissues.", 2, false);
    }
  } else sim.emptyFor = 0;

  if (tide < 0.22 && sim.gape > 0.12) {
    const depth = (0.22 - tide) / 0.22;
    const dps = 16 * depth * sim.gape * mods.heat;
    sim.shell -= dps * sdt;
    sim.energy = Math.max(0, sim.energy - dps * 0.32 * sdt);
    sim.dry = Math.min(1, sim.dry + sdt * 0.8);
    sim.lowBad = true;
    sim.lastHit = "dry";
    sim.dryTick -= sdt;
    if (sim.dry > 0.35 && sim.dryTick <= 0) {
      sim.dryTick = 0.7;
      ping(sim, "dry");
    }
  } else {
    sim.dry = Math.max(0, sim.dry - sdt * 0.45);
  }

  if (tide < 0.22 && !sim.lowAnnounced) {
    sim.lowAnnounced = true;
    sim.wasLow = true;
    say(sim, "Tide's out. Clamp shut.", 2.4, true);
  }
  if (tide > 0.48) {
    if (sim.wasLow && !sim.lowBad && !sim.tideLesson && sim.age > 0.2) {
      sim.tideLesson = true;
      unlock(sim, "tide");
      say(sim, "You stayed shut and lived on stored fuel. That is how an oyster waits out low tide.", 4, true);
    }
    sim.wasLow = false;
    sim.lowBad = false;
    sim.lowAnnounced = false;
  }

  const clouding =
    !!sim.threat &&
    (sim.threat.kind === "silt" || sim.threat.kind === "runoff") &&
    sim.threat.age < sim.threat.travel;
  if (!clouding) sim.stress = Math.max(0, sim.stress - (sim.gape < 0.15 ? 13 : 5.5) * sdt);

  if (sim.gape < 0.14 && sim.energy > 24 && tide > 0.24 && sim.stress < 70 && sim.dry < 0.2) {
    sim.shell = Math.min(100, sim.shell + 3.1 * sdt);
  }

  if (sim.age > 8) {
    sim.senescence = true;
    const extra = sim.age - 8;
    sim.shell -= (0.22 + extra * 0.38) * sdt;
    if (!sim.oldSaid) {
      sim.oldSaid = true;
      say(sim, "The shell is tiring. Old oysters do not get many mistakes.", 4, true);
    }
  }

  updateSpawn(sim, sdt, tide);
  updateThreats(sim, sdt, tide);
  ambience(sim, sdt, input.portrait, sim.gape > 0.4 && underwater);

  if (sim.shell <= 0 || sim.emptyFor > 4.2) {
    sim.shell = Math.max(0, sim.shell);
    sim.phase = "dying";
    sim.dieIn = 1.15;
    if (sim.emptyFor > 4.2 && sim.shell > 0) sim.cause = "starve";
    else if (sim.recentHurt > 0 && sim.lastHit) sim.cause = sim.lastHit;
    else if (sim.senescence) sim.cause = "old";
    else sim.cause = sim.lastHit || "dry";
    sim.spawning = false;
    sim.threat = null;
    ping(sim, "hurt");
    sim.trauma = Math.min(1, sim.trauma + 0.7);
  }
}

function seasonMods(name: string) {
  switch (name) {
    case "Spring":
      return { food: 1.22, drain: 1, heat: 1 };
    case "Summer":
      return { food: 0.92, drain: 1.05, heat: 1.7 };
    case "Autumn":
      return { food: 1.12, drain: 1, heat: 1 };
    default:
      return { food: 0.55, drain: 0.74, heat: 0.5 };
  }
}

function noteSeason(sim: Game) {
  const s = seasonIndexOf(sim.age);
  if (s === sim.seasonSeen) return;
  const first = sim.seasonSeen < 0;
  sim.seasonSeen = s;
  if (first) return;
  if (s === 2 && !sim.female) {
    sim.female = true;
    unlock(sim, "sex");
    say(
      sim,
      "Autumn on the reef, and a change in the mantle. You began as a male. Now you can make eggs. A lot of oysters grow up this way.",
      5.2,
      true,
    );
    return;
  }
  say(sim, SEASON_LINES[s % 4], 3.6, true);
}

function updateSpawn(sim: Game, dt: number, tide: number) {
  const season = seasonIndexOf(sim.age);
  const frac = sim.age - season;
  const spring = season % 4 === 0;
  const windowOpen = spring && sim.spawnedSeason !== season && frac > 0.2 && frac < 0.8;

  if (sim.spawning) {
    sim.spawnLeft -= dt;
    if (sim.gape > 0.8 && tide > 0.38) sim.spawnHold += dt;
    if (sim.spawnHold >= SPAWN_NEED) {
      const kind = sim.spawnKind ?? (sim.female ? "egg" : "milt");
      sim.spawning = false;
      unlock(sim, "spawn");
      if (kind === "egg") {
        sim.eggSpawns += 1;
        sim.energy = Math.max(8, sim.energy - 16);
        unlock(sim, "reef");
        say(sim, "A cloud of eggs leaves on the tide. A few larvae may settle and grow the reef.", 4.4, true);
        burst(sim, "larva", 14);
      } else {
        sim.miltSpawns += 1;
        sim.energy = Math.max(8, sim.energy - 8);
        say(sim, "You release milt into the spring tide. Somewhere, eggs may meet it.", 4, true);
        burst(sim, "spark", 10);
      }
      ping(sim, "spawn");
      sim.safeFlash = 1;
      return;
    }
    if (sim.spawnLeft <= 0) {
      sim.spawning = false;
      say(sim, "The spawn tide passed. There will be another spring.", 3.2, true);
    }
    return;
  }

  if (!windowOpen || sim.threat) return;
  const readyAt = season === 0 ? 0.42 : 0.32;
  if (frac < readyAt) return;
  sim.spawning = true;
  sim.spawnLeft = SPAWN_WINDOW;
  sim.spawnHold = 0;
  sim.spawnedSeason = season;
  sim.spawnKind = sim.female ? "egg" : "milt";
  sim.gap = Math.max(sim.gap, 2);
  if (sim.spawnKind === "egg") {
    say(sim, "Spring tide. You can make eggs now. Hold wide open and pump them out.", 4, true);
  } else {
    say(sim, "Spring tide. You are still male. Hold wide open to release milt.", 4, true);
  }
}

function updateThreats(sim: Game, dt: number, tide: number) {
  const season = seasonIndexOf(sim.age);
  const frac = sim.age - season;
  const springHold =
    season % 4 === 0 && sim.spawnedSeason !== season && frac > 0.18 && frac < 0.78;
  if (springHold || sim.spawning) {
    if (!sim.threat) return;
  }

  const threat = sim.threat;
  if (!threat) {
    sim.gap -= dt;
    if (sim.gap > 0 || sim.spawning) return;
    const kind = rollThreat(sim, tide);
    spawnThreat(sim, kind);
    const modsGap = seasonNameOf(sim.age) === "Winter" ? 1.3 : 1;
    sim.gap = Math.max(4.4, (9.2 - season * 0.38) * modsGap);
    return;
  }

  threat.age += dt;
  const walker = threat.kind === "crab" || threat.kind === "star" || threat.kind === "gull" || threat.kind === "hand";
  if (walker && !threat.urged && threat.age > threat.travel * 0.62 && sim.gape > safeGape(threat.kind)) {
    threat.urged = true;
    say(sim, "Shut now.", 1.15, true);
  }

  if (threat.kind === "silt" || threat.kind === "runoff") {
    const active = threat.age > 0.35 && threat.age < threat.travel;
    if (active && sim.gape > 0.14) {
      if (threat.kind === "silt") {
        sim.stress = Math.min(100, sim.stress + 30 * dt);
      } else {
        const dmg = 8.5 * sim.gape;
        sim.shell -= dmg * dt;
        sim.energy = Math.max(0, sim.energy - 4.5 * sim.gape * dt);
        sim.stress = Math.min(100, sim.stress + 12 * dt);
        sim.lastHit = "runoff";
      }
    }
  } else if (!threat.resolved && threat.age >= threat.travel * 0.92) {
    threat.resolved = true;
    resolveWalker(sim, threat);
  }

  if (threat.age >= threat.travel + threat.leave) sim.threat = null;
}

function safeGape(kind: ThreatKind) {
  if (kind === "star") return 0.2;
  if (kind === "hand") return 0.48;
  if (kind === "crab") return 0.32;
  return 0.3;
}

function resolveWalker(sim: Game, threat: Threat) {
  const g = sim.gape;
  const lay = layoutNorm(false, tide01(sim.anim));
  if (threat.kind === "hand") {
    if (g > 0.5 && sim.pearlMm >= 3.2) {
      sim.shell = 0;
      sim.lastHit = "hand";
      sim.recentHurt = 2;
      hurtFx(sim, lay.anchorX, lay.anchorY);
      say(sim, "The pearl caught the light. The hand closes.", 2.4, true);
      return;
    }
    if (g > 0.48) {
      injure(sim, 12 + 10 * g, "hand", lay);
      say(sim, "Fingers test the lip, then let go.", 2.4, true);
      return;
    }
    miss(sim, "The diver passes. A closed shell is just another rock.", lay);
    return;
  }

  const limit = safeGape(threat.kind);
  if (g <= limit) {
    const line =
      threat.kind === "crab"
        ? "The crab cannot get a purchase."
        : threat.kind === "star"
          ? "The star slides off a shut shell."
          : "The gull finds only shell.";
    miss(sim, line, lay);
    return;
  }

  const dmg =
    threat.kind === "star" ? 26 + 22 * g : threat.kind === "gull" ? 14 + 16 * g : 18 + 20 * g;
  const cause: Cause = threat.kind === "star" ? "star" : threat.kind === "gull" ? "gull" : "crab";
  injure(sim, dmg, cause, lay);
  const line =
    threat.kind === "star"
      ? "Tube feet find the gap."
      : threat.kind === "gull"
        ? "The beak gets in."
        : "A claw gets inside the lip.";
  say(sim, line, 2.2, true);
}

function miss(sim: Game, line: string, lay: { anchorX: number; anchorY: number }) {
  sim.safeFlash = 1;
  sim.trauma = Math.min(1, sim.trauma + 0.16);
  ping(sim, "safe");
  floatAt(sim, "safe", lay.anchorX + 0.08, lay.anchorY - 0.1, "good");
  say(sim, line, 2.2, true);
}

function injure(
  sim: Game,
  amount: number,
  cause: Cause,
  lay: { anchorX: number; anchorY: number },
) {
  sim.shell -= amount;
  sim.energy = Math.max(0, sim.energy - 6);
  sim.lastHit = cause;
  sim.recentHurt = 2.2;
  sim.hurtFlash = 1;
  sim.hitstop = 0.07;
  sim.trauma = Math.min(1, sim.trauma + 0.55);
  if (sim.cracks.length < 7) sim.cracks.push({ a: Math.random() * Math.PI, len: 0.4 + Math.random() * 0.7 });
  ping(sim, "hurt");
  floatAt(sim, `−${Math.round(amount)}`, lay.anchorX - 0.02, lay.anchorY - 0.12, "bad");
  hurtFx(sim, lay.anchorX, lay.anchorY);
}

function hurtFx(sim: Game, x: number, y: number) {
  burst(sim, "spark", 8);
  void x;
  void y;
}

function spawnThreat(sim: Game, kind: ThreatKind) {
  const spec = SPECS[kind];
  sim.threat = {
    kind,
    side: Math.random() < 0.5 ? -1 : 1,
    age: 0,
    travel: spec.travel * (0.92 + Math.random() * 0.16),
    leave: spec.leave,
    urged: false,
    resolved: false,
  };
  ping(sim, "warn");
  say(sim, INTRO[kind], 2.7, true);
  if (kind === "crab" || kind === "star" || kind === "gull" || kind === "hand") unlock(sim, "predators");
  if (kind === "silt" || kind === "runoff") unlock(sim, "pollution");
}

function rollThreat(sim: Game, tide: number): ThreatKind {
  const s = seasonIndexOf(sim.age);
  const name = seasonNameOf(sim.age);
  const bag: ThreatKind[] = [];
  const add = (k: ThreatKind, n: number) => {
    for (let i = 0; i < n; i++) bag.push(k);
  };
  if (s === 0) {
    add("silt", 5);
    add("runoff", 1);
    add("crab", 2);
  } else {
    add("silt", name === "Autumn" ? 4 : 2);
    add("runoff", name === "Autumn" || name === "Summer" ? 3 : 1);
    add("crab", name === "Summer" ? 4 : 2);
    if (s >= 2) add("star", name === "Winter" ? 1 : 2);
    if (tide < 0.34) add("gull", name === "Summer" ? 4 : 2);
    if (s >= 4 && sim.pearlMm >= 3) add("hand", 2);
  }
  let kind = bag[Math.floor(Math.random() * bag.length)] ?? "silt";
  if (kind === "gull" && tide > 0.34) kind = "crab";
  if (kind === "hand" && sim.pearlMm < 3) kind = "crab";
  return kind;
}

function springGape(sim: Game, target: number, dt: number, lively: boolean) {
  const opening = target > sim.gape;
  const k = lively ? (opening ? 36 : 82) : 8;
  const d = lively ? (opening ? 9.2 : 12.5) : 5;
  sim.gapeVel += ((target - sim.gape) * k - sim.gapeVel * d) * dt;
  sim.gape += sim.gapeVel * dt;
  if (sim.gape < 0) {
    sim.gape = 0;
    sim.gapeVel = 0;
  } else if (sim.gape > 1.05) {
    sim.gape = 1.05;
    sim.gapeVel *= -0.2;
  }
  if (!lively) return;
  if (sim.gape > 0.62) sim.wasWide = true;
  if (sim.wasWide && target < 0.5 && sim.gape < 0.2 && sim.gapeVel < -0.25) {
    sim.wasWide = false;
    ping(sim, "clamp");
    sim.trauma = Math.min(1, sim.trauma + 0.18);
  }
  if (sim.gape > 0.5 && opening && !sim.openPinged) {
    sim.openPinged = true;
    ping(sim, "open");
  }
  if (sim.gape < 0.18) sim.openPinged = false;
}

function ambience(sim: Game, dt: number, portrait: boolean, mouthBubbles: boolean) {
  const tide = tide01(sim.anim);
  const lay = layoutNorm(portrait, tide);
  for (const m of sim.motes) {
    if (!m.on) {
      Object.assign(m, makePlankton());
      continue;
    }
    if (m.kind === "plank") {
      let vx = 0.045 + Math.sin(sim.anim * 0.4 + m.r) * 0.01;
      let vy = Math.sin(sim.anim * 1.3 + m.x * 9) * 0.02;
      if (sim.phase === "play" && sim.gape > 0.28 && m.y > lay.waterY) {
        const dx = lay.anchorX + 0.03 - m.x;
        const dy = lay.anchorY - 0.04 - m.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.08 + sim.gape * 0.16) {
          vx += (dx / (dist || 0.001)) * 0.42 * sim.gape;
          vy += (dy / (dist || 0.001)) * 0.42 * sim.gape;
          if (dist < 0.03) {
            Object.assign(m, makePlankton());
            m.x = -0.05;
            continue;
          }
        }
      }
      m.x += vx * dt;
      m.y += vy * dt;
      if (m.x > 1.08) m.x = -0.06;
      if (m.y < lay.waterY + 0.02) m.y = lay.waterY + 0.02 + Math.random() * 0.05;
      if (m.y > 0.96) m.y = lay.waterY + 0.1;
    } else {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.vy -= dt * 0.02;
      m.life -= dt;
      if (m.life <= 0) Object.assign(m, makePlankton());
    }
  }

  for (const f of sim.fish) {
    f.x += f.dir * f.speed * dt;
    f.y += Math.sin(sim.anim * 1.2 + f.wob) * 0.012 * dt;
    const top = lay.waterY + 0.035;
    if (f.y < top) f.y = top + 0.01;
    if (f.y > 0.9) f.y = 0.72;
    if (Math.abs(f.x - lay.anchorX) < 0.1 && f.y > lay.anchorY - 0.06) f.y -= 0.05 * dt;
    if (f.x > 1.15) {
      f.x = -0.12;
      f.y = top + Math.random() * 0.25;
    }
    if (f.x < -0.15) {
      f.x = 1.12;
      f.y = top + Math.random() * 0.25;
    }
  }

  sim.bubbleTimer -= dt;
  if (mouthBubbles && sim.bubbleTimer <= 0) {
    sim.bubbleTimer = 0.32;
    const b = sim.bubbles[sim.bubbleCursor % sim.bubbles.length];
    sim.bubbleCursor += 1;
    b.x = lay.anchorX + 0.03;
    b.y = lay.anchorY - 0.045;
    b.r = 0.004 + Math.random() * 0.004;
    b.v = 0.035 + Math.random() * 0.02;
    b.life = 1.6;
  }
  for (const b of sim.bubbles) {
    b.life -= dt;
    b.y -= b.v * dt;
    b.x += Math.sin(sim.anim * 2 + b.y * 12) * 0.01 * dt;
    if (b.life <= 0 || b.y < lay.waterY + 0.01) {
      b.x = Math.random();
      b.y = 0.72 + Math.random() * 0.2;
      b.r = 0.003 + Math.random() * 0.006;
      b.v = 0.018 + Math.random() * 0.03;
      b.life = 2 + Math.random() * 2;
    }
  }

  for (const f of sim.floaters) {
    if (!f.on) continue;
    f.life -= dt;
    f.y -= 0.02 * dt;
    if (f.life <= 0) f.on = false;
  }
}

function makePlankton(): Mote {
  return {
    on: true,
    kind: "plank",
    x: Math.random(),
    y: 0.25 + Math.random() * 0.65,
    vx: 0,
    vy: 0,
    life: 1,
    max: 1,
    r: 1.4 + Math.random() * 2.1,
    gold: Math.random() < 0.16,
  };
}

function burst(sim: Game, kind: "spark" | "larva", n: number) {
  const lay = layoutNorm(false, tide01(sim.anim));
  let left = n;
  for (const m of sim.motes) {
    if (left <= 0) break;
    if (m.kind !== "plank") continue;
    left -= 1;
    m.kind = kind;
    m.x = lay.anchorX + (Math.random() - 0.5) * 0.08;
    m.y = lay.anchorY - 0.02;
    m.vx = (Math.random() - 0.5) * (kind === "larva" ? 0.18 : 0.35);
    m.vy = kind === "larva" ? -(0.06 + Math.random() * 0.1) : -Math.random() * 0.15;
    m.life = kind === "larva" ? 1.8 : 0.7;
    m.max = m.life;
    m.r = kind === "larva" ? 2.2 : 2.4;
    m.gold = true;
  }
}

function floatAt(sim: Game, text: string, x: number, y: number, tone: Floater["tone"]) {
  const slot = sim.floaters.find((f) => !f.on) ?? sim.floaters[0];
  slot.on = true;
  slot.text = text;
  slot.x = x;
  slot.y = y;
  slot.life = 1.05;
  slot.max = 1.05;
  slot.tone = tone;
}

function say(sim: Game, text: string, seconds: number, force: boolean) {
  if (!force && sim.bannerLife > 0.7) return;
  sim.bannerText = text;
  sim.bannerLife = seconds;
}

function ping(sim: Game, name: Ping) {
  if (sim.pings.length < 8) sim.pings.push(name);
}

function unlock(sim: Game, id: string) {
  if (sim.factSet.has(id)) return;
  sim.factSet.add(id);
  sim.facts.push(id);
  sim.factsDirty = true;
}
