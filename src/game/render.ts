import {
  bodyScale,
  layoutNorm,
  seasonNameOf,
  tide01,
  type Game,
} from "./engine";

const INK = "#071418";

export function resizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, canvas.clientWidth);
  const h = Math.max(1, canvas.clientHeight);
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

export function draw(
  ctx: CanvasRenderingContext2D,
  sim: Game,
  w: number,
  h: number,
  reduced: boolean,
) {
  const tide = tide01(sim.anim);
  const portrait = h > w * 1.05;
  const lay = layoutNorm(portrait, tide);
  const waterY = lay.waterY * h;
  const ax = lay.anchorX * w;
  const ay = lay.anchorY * h;
  const shake = reduced || !sim.shakeOn ? 0 : sim.trauma * sim.trauma;
  const ox = Math.sin(sim.anim * 43) * 10 * shake;
  const oy = Math.cos(sim.anim * 37) * 7 * shake;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(ox, oy);

  const season = seasonNameOf(sim.phase === "menu" ? 0 : sim.age);
  const day = 0.5 - 0.5 * Math.cos(sim.anim * 0.11);
  drawSky(ctx, w, h, waterY, season, day);
  drawSea(ctx, w, h, waterY, sim.anim, season);
  drawKelp(ctx, w, h, ay, sim.anim, 0.55);
  drawFish(ctx, sim, w, h);
  const world = Math.min(w, h) / 520;
  drawRock(ctx, ax, ay, Math.min(w, h));
  drawNeighbors(ctx, ax, ay, world, sim);
  const scale = world * bodyScale(sim.phase === "menu" ? 1.2 : sim.age) * 1.7;
  drawOyster(ctx, ax, ay, scale, sim);
  drawKelp(ctx, w, h, ay, sim.anim, 1);
  drawThreat(ctx, sim, w, h, ax, ay, waterY, world);
  drawMotes(ctx, sim, w, h, waterY);
  drawBubbles(ctx, sim, w, h);
  if (sim.threat?.kind === "silt") wash(ctx, w, h, waterY, sim.threat, "silt");
  if (sim.threat?.kind === "runoff") wash(ctx, w, h, waterY, sim.threat, "runoff");
  if (sim.dry > 0.08 && tide < 0.4) drawDry(ctx, w, h, sim.dry);
  drawFloaters(ctx, sim, w, h);
  ctx.restore();

  const vignette = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.2, w / 2, h * 0.5, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  if (sim.phase === "dying" || sim.phase === "dead") {
    ctx.fillStyle = `rgba(7, 20, 24, ${sim.phase === "dead" ? 0.28 : 0.12})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  waterY: number,
  season: string,
  day: number,
) {
  const skies: Record<string, [string, string]> = {
    Spring: ["#8ec4d4", "#f0d2bc"],
    Summer: ["#67b7cc", "#f3d7a4"],
    Autumn: ["#6e9aaf", "#e7b48a"],
    Winter: ["#8aa4b5", "#d5dde3"],
  };
  const [top, horizon] = skies[season] ?? skies.Spring;
  const dusk = 0.12 + (1 - day) * 0.5;
  const g = ctx.createLinearGradient(0, -20, 0, Math.max(waterY, h * 0.3));
  g.addColorStop(0, mix(top, "#1a4450", dusk));
  g.addColorStop(1, mix(horizon, "#2a5c62", dusk * 0.35));
  ctx.fillStyle = g;
  ctx.fillRect(-30, -30, w + 60, h + 60);

  const sunX = w * (0.18 + 0.64 * day);
  const sunY = waterY * (0.42 + 0.18 * Math.sin(day * Math.PI));
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, Math.min(w, h) * 0.28);
  glow.addColorStop(0, "rgba(255, 236, 196, 0.95)");
  glow.addColorStop(0.35, "rgba(244, 196, 140, 0.28)");
  glow.addColorStop(1, "rgba(244, 196, 140, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, Math.min(w, h) * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(12, 48, 56, 0.55)";
  ctx.beginPath();
  ctx.moveTo(-10, waterY - 6);
  hill(ctx, 0.08 * w, waterY - h * 0.045, 0.22 * w, waterY - 8);
  hill(ctx, 0.28 * w, waterY - h * 0.07, 0.48 * w, waterY - 4);
  hill(ctx, 0.55 * w, waterY - h * 0.05, 0.78 * w, waterY - 10);
  hill(ctx, 0.8 * w, waterY - h * 0.04, w + 20, waterY - 2);
  ctx.lineTo(w + 20, waterY + 4);
  ctx.lineTo(-10, waterY + 4);
  ctx.closePath();
  ctx.fill();
}

function hill(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const mid = (x1 + x2) / 2;
  ctx.quadraticCurveTo(mid, Math.min(y1, y2) - 8, x2, y2);
  void y1;
}

function drawSea(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  waterY: number,
  time: number,
  season: string,
) {
  const top = season === "Summer" ? "#1a7c86" : season === "Winter" ? "#3d6d78" : "#1a6e78";
  const g = ctx.createLinearGradient(0, waterY, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(0.45, "#0c4a54");
  g.addColorStop(1, "#06262e");
  ctx.fillStyle = g;
  ctx.fillRect(-20, waterY, w + 40, h - waterY + 30);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const x = ((time * 18 + i * w * 0.27) % (w + 80)) - 40;
    const ray = ctx.createLinearGradient(x, waterY, x + 70, h);
    ray.addColorStop(0, "rgba(210, 236, 230, 0.09)");
    ray.addColorStop(1, "rgba(210, 236, 230, 0)");
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(x, waterY);
    ctx.lineTo(x + 36, waterY);
    ctx.lineTo(x + 90, h);
    ctx.lineTo(x + 20, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(232, 246, 242, 0.16)";
  ctx.lineWidth = 1.5;
  for (let row = 0; row < 5; row++) {
    ctx.beginPath();
    const y = waterY + 18 + row * ((h - waterY) / 7);
    for (let x = 0; x <= w; x += 12) {
      const yy = y + Math.sin(x * 0.02 + time * 1.4 + row) * (3 + row);
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  ctx.beginPath();
  for (let x = 0; x <= w; x += 8) {
    const yy = waterY + Math.sin(x * 0.018 + time * 1.6) * 4 + Math.sin(x * 0.05 + time) * 1.5;
    if (x === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.strokeStyle = "rgba(244, 239, 230, 0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawRock(ctx: CanvasRenderingContext2D, ax: number, ay: number, unit: number) {
  const rw = unit * 0.72;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(ax, ay + unit * 0.08, rw * 0.72, unit * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createLinearGradient(ax - rw, ay - 40, ax + rw, ay + 80);
  g.addColorStop(0, "#6a655c");
  g.addColorStop(0.35, "#3e4542");
  g.addColorStop(1, "#242a28");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ax - rw, ay + unit * 0.42);
  ctx.bezierCurveTo(ax - rw * 0.7, ay - unit * 0.02, ax - rw * 0.2, ay + unit * 0.02, ax - rw * 0.05, ay - unit * 0.03);
  ctx.bezierCurveTo(ax + rw * 0.2, ay - unit * 0.07, ax + rw * 0.55, ay - unit * 0.01, ax + rw * 0.86, ay + unit * 0.05);
  ctx.lineTo(ax + rw, ay + unit * 0.5);
  ctx.lineTo(ax - rw, ay + unit * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(20, 24, 22, 0.25)";
  for (let i = 0; i < 18; i++) {
    const px = ax + (hash(i * 3.1) - 0.5) * rw * 1.3;
    const py = ay + hash(i * 1.7) * unit * 0.16;
    ctx.beginPath();
    ctx.ellipse(px, py, 6 + hash(i) * 14, 3 + hash(i + 2) * 5, hash(i) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 9; i++) {
    const px = ax + (hash(20 + i) - 0.45) * rw * 1.1;
    const py = ay + 6 + hash(40 + i) * unit * 0.1;
    ctx.fillStyle = "#d9d0c2";
    ctx.beginPath();
    ctx.ellipse(px, py, 5 + hash(i + 8) * 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8d867c";
    ctx.beginPath();
    ctx.arc(px, py, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNeighbors(ctx: CanvasRenderingContext2D, ax: number, ay: number, world: number, sim: Game) {
  const spots = [
    { x: -168, y: 28, s: 0.42 },
    { x: 176, y: 34, s: 0.34 },
    { x: -250, y: 48, s: 0.26 },
  ];
  for (const spot of spots) {
    drawMiniShell(ctx, ax + spot.x * world, ay + spot.y * world, world * spot.s);
  }
  const spat = Math.min(5, sim.eggSpawns);
  for (let i = 0; i < spat; i++) {
    drawMiniShell(ctx, ax + (70 + i * 28) * world, ay + (46 + (i % 2) * 10) * world, world * 0.16);
  }
}

function drawMiniShell(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s * 0.85);
  const g = ctx.createLinearGradient(-70, -20, 80, 30);
  g.addColorStop(0, "#6b4034");
  g.addColorStop(0.55, "#c48968");
  g.addColorStop(1, "#edd3b8");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-78, 4);
  ctx.bezierCurveTo(-20, -46, 70, -36, 96, 2);
  ctx.bezierCurveTo(40, 36, -30, 34, -78, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(74, 40, 32, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawOyster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  sim: Game,
) {
  const gape = Math.max(0, sim.gape) + Math.sin(sim.anim * 8.5) * 0.012 * Math.max(0, sim.gape);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(16, 42, 108, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  traceBottom(ctx);
  ctx.fillStyle = shellGradient(ctx, sim);
  ctx.fill();
  ridges(ctx, false);

  if (gape > 0.05) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (gape - 0.04) * 1.8);
    drawInterior(ctx, sim, gape);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(-92, 2);
  ctx.rotate(-0.04 - gape * 0.98);
  traceTop(ctx);
  ctx.fillStyle = shellGradient(ctx, sim);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ridges(ctx, true);
  if (sim.cracks.length) {
    ctx.strokeStyle = `rgba(48, 24, 20, ${0.45 + sim.hurtFlash * 0.4})`;
    ctx.lineWidth = 1.6;
    for (const crack of sim.cracks) {
      ctx.beginPath();
      ctx.moveTo(40 + Math.cos(crack.a) * 10, -8);
      ctx.lineTo(40 + Math.cos(crack.a) * 70 * crack.len, -16 + Math.sin(crack.a) * 18);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(90, 48, 36, 0.45)";
  ctx.lineWidth = 2;
  traceTop(ctx);
  ctx.stroke();
  lip(ctx);
  ctx.restore();

  if (sim.spawning) {
    ctx.strokeStyle = "rgba(231, 201, 138, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(16, 8, 120, 48 + gape * 20, -0.1, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (sim.hurtFlash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = sim.hurtFlash * 0.7;
    ctx.fillStyle = "#fff4ea";
    traceBottom(ctx);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function shellGradient(ctx: CanvasRenderingContext2D, sim: Game) {
  const g = ctx.createLinearGradient(-100, -40, 120, 40);
  const dry = sim.dry;
  g.addColorStop(0, mix("#5c3428", "#c2a48a", dry * 0.7));
  g.addColorStop(0.45, mix("#b87352", "#d7c2a4", dry * 0.55));
  g.addColorStop(1, mix("#f0d2b4", "#efe6d4", dry * 0.4));
  if (sim.safeFlash > 0) {
    g.addColorStop(0.7, `rgba(231, 201, 138, ${0.35 + sim.safeFlash * 0.4})`);
  }
  return g;
}

function traceBottom(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-92, 2);
  ctx.bezierCurveTo(-40, 54, 48, 62, 118, 8);
  ctx.bezierCurveTo(78, 40, 4, 44, -92, 2);
  ctx.closePath();
}

function traceTop(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(36, -18, 110, -52, 196, -6);
  ctx.bezierCurveTo(150, -28, 70, 8, 0, 0);
  ctx.closePath();
}

function ridges(ctx: CanvasRenderingContext2D, top: boolean) {
  ctx.strokeStyle = "rgba(74, 36, 28, 0.28)";
  ctx.lineWidth = 1.5;
  const n = top ? 4 : 5;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    if (top) {
      ctx.moveTo(16, -2);
      ctx.quadraticCurveTo(80, -10 - i * 8, 170 - i * 6, -6);
    } else {
      ctx.moveTo(-70 + i * 4, 8);
      ctx.quadraticCurveTo(20, 18 + i * 7, 100 - i * 6, 10);
    }
    ctx.stroke();
  }
}

function lip(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(255, 244, 230, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(150, -14);
  ctx.quadraticCurveTo(188, -10, 196, -6);
  ctx.stroke();
}

function drawInterior(ctx: CanvasRenderingContext2D, sim: Game, gape: number) {
  ctx.beginPath();
  ctx.moveTo(-58, 6);
  ctx.bezierCurveTo(-10, 32, 50, 36, 100, 10);
  ctx.bezierCurveTo(48, 22, -8, 20, -58, 6);
  ctx.fillStyle = "#e7b7a6";
  ctx.fill();

  ctx.strokeStyle = "rgba(120, 64, 74, 0.4)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(-36 + i * 16, 10);
    ctx.quadraticCurveTo(-24 + i * 16, 24, -8 + i * 14, 12);
    ctx.stroke();
  }

  const pr = 4 + Math.min(28, sim.pearlMm * 1.55);
  const px = 18;
  const py = 16;
  const pg = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.35, pr * 0.15, px, py, pr);
  pg.addColorStop(0, "#ffffff");
  pg.addColorStop(0.4, "#f6edd4");
  pg.addColorStop(0.75, mix("#e7d7a4", "#d5efe8", 0.35 + Math.sin(sim.anim * 2) * 0.15));
  pg.addColorStop(1, "#b9926a");
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(px - pr * 0.28, py - pr * 0.32, Math.max(1.2, pr * 0.18), 0, Math.PI * 2);
  ctx.fill();
  void gape;
}

function drawKelp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ay: number,
  time: number,
  alpha: number,
) {
  const stalks = alpha < 0.8
    ? [
        { x: w * 0.12, h: h * 0.28 },
        { x: w * 0.22, h: h * 0.2 },
        { x: w * 0.84, h: h * 0.26 },
      ]
    : [
        { x: w * 0.06, h: h * 0.34 },
        { x: w * 0.93, h: h * 0.3 },
      ];
  ctx.lineCap = "round";
  for (const stalk of stalks) {
    ctx.strokeStyle = alpha < 0.8 ? "rgba(18, 90, 74, 0.45)" : "rgba(16, 78, 64, 0.8)";
    ctx.lineWidth = alpha < 0.8 ? 5 : 8;
    ctx.beginPath();
    ctx.moveTo(stalk.x, ay + 30);
    for (let i = 1; i <= 8; i++) {
      const p = i / 8;
      const yy = ay + 30 - stalk.h * p;
      const xx = stalk.x + Math.sin(time * 0.9 + i + stalk.x) * (8 + p * 18);
      ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
}

function drawFish(ctx: CanvasRenderingContext2D, sim: Game, w: number, h: number) {
  for (const fish of sim.fish) {
    const y = fish.y * h;
    const x = fish.x * w;
    const s = fish.scale * Math.min(w, h) * 0.018;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(fish.dir > 0 ? s : -s, s);
    ctx.fillStyle = fish.gold ? "rgba(231, 201, 138, 0.85)" : "rgba(214, 236, 230, 0.72)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(-24, -7);
    ctx.lineTo(-24, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(8, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawThreat(
  ctx: CanvasRenderingContext2D,
  sim: Game,
  w: number,
  h: number,
  ax: number,
  ay: number,
  waterY: number,
  world: number,
) {
  const threat = sim.threat;
  if (!threat) return;
  const travel = Math.min(1, threat.age / threat.travel);
  const leave = threat.age > threat.travel ? Math.min(1, (threat.age - threat.travel) / threat.leave) : 0;
  const startX = threat.side < 0 ? -0.12 * w : 1.12 * w;
  const endX = ax + threat.side * world * 90;
  let x = startX + (endX - startX) * travel;
  if (leave > 0) x = endX + (startX - endX) * leave;
  const y = ay + world * 10;
  const s = world * 2.15;

  if (threat.kind === "crab") drawCrab(ctx, x, y, s, threat.side);
  if (threat.kind === "star") drawStar(ctx, x, y + world * 8, s * 0.9, sim.anim);
  if (threat.kind === "gull") {
    const gy = waterY - 36 - (1 - travel) * h * 0.22 + leave * 30;
    drawGull(ctx, ax + threat.side * (1 - travel) * w * 0.32, Math.min(gy, ay - 70), s, threat.side);
  }
  if (threat.kind === "hand") {
    const hy = waterY - 70 + travel * (ay - waterY + 10) - leave * h * 0.25;
    drawHand(ctx, ax + world * 36, hy, world * 1.7);
  }
}

function drawCrab(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, side: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side < 0 ? -s : s, s);
  ctx.fillStyle = "#8d3b32";
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c46a45";
  ctx.beginPath();
  ctx.ellipse(0, -2, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6e2e28";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-6, 6);
    ctx.lineTo(-20 - i * 2, 16 + i * 2);
    ctx.moveTo(6, 6);
    ctx.lineTo(18 + i * 2, 16 + i * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#e7c2a4";
  claw(ctx, -16, -8, -1);
  claw(ctx, 16, -10, 1);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-6, -12, 2, 0, Math.PI * 2);
  ctx.arc(6, -12, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function claw(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 5, dir * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + dir * 7, y - 3, 4, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, time: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time) * 0.1);
  ctx.scale(s, s);
  ctx.fillStyle = "#d4653a";
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, 16, 7, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e7a07a";
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGull(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, side: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((side < 0 ? -1 : 1) * s, s);
  ctx.fillStyle = "#f4efe6";
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.quadraticCurveTo(-28, -16, -36, -2);
  ctx.quadraticCurveTo(-20, -4, -4, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, -2);
  ctx.quadraticCurveTo(20, -20, 34, -4);
  ctx.quadraticCurveTo(16, -2, 2, 3);
  ctx.fill();
  ctx.fillStyle = "#e7c98a";
  ctx.beginPath();
  ctx.moveTo(16, 1);
  ctx.lineTo(26, 4);
  ctx.lineTo(16, 5);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(10, -2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "#1c3e46";
  ctx.fillRect(-10, -120, 20, 100);
  ctx.fillStyle = "#244e58";
  ctx.beginPath();
  ctx.roundRect(-18, -28, 36, 32, 10);
  ctx.fill();
  ctx.fillStyle = "#d7c4b0";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.roundRect(-16 + i * 8, -8, 7, 22, 3);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.roundRect(-24, 4, 8, 14, 3);
  ctx.fill();
  ctx.restore();
}

function drawMotes(ctx: CanvasRenderingContext2D, sim: Game, w: number, h: number, waterY: number) {
  for (const m of sim.motes) {
    if (!m.on) continue;
    const x = m.x * w;
    const y = m.y * h;
    if (m.kind === "plank") {
      if (y < waterY) continue;
      ctx.fillStyle = m.gold ? "rgba(231, 201, 138, 0.9)" : "rgba(210, 236, 196, 0.75)";
      ctx.beginPath();
      ctx.ellipse(x, y, m.r * 1.3, m.r, Math.sin(sim.anim + x) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const alpha = Math.max(0, m.life / m.max);
      ctx.fillStyle =
        m.kind === "larva" ? `rgba(244, 239, 230, ${alpha})` : `rgba(231, 201, 138, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBubbles(ctx: CanvasRenderingContext2D, sim: Game, w: number, h: number) {
  ctx.strokeStyle = "rgba(232, 246, 242, 0.45)";
  ctx.lineWidth = 1;
  for (const b of sim.bubbles) {
    ctx.beginPath();
    ctx.arc(b.x * w, b.y * h, b.r * Math.min(w, h), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function wash(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  waterY: number,
  threat: NonNullable<Game["threat"]>,
  kind: "silt" | "runoff",
) {
  const u = threat.age / threat.travel;
  const alpha = kind === "silt" ? 0.22 * Math.sin(Math.min(1, u) * Math.PI) : 0.18 * Math.sin(Math.min(1, u) * Math.PI);
  ctx.fillStyle = kind === "silt" ? `rgba(92, 70, 48, ${alpha})` : `rgba(40, 48, 42, ${alpha})`;
  ctx.fillRect(0, waterY, w, h - waterY);
  if (kind === "runoff") {
    ctx.strokeStyle = `rgba(231, 201, 138, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const yy = waterY + 3 + Math.sin(x * 0.05 + threat.age * 3) * 2;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    ctx.strokeStyle = `rgba(180, 120, 160, ${alpha * 0.8})`;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const yy = waterY + 7 + Math.sin(x * 0.04 + threat.age * 2) * 2;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

function drawDry(ctx: CanvasRenderingContext2D, w: number, h: number, dry: number) {
  const g = ctx.createRadialGradient(w / 2, 0, 20, w / 2, h * 0.3, h * 0.7);
  g.addColorStop(0, `rgba(226, 168, 96, ${0.18 * dry})`);
  g.addColorStop(1, "rgba(226, 168, 96, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawFloaters(ctx: CanvasRenderingContext2D, sim: Game, w: number, h: number) {
  ctx.textAlign = "center";
  ctx.font = "600 15px Outfit, sans-serif";
  for (const f of sim.floaters) {
    if (!f.on) continue;
    const alpha = Math.max(0, f.life / f.max);
    ctx.fillStyle =
      f.tone === "bad"
        ? `rgba(224, 122, 95, ${alpha})`
        : f.tone === "good"
          ? `rgba(231, 201, 138, ${alpha})`
          : `rgba(244, 239, 230, ${alpha})`;
    ctx.fillText(f.text, f.x * w, f.y * h);
  }
}

function mix(a: string, b: string, t: number) {
  const pa = hex(a);
  const pb = hex(b);
  const u = Math.min(1, Math.max(0, t));
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * u);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * u);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * u);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hex(color: string): [number, number, number] {
  const h = color.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
