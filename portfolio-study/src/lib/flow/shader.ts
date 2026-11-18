/**
 * One fragment shader draws the whole bar: the dark glass, the field you see
 * through it, the bead (a lens of liquid glass when surfaced, a coloured glow
 * with a travelling wave over it when sunk), its light, refraction, the rim,
 * the landing ripple, the sweep of light, and the soft shadow under the bar.
 *
 * Coordinates are stage pixels (380 x 84), y down, so the numbers here match
 * lib/flow/timeline.ts exactly.
 */

export const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uRes;      // canvas size, device px
uniform float uScale;   // device px per stage px
uniform vec4 uBar;      // x0, y0, x1, y1
uniform float uBarR;    // corner radius
uniform vec4 uBead;     // centre x, centre y, half-width, half-height
uniform float uDepth;   // 0 surfaced, 1 sunk
uniform float uWave;    // travelling-wave strength
uniform float uTime;    // seconds
uniform vec3 uColA;     // light colour, from
uniform vec3 uColB;     // light colour, to
uniform float uMix;
uniform vec4 uRipple;   // x, y, radius, strength
uniform vec2 uSweep;    // x, strength

out vec4 outColor;

float sdRound(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float beadSd(vec2 q) {
  return sdRound(q, uBead.zw, min(uBead.z, uBead.w));
}

// What sits behind the glass: a dim vertical gradient, a fine dot lattice (so
// refraction has something to bend), and a pool of the bead's coloured light.
vec3 field(vec2 p, vec3 light) {
  float t = clamp((p.y - uBar.y) / (uBar.w - uBar.y), 0.0, 1.0);
  vec3 c = mix(vec3(0.118, 0.11, 0.102), vec3(0.042, 0.039, 0.037), t);

  vec2 g = fract(p / 7.0) - 0.5;
  c += vec3(smoothstep(0.17, 0.0, length(g)) * 0.045);

  // the pool follows the bead's stretch only partly, so a fast hop doesn't flood the bar
  float sx = mix(1.0, 30.0 / uBead.z, 0.6);
  vec2 d = (p - uBead.xy) * vec2(sx, 1.55);
  float s = 34.0 + 12.0 * uDepth;
  float glow = exp(-dot(d, d) / (2.0 * s * s));
  c += light * glow * (0.3 + 0.1 * uDepth);
  return c;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  float aa = 1.0 / uScale;

  vec2 bc = (uBar.xy + uBar.zw) * 0.5;
  vec2 bh = (uBar.zw - uBar.xy) * 0.5;
  float dBar = sdRound(p - bc, bh, uBarR);

  // soft shadow under the bar
  float dSh = sdRound(p - bc - vec2(0.0, 5.0), bh, uBarR);
  float shadow = (1.0 - smoothstep(-2.0, 12.0, dSh)) * 0.34;

  vec3 light = mix(uColA, uColB, uMix);
  vec2 q = p - uBead.xy;
  float dB = beadSd(q);
  float R = min(uBead.z, uBead.w);
  float surf = 1.0 - uDepth;

  // ---- refraction ---------------------------------------------------------
  vec2 grad = vec2(beadSd(q + vec2(0.5, 0.0)) - beadSd(q - vec2(0.5, 0.0)),
                   beadSd(q + vec2(0.0, 0.5)) - beadSd(q - vec2(0.0, 0.5)));
  grad = grad / max(length(grad), 1e-4);
  float e = clamp(-dB / R, 0.0, 1.0);          // 0 at the rim, 1 in the middle
  float dome = sqrt(1.0 - (1.0 - e) * (1.0 - e));
  float inBead = 1.0 - smoothstep(-aa, aa, dB);

  vec2 sp = p;
  // the lens magnifies and bends what's behind it toward its rim
  vec2 lensed = uBead.xy + q * 0.8 - grad * (1.0 - dome) * R * 0.55;
  sp = mix(sp, lensed, inBead * surf);

  // the landing ripple pushes the field outward along its ring
  vec2 rd = p - uRipple.xy;
  float rl = length(rd);
  float ringD = rl - uRipple.z;
  float ring = exp(-ringD * ringD / 22.0) * uRipple.w;
  sp += (rd / max(rl, 1e-3)) * ring * 3.2;

  // the travelling wave over a sunk bead
  float dx = p.x - uBead.x;
  float envW = 20.0 + uBead.z * 0.75;
  float env = exp(-dx * dx / (2.0 * envW * envW));
  float phase = dx * 0.17 - uTime * 10.0;
  sp.y += uWave * env * sin(phase) * 2.2;

  vec3 col = field(sp, light);

  // ---- the bead under the glass (sunk): a stretched glow -------------------
  vec2 qn = q / max(uBead.zw, vec2(1.0));
  float blob = exp(-dot(qn, qn) * 1.6);
  col += light * blob * uDepth * 0.34;

  // the crest of the wave, lit by the bead below it
  float crestY = uBead.y - uBead.w * 0.9 - 3.0 + sin(phase) * 3.2 * uWave;
  float crest = exp(-pow(p.y - crestY, 2.0) / 2.0) * env * uWave;
  col += mix(vec3(1.0), light, 0.6) * crest * 0.38;

  // ---- the bead on the surface: a lens of liquid glass ----------------------
  float lens = inBead * surf;
  col = mix(col, col * 0.86 + light * 0.16, lens);                    // tint
  float rim = pow(1.0 - e, 3.5) * lens;
  col += mix(vec3(1.0), light, 0.35) * rim * 0.75;                    // fresnel rim
  vec2 hs = q - vec2(-0.32 * uBead.z, -0.5 * uBead.w);
  col += vec3(1.0) * exp(-dot(hs, hs) / (R * R * 0.07)) * 0.42 * lens; // specular
  float caus = exp(-pow(q.y - uBead.w * 0.55, 2.0) / (R * R * 0.025)) * exp(-q.x * q.x / (uBead.z * uBead.z * 0.5));
  col += light * caus * 0.32 * lens;                                    // caustic at its foot
  float outline = (1.0 - smoothstep(0.0, 1.4 * aa + 0.6, abs(dB))) * surf;
  col = mix(col, col * 0.55 + light * 0.25, outline * 0.6);

  // ---- the glass itself ----------------------------------------------------
  float edge = clamp(-dBar, 0.0, 30.0);
  float top = clamp((bc.y - p.y) / bh.y, 0.0, 1.0);
  float barRim = (1.0 - smoothstep(0.0, 1.8, edge));
  col += vec3(1.0) * barRim * (0.1 + 0.32 * top);                       // lit upper rim
  col += vec3(1.0) * exp(-pow(p.y - (uBar.y + 2.5), 2.0) / 1.6) * 0.07;  // the glass's top surface
  col *=1.0 - 0.18 * smoothstep(bc.y, uBar.w, p.y) * (1.0 - smoothstep(0.0, 10.0, edge)); // inner shade at the foot

  // ripple and sweep highlights
  col += mix(vec3(1.0), light, 0.5) * ring * 0.28;
  float band = exp(-pow(p.x - uSweep.x + (p.y - bc.y) * 0.55, 2.0) / (2.0 * 15.0 * 15.0));
  col += vec3(1.0) * band * uSweep.y * 0.16;

  // premultiplied: glass at 0.9 over the blurred page, black shadow outside it
  float cover = 1.0 - smoothstep(-aa, aa, dBar);
  outColor = vec4(col * 0.9 * cover, mix(shadow, 0.9, cover));
}
`;
