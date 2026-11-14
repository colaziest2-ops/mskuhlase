/*!
 * RELUMA · depth-aware relighting for any website
 * <reluma-light src="photo.jpg" depth="photo-depth.png" preset="dramatic"></reluma-light>
 * Runs fully in the visitor's browser (WebGL). No server, no AI calls at runtime.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.customElements && window.customElements.get('reluma-light')) return;

  var VERSION = '1.0.0';

  /* ------------------------------------------------------------------ presets */
  var PRESETS = {
    'soft-studio': { intensity: 1.6, radius: 0.8, softness: 0.8, color: '#fff1de', ambient: 0.55, height: 0.4, spec: 0.25 },
    dramatic: { intensity: 2.6, radius: 0.38, softness: 0.15, color: '#ffeacc', ambient: 0.2, height: 0.19, spec: 0.5 },
    cinematic: { intensity: 2.1, radius: 0.55, softness: 0.45, color: '#ffb36b', ambient: 0.34, height: 0.27, spec: 0.4 },
    neon: { intensity: 2.4, radius: 0.45, softness: 0.3, color: '#5fdcff', ambient: 0.28, height: 0.23, spec: 0.55 },
    daylight: { intensity: 1.4, radius: 1.1, softness: 0.9, color: '#e4ecff', ambient: 0.68, height: 0.5, spec: 0.2 },
  };
  var NUMERIC = ['intensity', 'radius', 'softness', 'ambient', 'height', 'spec', 'relief', 'shadow'];
  var DEFAULTS = { relief: 1, shadow: 1 };

  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function hexToRgb(hex, out) {
    var rgb = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(String(hex || ''));
    if (rgb) return [rgb[1] / 255, rgb[2] / 255, rgb[3] / 255];
    var h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (h.length !== 6 || !isFinite(n)) return out;
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  var reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ------------------------------------------------------------- shaders */
  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }',
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform sampler2D uPhoto;',   // source photo (sRGB)
    'uniform sampler2D uMap;',     // rg normal.xy · b cavity · a depth (1 = near)
    'uniform vec2 uSize;',          // image plane size, width = 1
    'uniform vec4 uFit;',           // element uv -> image uv: uv * xy + zw
    'uniform vec3 uLightPos;',
    'uniform vec3 uLightColor;',
    'uniform float uLightInt, uRadius, uSoft, uAmbient, uSpec, uNormalStr, uVH, uShadow;',
    'uniform float uView;',         // 0 relit · 1 original · 2 depth
    'uniform float uOpacity;',
    'varying vec2 vUv;',
    'float heightAt(vec2 uv){ return (texture2D(uMap, uv).a - 0.35) * uVH; }',
    'vec3 toLinear(vec3 c){ return pow(c, vec3(2.2)); }',
    'vec3 toGamma(vec3 c){ return pow(max(c, 0.0), vec3(1.0 / 2.2)); }',
    'vec3 shoulder(vec3 c){ vec3 o = max(c - 0.75, 0.0); return min(c, vec3(0.75)) + o / (1.0 + o * 1.6); }',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
    'void main(){',
    '  vec2 uv = vUv * uFit.xy + uFit.zw;',
    '  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }',
    '  vec4 src = texture2D(uPhoto, uv);',
    '  vec3 photo = src.rgb;',
    '  vec4 m = texture2D(uMap, uv);',
    '  vec3 col;',
    '  if (uView > 1.5) {',
    '    float v = pow(m.a, 0.85); col = mix(vec3(v), vec3(v) * vec3(1.0, 0.95, 0.88), v * 0.5);',
    '  } else if (uView > 0.5) {',
    '    col = photo;',
    '  } else {',
    '    float lum = dot(photo, vec3(0.2126, 0.7152, 0.0722));',
    '    float ao = mix(1.0, m.b, 0.85);',
    '    vec2 nxy = (m.rg * 2.0 - 1.0) * uNormalStr;',
    '    vec3 n = normalize(vec3(nxy, sqrt(max(0.02, 1.0 - dot(nxy, nxy)))));',
    '    vec3 pos = vec3((uv - 0.5) * uSize, heightAt(uv));',
    '    vec3 L = uLightPos - pos; float dist = length(L); vec3 l = L / dist;',
    '    float wrap = 0.15 + uSoft * 0.55;',
    '    float ndl = clamp((dot(n, l) + wrap) / (1.0 + wrap), 0.0, 1.0);',
    '    ndl = mix(ndl, ndl * ndl * (3.0 - 2.0 * ndl), 0.35);',
    '    float r = max(uRadius, 0.05);',
    '    float att = exp(-(dist * dist) / (r * r) * mix(3.0, 1.35, uSoft));',
    '    float shadow = 1.0;',
    '    if (uShadow > 0.001) {',
    '      float occ = 0.0;',
    '      float reach = min(1.0, 0.26 / max(length(L.xy), 1e-3));',
    '      float j = hash(uv * 731.0) * 0.8;',
    '      for (int i = 1; i <= 14; i++) {',
    '        float f = (float(i) + j) / 14.0 * reach;',
    '        vec3 s = pos + L * f;',
    '        float sh = heightAt(s.xy / uSize + 0.5);',
    '        occ = max(occ, smoothstep(0.0, 0.004 + uSoft * 0.016, sh - s.z) * (1.0 - f * 0.6));',
    '      }',
    '      shadow = 1.0 - occ * uShadow;',
    '    }',
    '    vec3 v = normalize(vec3(0.0, 0.0, 3.0) - pos);',
    '    vec3 hv = normalize(l + v);',
    '    float gloss = mix(70.0, 14.0, uSoft);',
    '    float spec = pow(max(dot(n, hv), 0.0), gloss) * uSpec * smoothstep(0.22, 0.75, lum) * (gloss + 8.0) / 80.0;',
    '    vec3 lin = toLinear(photo);',
    '    vec3 albedo = lin * 0.78 + 0.05 * smoothstep(0.03, 0.35, lum);',
    '    vec3 base = lin * uAmbient * mix(1.0, ao, 0.45);',
    '    vec3 added = (albedo * ndl * 1.25 + spec) * att * shadow * ao * uLightInt * uLightColor;',
    '    col = toGamma(shoulder(base + added));',
    '  }',
    '  float a = src.a * uOpacity;',
    '  gl_FragColor = vec4(col * a, a);',
    '}',
  ].join('\n');

  /* ------------------------------------------- depth -> normal / cavity map */
  function boxSizes(sigma) {
    var n = 3, wIdeal = Math.sqrt((12 * sigma * sigma / n) + 1);
    var wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
    var wu = wl + 2;
    var mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
    var m = Math.round(mIdeal), r = [];
    for (var i = 0; i < n; i++) r.push(((i < m ? wl : wu) - 1) / 2);
    return r;
  }
  function boxH(src, dst, w, h, r) {
    var inv = 1 / (r + r + 1);
    for (var y = 0; y < h; y++) {
      var row = y * w, acc = src[row] * r;
      for (var k = 0; k < r; k++) acc += src[row + Math.min(k, w - 1)];
      for (var x = 0; x < w; x++) {
        acc += src[row + Math.min(x + r, w - 1)];
        dst[row + x] = acc * inv;
        acc -= src[row + Math.max(x - r, 0)];
      }
    }
  }
  function boxV(src, dst, w, h, r) {
    var inv = 1 / (r + r + 1);
    for (var x = 0; x < w; x++) {
      var acc = src[x] * r;
      for (var k = 0; k < r; k++) acc += src[Math.min(k, h - 1) * w + x];
      for (var y = 0; y < h; y++) {
        acc += src[Math.min(y + r, h - 1) * w + x];
        dst[y * w + x] = acc * inv;
        acc -= src[Math.max(y - r, 0) * w + x];
      }
    }
  }
  function gauss(src, w, h, sigma) {
    var a = new Float32Array(src), b = new Float32Array(src.length), rs = boxSizes(sigma);
    for (var i = 0; i < rs.length; i++) {
      var r = Math.max(0, Math.round(rs[i]));
      boxH(a, b, w, h, r); boxV(b, a, w, h, r);
    }
    return a;
  }
  function box(src, w, h, r) {
    var t = new Float32Array(src.length), o = new Float32Array(src.length);
    boxH(src, t, w, h, r); boxV(t, o, w, h, r);
    return o;
  }
  /**
   * Edge-preserving smoothing (self-guided filter, He et al.). Monocular depth from
   * small models carries fine lumps and 8-bit steps that read as bumpy skin once turned
   * into normals; this flattens them while keeping silhouettes and real forms.
   */
  function guided(p, w, h, r, eps) {
    var n = p.length, pp = new Float32Array(n), i;
    for (i = 0; i < n; i++) pp[i] = p[i] * p[i];
    var m = box(p, w, h, r), v = box(pp, w, h, r);
    var a = new Float32Array(n), b = new Float32Array(n);
    for (i = 0; i < n; i++) { var vi = v[i] - m[i] * m[i]; a[i] = vi / (vi + eps); b[i] = m[i] - a[i] * m[i]; }
    var ma = box(a, w, h, r), mb = box(b, w, h, r), q = new Float32Array(n);
    for (i = 0; i < n; i++) q[i] = ma[i] * p[i] + mb[i];
    return q;
  }
  /** Builds the RGBA map the shader samples: normal.xy, cavity, depth. */
  function buildMap(raw, w, h) {
    var sc = w / 720;
    var depth = guided(raw, w, h, Math.max(1, Math.round(6 * sc)), (3 / 255) * (3 / 255));
    var ds = gauss(depth, w, h, 2.5 * sc);
    var broad = gauss(depth, w, h, 30 * sc);
    var mid = gauss(depth, w, h, 8 * sc);
    var hf = new Float32Array(w * h), i, x, y;
    for (i = 0; i < hf.length; i++) hf[i] = ds[i] + (ds[i] - broad[i]); // local form boost
    var out = new Uint8Array(w * h * 4), K = 10 * sc;
    for (y = 0; y < h; y++) {
      var ym = Math.max(y - 1, 0) * w, y0 = y * w, yp = Math.min(y + 1, h - 1) * w;
      for (x = 0; x < w; x++) {
        var xm = Math.max(x - 1, 0), xp = Math.min(x + 1, w - 1);
        var gx = (hf[ym + xp] + 2 * hf[y0 + xp] + hf[yp + xp]) - (hf[ym + xm] + 2 * hf[y0 + xm] + hf[yp + xm]);
        var gy = (hf[yp + xm] + 2 * hf[yp + x] + hf[yp + xp]) - (hf[ym + xm] + 2 * hf[ym + x] + hf[ym + xp]);
        var nx = -gx * K, ny = gy * K, inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        var o = (y0 + x) * 4, j = y0 + x;
        var ao = 1 - Math.max(mid[j] - ds[j], 0) * 8;
        out[o] = Math.round((nx * inv * 0.5 + 0.5) * 255);
        out[o + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255);
        out[o + 2] = Math.round(Math.min(1, Math.max(0, ao)) * 255);
        out[o + 3] = Math.round(Math.min(1, Math.max(0, depth[j])) * 255);
      }
    }
    return out;
  }

  /* ------------------------------------------------------- asset loading */
  var MAX_TEX = 2048, MAX_DEPTH = 1024;
  var imgCache = new Map(), mapCache = new Map();

  function loadImage(url) {
    if (imgCache.has(url)) return imgCache.get(url);
    var p = new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('RELUMA: could not load ' + url + ' (missing file or no CORS header)')); };
      img.src = url;
    });
    imgCache.set(url, p);
    p.catch(function () { imgCache.delete(url); });
    return p;
  }
  function fitCanvas(img, max) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var s = Math.min(1, max / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    var g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, c.width, c.height);
    return { canvas: c, ctx: g, w: c.width, h: c.height };
  }
  function loadMap(url) {
    if (mapCache.has(url)) return mapCache.get(url);
    var p = loadImage(url).then(function (img) {
      var f = fitCanvas(img, MAX_DEPTH);
      var px = f.ctx.getImageData(0, 0, f.w, f.h).data; // throws if the depth map is cross-origin without CORS
      var d = new Float32Array(f.w * f.h);
      for (var i = 0; i < d.length; i++) d[i] = px[i * 4] / 255;
      return { data: buildMap(d, f.w, f.h), w: f.w, h: f.h };
    });
    mapCache.set(url, p);
    p.catch(function () { mapCache.delete(url); });
    return p;
  }

  /* ------------------------------------------------------ shared renderer */
  // One WebGL context for every <reluma-light> on the page: each element owns a
  // plain 2D canvas and receives its frame with drawImage. This keeps product
  // grids with dozens of cards far below the browser's WebGL context limit.
  var engine = null;

  function Engine() {
    var c = document.createElement('canvas');
    c.width = 2; c.height = 2;
    var opts = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'default' };
    var gl = c.getContext('webgl', opts) || c.getContext('experimental-webgl', opts);
    this.canvas = c; this.gl = gl; this.ok = !!gl; this.instances = new Set(); this.raf = 0; this.last = 0;
    if (!gl) return;
    var self = this;
    c.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.ok = false; self.instances.forEach(function (i) { i._contextLost(); }); });
    c.addEventListener('webglcontextrestored', function () { self._init(); self.instances.forEach(function (i) { i._contextRestored(); }); });
    this._init();
  }
  Engine.prototype._init = function () {
    var gl = this.gl;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('RELUMA shader: ' + gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('RELUMA link: ' + gl.getProgramInfoLog(p));
    this.prog = p;
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    var names = ['uPhoto', 'uMap', 'uSize', 'uFit', 'uLightPos', 'uLightColor', 'uLightInt', 'uRadius', 'uSoft', 'uAmbient', 'uSpec', 'uNormalStr', 'uVH', 'uShadow', 'uView', 'uOpacity'];
    for (var i = 0; i < names.length; i++) this.u[names[i]] = gl.getUniformLocation(p, names[i]);
    gl.useProgram(p);
    gl.uniform1i(this.u.uPhoto, 0);
    gl.uniform1i(this.u.uMap, 1);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.SCISSOR_TEST);
    this.ok = true;
  };
  Engine.prototype.texture = function (source, w, h) {
    var gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    if (source instanceof Uint8Array) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  Engine.prototype.add = function (inst) { this.instances.add(inst); this.wake(); };
  Engine.prototype.remove = function (inst) { this.instances.delete(inst); };
  Engine.prototype.wake = function () {
    if (this.raf || !this.ok) return;
    var self = this;
    this.raf = requestAnimationFrame(function (t) { self._frame(t); });
  };
  Engine.prototype._frame = function (now) {
    this.raf = 0;
    var dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    var busy = false, self = this;
    this.instances.forEach(function (inst) { if (inst._tick(dt, now / 1000, self)) busy = true; });
    if (busy) this.wake(); else this.last = 0;
  };
  Engine.prototype.draw = function (inst) {
    var gl = this.gl, c = this.canvas, w = inst._pw, h = inst._ph;
    if (c.width < w || c.height < h) {
      c.width = Math.max(c.width, w); c.height = Math.max(c.height, h);
    }
    gl.viewport(0, 0, w, h);
    gl.scissor(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var u = this.u, s = inst._cur, img = inst._img;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, inst._texPhoto);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, inst._texMap);
    gl.uniform2f(u.uSize, 1, img.h / img.w);
    gl.uniform4f(u.uFit, inst._fit[0], inst._fit[1], inst._fit[2], inst._fit[3]);
    gl.uniform3f(u.uLightPos, inst._light[0], inst._light[1], s.height);
    gl.uniform3f(u.uLightColor, inst._col[0], inst._col[1], inst._col[2]);
    gl.uniform1f(u.uLightInt, s.intensity);
    gl.uniform1f(u.uRadius, s.radius);
    gl.uniform1f(u.uSoft, s.softness);
    gl.uniform1f(u.uAmbient, s.ambient);
    gl.uniform1f(u.uSpec, s.spec);
    gl.uniform1f(u.uNormalStr, s.relief);
    gl.uniform1f(u.uVH, 0.18 * s.relief);
    gl.uniform1f(u.uShadow, 0.78 * Math.min(1, s.relief * 1.2) * s.shadow);
    gl.uniform1f(u.uView, inst._view);
    gl.uniform1f(u.uOpacity, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    var ctx = inst._ctx;
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(c, 0, c.height - h, w, h, 0, 0, w, h);
  };

  function getEngine() {
    if (!engine) {
      try { engine = new Engine(); } catch (e) { console.warn(e); engine = { ok: false, add: function () {}, remove: function () {}, wake: function () {} }; }
    }
    return engine;
  }

  /* ------------------------------------------------------------ element */
  var STYLE = [
    ':host{display:block;position:relative;overflow:hidden;contain:content;aspect-ratio:var(--reluma-ratio,auto);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}',
    '.f{-webkit-user-drag:none}',
    ':host([hidden]){display:none}',
    '.f,canvas{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.f{object-fit:var(--reluma-fit,cover)}',
    'canvas{opacity:0;transition:opacity .9s cubic-bezier(.22,.61,.36,1)}',
    ':host([data-live]) canvas{opacity:1}',
  ].join('');

  var OBSERVED = ['src', 'depth', 'preset', 'intensity', 'radius', 'softness', 'color', 'ambient', 'light-height', 'height', 'spec', 'relief', 'shadow', 'interaction', 'idle', 'fit', 'alt', 'view', 'max-dpr'];

  var io = null, ro = null;
  function observers() {
    if (io) return;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target._setVisible(e.isIntersecting); });
    }, { rootMargin: '200px 0px' });
    ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) { e.target._resize(); });
    });
  }

  var pagePointer = { x: 0, y: 0, active: false, listeners: 0 };
  var TOUCH_EVENTS = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
  var HOLD_MS = 160, SLOP_PX = 10; // a finger held this long without moving this far drives the light
  function onPagePointer(e) { pagePointer.x = e.clientX; pagePointer.y = e.clientY; pagePointer.active = true; if (engine) engine.wake(); }

  class RelumaLight extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    constructor() {
      super();
      var root = this.attachShadow({ mode: 'open' });
      var style = document.createElement('style'); style.textContent = STYLE;
      this._fallback = document.createElement('img'); this._fallback.className = 'f'; this._fallback.alt = '';
      this._fallback.setAttribute('part', 'image');
      this._canvas = document.createElement('canvas'); this._canvas.setAttribute('part', 'canvas'); this._canvas.setAttribute('aria-hidden', 'true');
      root.append(style, this._fallback, this._canvas);
      this._ctx = null;
      this._img = null; this._texPhoto = null; this._texMap = null;
      this._ready = false; this._visible = false; this._dirty = true;
      this._pw = 1; this._ph = 1; this._fit = [1, 1, 0, 0];
      this._target = {}; this._cur = {}; this._colT = [1, 0.95, 0.87]; this._col = [1, 0.95, 0.87];
      this._light = [-0.18, 0.24]; this._ptr = { x: 0, y: 0, inside: false };
      this._view = 0; this._t0 = Math.random() * 10; this._loadId = 0;
      this._onMove = this._onMove.bind(this); this._onLeave = this._onLeave.bind(this);
      this._touch = { id: null, x: 0, y: 0, timer: 0, on: false };
      this._onTouch = this._onTouch.bind(this);
      this._readParams(true);
    }

    connectedCallback() {
      if (!this.hasAttribute('role')) this.setAttribute('role', 'img');
      observers(); io.observe(this); ro.observe(this);
      this.addEventListener('pointermove', this._onMove);
      this.addEventListener('pointerdown', this._onMove);
      this.addEventListener('pointerleave', this._onLeave);
      for (var i = 0; i < TOUCH_EVENTS.length; i++) this.addEventListener(TOUCH_EVENTS[i], this._onTouch, { passive: TOUCH_EVENTS[i] !== 'touchmove' });
      this._bindPage();
      this._load();
    }
    disconnectedCallback() {
      io && io.unobserve(this); ro && ro.unobserve(this);
      this.removeEventListener('pointermove', this._onMove);
      this.removeEventListener('pointerdown', this._onMove);
      this.removeEventListener('pointerleave', this._onLeave);
      for (var i = 0; i < TOUCH_EVENTS.length; i++) this.removeEventListener(TOUCH_EVENTS[i], this._onTouch);
      this._unbindPage();
      if (engine) engine.remove(this);
    }
    attributeChangedCallback(name, oldV, newV) {
      if (oldV === newV) return;
      if (name === 'src' || name === 'depth') { if (this.isConnected) this._load(); return; }
      if (name === 'alt') { this.setAttribute('aria-label', newV || ''); return; }
      if (name === 'interaction') { this._unbindPage(); this._bindPage(); }
      if (name === 'fit') this._resize();
      if (name === 'max-dpr') this._resize();
      this._readParams(false);
      this._wake();
    }

    /* public API */
    get preset() { return this.getAttribute('preset') || 'soft-studio'; }
    set preset(v) { this.setAttribute('preset', v); }
    /** Set several options at once: el.set({ intensity: 2, color: '#ff0' }) */
    set(opts) { for (var k in opts) if (opts[k] != null) this.setAttribute(k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }), String(opts[k])); return this; }
    /** Place the light: x, y in -1…1 over the image (0,0 = centre). */
    setLight(x, y) { this._manual = [x * 0.5, y * 0.5 * (this._img ? this._img.h / this._img.w : 1.25)]; this._wake(); return this; }
    static get presets() { return Object.keys(PRESETS); }
    static get version() { return VERSION; }

    /* params */
    _readParams(snap) {
      var p = PRESETS[this.getAttribute('preset')] || PRESETS['soft-studio'];
      var t = this._target;
      for (var i = 0; i < NUMERIC.length; i++) {
        var k = NUMERIC[i];
        var raw = this.getAttribute(k === 'height' ? 'light-height' : k);
        // "height" alone is ignored unless it is a bare number: builders such as Framer
        // pass the element's own layout height ("100%") under that name
        if (raw == null && k === 'height' && /^\s*\d*\.?\d+\s*$/.test(this.getAttribute('height') || '')) raw = this.getAttribute('height');
        t[k] = num(raw, p[k] != null ? p[k] : DEFAULTS[k]);
      }
      this._colT = hexToRgb(this.getAttribute('color') || p.color, this._colT);
      var view = this.getAttribute('view');
      this._view = view === 'original' ? 1 : view === 'depth' ? 2 : 0;
      this._idle = (this.getAttribute('idle') || 'drift') === 'drift' && !reducedMotion;
      if (snap) { for (var j = 0; j < NUMERIC.length; j++) this._cur[NUMERIC[j]] = t[NUMERIC[j]]; this._col = this._colT.slice(); }
      this._dirty = true;
    }

    _bindPage() {
      if (this.getAttribute('interaction') === 'page' && !this._page) {
        this._page = true;
        if (pagePointer.listeners++ === 0) window.addEventListener('pointermove', onPagePointer, { passive: true });
      }
    }
    _unbindPage() {
      if (this._page) {
        this._page = false;
        if (--pagePointer.listeners === 0) window.removeEventListener('pointermove', onPagePointer);
      }
    }
    _onMove(e) {
      if (e.pointerType === 'touch') return; // fingers: _onTouch
      this._place(e.clientX, e.clientY);
    }
    _place(x, y) {
      var mode = this.getAttribute('interaction');
      if (mode === 'none' || mode === 'page') return false;
      var r = this.getBoundingClientRect();
      this._ptr.x = x - r.left; this._ptr.y = y - r.top; this._ptr.inside = true;
      this._wake();
      return true;
    }
    _onLeave(e) { if (e && e.pointerType === 'touch') return; this._ptr.inside = false; this._wake(); }
    // Touch: hold still for HOLD_MS, then drag to move the light. A quick swipe scrolls the page as
    // usual; once the hold has started its touchmoves are cancelled, so the page stays put.
    _onTouch(e) {
      var t = this._touch, self = this, f = null, i;
      for (i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === t.id) f = e.changedTouches[i];
      if (e.type === 'touchstart') {
        if (t.id !== null || e.touches.length > 1) { this._touchEnd(); return; }
        var mode = this.getAttribute('interaction');
        if (mode === 'none' || mode === 'page') return;
        f = e.changedTouches[0];
        t.id = f.identifier; t.x = f.clientX; t.y = f.clientY;
        t.timer = setTimeout(function () { t.on = true; self._place(t.x, t.y); }, HOLD_MS);
      } else if (!f) {
        return;
      } else if (e.type === 'touchmove') {
        if (t.on) { if (e.cancelable) e.preventDefault(); this._place(f.clientX, f.clientY); }
        else if (Math.abs(f.clientX - t.x) + Math.abs(f.clientY - t.y) > SLOP_PX) this._touchEnd();
      } else {
        this._touchEnd();
      }
    }
    _touchEnd() {
      var t = this._touch;
      clearTimeout(t.timer);
      if (t.on) { this._ptr.inside = false; this._wake(); }
      t.id = null; t.on = false;
    }

    _setVisible(v) { this._visible = v; if (v) this._wake(); }
    _wake() { this._dirty = true; if (engine) engine.wake(); }

    _resize() {
      var w = this.clientWidth, h = this.clientHeight;
      if (!w || !h) return;
      var max = num(this.getAttribute('max-dpr'), 2);
      var dpr = Math.min(window.devicePixelRatio || 1, max);
      var budget = 1.8e6; // pixels per element; plenty for cards, keeps big heroes smooth
      if (w * h * dpr * dpr > budget) dpr = Math.sqrt(budget / (w * h));
      this._pw = Math.max(1, Math.round(w * dpr)); this._ph = Math.max(1, Math.round(h * dpr));
      if (this._canvas.width !== this._pw || this._canvas.height !== this._ph) {
        this._canvas.width = this._pw; this._canvas.height = this._ph;
      }
      var fit = this.getAttribute('fit') === 'contain' ? 'contain' : 'cover';
      this.style.setProperty('--reluma-fit', fit);
      if (this._img) {
        var E = w / h, I = this._img.w / this._img.h, sx = 1, sy = 1;
        if (fit === 'cover') { if (E > I) sy = I / E; else sx = E / I; }
        else { if (E > I) sx = E / I; else sy = I / E; }
        this._fit = [sx, sy, (1 - sx) / 2, (1 - sy) / 2];
      }
      this._wake();
    }

    _load() {
      var src = this.getAttribute('src'), depth = this.getAttribute('depth');
      var id = ++this._loadId, self = this;
      if (src) {
        // same CORS mode as the texture request, so the browser fetches the file once
        var fb = this._fallback;
        fb.crossOrigin = 'anonymous';
        fb.onerror = function () { if (fb.crossOrigin) { fb.removeAttribute('crossorigin'); fb.src = src; } };
        fb.src = src;
      }
      if (this.hasAttribute('alt')) this.setAttribute('aria-label', this.getAttribute('alt'));
      if (!src || !depth) return;
      var eng = getEngine();
      if (!eng.ok) return; // no WebGL: the plain image stays
      Promise.all([loadImage(src), loadMap(depth)]).then(function (res) {
        if (id !== self._loadId) return;
        var img = res[0], map = res[1];
        var nw = img.naturalWidth, nh = img.naturalHeight;
        var source = img;
        if (Math.max(nw, nh) > MAX_TEX) { var f = fitCanvas(img, MAX_TEX); source = f.canvas; }
        var gl = eng.gl;
        if (self._texPhoto) gl.deleteTexture(self._texPhoto);
        if (self._texMap) gl.deleteTexture(self._texMap);
        self._texPhoto = eng.texture(source);
        self._texMap = eng.texture(map.data, map.w, map.h);
        self._img = { w: nw, h: nh };
        self._mapData = map;
        self._imgSource = source;
        self.style.setProperty('--reluma-ratio', nw + ' / ' + nh);
        if (!self._ctx) self._ctx = self._canvas.getContext('2d');
        self._ready = true;
        self._resize();
        eng.add(self);
        self._firstFrame = true;
      }).catch(function (err) {
        console.warn(err && err.message ? err.message : err);
        self.dispatchEvent(new CustomEvent('reluma:error', { detail: err }));
      });
    }

    _contextLost() { this._ready = false; this.removeAttribute('data-live'); }
    _contextRestored() {
      if (!this._mapData) return;
      var eng = engine;
      this._texPhoto = eng.texture(this._imgSource);
      this._texMap = eng.texture(this._mapData.data, this._mapData.w, this._mapData.h);
      this._ready = true; this._wake();
    }

    /** One frame. Returns true while the element still needs frames. */
    _tick(dt, t, eng) {
      if (!this._ready || !this._visible || !this._img) return false;
      var aspect = this._img.h / this._img.w;
      // light target: pointer > manual > idle drift > rest
      var gx, gy, moving = false;
      var mode = this.getAttribute('interaction');
      var px = null, py = null;
      if (mode === 'page' && pagePointer.active) {
        var r = this.getBoundingClientRect();
        px = pagePointer.x - r.left; py = pagePointer.y - r.top;
      } else if (this._ptr.inside && mode !== 'none' && mode !== 'page') {
        px = this._ptr.x; py = this._ptr.y;
      }
      if (px !== null) {
        var w = this.clientWidth || 1, h = this.clientHeight || 1, f = this._fit;
        var u = (px / w) * f[0] + f[2], v = (1 - py / h) * f[1] + f[3];
        gx = Math.max(-1, Math.min(1, u - 0.5)); gy = Math.max(-aspect, Math.min(aspect, (v - 0.5) * aspect));
      } else if (this._manual) {
        gx = this._manual[0]; gy = this._manual[1];
      } else if (this._idle) {
        var tt = t + this._t0;
        gx = 0.28 * Math.cos(tt * 0.45); gy = (0.08 + 0.21 * Math.sin(tt * 0.36)) * aspect;
        moving = true;
      } else {
        gx = -0.18; gy = 0.19 * aspect;
      }
      var lk = 1 - Math.pow(0.002, dt);
      var L = this._light;
      if (this._firstFrame) { L[0] = gx; L[1] = gy; }
      L[0] += (gx - L[0]) * lk; L[1] += (gy - L[1]) * lk;
      if (Math.abs(gx - L[0]) + Math.abs(gy - L[1]) > 1e-4) moving = true;

      var k = 1 - Math.pow(0.0015, dt), c = this._cur, tg = this._target;
      for (var i = 0; i < NUMERIC.length; i++) {
        var key = NUMERIC[i], d = tg[key] - c[key];
        if (Math.abs(d) > 1e-4) { c[key] += d * k; moving = true; } else c[key] = tg[key];
      }
      for (var j = 0; j < 3; j++) {
        var dc = this._colT[j] - this._col[j];
        if (Math.abs(dc) > 1e-4) { this._col[j] += dc * k; moving = true; } else this._col[j] = this._colT[j];
      }

      if (moving || this._dirty) {
        eng.draw(this);
        this._dirty = false;
        if (this._firstFrame) {
          this._firstFrame = false;
          this.setAttribute('data-live', '');
          this.dispatchEvent(new CustomEvent('reluma:ready'));
        }
      }
      return moving;
    }
  }

  customElements.define('reluma-light', RelumaLight);
  window.Reluma = { version: VERSION, presets: PRESETS, Element: RelumaLight };
})();
