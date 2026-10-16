import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Droplets,
  Gem,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Shell,
  Shield,
  Sun,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { ReefAudio } from "@/game/audio";
import { FACTS, epitaph } from "@/game/content";
import {
  beginLife,
  drainPings,
  step,
  tide01,
  view,
  createGame,
  type Game,
  type HudModel,
} from "@/game/engine";
import { draw, resizeCanvas } from "@/game/render";
import { loadSave, writeSave, type SaveData } from "@/game/save";

type ShellboundApi = {
  ready: boolean;
  snapshot: () => HudModel;
  hold: (down: boolean) => void;
  begin: () => void;
};

declare global {
  interface Window {
    __shellbound?: ShellboundApi;
  }
}

export function OysterGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Game | null>(null);
  const audioRef = useRef<ReefAudio | null>(null);
  const buttonHold = useRef(false);
  const worldHold = useRef(false);
  const keys = useRef(new Set<string>());
  const notesRef = useRef(false);
  const reducedRef = useRef(false);
  const [hud, setHud] = useState<HudModel | null>(null);
  const [save, setSave] = useState<SaveData | null>(null);
  const [notes, setNotes] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const loaded = loadSave();
    setSave(loaded);
    const sim = createGame({ shake: loaded.shake, facts: loaded.facts });
    simRef.current = sim;
    const audio = new ReefAudio();
    audioRef.current = audio;
    audio.setMusic(loaded.music);
    audio.setSfx(loaded.sfx);
    audio.setMuted(loaded.muted);
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setHud(view(sim));
    setBooted(true);

    const persistFacts = () => {
      if (!sim.factsDirty) return;
      sim.factsDirty = false;
      const cur = loadSave();
      cur.facts = sim.facts.slice();
      writeSave(cur);
      setSave(cur);
    };

    const finishLife = () => {
      if (sim.recorded) return;
      sim.recorded = true;
      const cur = loadSave();
      cur.runs += 1;
      cur.bestSeasons = Math.max(cur.bestSeasons, Math.floor(sim.age));
      cur.bestPearl = Math.max(cur.bestPearl, sim.pearlMm);
      cur.bestSpawns = Math.max(cur.bestSpawns, sim.eggSpawns + sim.miltSpawns);
      cur.bestGallons = Math.max(cur.bestGallons, sim.gallons);
      cur.facts = sim.facts.slice();
      writeSave(cur);
      setSave(cur);
    };

    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    let prevPhase = sim.phase;
    let prevStart = false;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const canvas = canvasRef.current;
      const fitted = canvas ? resizeCanvas(canvas) : null;
      const portrait = fitted ? fitted.h > fitted.w * 1.05 : false;
      const pad = pollPad();
      if (pad.start && !prevStart && (sim.phase === "play" || sim.phase === "pause")) {
        sim.phase = sim.phase === "play" ? "pause" : "play";
      }
      prevStart = pad.start;
      const hold =
        sim.phase === "play" &&
        !notesRef.current &&
        (buttonHold.current || worldHold.current || keys.current.has("Space") || pad.hold);
      step(sim, { hold, portrait, frozen: notesRef.current }, dt);
      if (fitted) {
        for (const name of drainPings(sim)) audio.play(name);
        audio.setTide(tide01(sim.anim));
        draw(fitted.ctx, sim, fitted.w, fitted.h, reducedRef.current || !sim.shakeOn);
      }
      hudAcc += dt;
      if (sim.phase !== prevPhase || hudAcc > 0.12) {
        prevPhase = sim.phase;
        hudAcc = 0;
        setHud(view(sim));
        if (sim.phase === "dead") finishLife();
      }
      if (sim.factsDirty) persistFacts();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") e.preventDefault();
      if (e.repeat) return;
      keys.current.add(e.code);
      audio.unlock();
      if ((e.code === "Escape" || e.code === "KeyP") && (sim.phase === "play" || sim.phase === "pause")) {
        sim.phase = sim.phase === "play" ? "pause" : "play";
        setHud(view(sim));
      }
      if (e.code === "KeyM") {
        const cur = loadSave();
        cur.muted = !cur.muted;
        audio.setMuted(cur.muted);
        writeSave(cur);
        setSave(cur);
      }
      if (e.code === "Space" && sim.phase === "menu" && !notesRef.current) {
        beginLife(sim);
        setHud(view(sim));
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
    };
    const blur = () => {
      keys.current.clear();
      buttonHold.current = false;
      worldHold.current = false;
    };
    const vis = () => {
      if (document.visibilityState === "visible") audio.resume();
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", vis);

    window.__shellbound = {
      ready: true,
      snapshot: () => view(sim),
      hold: (downHeld: boolean) => {
        buttonHold.current = downHeld;
      },
      begin: () => {
        audio.unlock();
        beginLife(sim);
        setHud(view(sim));
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", vis);
      audio.dispose();
      delete window.__shellbound;
    };
  }, []);

  function unlockAudio() {
    audioRef.current?.unlock();
  }

  function startLife() {
    const sim = simRef.current;
    if (!sim) return;
    unlockAudio();
    beginLife(sim);
    setHud(view(sim));
  }

  function togglePause() {
    const sim = simRef.current;
    if (!sim) return;
    if (sim.phase !== "play" && sim.phase !== "pause") return;
    sim.phase = sim.phase === "play" ? "pause" : "play";
    setHud(view(sim));
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    const cur = loadSave();
    cur.muted = !cur.muted;
    audio.setMuted(cur.muted);
    writeSave(cur);
    setSave(cur);
  }

  function patchSave(partial: Partial<SaveData>) {
    const audio = audioRef.current;
    const sim = simRef.current;
    const cur = { ...loadSave(), ...partial };
    if (partial.music !== undefined) audio?.setMusic(cur.music);
    if (partial.sfx !== undefined) audio?.setSfx(cur.sfx);
    if (partial.muted !== undefined) audio?.setMuted(cur.muted);
    if (partial.shake !== undefined && sim) sim.shakeOn = cur.shake;
    writeSave(cur);
    setSave(cur);
  }

  function openNotes(next: boolean) {
    notesRef.current = next;
    setNotes(next);
  }

  const phase = hud?.phase ?? "menu";
  const playing = phase === "play" || phase === "pause" || phase === "dying" || phase === "dead";
  const end = phase === "dead" && hud ? epitaph(hud) : null;

  return (
    <div
      className="reef relative h-dvh w-full overflow-hidden bg-bg text-fg"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        unlockAudio();
        const target = e.target as HTMLElement;
        if (target.closest("[data-ui]")) return;
        if (phase !== "play") return;
        worldHold.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerUp={() => {
        worldHold.current = false;
      }}
      onPointerCancel={() => {
        worldHold.current = false;
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />

      {playing && hud && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-3 p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <div className="pointer-events-none min-w-0 flex-1 rounded-2xl border border-border bg-surface/90 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-base leading-tight sm:text-lg">
                  Year {hud.year}
                  <span className="text-muted"> · {hud.season}</span>
                </p>
                <p className="text-xs text-muted">{hud.female ? "Female" : "Male"}</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Meter label="Energy" value={hud.energy} danger={hud.energy < 25} />
                <Meter label="Shell" value={hud.shell} danger={hud.shell < 35} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Gem className="size-4 text-primary" aria-hidden />
                <span className="tabular-nums">{hud.pearl.toFixed(1)} mm</span>
                <span className="text-muted">{hud.pearlTitle}</span>
                <span className="ml-auto hidden tabular-nums text-xs text-muted sm:inline">
                  {Math.floor(hud.gallons).toLocaleString()} gal
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Waves className="size-4 text-primary" aria-hidden />
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-bg"
                  role="meter"
                  aria-label="Tide"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(hud.tide * 100)}
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${hud.tide * 100}%` }} />
                </div>
                <span className="w-14 text-right text-xs text-muted">{hud.tide < 0.28 ? "Low" : hud.tide > 0.72 ? "High" : "Turning"}</span>
              </div>
            </div>
            <div className="pointer-events-auto flex flex-col gap-2" data-ui>
              <IconButton label={phase === "pause" ? "Resume" : "Pause"} onClick={togglePause} disabled={phase === "dying" || phase === "dead"}>
                {phase === "pause" ? <Play className="size-5" /> : <Pause className="size-5" />}
              </IconButton>
              <IconButton label={save?.muted ? "Unmute" : "Mute"} onClick={toggleMute}>
                {save?.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </IconButton>
              <IconButton label="Field notes" onClick={() => openNotes(true)}>
                <BookOpen className="size-5" />
              </IconButton>
            </div>
          </div>
        </div>
      )}

      {playing && hud?.banner && phase !== "dead" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center px-4 sm:bottom-32">
          <p
            aria-live="polite"
            className={`max-w-md rounded-2xl border px-4 py-2 text-center text-sm leading-snug backdrop-blur-md ${
              hud.alert ? "border-danger bg-surface/95 text-fg" : "border-border bg-surface/90 text-fg"
            }`}
          >
            {hud.banner}
          </p>
        </div>
      )}

      {hud?.spawning && phase === "play" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-44 z-10 px-4 sm:bottom-48">
          <div className="mx-auto max-w-md">
            <div className="mb-1 flex justify-between text-xs text-primary">
              <span>{hud.spawnKind === "egg" ? "Pump eggs" : "Release milt"}</span>
              <span className="tabular-nums">{Math.round(hud.spawnProgress * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg">
              <div className="h-full rounded-full bg-primary" style={{ width: `${hud.spawnProgress * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {phase === "play" && (
        <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4" data-ui>
          <button
            type="button"
            className="mx-auto flex min-h-16 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-base font-semibold text-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-pressed={hud ? hud.gape > 0.4 : false}
            onPointerDown={(e) => {
              unlockAudio();
              buttonHold.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              e.stopPropagation();
            }}
            onPointerUp={() => {
              buttonHold.current = false;
            }}
            onPointerCancel={() => {
              buttonHold.current = false;
            }}
            onLostPointerCapture={() => {
              buttonHold.current = false;
            }}
          >
            <Shell className="size-5" aria-hidden />
            {hud && hud.gape > 0.72 ? "Open" : hud && hud.gape > 0.15 ? "Opening" : "Hold to open"}
          </button>
          <p className="mt-2 text-center text-xs text-muted">Space, or press the shell itself. Let go to shut.</p>
        </div>
      )}

      {phase === "menu" && (
        <div className="absolute inset-0 z-20 flex items-start justify-start p-3 sm:items-center sm:p-8">
          <section
            data-ui
            className="w-full max-w-md rounded-2xl border border-border bg-surface/90 p-5 shadow-lg backdrop-blur-md sm:p-7"
          >
            <p className="text-xs font-medium tracking-wide text-primary uppercase">A life on one rock</p>
            <h1 className="mt-1 font-display text-4xl leading-none text-fg sm:text-5xl">Shellbound</h1>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted sm:text-base">
              You cemented to this rock as a larva. You will never swim again. Plankton, predators, and the tide all come to you. The only choice left is when to open.
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-fg">
              <li className="flex items-start gap-2">
                <Droplets className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                Hold open to filter plankton and lay nacre on a pearl.
              </li>
              <li className="flex items-start gap-2">
                <Shield className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                Shut before crabs, stars, gulls, silt, or a diver arrive.
              </li>
              <li className="flex items-start gap-2">
                <Sun className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                Low tide in the sun will dry an open shell.
              </li>
            </ul>
            <button
              type="button"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={startLife}
              disabled={!booted}
            >
              <Shell className="size-5" aria-hidden />
              Begin a life
            </button>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={() => openNotes(true)}
              >
                <BookOpen className="size-4" aria-hidden />
                Field notes
              </button>
              {save && save.runs > 0 && (
                <p className="text-right text-xs text-muted tabular-nums">
                  Best pearl {save.bestPearl.toFixed(1)} mm
                  <span className="block">Longest life, year {Math.floor(save.bestSeasons / 4) + 1}</span>
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {phase === "pause" && (
        <Overlay>
          <h2 className="font-display text-3xl">Tide paused</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">The reef holds still. Nothing eats, nothing dries, until you go back.</p>
          <button
            type="button"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-bg"
            onClick={togglePause}
          >
            <Play className="size-5" aria-hidden />
            Resume
          </button>
          <Sliders save={save} onChange={patchSave} />
        </Overlay>
      )}

      {end && hud && (
        <Overlay>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Epitaph</p>
          <h2 className="mt-1 font-display text-3xl sm:text-4xl">{end.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg">{end.lesson}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{end.detail}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Pearl" value={`${hud.pearl.toFixed(1)} mm ${hud.pearlTitle}`} />
            <Stat label="Filtered" value={`${Math.floor(hud.gallons).toLocaleString()} gal`} />
            <Stat label="Spawnings" value={`${hud.miltSpawns + hud.eggSpawns}`} />
            <Stat label="Season" value={`${hud.season}`} />
          </dl>
          <button
            type="button"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-bg"
            onClick={startLife}
          >
            <RotateCcw className="size-5" aria-hidden />
            Live again
          </button>
          <button
            type="button"
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm text-fg"
            onClick={() => openNotes(true)}
          >
            <BookOpen className="size-4" aria-hidden />
            Field notes
          </button>
        </Overlay>
      )}

      {notes && (
        <div className="absolute inset-0 z-30 flex items-end justify-center p-3 sm:items-center sm:p-6" data-ui>
          <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="font-display text-2xl">Field notes</h2>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-muted"
                onClick={() => openNotes(false)}
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <ul className="grid gap-4">
                {FACTS.map((fact) => {
                  const known = hud?.facts.includes(fact.id) || save?.facts.includes(fact.id);
                  return (
                    <li key={fact.id} className="border-b border-border pb-4 last:border-b-0">
                      <h3 className="flex items-center gap-2 text-base text-fg">
                        {known ? <Shell className="size-4 text-primary" aria-hidden /> : <Lock className="size-4 text-muted" aria-hidden />}
                        {fact.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-pretty text-muted">
                        {known ? fact.body : "You have not lived this yet."}
                      </p>
                    </li>
                  );
                })}
              </ul>
              {save && (
                <Sliders save={save} onChange={patchSave} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <section data-ui className="w-full max-w-md rounded-2xl border border-border bg-surface/95 p-5 shadow-lg backdrop-blur-md sm:p-6">
        {children}
      </section>
    </div>
  );
}

function Meter({ label, value, danger }: { label: string; value: number; danger: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="tabular-nums text-fg">{Math.round(v)}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-bg"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v)}
      >
        <div className={`h-full rounded-full ${danger ? "bg-danger" : "bg-primary"}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-surface/90 text-fg backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular-nums text-fg">{value}</dd>
    </div>
  );
}

function Sliders({
  save,
  onChange,
}: {
  save: SaveData | null;
  onChange: (partial: Partial<SaveData>) => void;
}) {
  if (!save) return null;
  return (
    <div className="mt-4 grid gap-3 border-t border-border pt-4 text-sm">
      <Slider label="Surf" value={save.music} onChange={(music) => onChange({ music })} />
      <Slider label="Effects" value={save.sfx} onChange={(sfx) => onChange({ sfx })} />
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-muted">Screen shake</span>
        <input
          type="checkbox"
          checked={save.shake}
          onChange={(e) => onChange({ shake: e.target.checked })}
          className="size-5 accent-primary"
        />
      </label>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="flex justify-between text-muted">
        {label}
        <span className="tabular-nums text-fg">{Math.round(value * 100)}</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="accent-primary"
      />
    </label>
  );
}

function pollPad() {
  const pads = navigator.getGamepads?.() ?? [];
  let hold = false;
  let start = false;
  for (const pad of pads) {
    if (!pad) continue;
    if (pad.buttons[0]?.pressed) hold = true;
    if (pad.buttons[9]?.pressed) start = true;
  }
  return { hold, start };
}
