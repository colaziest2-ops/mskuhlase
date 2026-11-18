import { STATUS } from "./content";
import { demoAt, LOOP } from "./demo";
import { clamp } from "./math";
import { createRenderer, type Layout } from "./renderer";
import { createWorld, H, W } from "./world";

// Port of the Aquarium Toggle reference engine. Every expression of the simulation, springs, layout and input is
// kept as specified; the only changes are marked "site:" — the starting side comes from the site's theme, every
// commit is reported to the site (which changes the theme and pours it), toggle() serves the `T` key, and the
// engine leaves the site's own page colours alone (the reference repaints --bg/--fg; this site has its own tokens).

export type Parts = {
  canvas: HTMLCanvasElement;
  hit: HTMLButtonElement;
  status: HTMLElement;
  tank: HTMLElement;
  wrap: HTMLElement;
  cursor: SVGSVGElement;
};
export type EngineOptions = {
  /** Play the scripted demo pointer (?demo=1). */
  demo: boolean;
  /** The clock (ms, rAF time) the engine starts at; the frame-exact recorder starts at 0. */
  now0?: number;
  /** site: open on night (the site's dark theme) instead of asking prefers-color-scheme. */
  startNight?: boolean;
  /** site: called once per committed switch; true = day (light theme). */
  onCommit?: (lightOn: boolean) => void;
};

/** The demo pointer's tip inside its 28 px SVG (24-unit viewBox, tip at 3, 2), on the 1/16 px grid. */
const CURSOR_TIP = [3.5, 2.375];

/**
 * The toggle: lays out the pill, runs the bubble (the lens) on springs, turns pointer and keyboard input into day or
 * night, and steps the world at 30 Hz and the glass at every frame. start() runs it on requestAnimationFrame; step(now)
 * is one frame, for the recorder.
 */
export function createEngine(parts: Parts, { demo, now0, startNight, onCommit }: EngineOptions) {
  const { canvas, hit, status: statusEl, tank: tankEl, wrap: wrapEl, cursor } = parts;
  const off = new AbortController();
  const on = <K extends keyof WindowEventMap>(target: Window, type: K, fn: (e: WindowEventMap[K]) => void) =>
    target.addEventListener(type, fn, { signal: off.signal });
  const onHit = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) =>
    hit.addEventListener(type, fn, { signal: off.signal });

  const world = createWorld();
  const { S, GL } = world;
  const renderer = createRenderer(canvas, world);

  // ---- layout: a glass pill filled by the world; the lens rests 16/422 of the height from either end
  const G: Layout = { k: 4, dpr: 1, ox: 0, oy: 0, cw: 0, ch: 0, pw: 0, ph: 0, r0: 20, ts: 0, tl: 1, by: 0 };
  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // site: the pill lives in the nav, so its column (wrap) sets the width; the reference's 240/200 px floors are
    // for a full-page stage and would overflow the nav, so they're dropped
    const availW = wrapEl.clientWidth;
    const availH = window.innerHeight - 64;
    // the canvas is the pill plus a 3%-of-its-height margin each side (for the glass's light): that has to fit too
    const cssW = Math.min(800, availW / (1 + 0.06 * (H / W)), availH * (W / H));
    const pw = Math.round(cssW * dpr);
    const k = pw / W;
    const ph = H * k;
    const m = Math.round(ph * 0.03);
    Object.assign(G, { k, dpr, pw, ph, ox: m, oy: m, cw: pw + 2 * m, ch: Math.round(ph) + 2 * m });
    G.r0 = ph * (195 / 422);
    G.ts = ph / 2;
    G.tl = pw - ph;
    G.by = ph / 2;
    canvas.width = G.cw; canvas.height = G.ch;
    canvas.style.width = G.cw / dpr + "px";
    canvas.style.height = G.ch / dpr + "px";
    tankEl.style.width = G.cw / dpr + "px";
    Object.assign(hit.style, {
      left: m / dpr + "px", top: m / dpr + "px",
      width: pw / dpr + "px", height: ph / dpr + "px",
      borderRadius: ph / 2 / dpr + "px",
    });
    S.bwr = G.r0 / k;
    renderer.resize(G);
    // the sun sits where the lens rests by day (left), the moon where it rests at night (right)
    world.glyphSlots((G.ts + G.tl) / k, G.ts / k, G.by / k);
    if (GL.parts.length) world.glyphRest(GL.on);
  }

  // ---- lens physics. Position 0 = day (left), 1 = night (right)
  const motionQ = matchMedia("(prefers-reduced-motion: reduce)");
  let calm = motionQ.matches || document.documentElement.dataset.reduced === "true";
  motionQ.addEventListener("change", (e) => { calm = e.matches; }, { signal: off.signal });

  // dark-mode viewers open on night; the demo always opens on day (site: the site's own theme decides)
  const darkStart = !demo && (startNight ?? matchMedia("(prefers-color-scheme: dark)").matches);
  const B = {
    x: darkStart ? 1 : 0, v: 0, tx: darkStart ? 1 : 0,
    dragging: false,
    wa: 0, wav: 0, wb: 0, wbv: 0, w3: 0, w3v: 0, ph3: 0,
    prevVpx: 0, shedAcc: 0, settled: true,
    held: false, press: 0, pv: 0, scale: 1,
  };
  // committed state: the light is on (day). The switch itself reads as "night mode".
  let committed = !darkStart;
  hit.setAttribute("aria-checked", String(!committed));
  // reflected light running round the lens: top by day, bottom at night, always turning the same way
  const ARC = { a: committed ? -Math.PI / 2 : Math.PI / 2, v: 0, t: committed ? -Math.PI / 2 : Math.PI / 2 };
  function setTarget(lightOn: boolean) {
    B.tx = lightOn ? 0 : 1;
    if (lightOn === committed) return;
    committed = lightOn;
    B.settled = false; // announce the new state even when the bubble jumps there (reduced motion)
    ARC.t -= Math.PI;
    world.glyphCommit(lightOn, calm);
    onCommit?.(lightOn); // site: change the theme
  }

  function stepBubble(dt: number) {
    if (calm) {
      B.x = B.tx; B.v = 0; B.wa = B.wb = B.w3 = 0;
    } else {
      // soft spring: follows the finger closely, settles with only a slight overshoot
      const K = B.dragging ? 200 : 90;
      const C = 2 * Math.sqrt(K) * (B.dragging ? 1.0 : 0.8);
      B.v += (K * (B.tx - B.x) - C * B.v) * dt;
      B.x += B.v * dt;
      if (B.x < -0.03) { B.x = -0.03; B.v = Math.abs(B.v) * 0.2; }
      if (B.x > 1.03) { B.x = 1.03; B.v = -Math.abs(B.v) * 0.2; }
    }
    const vpx = B.v * G.tl;
    B.prevVpx = vpx;

    if (!calm) {
      // the lens spreads wider along its path, like a drop pulled sideways, and settles softly when it stops
      const stretch = clamp(Math.abs(vpx) / (G.r0 * 12), 0, 0.1) + (B.dragging ? 0.025 : 0);
      B.wav += (-150 * (B.wa - stretch) - 11 * B.wav) * dt;
      B.wa += B.wav * dt;
      B.wbv += (-150 * B.wb - 10 * B.wbv) * dt;
      B.wb += B.wbv * dt;
      const t3 = 0.012 * clamp(Math.abs(vpx) / (G.r0 * 5)) * Math.sin(S.t * 6);
      B.w3v += (-300 * (B.w3 - t3) - 10 * B.w3v) * dt;
      B.w3 += B.w3v * dt;
      B.wa = clamp(B.wa, -0.08, 0.08); B.wb = clamp(B.wb, -0.05, 0.05); B.w3 = clamp(B.w3, -0.03, 0.03);

      // small air bubbles trail behind a fast lens
      const vw = vpx / G.k;
      if (Math.abs(vw) > 30) {
        B.shedAcc += (Math.abs(vw) - 30) * 0.08 * dt;
        const n = Math.floor(B.shedAcc);
        if (n > 0) { B.shedAcc -= n; world.shedBubbles(Math.min(n, 3), Math.sign(vw)); }
      }
    }

    // pressed: the lens grows a little and casts a deeper shadow
    if (calm) { B.press = B.held ? 1 : 0; B.pv = 0; }
    else { B.pv += (260 * ((B.held ? 1 : 0) - B.press) - 26 * B.pv) * dt; B.press += B.pv * dt; }
    // grows a little, but the light strip never leaves the capsule
    B.scale = 1 + Math.min(0.035, (G.ph / 2 - 1.5 * G.dpr) / (G.r0 * 410 / 390) - 1) * B.press;

    // the light follows the lens directly: no lamp, no flicker
    S.L = 1 - clamp(B.x);
    if (calm) { ARC.a = ARC.t; ARC.v = 0; }
    else { ARC.v += (40 * (ARC.t - ARC.a) - 11 * ARC.v) * dt; ARC.a += ARC.v * dt; }

    const bx = G.ts + B.x * G.tl;
    const by = G.by;
    S.bw.x = bx / G.k; S.bw.y = by / G.k;
    S.bvw = vpx / G.k;

    if (!B.dragging && Math.abs(B.x - B.tx) < 0.01 && Math.abs(B.v) < 0.05) {
      if (!B.settled) {
        B.settled = true;
        const night = B.tx > 0.5;
        hit.setAttribute("aria-checked", String(night));
        statusEl.textContent = night ? STATUS.night : STATUS.day;
      }
    } else B.settled = false;
    return { bx, by };
  }

  // ---- input (the real pointer and the demo pointer go through the same handlers)
  let down: { x: number; y: number; moved: boolean; off: number } | null = null, suppressClick = false;
  function bubbleCssX() {
    const rect = canvas.getBoundingClientRect();
    return rect.left + (G.ox + G.ts + B.x * G.tl) / G.dpr;
  }
  function press(clientX: number, clientY: number) {
    suppressClick = false;
    const bcx = bubbleCssX();
    const rcss = G.r0 / G.dpr;
    down = { x: clientX, y: clientY, moved: false, off: Math.abs(clientX - bcx) < rcss * 1.1 ? clientX - bcx : 0 };
    B.held = true;
  }
  function drag(clientX: number) {
    if (!down) return;
    if (!down.moved && Math.abs(clientX - down.x) > 4) { down.moved = true; B.dragging = true; }
    if (B.dragging) {
      const rect = canvas.getBoundingClientRect();
      const px = (clientX - down.off - rect.left) * G.dpr - G.ox;
      B.tx = clamp((px - G.ts) / G.tl, -0.03, 1.03);
    }
  }
  const release = () => {
    if (!down) return;
    if (down.moved) {
      suppressClick = true;
      const proj = B.x + B.v * 0.18;
      setTarget(proj < 0.5);
    }
    B.dragging = false;
    B.held = false;
    down = null;
  };
  function click() {
    if (suppressClick) { suppressClick = false; return; }
    setTarget(!committed);
  }
  // viewing angle follows the pointer anywhere on the page
  const TILT = { tx: 0, ty: 0, ix: 0, iy: 0 };
  function look(clientX: number, clientY: number) {
    TILT.tx = clamp((clientX / window.innerWidth) * 2 - 1, -1, 1);
    TILT.ty = clamp((clientY / window.innerHeight) * 2 - 1, -1, 1);
  }

  onHit("pointerdown", (e) => {
    hit.setPointerCapture(e.pointerId);
    press(e.clientX, e.clientY);
  });
  onHit("pointermove", (e) => drag(e.clientX));
  onHit("pointerup", release);
  onHit("pointercancel", release);
  onHit("click", click);
  onHit("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "Home") { setTarget(true); e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key === "End") { setTarget(false); e.preventDefault(); }
  });
  on(window, "pointermove", (e) => look(e.clientX, e.clientY));

  // ---- the demo pointer: plays until the real pointer or keyboard is used
  let demoOn = demo && !calm;
  let demoT0: number | null = null;
  let demoPrev = { x: NaN, y: NaN, down: false };
  cursor.toggleAttribute("data-on", demoOn);
  function handOver() {
    if (!demoOn) return;
    demoOn = false;
    if (demoPrev.down) release();
    cursor.toggleAttribute("data-on", false);
  }
  if (demoOn) {
    on(window, "pointermove", (e) => { if (e.movementX || e.movementY) handOver(); });
    on(window, "pointerdown", handOver);
    on(window, "keydown", handOver);
  }
  function stepDemo(now: number) {
    if (demoT0 === null) demoT0 = now;
    const p = demoAt(((now - demoT0) / 1000) % LOOP);
    const rect = canvas.getBoundingClientRect();
    // on a 1/16 px grid, like real pointer coordinates (exact in the browser's 32-bit floats)
    const x = Math.round((rect.left + (G.ox + p.u * G.pw) / G.dpr) * 16) / 16;
    const y = Math.round((rect.top + (G.oy + p.v * G.ph) / G.dpr) * 16) / 16;
    // the order a browser fires them in: move (on the button, then the window), then down or up, then click
    if (x !== demoPrev.x || y !== demoPrev.y) { drag(x); look(x, y); }
    if (p.down && !demoPrev.down) press(x, y);
    if (!p.down && demoPrev.down) { release(); click(); }
    demoPrev = { x, y, down: p.down };
    cursor.style.transform = `translate(${x - CURSOR_TIP[0]}px, ${y - CURSOR_TIP[1]}px)`;
    cursor.toggleAttribute("data-down", p.down);
  }

  // ---- frame
  let last = now0 ?? performance.now();
  let worldAcc = 1;
  function step(now: number) {
    if (demoOn) stepDemo(now);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const kf = 1 - Math.exp(-4 * dt);
    TILT.ix += (TILT.tx - TILT.ix) * kf;
    TILT.iy += (TILT.ty - TILT.iy) * kf;
    const ts = now / 1000;
    S.ix = calm ? 0 : TILT.ix + 0.25 * Math.sin(0.5 * ts);
    S.iy = calm ? 0 : TILT.iy + 0.2 * Math.cos(0.4 * ts);
    const { bx, by } = stepBubble(dt);
    worldAcc += dt;
    if (worldAcc >= 1 / 30) {
      world.simulate(calm ? 0 : Math.min(worldAcc, 0.1));
      world.drawWorld();
      worldAcc = 0;
    }
    renderer.draw(G, { bx, by, x: B.x, scale: B.scale, wa: B.wa, wb: B.wb, w3: B.w3, ph3: B.ph3, press: B.press }, S.L);
  }

  layout();
  world.glyphRest(committed);
  on(window, "resize", layout);
  // warm up the world so the fish are already gathered round the lens on the first frame
  for (let i = 0; i < 60; i++) { stepBubble(1 / 60); world.simulate(1 / 30); }

  let raf = 0;
  function start() {
    const loop = (now: number) => { step(now); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
  }
  function dispose() {
    cancelAnimationFrame(raf);
    off.abort();
    renderer.dispose();
    cursor.toggleAttribute("data-on", false);
  }
  /** site: the `T` key — the same as a click on the bubble. */
  function toggle() {
    setTarget(!committed);
  }
  /** site: where the bubble is on screen (CSS px), for the theme pour's origin. */
  function bubbleCenter() {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + (G.ox + G.ts + B.tx * G.tl) / G.dpr, y: rect.top + (G.oy + G.by) / G.dpr };
  }
  return { start, step, dispose, toggle, bubbleCenter, layout };
}

export type Engine = ReturnType<typeof createEngine>;
