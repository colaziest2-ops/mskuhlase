import { clamp, mix, sstep, type RGB } from "./math";
import { LENS_RIM, LENS_SHADOW } from "./palette";
import { FRAG, VERT } from "./shaders";
import { H, W, type World } from "./world";

/** The pill's layout in device px (set by the engine's layout()). */
export type Layout = { k: number; dpr: number; ox: number; oy: number; cw: number; ch: number; pw: number; ph: number; r0: number; ts: number; tl: number; by: number };
/** What the glass needs from the lens each frame. */
export type LensFrame = { bx: number; by: number; x: number; scale: number; wa: number; wb: number; w3: number; ph3: number; press: number };

// ============================================================
// Glass, lamp, bubble: WebGL2 (a 2D canvas fallback without it)
// ============================================================
export function createRenderer(canvas: HTMLCanvasElement, world: World) {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  const U: Record<string, WebGLUniformLocation | null> = {};
  let prog: WebGLProgram | null = null, vb: WebGLBuffer | null = null, texWorld: WebGLTexture | null = null, texGlow: WebGLTexture | null = null;
  let ctx2d: CanvasRenderingContext2D | null = null;

  if (gl) {
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "program");
    gl.useProgram(prog);
    vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ["uWorld", "uGlow", "uRes", "uO", "uWS", "uK", "uBub", "uWob", "uL", "uArc", "uArcCol", "uShadowCol", "uShadow", "uDpr"]
      .forEach((n) => { U[n] = gl.getUniformLocation(prog!, n); });
    const mkTex = (unit: number) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      return t;
    };
    texWorld = mkTex(0);
    texGlow = mkTex(1);
    gl.uniform1i(U.uWorld, 0);
    gl.uniform1i(U.uGlow, 1);
    gl.uniform2f(U.uWS, W, H);
  } else {
    ctx2d = canvas.getContext("2d");
  }
  const worldCanvas = document.createElement("canvas");
  worldCanvas.width = W; worldCanvas.height = H;
  const worldCtx = worldCanvas.getContext("2d")!;
  const worldImg = worldCtx.createImageData(W, H);

  function resize(G: Layout) {
    if (gl) gl.viewport(0, 0, G.cw, G.ch);
  }

  function draw(G: Layout, B: LensFrame, L: number) {
    const keyLerp: (set: RGB[]) => RGB = world.keyLerp;
    if (gl) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texWorld);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, world.img8);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texGlow);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, world.g8);
      gl.uniform2f(U.uRes, G.cw, G.ch);
      gl.uniform2f(U.uO, G.ox, G.oy);
      gl.uniform1f(U.uK, G.k);
      gl.uniform3f(U.uBub, B.bx, B.by, G.r0 * B.scale);
      gl.uniform4f(U.uWob, B.wa, B.wb, B.w3, B.ph3);
      gl.uniform1f(U.uL, L);
      // the highlight runs round the ring with the lens: top by day, upper left at dusk, lower left in moonlight, bottom at night
      gl.uniform1f(U.uArc, -Math.PI / 2 - Math.PI * clamp(B.x));
      gl.uniform3fv(U.uArcCol, keyLerp(LENS_RIM));
      gl.uniform3fv(U.uShadowCol, keyLerp(LENS_SHADOW));
      // pressing the lens deepens its shadow
      const night = sstep(0.4, 0.0, L);
      gl.uniform3f(U.uShadow, mix(0.24, 0.42, B.press) * (1 - 0.5 * night), mix(6, 9, B.press) * G.dpr, mix(2, 5, B.press) * G.dpr);
      gl.uniform1f(U.uDpr, G.dpr);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (ctx2d) {
      // fallback: the world at full size inside the pill, and a ring for the lens
      worldImg.data.set(world.img8);
      worldCtx.putImageData(worldImg, 0, 0);
      const c = ctx2d;
      c.clearRect(0, 0, G.cw, G.ch);
      c.save();
      c.beginPath();
      c.roundRect(G.ox, G.oy, G.pw, G.ph, G.ph / 2);
      c.clip();
      c.imageSmoothingEnabled = false;
      c.drawImage(worldCanvas, G.ox, G.oy, G.pw, G.ph);
      c.restore();
      c.strokeStyle = "rgba(255,255,255,.85)";
      c.lineWidth = Math.max(2, G.k * 0.4);
      c.beginPath();
      c.arc(G.ox + B.bx, G.oy + B.by, G.r0, 0, Math.PI * 2);
      c.stroke();
    }
  }

  function dispose() {
    if (!gl) return;
    gl.deleteTexture(texWorld);
    gl.deleteTexture(texGlow);
    gl.deleteBuffer(vb);
    gl.deleteProgram(prog);
  }

  return { resize, draw, dispose };
}
