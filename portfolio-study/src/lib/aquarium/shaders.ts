// The glass: one full-screen quad. The fragment shader draws the capsule track (the world seen through glass that
// bends it only near the rim), the lens (the big bubble: magnifies the world, wobbles, a light strip on its ring) and
// the lens's coloured shadow. The world and its glow arrive as two 144 × 76 textures every frame.

export const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

export const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uWorld;
uniform sampler2D uGlow;
uniform vec2 uRes;
uniform vec2 uO;
uniform vec2 uWS;
uniform float uK;
uniform vec3 uBub;
uniform vec4 uWob;
uniform float uL;
uniform float uArc;
uniform vec3 uArcCol;
uniform vec3 uShadowCol;
uniform vec3 uShadow; // strength, softness (px), drop (px)
uniform float uDpr;
out vec4 outColor;

const float PI = 3.14159265;
const float POWER = 1.5;          // magnification at the lens centre
const float RING = 410.0 / 390.0; // the lens's glass ring, outside its 390 face (from the mockup)

// pixels stay sharp at any scale
vec3 world(vec2 w, float s){
  vec2 p = w - 0.5;
  vec2 i = floor(p);
  vec2 f = clamp((p - i - 0.5) * s + 0.5, 0.0, 1.0);
  return texture(uWorld, (i + f + 0.5) / uWS).rgb;
}
vec3 scene(vec2 p, float s){
  vec2 w = p / uK;
  return world(w, s) + texture(uGlow, w / uWS).rgb * 1.25;
}

void main(){
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = q - uO;
  float PW = uWS.x * uK, PH = uWS.y * uK, R = PH * 0.5;

  // ---- the track: a glass capsule. Sharp pixels; the glass bends them only near its edge
  vec2 seg = vec2(clamp(p.x, R, PW - R), R);
  vec2 off = p - seg;
  float ld = length(off);
  float e = R - ld;
  vec2 n = ld > 1e-3 ? off / ld : vec2(0.0, -1.0);
  vec4 acc = vec4(0.0);
  float cov = clamp(e + 0.5, 0.0, 1.0);
  if (cov > 0.0) {
    float band = PH * 0.06;
    float t = clamp(1.0 - e / band, 0.0, 1.0);
    vec3 col;
    if (t > 0.0) {
      vec2 sp = p - n * band * 0.45 * t * t * t;
      float ca = PH * 0.0012 * t * t;
      float sh = uK * mix(1.0, 0.5, t);
      col.r = scene(sp - n * ca, sh).r;
      col.g = scene(sp, sh).g;
      col.b = scene(sp + n * ca, sh).b;
    } else {
      col = scene(p, uK);
    }
    float up = clamp(-n.y, 0.0, 1.0), dn = clamp(n.y, 0.0, 1.0);
    col += vec3(1.0) * pow(t, 3.0) * (0.05 + 0.18 * up) * mix(0.35, 1.0, uL);
    col *= 1.0 - 0.1 * t * t * dn;
    // 2px hairline, white at 10%
    col = mix(col, vec3(1.0), 0.1 * (1.0 - smoothstep(2.0 * uDpr - 0.5, 2.0 * uDpr + 0.5, e)));

    // the lens's coloured shadow on the track: the lens's own shape (stretched when it is), dropped a little,
    // close and soft, fading out near the capsule's rim
    vec2 sb = p - (uBub.xy + vec2(0.0, uShadow.z));
    float sa = atan(sb.y, sb.x);
    float sr = uBub.z * (1.0 + uWob.x * cos(2.0 * sa) + uWob.y * sin(2.0 * sa) + uWob.z * cos(3.0 * sa - uWob.w));
    float gap = length(sb) - sr;
    float shade = uShadow.x * exp(-max(gap, 0.0) / uShadow.y) * smoothstep(0.0, PH * 0.06, e);
    col = mix(col, uShadowCol, clamp(shade, 0.0, 1.0));
    acc = vec4(col * cov, cov);
  }

  // ---- the lens
  vec2 bd = p - uBub.xy;
  float dist = length(bd);
  float ang = atan(bd.y, bd.x);
  float r = uBub.z * (1.0 + uWob.x * cos(2.0 * ang) + uWob.y * sin(2.0 * ang) + uWob.z * cos(3.0 * ang - uWob.w));
  float rho = dist / r;
  vec2 dir = dist > 1e-3 ? bd / dist : vec2(0.0, -1.0);
  float aa = 1.2 / r;
  // where the light strip is on the rim: it rolls from the top (day) round to the bottom (night)
  float da = abs(mod(ang - uArc + PI, 2.0 * PI) - PI);
  float arcM = 1.0 - smoothstep(0.25, 1.35, da);

  if (rho < 1.0 + aa) {
    // the face: magnified in the middle, squeezed towards the rim
    float rr = min(rho, 1.0);
    float ca = 0.008 * smoothstep(0.6, 1.0, rr);
    float rsG = 1.0 - pow(1.0 - rr, 1.0 / POWER);
    float rsR = 1.0 - pow(1.0 - min(rr * (1.0 - ca), 1.0), 1.0 / POWER);
    float rsB = 1.0 - pow(1.0 - min(rr * (1.0 + ca), 1.0), 1.0 / POWER);
    float mag = POWER * pow(max(1.0 - rsG, 1e-3), POWER - 1.0);
    float s = uK * clamp(mag, 0.25, POWER);
    vec3 lens;
    lens.r = scene(uBub.xy + dir * rsR * r, s).r;
    lens.g = scene(uBub.xy + dir * rsG * r, s).g;
    lens.b = scene(uBub.xy + dir * rsB * r, s).b;
    // glass: a light inner shadow along the edge, and a fine light outline (visible in every state, needed at night)
    float px = (1.0 - rr) * r;                       // distance in from the edge, device px
    float inner = exp(-px / (7.0 * uDpr));
    lens = mix(lens, vec3(0.86, 0.9, 1.0), inner * mix(0.12, 0.08, uL));
    float outline = exp(-pow((rho - 1.0) * r / (0.75 * uDpr), 2.0));
    lens = mix(lens, vec3(0.92, 0.95, 1.0), outline * mix(0.25, 0.18, uL));
    float a = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, rho);
    acc = mix(acc, vec4(lens, 1.0), a);
  }

  // the light strip only: a soft band just outside the face, with a brighter core, no outline elsewhere
  if (arcM > 0.0 && rho > 0.9 && rho < RING + 0.03) {
    float u = (rho - 1.0) / (RING - 1.0);
    float band = exp(-pow((u - 0.35) / 0.55, 2.0));
    float core = exp(-pow((u - 0.25) / 0.2, 2.0));
    float k = clamp(arcM * (band * 0.55 + core * 0.6), 0.0, 1.0);
    acc.rgb = mix(acc.rgb, uArcCol * max(acc.a, 0.0), k);
  }

  float nz = fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  acc.rgb += nz / 255.0 * acc.a;
  outColor = vec4(clamp(acc.rgb, 0.0, 1.0), clamp(acc.a, 0.0, 1.0));
}`;
