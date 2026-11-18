import { BAY, bay, clamp, easeIO, easeOut, hash, mix, noise2, rng, sstep, type RGB } from "./math";
import { KC, LAMP_IN, M, PLK } from "./palette";

// ============================================================
// World: a tiny pixel aquarium, drawn procedurally each frame
// ============================================================

/** The world's size in pixels (the glass pill shows all of it) and the air gap above the water. */
export const W = 144, H = 76, AIR = 4;

type Sprite = { px: (number | string)[]; w: number; h: number };
type SpriteMap = Partial<Record<string, number>>;
type Plant = { kind: "ribbon" | "stem"; x: number; h: number; color?: "g" | "r"; ph: number; flex: number; bend: number; front: boolean };
type Fish = {
  spr: Sprite; map: SpriteMap; speed: number; school: boolean;
  x: number; y: number; vx: number; vy: number; dir: number;
  tx: number; ty: number; timer: number; phase: number;
  rest: { x: number; y: number }; seed: number;
};
type Bubble = { x: number; y: number; vx: number; vy: number; size: number; ph: number };
type Part = {
  mode: "fly" | "in" | "out"; kind: "b" | "p"; from: "b" | "p";
  x0: number; y0: number; x1: number; y1: number; t: number; delay: number; dur: number; wob: number; sag: number; ph: number;
};

function sprite(rows: string[]): Sprite {
  const px: (number | string)[] = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") px.push(x, y, ch); }));
  return { px, w: rows[0].length, h: rows.length };
}
const TETRA = sprite([
  "...f....",
  "t.ssssew",
  "ttrrrrww",
  "...f....",
]);
const PLATY = sprite([
  "....ff.....",
  "..ooooooo..",
  "t.oowoooeo.",
  "ttoooooooow",
  "t.oooooooo.",
  "..ooooooo..",
  ".....f.....",
]);
const ANGEL = sprite([
  ".....f...",
  "....ff...",
  "...fyy...",
  "..yykyy..",
  "t.ykyyyy.",
  "ttykyyyey",
  "t.ykyyyy.",
  "..yykyy..",
  "...fyy...",
  "....ff...",
  ".....f...",
]);
const SNAIL = sprite([
  "..cc...",
  ".cssc..",
  ".cscc.a",
  "bbbbbbb",
]);
const MAP_TETRA: SpriteMap = { f: M.FW, t: M.FW, s: M.FS, r: M.FR, w: M.FW, e: M.FE };
const MAP_PLATY: SpriteMap = { o: M.FO, f: M.FO2, t: M.FO2, w: M.FW, e: M.FE };
const MAP_ANGEL: SpriteMap = { y: M.FY, k: M.FK, f: M.FK, t: M.FY, e: M.FE };
const MAP_SNAIL: SpriteMap = { c: M.SN0, s: M.SN1, b: M.SNB, a: M.SNB };

// ---- glyphs etched on the back glass where the bubble rests, and assembled from the tank's own life:
//      the sun out of air bubbles, the moon out of glowing plankton
function glyphCells(fn: (dx: number, dy: number) => boolean) {
  const cells: [number, number][] = [];
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) if (fn(dx, dy)) cells.push([dx, dy]);
  return cells;
}
const SUN_CELLS = glyphCells((dx, dy) => {
  const d = Math.hypot(dx, dy);
  if (d <= 3.6) return true;
  const a = Math.atan2(dy, dx);
  const near = Math.abs(a - Math.round(a / (Math.PI / 4)) * (Math.PI / 4));
  const diag = Math.round(a / (Math.PI / 4)) % 2 !== 0;
  return d >= 5.2 && d <= (diag ? 6.5 : 7.1) && near * d < 0.75;
});
const MOON_CELLS = glyphCells((dx, dy) => {
  const disc = dx * dx + dy * dy <= 6.2 * 6.2;
  const bite = (dx - 2.6) ** 2 + (dy + 2.2) ** 2 <= 5.2 * 5.2;
  const star = (dx === 5 && dy >= -6 && dy <= -4) || (dy === -5 && dx >= 4 && dx <= 6);
  return (disc && !bite) || star || (dx === 2 && dy === -6);
});

/**
 * One tank: its fixed layout, its creatures and their simulation, and the pixel buffers drawWorld() fills
 * (img8: the world, RGBA; g8: the glow of emissive pixels, blurred). Every random number comes from two seeded
 * generators, so the tank is the same on every load and every run of the same inputs is the same, frame for frame.
 */
export function createWorld() {
  const buf = new Uint32Array(W * H);
  const img8 = new Uint8Array(buf.buffer);
  let CA = KC[0], CB = KC[0], tT = 0;
  let keyA = 0, keyB = 0, keyS = 0;

  function setKeys(L: number) {
    let a: number, b: number, t: number;
    if (L >= 0.76) { a = 1; b = 0; t = (L - 0.76) / 0.24; }
    else if (L >= 0.24) { a = 2; b = 1; t = (L - 0.24) / 0.52; }
    else { a = 3; b = 2; t = L / 0.24; }
    t = clamp(t);
    CA = KC[a]; CB = KC[b];
    tT = sstep(0.28, 0.72, t);
    keyA = a; keyB = b; keyS = sstep(0, 1, t);
  }
  // smooth lerp of a 4-key colour set (for glass, page, lights — things that are not pixels)
  function keyLerp(set: RGB[]): RGB {
    const a = set[keyA], b = set[keyB];
    return [mix(a[0], b[0], keyS), mix(a[1], b[1], keyS), mix(a[2], b[2], keyS)];
  }

  // parallax offset of the layer being drawn (whole pixels)
  let OX = 0, OY = 0;
  function put(x: number, y: number, m: number) {
    x = Math.floor(x + OX); y = Math.floor(y + OY);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    buf[y * W + x] = BAY[((y & 3) << 2) | (x & 3)] < tT ? CB[m] : CA[m];
  }
  function raw(x: number, y: number, c: number) {
    x = Math.floor(x + OX); y = Math.floor(y + OY);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    buf[y * W + x] = c;
  }

  // ---- glow (emissive pixels, blurred, added in the shader)
  const gbuf = new Float32Array(W * H * 3);
  const gtmp = new Float32Array(W * H * 3);
  const g8 = new Uint8Array(W * H * 4);
  function emit(x: number, y: number, r: number, g: number, b: number) {
    x = Math.floor(x + OX); y = Math.floor(y + OY);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    gbuf[i] += r; gbuf[i + 1] += g; gbuf[i + 2] += b;
  }
  function blur(src: Float32Array, dst: Float32Array, horiz: boolean, R: number) {
    const n = 2 * R + 1;
    if (horiz) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let r = 0, g = 0, b = 0;
        for (let k = -R; k <= R; k++) {
          const xx = x + k; if (xx < 0 || xx >= W) continue;
          const i = (y * W + xx) * 3; r += src[i]; g += src[i + 1]; b += src[i + 2];
        }
        const o = (y * W + x) * 3; dst[o] = r / n; dst[o + 1] = g / n; dst[o + 2] = b / n;
      }
    } else {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let r = 0, g = 0, b = 0;
        for (let k = -R; k <= R; k++) {
          const yy = y + k; if (yy < 0 || yy >= H) continue;
          const i = (yy * W + x) * 3; r += src[i]; g += src[i + 1]; b += src[i + 2];
        }
        const o = (y * W + x) * 3; dst[o] = r / n; dst[o + 1] = g / n; dst[o + 2] = b / n;
      }
    }
  }
  function finishGlow() {
    blur(gbuf, gtmp, true, 3); blur(gtmp, gbuf, false, 3);
    blur(gbuf, gtmp, true, 2); blur(gtmp, gbuf, false, 2);
    for (let i = 0, j = 0; i < W * H; i++, j += 3) {
      g8[i * 4] = Math.min(255, gbuf[j] * 255 * 2.2);
      g8[i * 4 + 1] = Math.min(255, gbuf[j + 1] * 255 * 2.2);
      g8[i * 4 + 2] = Math.min(255, gbuf[j + 2] * 255 * 2.2);
      g8[i * 4 + 3] = 255;
    }
  }

  // ---- static layout
  const sandTop = new Int16Array(W);
  for (let x = 0; x < W; x++) {
    sandTop[x] = Math.round(64.5 + (noise2(x * 0.06, 3.3) - 0.5) * 5 + Math.sin((x / W) * Math.PI) * 1.6);
  }
  const surfY = new Int16Array(W);

  function buildRock(cx: number, cy: number, rx: number, ry: number, seed: number) {
    const list: number[] = [];
    for (let y = cy - ry - 1; y <= cy + ry + 1; y++) {
      for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
        if (x < 0 || x >= W) continue;
        if (y > sandTop[x] + 1) continue;
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        const r = nx * nx + ny * ny;
        const edge = 1 + (noise2(x * 0.45 + seed, y * 0.45) - 0.5) * 0.4;
        if (r > edge) continue;
        const light = -nx * 0.55 - ny * 0.85 + (noise2(x * 0.8 + seed, y * 0.8) - 0.5) * 0.6;
        list.push(x, y, light > 0.42 ? M.ROCK2 : light < -0.2 ? M.ROCK1 : M.ROCK0);
      }
    }
    return list;
  }
  const rocks = [
    ...buildRock(20, 59, 13, 9, 3),
    ...buildRock(130, 61, 11, 7, 9),
    ...buildRock(60, 66, 4, 3, 17),
  ];

  // brass diving helmet — someone lives in it
  const HX = 97;
  const HY = sandTop[HX] - 9;
  const helmet: number[] = []; // x, y, mat, glass(0/1/2)
  (function buildHelmet() {
    const R = 9;
    for (let y = HY - R - 3; y <= HY + 9; y++) {
      for (let x = HX - R - 3; x <= HX + R + 3; x++) {
        const dx = x - HX, dy = y - HY;
        let m = -1, glass = 0;
        if (y <= HY + 5 && dx * dx + dy * dy <= (R + 0.3) * (R + 0.3)) {
          const nx = dx / R, ny = dy / R;
          const l = -nx * 0.5 - ny * 0.8;
          m = l > 0.38 ? M.BRASS2 : l > -0.28 ? M.BRASS1 : M.BRASS0;
        }
        if (y >= HY + 5 && y <= HY + 8 && Math.abs(dx) <= R + 2) {
          m = y === HY + 5 ? M.BRASS1 : M.BRASS0;
          if (y === HY + 6 && dx % 3 === 0) m = M.BRASS2;
        }
        // front porthole
        const pd = Math.hypot(x - (HX - 1), y - HY);
        if (pd <= 3.9) {
          if (pd > 2.6) m = (x - HX + y - HY) < -1 ? M.BRASS2 : M.BRASS1;
          else { m = M.PORT; glass = 1; if (x === HX - 1 || y === HY) { m = M.BRASS0; glass = 0; } }
        }
        // side porthole
        const sd = Math.hypot(x - (HX + 6), y - (HY - 2));
        if (sd <= 1.9) { if (sd > 0.9) m = M.BRASS0; else { m = M.PORT; glass = 2; } }
        if (m >= 0) helmet.push(x, y, m, glass);
      }
    }
    // valve on top
    helmet.push(HX - 1, HY - R - 1, M.BRASS0, 0, HX, HY - R - 1, M.BRASS1, 0, HX + 1, HY - R - 1, M.BRASS0, 0, HX, HY - R - 2, M.BRASS2, 0);
  })();

  const moss: number[] = [];
  (function buildMoss() {
    const spans = [[30, 46], [66, 84], [108, 120], [2, 10]];
    for (const [a, b] of spans) for (let x = a; x <= b; x++) {
      if (hash(x, 7) > 0.72) continue;
      const h = 1 + Math.floor(hash(x, 9) * 3);
      for (let j = 1; j <= h; j++) moss.push(x, sandTop[x] - j + 1, j === h ? M.G2 : M.MOSS);
    }
  })();

  // plants
  const R0 = rng(41);
  const plants: Plant[] = [];
  ([[5, 50], [9, 44], [13, 54], [27, 40], [33, 47], [121, 46], [126, 53], [134, 41], [139, 49]] as const).forEach(([x, h]) =>
    plants.push({ kind: "ribbon", x, h, ph: R0() * 6.28, flex: 0.8 + R0() * 0.5, bend: 0, front: false }));
  ([[38, 30, "g", false], [44, 36, "g", true], [50, 24, "g", false], [64, 28, "r", false], [68, 34, "r", true], [72, 22, "r", false], [112, 32, "g", false], [117, 26, "g", true]] as const).forEach(([x, h, color, front]) =>
    plants.push({ kind: "stem", x, h, color, ph: R0() * 6.28, flex: 0.6 + R0() * 0.4, bend: 0, front }));

  // ---- creatures
  const R1 = rng(7);
  const fish: Fish[] = [];
  function addFish(spr: Sprite, map: SpriteMap, speed: number, school: boolean) {
    const x = 20 + R1() * (W - 40), y = 14 + R1() * 34;
    const rx = 10 + R1() * (W - 20);
    fish.push({
      spr, map, speed, school,
      x, y, vx: 0, vy: 0, dir: R1() < 0.5 ? -1 : 1,
      tx: x, ty: y, timer: 0, phase: R1() * 6.28,
      rest: { x: rx, y: sandTop[Math.round(rx)] - spr.h / 2 - 3 - R1() * 6 },
      seed: R1() * 100,
    });
  }
  for (let i = 0; i < 6; i++) addFish(TETRA, MAP_TETRA, 15, true);
  addFish(PLATY, MAP_PLATY, 9, false);
  addFish(PLATY, MAP_PLATY, 8, false);
  addFish(ANGEL, MAP_ANGEL, 6, false);

  const snail = { x: 40, dir: 1 };

  const snow = Array.from({ length: 28 }, () => ({ x: R1() * W, y: AIR + R1() * 56, vx: 0, ph: R1() * 6.28 }));
  const plankton = Array.from({ length: 80 }, () => ({ x: R1() * W, y: AIR + 4 + R1() * 56, g: 0, ph: R1() * 6.28 }));
  const bubbles: Bubble[] = []; // small rising bubbles
  const ripples: { x: number; age: number }[] = [];
  let helmetTimer = 0;

  // ---- the sun and moon on the back glass
  const GL = { on: true, parts: [] as Part[], sun: [] as [number, number][], moon: [] as [number, number][], sunC: [0, 0], moonC: [0, 0] };

  function glyphSlots(moonX: number, sunX: number, y: number) {
    GL.moonC = [Math.round(moonX), Math.round(y)];
    GL.sunC = [Math.round(sunX), Math.round(y)];
    GL.moon = MOON_CELLS.map(([dx, dy]) => [GL.moonC[0] + dx, GL.moonC[1] + dy]);
    GL.sun = SUN_CELLS.map(([dx, dy]) => [GL.sunC[0] + dx, GL.sunC[1] + dy]);
  }
  function glyphRest(on: boolean) {
    GL.on = on;
    GL.parts = (on ? GL.sun : GL.moon).map(([x, y]): Part => ({
      mode: "fly", kind: on ? "b" : "p", from: on ? "b" : "p",
      x0: x, y0: y, x1: x, y1: y, t: 1, delay: 0, dur: 1, wob: 0, sag: 0, ph: R1() * 6.28,
    }));
  }
  function partState(p: Part) {
    const u = clamp((p.t - p.delay) / p.dur);
    if (p.mode === "fly") {
      const e = easeIO(u);
      const lift = Math.sin(u * Math.PI);
      const x = mix(p.x0, p.x1, e) + Math.sin(u * Math.PI * 3 + p.ph) * p.wob * lift;
      const y = mix(p.y0, p.y1, p.kind === "b" ? easeOut(u) : e) + lift * p.sag;
      const shown = p.from === "b" && p.kind === "b" && p.t < p.delay && p.y0 > 50 ? 0 : 1; // bubbles appear when they leave the sand
      return { x, y, a: shown, kind: u < 0.08 ? p.from : p.kind };
    }
    if (p.mode === "in") return { x: p.x1, y: p.y1, a: u, kind: p.kind };
    // out: bubbles rise away, plankton drifts and dims
    return {
      x: p.x0 + Math.sin(u * 4 + p.ph) * 1.5,
      y: p.y0 - (p.kind === "b" ? u * 9 : -u * 2),
      a: 1 - u, kind: p.kind,
    };
  }
  function glyphCommit(on: boolean, instant: boolean) {
    if (on === GL.on && !instant) return;
    if (instant) { glyphRest(on); return; }
    GL.on = on;
    const cur = GL.parts.map(partState).filter((s) => s.a > 0.3);
    const parts: Part[] = [];
    const out = (c: { x: number; y: number; kind: "b" | "p" }) => parts.push({ mode: "out", kind: c.kind, from: c.kind, x0: c.x, y0: c.y, x1: c.x, y1: c.y, t: 0, delay: R1() * 0.3, dur: 0.5 + R1() * 0.5, wob: 0, sag: 0, ph: R1() * 6.28 });
    if (on) {
      // air bubbles leave the sand along the path and gather into the sun
      const lo = GL.moonC[0] - 4, hi = GL.sunC[0] + 4;
      for (const [x, y] of GL.sun) {
        const sx = clamp(Math.round(mix(lo, hi, R1())), 0, W - 1);
        parts.push({ mode: "fly", kind: "b", from: "b", x0: sx, y0: sandTop[sx] - 1, x1: x, y1: y, t: 0, delay: R1() * 0.45, dur: 1.0 + R1() * 0.55, wob: 1.3, sag: 0, ph: R1() * 6.28 });
      }
      cur.forEach(out);
    } else {
      // the sun breaks up into plankton that drifts home and settles as the moon
      for (let i = cur.length - 1; i > 0; i--) { const j = Math.floor(R1() * (i + 1)); [cur[i], cur[j]] = [cur[j], cur[i]]; }
      GL.moon.forEach(([x, y], i) => {
        if (i < cur.length) {
          const c = cur[i];
          parts.push({ mode: "fly", kind: "p", from: c.kind, x0: c.x, y0: c.y, x1: x, y1: y, t: 0, delay: R1() * 0.3, dur: 1.1 + R1() * 0.55, wob: 1.6, sag: 4 + R1() * 6, ph: R1() * 6.28 });
        } else {
          parts.push({ mode: "in", kind: "p", from: "p", x0: x, y0: y, x1: x, y1: y, t: 0, delay: 0.7 + R1() * 0.6, dur: 0.5, wob: 0, sag: 0, ph: R1() * 6.28 });
        }
      });
      cur.slice(GL.moon.length).forEach(out);
    }
    GL.parts = parts;
  }
  function stepGlyph(dt: number) {
    for (let i = GL.parts.length - 1; i >= 0; i--) {
      const p = GL.parts[i];
      p.t += dt;
      if (p.mode === "out" && p.t > p.delay + p.dur) GL.parts.splice(i, 1);
    }
  }
  function drawGlyphParts(t: number) {
    const dark = sstep(0.55, 0.1, S.L);
    for (const p of GL.parts) {
      const s = partState(p);
      if (s.a <= 0.01) continue;
      const x = Math.round(s.x), y = Math.round(s.y);
      if (s.kind === "b") {
        // bubbles caught in the lamp light: warm once they settle into the sun
        const settled = p.mode === "fly" && p.t >= p.delay + p.dur;
        const m = settled ? ((x + y) & 1 ? M.SUNB : M.SUNB_DK) : M.OBUB;
        if (bay(x, y) < s.a) put(x, y, m);
      } else {
        const lv = s.a * (0.72 + 0.28 * Math.sin(t * 2.2 + p.ph * 3));
        raw(x, y, PLK[lv > 0.66 ? 3 : lv > 0.33 ? 2 : 1]);
        const e = lv * (0.35 + 0.65 * dark);
        emit(x, y, 0.2 * e, 0.8 * e, 0.95 * e);
      }
    }
  }

  // ---- shared state
  const S = {
    ix: 0, iy: 0,       // viewing angle (pointer + slow sway), -1..1
    L: 1,               // light level 0..1 (from bubble position)
    t: 0,               // world time
    bw: { x: 0, y: 0 }, // big bubble in world px
    bwr: 10,
    bvw: 0,             // big bubble x-velocity in world px/s
  };

  function popBubble(x: number) {
    ripples.push({ x, age: 0 });
    if (ripples.length > 8) ripples.shift();
  }

  function simulate(dt: number) {
    const t = (S.t += dt);
    const L = S.L;
    const act = sstep(0.25, 0.8, L);
    const night = 1 - act;
    const bw = S.bw, bwr = S.bwr, bspeed = Math.abs(S.bvw);

    // plants bend in the bubble's wake
    const sig2 = (bwr * 1.7) ** 2;
    for (const p of plants) {
      const mid = sandTop[p.x] - p.h * 0.6;
      const d2 = (p.x - bw.x) ** 2 + (mid - bw.y) ** 2;
      const target = clamp(S.bvw * Math.exp(-d2 / (2 * sig2)) * 0.05, -7, 7);
      p.bend += (target - p.bend) * Math.min(1, dt * (Math.abs(target) > Math.abs(p.bend) ? 5 : 1.3));
    }

    // fish
    let cx = 0, cy = 0, cn = 0;
    for (const f of fish) if (f.school) { cx += f.x; cy += f.y; cn++; }
    cx /= cn || 1; cy /= cn || 1;
    fish.forEach((f, i) => {
      // the fish follow the lens: each circles it on its own orbit, the school keeps together
      const dirn = i % 2 ? 1 : -1;
      const orbitA = f.seed + t * (0.35 + 0.1 * (i % 3)) * dirn;
      const orbitR = bwr * (0.3 + 0.55 * hash(i, 3));
      let gx = bw.x + Math.cos(orbitA) * orbitR * 1.25;
      let gy = bw.y + Math.sin(orbitA) * orbitR * 0.7;
      if (f.school) { gx = mix(gx, cx + Math.sin(t * 0.7 + i) * 5, 0.35); gy = mix(gy, cy + Math.cos(t * 0.9 + i * 1.7) * 3, 0.35); }
      const dx = gx - f.x, dy = gy - f.y;
      const dist = Math.hypot(dx, dy) || 1;
      // they hurry after a moving lens and drift slowly at night
      const boost = clamp(bspeed / 40, 0, 1.5) * clamp(dist / bwr);
      const sp = f.speed * (0.45 + 0.55 * act + boost) * Math.min(1, dist / 8);
      let ax = (dx / dist * sp - f.vx) * 1.8;
      let ay = (dy / dist * sp * 0.8 - f.vy) * 1.8;
      // separation inside the school
      if (f.school) for (const o of fish) if (o !== f && o.school) {
        const sx = f.x - o.x, sy = f.y - o.y, s2 = sx * sx + sy * sy;
        if (s2 < 25 && s2 > 0.01) { ax += sx / s2 * 14; ay += sy / s2 * 14; }
      }
      f.vx += ax * dt; f.vy += ay * dt;
      const vmax = f.speed * (1.2 + boost * 1.6);
      const v = Math.hypot(f.vx, f.vy);
      if (v > vmax) { f.vx *= vmax / v; f.vy *= vmax / v; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      const hw = f.spr.w / 2, hh = f.spr.h / 2;
      f.x = clamp(f.x, hw + 2, W - hw - 2);
      const floor = sandTop[clamp(Math.round(f.x), 0, W - 1)] - hh - 1;
      f.y = clamp(f.y, AIR + hh + 3, floor);
      if (f.vx > 0.9) f.dir = 1; else if (f.vx < -0.9) f.dir = -1;
      f.phase += dt * (3 + Math.hypot(f.vx, f.vy) * 0.7);
    });

    // snail comes out at night
    if (night > 0.5) {
      snail.x += snail.dir * dt * 1.1 * night;
      if (snail.x > 82) snail.dir = -1;
      if (snail.x < 30) snail.dir = 1;
    }

    // marine snow
    for (const s of snow) {
      s.vx += (S.bvw * Math.exp(-((s.x - bw.x) ** 2 + (s.y - bw.y) ** 2) / (2 * sig2)) * 0.6 - s.vx) * Math.min(1, dt * 2);
      s.x += (s.vx + Math.sin(t * 0.4 + s.ph) * 0.8) * dt;
      s.y += (0.6 + Math.sin(t * 0.3 + s.ph * 2) * 0.4) * dt;
      if (s.x < 0) s.x += W;
      if (s.x >= W) s.x -= W;
      if (s.y > sandTop[Math.floor(s.x)]) { s.y = AIR + 3; s.x = R1() * W; }
    }

    // plankton: lights up when disturbed
    for (const p of plankton) {
      p.x += Math.sin(t * 0.25 + p.ph) * 0.9 * dt + S.bvw * Math.exp(-((p.x - bw.x) ** 2 + (p.y - bw.y) ** 2) / (2 * sig2)) * 0.25 * dt;
      p.y += Math.cos(t * 0.2 + p.ph * 1.3) * 0.6 * dt;
      if (p.x < 0) p.x += W;
      if (p.x >= W) p.x -= W;
      p.y = clamp(p.y, AIR + 3, 62);
      const d = Math.hypot(p.x - bw.x, p.y - bw.y);
      if (bspeed > 18 && d < bwr * 1.35) p.g = Math.max(p.g, clamp(bspeed / 70));
      for (const f of fish) {
        if (Math.abs(f.x - p.x) < 3 && Math.abs(f.y - p.y) < 3 && Math.hypot(f.vx, f.vy) > 4) p.g = Math.max(p.g, 0.6);
      }
      if (R1() < dt * 0.015) p.g = Math.max(p.g, 0.45);
      p.g *= Math.exp(-dt * 0.8);
    }

    // small bubbles
    if (L > 0.7) {
      for (const p of plants) {
        if (R1() < dt * 0.12 * sstep(0.7, 1, L)) {
          const i = Math.floor(p.h * (0.3 + R1() * 0.7));
          bubbles.push({ x: p.x + (R1() - 0.5) * 3, y: sandTop[p.x] - i, vy: 5 + R1() * 4, vx: 0, size: 1, ph: R1() * 6.28 });
        }
      }
    }
    helmetTimer -= dt;
    if (helmetTimer <= 0) {
      helmetTimer = 0.35 + R1() * 0.9;
      bubbles.push({ x: HX + (R1() - 0.5), y: HY - 12, vy: 10 + R1() * 6, vx: 0, size: R1() < 0.3 ? 2 : 1, ph: R1() * 6.28 });
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.vx *= Math.exp(-dt * 2);
      b.x += (b.vx + Math.sin(t * 4 + b.ph) * 1.2) * dt;
      b.y -= b.vy * dt;
      b.vy = Math.min(b.vy + dt * 6, 22);
      const sx = clamp(Math.round(b.x), 0, W - 1);
      if (b.y <= surfY[sx] + 1) { if (b.size > 1 || R1() < 0.35) popBubble(b.x); bubbles.splice(i, 1); }
    }
    if (bubbles.length > 160) bubbles.splice(0, bubbles.length - 160);

    for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].age += dt; if (ripples[i].age > 2.2) ripples.splice(i, 1); }
    stepGlyph(dt);
  }

  /** Small air bubbles shed behind a fast lens (dir: the lens's direction of travel). */
  function shedBubbles(count: number, dir: number) {
    const bw = S.bw, r = S.bwr;
    for (let i = 0; i < count; i++) {
      const a = (R1() - 0.5) * 2.2;
      bubbles.push({
        x: bw.x - dir * Math.cos(a) * r * 0.92,
        y: bw.y + Math.sin(a) * r * 0.92,
        vx: -dir * (4 + R1() * 8) + S.bvw * 0.08,
        vy: 8 + R1() * 10,
        size: R1() < 0.35 ? 2 : 1,
        ph: R1() * 6.28,
      });
    }
  }

  function drawSprite(s: Sprite, map: SpriteMap, x0: number, y0: number, flip: boolean, tail: number) {
    const { px, w } = s;
    for (let i = 0; i < px.length; i += 3) {
      const sx = px[i] as number, sy = px[i + 1] as number, ch = px[i + 2] as string;
      const x = flip ? x0 + w - 1 - sx : x0 + sx;
      const y = y0 + sy + (ch === "t" && sx === 0 ? tail : 0);
      const m = map[ch];
      if (m !== undefined) put(x, y, m);
    }
  }

  function drawPlant(p: Plant, t: number) {
    const base = sandTop[p.x];
    for (let i = 0; i <= p.h; i++) {
      const f = i / p.h;
      const sway = (Math.sin(t * 0.8 + p.ph + i * 0.11) * 1.6 + Math.sin(t * 0.37 + p.ph * 1.7)) * Math.pow(f, 1.5) * p.flex + p.bend * Math.pow(f, 1.3);
      const x = Math.round(p.x + sway);
      const y = base - i;
      if (p.kind === "ribbon") {
        const tw = Math.sin(i * 0.33 + p.ph) > 0;
        put(x, y, tw ? M.V1 : M.V0);
        if (i < p.h - 3) put(x + 1, y, tw ? M.V0 : M.V1);
      } else {
        const g = p.color === "g";
        put(x, y, g ? M.G0 : M.R0);
        if (i > 2 && i % 3 === 0) {
          const side = (i / 3) % 2 ? 1 : -1;
          put(x + side, y, g ? M.G1 : M.R1);
          put(x + side * 2, y - 1, g ? M.G2 : M.R2);
          put(x - side, y - 1, g ? M.G1 : M.R1);
        }
        if (i === p.h) { put(x - 1, y, g ? M.G2 : M.R2); put(x + 1, y, g ? M.G2 : M.R2); put(x, y - 1, g ? M.G2 : M.R2); }
      }
    }
  }

  function drawWorld() {
    const t = S.t, L = S.L;
    setKeys(L);
    gbuf.fill(0);

    // surface line
    for (let x = 0; x < W; x++) {
      let r = 0;
      for (const rp of ripples) {
        const d = Math.abs(x - rp.x);
        r += Math.exp(-rp.age * 1.8) * Math.sin(d * 0.9 - rp.age * 9) * Math.exp(-d * 0.09) * (d < rp.age * 12 ? 1 : 0) * 1.4;
      }
      surfY[x] = clamp(Math.round(AIR + 0.5 + 0.6 * Math.sin(x * 0.3 + t * 1.6) + 0.4 * Math.sin(x * 0.11 - t * 0.9) + r), AIR - 1, AIR + 2);
    }

    const rayAmt = Math.max(sstep(0.5, 1, L) * 0.9, 0.45 * clamp(1 - Math.abs(L - 0.32) / 0.16));
    const caus = Math.max(sstep(0.4, 1, L), 0.35 * clamp(1 - Math.abs(L - 0.32) / 0.14));
    const span = H - AIR - 10;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const sy = surfY[x], st = sandTop[x];
        let m: number;
        if (y < sy) {
          m = y <= 1 ? M.AIR_HI : M.AIR;
        } else if (y === sy) {
          m = M.SURF;
        } else if (y < st) {
          if (y === sy + 1 && bay(x, y) < 0.5) { put(x, y, M.SURF_DK); continue; }
          const d = clamp((y - AIR) / span);
          const f = d * 4;
          const i0 = Math.min(4, Math.floor(f));
          const fr = f - i0;
          m = M.W0 + (BAY[(((y + 1) & 3) << 2) | ((x + 2) & 3)] < fr && i0 < 4 ? i0 + 1 : i0);
          if (rayAmt > 0.01) {
            const rx = x + y * 0.55;
            const rv = Math.sin(rx * 0.11 + t * 0.25) * 0.6 + Math.sin(rx * 0.047 - t * 0.18 + 1.0) * 0.4;
            const ray = sstep(0.3, 0.95, rv) * (1 - d * 1.15) * rayAmt;
            if (ray > bay(x + 1, y) * 0.9 + 0.08) m = M.RAY;
          }
        } else {
          const ds = y - st;
          const n = noise2(x * 0.28, y * 0.45) + (bay(x, y) - 0.5) * 0.25 - ds * 0.03;
          m = ds === 0 ? M.SAND2 : n > 0.68 ? M.SAND2 : n < 0.36 ? M.SAND1 : M.SAND0;
          if (caus > 0.01 && ds < 9) {
            const v = Math.abs(Math.sin(x * 0.42 + 1.7 * Math.sin(y * 0.55 + t * 0.9) + t * 0.8) + Math.sin(x * 0.23 - t * 0.6 + 1.3 * Math.sin(y * 0.37 - t * 0.5)));
            if (v < 0.42 * caus * (1 - ds / 10)) m = M.CAUS;
          }
        }
        put(x, y, m);
      }
    }

    // parallax: the back glass moves most with the viewing angle, the front plants the other way
    const gx = Math.round(S.ix * 3), gy = Math.round(S.iy * 1.5);
    // glyphs etched on the back glass
    OX = gx; OY = gy;
    for (const [x, y] of GL.sun) put(x, y, M.ETCH);
    for (const [x, y] of GL.moon) put(x, y, M.ETCH);
    // back plants
    OX = Math.round(S.ix * 2); OY = 0;
    for (const p of plants) if (p.kind === "ribbon") drawPlant(p, t);
    // rocks, moss
    OX = Math.round(S.ix * 1);
    for (let i = 0; i < rocks.length; i += 3) put(rocks[i], rocks[i + 1], rocks[i + 2]);
    for (let i = 0; i < moss.length; i += 3) put(moss[i], moss[i + 1], moss[i + 2]);

    // helmet: porthole lights up when the lamp goes out
    const lampIn = sstep(0.6, 0.25, L);
    const flick = 0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
    for (let i = 0; i < helmet.length; i += 4) {
      const x = helmet[i], y = helmet[i + 1], glass = helmet[i + 3];
      if (glass && lampIn > 0.02) {
        const n = lampIn * flick * (glass === 2 ? 0.6 : 1);
        if (bay(x, y) < n) {
          raw(x, y, (glass === 1 && Math.abs(x - (HX - 2)) + Math.abs(y - (HY - 1)) < 2) ? LAMP_IN[1] : LAMP_IN[0]);
          emit(x, y, 1.0 * n, 0.72 * n, 0.36 * n);
          continue;
        }
      }
      put(x, y, helmet[i + 2]);
    }

    // mid plants
    OX = 0;
    for (const p of plants) if (p.kind === "stem" && !p.front) drawPlant(p, t);

    // snail
    const night = 1 - sstep(0.25, 0.8, L);
    const sx = Math.round(snail.x);
    if (night > 0.5) drawSprite(SNAIL, MAP_SNAIL, sx, sandTop[sx] - 3, snail.dir < 0, 0);
    else drawSprite(SNAIL, { c: M.SN0, s: M.SN1 }, sx, sandTop[sx] - 2, snail.dir < 0, 0); // hidden in its shell by day

    // fish
    fish.forEach((f) => {
      const bob = Math.sin(t * 1.3 + f.seed) * (0.3 + 0.7 * night) * 0.7;
      const x0 = Math.round(f.x - f.spr.w / 2);
      const y0 = Math.round(f.y - f.spr.h / 2 + bob);
      const tail = Math.round(Math.sin(f.phase) * 0.9);
      drawSprite(f.spr, f.map, x0, y0, f.dir < 0, tail);
    });

    // the glyph's bubbles / plankton
    OX = gx; OY = gy;
    drawGlyphParts(t);
    // front plants
    OX = -Math.round(S.ix * 2); OY = 0;
    for (const p of plants) if (p.kind === "stem" && p.front) drawPlant(p, t);
    OX = 0; OY = 0;

    // marine snow (only visible with some light)
    if (L > 0.15) for (const s of snow) if (bay(Math.round(s.x), Math.round(s.y)) < L) put(s.x, s.y, M.SNOW);

    // plankton
    const dark = sstep(0.45, 0.08, L);
    if (dark > 0.01) {
      for (const p of plankton) {
        // plankton glows on its own in the dark, breathing slowly; a passing lens or fish makes it flare
        const base = 0.36 + 0.22 * Math.sin(t * 0.9 + p.ph * 4);
        const lv = Math.max(p.g, base) * dark;
        const x = Math.round(p.x), y = Math.round(p.y);
        if (lv > 0.06) {
          raw(x, y, PLK[lv > 0.66 ? 3 : lv > 0.33 ? 2 : 1]);
          emit(x, y, 0.22 * lv, 0.9 * lv, 1.0 * lv);
          if (lv > 0.5) { emit(x + 1, y, 0.1 * lv, 0.4 * lv, 0.45 * lv); emit(x - 1, y, 0.1 * lv, 0.4 * lv, 0.45 * lv); }
        }
      }
    }

    // small bubbles
    for (const b of bubbles) {
      const x = Math.round(b.x), y = Math.round(b.y);
      if (b.size === 1) put(x, y, M.OBUB);
      else { put(x, y, M.OBUB); put(x + 1, y, M.OBUB_DK); put(x, y + 1, M.OBUB_DK); put(x + 1, y + 1, M.OBUB_DK); }
      if (dark > 0.3) emit(x, y, 0.02, 0.06, 0.08);
    }

    finishGlow();
  }

  return { S, GL, img8, g8, keyLerp, simulate, drawWorld, shedBubbles, glyphSlots, glyphRest, glyphCommit };
}

export type World = ReturnType<typeof createWorld>;
