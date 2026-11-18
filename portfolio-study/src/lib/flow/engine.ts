import { FRAG, VERT } from "./shader";
import { BAR, DEMO, DEMO_LEN, STAGE_H, STAGE_W, hopDuration, sample, tailDuration, type FrameState, type Hop } from "./timeline";

export interface EngineOptions {
  readonly tabs: number;
  /** RGB 0–1 per tab: the bead's light when it sits on that tab. */
  readonly colors: readonly (readonly [number, number, number])[];
  readonly reduced: boolean;
  /** time multiplier (?z=), 1 = normal */
  readonly z: number;
  /** called every rendered frame with the same state the shader got */
  readonly onFrame: (s: FrameState) => void;
}

type Uniforms = Record<
  "uRes" | "uScale" | "uBar" | "uBarR" | "uBead" | "uDepth" | "uWave" | "uTime" | "uColA" | "uColB" | "uMix" | "uRipple" | "uSweep",
  WebGLUniformLocation | null
>;

/**
 * Drives the bar. One clock, one queue: a click during a hop waits for the
 * landing, then the bead sets off again from where it surfaced. The demo plays
 * once on load and stops the moment someone takes over.
 */
export class FlowEngine {
  private gl: WebGL2RenderingContext | null = null;
  private uni: Uniforms | null = null;
  private raf = 0;
  private hop: Hop | null = null;
  private rest = 0;
  private queue: number[] = [];
  private demoStart = -1;
  private demoNext = 0;
  private scale = 1;
  private readonly opts: EngineOptions;
  private readonly canvas: HTMLCanvasElement;
  /** false when WebGL2 isn't available (or the context was lost): the overlay draws a CSS bead instead */
  glOk = false;

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions) {
    this.canvas = canvas;
    this.opts = opts;
    this.glOk = this.initGl();
    canvas.addEventListener("webglcontextlost", this.onLost);
  }

  private initGl(): boolean {
    const gl = this.canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return false;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("flow bar shader:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return false;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("flow bar link:", gl.getProgramInfoLog(prog));
      return false;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one big triangle
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const names = ["uRes", "uScale", "uBar", "uBarR", "uBead", "uDepth", "uWave", "uTime", "uColA", "uColB", "uMix", "uRipple", "uSweep"] as const;
    const uni = {} as Uniforms;
    for (const n of names) uni[n] = gl.getUniformLocation(prog, n);
    this.gl = gl;
    this.uni = uni;
    return true;
  }

  private onLost = (e: Event) => {
    e.preventDefault();
    this.gl = null;
    this.glOk = false;
    this.draw();
  };

  /** Stage → screen scale (CSS) times the device pixel ratio. Call on resize. */
  resize(cssScale: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.scale = cssScale * dpr;
    this.canvas.width = Math.round(STAGE_W * this.scale);
    this.canvas.height = Math.round(STAGE_H * this.scale);
    this.gl?.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.draw();
  }

  private now() {
    return performance.now() / 1000;
  }

  /** Put the bead on tab `i` with no motion (first paint, reduced motion). */
  jump(i: number) {
    this.rest = i;
    this.hop = null;
    this.queue = [];
    this.draw();
  }

  /** Send the bead to tab `i`. If it's mid-hop, this waits for the landing. */
  go(i: number) {
    this.stopDemo();
    if (this.opts.reduced) {
      this.jump(i);
      return;
    }
    if (this.busy()) {
      if (this.queue[this.queue.length - 1] !== i) this.queue.push(i);
      if (this.queue.length > 3) this.queue.splice(0, this.queue.length - 3);
      return;
    }
    this.start(i, this.now());
  }

  private busy() {
    return this.hop !== null && this.now() < this.hop.t0 + this.hop.dur;
  }

  private start(to: number, t0: number) {
    if (to === this.rest) return;
    this.hop = { from: this.rest, to, t0, dur: hopDuration(this.rest, to, this.opts.z) };
    this.rest = to;
    this.kick();
  }

  /** The 8-second demo. Skipped under reduced motion. */
  playDemo() {
    if (this.opts.reduced) return;
    this.demoStart = this.now();
    this.demoNext = 0;
    this.kick();
  }

  stopDemo() {
    this.demoStart = -1;
  }

  get demoRunning() {
    return this.demoStart >= 0;
  }

  private kick() {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = () => {
    this.raf = 0;
    const t = this.now();

    // demo: fire each scheduled hop when its time comes
    if (this.demoStart >= 0) {
      const z = this.opts.z;
      while (this.demoNext < DEMO.length) {
        const step = DEMO[this.demoNext];
        if (!step || t < this.demoStart + step.at * z) break;
        this.start(step.to, this.demoStart + step.at * z);
        this.demoNext++;
      }
      if (t >= this.demoStart + DEMO_LEN * z) this.demoStart = -1;
    }

    // queued clicks leave from the landing spot, at the moment of landing
    if (this.hop && this.queue.length && t >= this.hop.t0 + this.hop.dur) {
      const next = this.queue.shift();
      if (next !== undefined) this.start(next, Math.max(this.hop.t0 + this.hop.dur, t - 0.05));
    }

    const s = this.draw(t);
    const tailOver = !this.hop || t > this.hop.t0 + this.hop.dur + tailDuration(this.opts.z);
    if (s.moving || !tailOver || this.demoStart >= 0 || this.queue.length) this.raf = requestAnimationFrame(this.frame);
  };

  /** Render one frame (shader + overlay) and return the state used. */
  draw(t = this.now()): FrameState {
    const n = this.opts.tabs;
    const s = sample(t, n, this.rest, this.hop, this.opts.z);
    const gl = this.gl;
    const u = this.uni;
    if (gl && u) {
      const ca = this.opts.colors[s.colFrom] ?? [1, 1, 1];
      const cb = this.opts.colors[s.colTo] ?? [1, 1, 1];
      gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
      gl.uniform1f(u.uScale, this.scale);
      gl.uniform4f(u.uBar, BAR.x0, BAR.y0, BAR.x1, BAR.y1);
      gl.uniform1f(u.uBarR, BAR.r);
      gl.uniform4f(u.uBead, s.bx, s.by, s.hw, s.hh);
      gl.uniform1f(u.uDepth, s.depth);
      gl.uniform1f(u.uWave, s.wave);
      gl.uniform1f(u.uTime, t / this.opts.z);
      gl.uniform3f(u.uColA, ca[0], ca[1], ca[2]);
      gl.uniform3f(u.uColB, cb[0], cb[1], cb[2]);
      gl.uniform1f(u.uMix, s.mix);
      gl.uniform4f(u.uRipple, s.rippleX, BAR.y0 + (BAR.y1 - BAR.y0) / 2, s.rippleR, s.rippleA);
      gl.uniform2f(u.uSweep, s.sweepX, s.sweepA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    this.opts.onFrame(s);
    return s;
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.gl?.getExtension("WEBGL_lose_context")?.loseContext();
    this.gl = null;
  }
}
