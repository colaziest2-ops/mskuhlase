import { hexRGB, pack, type RGB } from "./math";

// Light keys: 0 = lamp on (day), 1 = dimming (dusk, warm), 2 = moonlight LEDs, 3 = dark.
// Every material of the pixel world is one colour per key: [day, dusk, moon, dark].
export const MATS = {
  AIR:     ["#cfe8e1", "#efcca6", "#25344f", "#04070d"],
  AIR_HI:  ["#f4fff9", "#ffe3bb", "#3b5077", "#060a12"],
  SURF:    ["#f0fdf8", "#ffe2b4", "#8eaedd", "#1b2c45"],
  SURF_DK: ["#a8e1d5", "#e8b98b", "#5b7bb0", "#111d31"],
  W0:      ["#86d5c5", "#e2a775", "#3f6396", "#0c1726"],
  W1:      ["#5cbbb2", "#b88271", "#304f82", "#0a1320"],
  W2:      ["#3b9ca1", "#7c6676", "#243f6e", "#08101b"],
  W3:      ["#287a88", "#4b4c69", "#1b315c", "#070d17"],
  W4:      ["#1d6175", "#33395a", "#15274d", "#060a13"],
  RAY:     ["#b4eee1", "#f7c690", "#5a7fb6", "#0c1726"],
  ETCH:    ["#62bdb8", "#a07b7e", "#34548a", "#13213a"],
  SUNB:    ["#ffe39a", "#ffd08a", "#c9d6f5", "#3a4a66"],
  SUNB_DK: ["#f2b24e", "#e89a5a", "#8ea6d8", "#26344e"],
  SAND0:   ["#e2c58e", "#c4946c", "#45567d", "#0f1726"],
  SAND1:   ["#c3a26a", "#9a6c55", "#35446a", "#0b111d"],
  SAND2:   ["#f2deac", "#dcb084", "#566a9a", "#131d2e"],
  CAUS:    ["#fff7da", "#ffd9a0", "#7891c6", "#131d2e"],
  ROCK0:   ["#7b8a8c", "#6e6068", "#36456c", "#0b111e"],
  ROCK1:   ["#55636a", "#4a4050", "#28345a", "#080d18"],
  ROCK2:   ["#a6b5b2", "#8e7c7e", "#4a5c8e", "#111a2c"],
  MOSS:    ["#5aa64a", "#6d7d40", "#2a5866", "#0a181c"],
  G0:      ["#2f7a3c", "#455a30", "#1b3f4c", "#071316"],
  G1:      ["#46a24c", "#5f7a3c", "#245262", "#0a1a1e"],
  G2:      ["#7bcd5d", "#8d9850", "#2f6874", "#0d2227"],
  V0:      ["#3d8a5a", "#4d6040", "#1f4658", "#08161a"],
  V1:      ["#62b070", "#6c8050", "#2a5a6c", "#0c1e24"],
  R0:      ["#9e3a2e", "#7e3430", "#3a2a56", "#0e0a16"],
  R1:      ["#d05a3c", "#b04e3c", "#4a3a68", "#140e1e"],
  R2:      ["#f08a56", "#d0704e", "#5a4a7c", "#1a1428"],
  BRASS0:  ["#7e5222", "#74482a", "#3b3858", "#0c0b15"],
  BRASS1:  ["#c4882e", "#b07436", "#575276", "#14121e"],
  BRASS2:  ["#f2c463", "#e2a050", "#77709a", "#1c1a2a"],
  PORT:    ["#27414d", "#2e3242", "#141e36", "#0a0f1a"],
  FO:      ["#f0862c", "#e0783a", "#7a7598", "#1a1a2a"],
  FO2:     ["#c0541e", "#b0522c", "#5e5a7e", "#141422"],
  FW:      ["#fff4e0", "#f6d8bc", "#b7c4e0", "#262c40"],
  FS:      ["#46e4ff", "#64cce2", "#7aa6d6", "#1a2a42"],
  FR:      ["#e83c48", "#c8403e", "#6a5a86", "#18142a"],
  FE:      ["#14141e", "#14141e", "#10101a", "#05060a"],
  FY:      ["#f6dc6a", "#e6b860", "#9aa0c0", "#1e2232"],
  FK:      ["#3a3a4a", "#3a3240", "#2a2c48", "#0a0c14"],
  SN0:     ["#a8622a", "#9a5a30", "#4a4066", "#120f1c"],
  SN1:     ["#e3a352", "#c88a4a", "#6a5c88", "#1a1628"],
  SNB:     ["#d8c8a8", "#c8b090", "#7a84a8", "#1c2030"],
  SNOW:    ["#d9f4ee", "#f2d2b0", "#6f8cc0", "#14223a"],
  OBUB:    ["#f2fffc", "#fff0d8", "#a8c4ee", "#2a3c58"],
  OBUB_DK: ["#9fd8cc", "#d8b090", "#5a78aa", "#16243a"],
} as const;

export type Mat = keyof typeof MATS;
/** Material name → index into each key's colour table. */
export const M = {} as Record<Mat, number>;
const tables: number[][] = [[], [], [], []];
(Object.entries(MATS) as [Mat, readonly string[]][]).forEach(([name, cols], i) => {
  M[name] = i;
  cols.forEach((h, k) => { tables[k][i] = pack(hexRGB(h)); });
});
/** One packed colour table per light key. */
export const KC = tables.map((t) => Uint32Array.from(t));

/** Plankton: four glow levels, not lit by the lamp (written raw). */
export const PLK = ["#123544", "#1f8fa8", "#5ce8f6", "#d2fcff"].map((h) => pack(hexRGB(h)));
/** The lamp inside the diving helmet: its glass, and the bright spot near the top left. */
export const LAMP_IN = ["#ffc66a", "#fff0c4"].map((h) => pack(hexRGB(h)));

export const rgbSet = (arr: string[]): RGB[] => arr.map((h) => hexRGB(h).map((v) => v / 255) as RGB);

// From the mockups: the room (page) and its text colour per key: sand, terracotta, navy, black. Every room is light.
export const PAGE_BG = rgbSet(["#f7f5f3", "#f4f0e9", "#eff4fa", "#e4e7f2"]);
export const PAGE_FG = rgbSet(["#2b2412", "#2a160b", "#1b2a4a", "#0b1222"]);
// From the mockups: the lens's coloured shadow on the track, and the colour of the light strip on its glass ring.
export const LENS_SHADOW = rgbSet(["#1d5e71", "#2e3451", "#16274c", "#000000"]);
export const LENS_RIM = rgbSet(["#ffffff", "#fcedde", "#80a4db", "#8c9dc2"]);

export const css = (c: RGB) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;
