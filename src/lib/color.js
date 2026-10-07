// Colors are stored as "#RRGGBB" (uppercase). Anything perceptual happens in
// CIELAB with CIEDE2000 distance, so "close" means close to the eye, not
// close in RGB (where a dark navy and a black are "far" and two oranges that
// look different are "near").

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// "#abc", "abc", "#aabbcc" → "#AABBCC"; anything else → null.
export function normHex(v) {
  if (typeof v !== "string") return null;
  let h = v.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split("").map((c) => c + c).join("");
  return /^[0-9a-f]{6}$/i.test(h) ? "#" + h.toUpperCase() : null;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

// sRGB channel (0–255) ↔ linear light (0–1).
const toLinear = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

// "#RRGGBB" → [L, a, b] (D65 white).
export function hexToLab(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// CIEDE2000 color difference between two Lab colors.
// Roughly: < 1 invisible, ~2 barely, ~5 clearly different up close, 10+ another color.
export function deltaE(lab1, lab2) {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const rad = Math.PI / 180;
  const pow7 = (v) => v ** 7;
  const K = pow7(25);

  const Cbar = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(pow7(Cbar) / (pow7(Cbar) + K)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (b, ap) => {
    if (b === 0 && ap === 0) return 0;
    const h = Math.atan2(b, ap) / rad;
    return h < 0 ? h + 360 : h;
  };
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);

  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbp += hbp < 360 ? 360 : -360;
    hbp /= 2;
  }

  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * rad) +
    0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) -
    0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(pow7(Cbp) / (pow7(Cbp) + K));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;

  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh)
  );
}

export const colorDistance = (hexA, hexB) => deltaE(hexToLab(hexA), hexToLab(hexB));

// How a distance reads to a person standing in a shop.
export const MATCH_BANDS = [
  { max: 3, key: "twin", label: "Twin" },
  { max: 6, key: "close", label: "Close" },
  { max: 12, key: "family", label: "Family" },
  { max: Infinity, key: "far", label: "Far" },
];
export const matchBand = (d) => MATCH_BANDS.find((b) => d < b.max);

// Average a square patch around (x, y) on a canvas, in linear light: a plain
// sRGB average comes out too dark where light and shadow strands mix.
// Fully transparent pixels are skipped. → "#RRGGBB" or null.
export function samplePatch(ctx, x, y, radius) {
  const { width: w, height: h } = ctx.canvas;
  const cx = Math.round(x);
  const cy = Math.round(y);
  const x0 = clamp(cx - radius, 0, w - 1);
  const y0 = clamp(cy - radius, 0, h - 1);
  const x1 = clamp(cx + radius, 0, w - 1);
  const y1 = clamp(cy + radius, 0, h - 1);
  const data = ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    r += toLinear(data[i]);
    g += toLinear(data[i + 1]);
    b += toLinear(data[i + 2]);
    n++;
  }
  if (!n) return null;
  return rgbToHex(fromLinear(r / n), fromLinear(g / n), fromLinear(b / n));
}

// Text color that stays readable on top of a swatch.
export const inkOn = (hex) => (hexToLab(hex)[0] > 62 ? "#1a0f0a" : "#f6ede5");

// ── Color families ─────────────────────────────────────────────────────
// Loose buckets for browsing ("all the greenish ones"). Hue comes from HSV,
// because that's where people's color names line up (blue sits at 240, not
// at Lab's skewed ~300). Lightness and chroma come from Lab, because that's
// what the eye sees. Ranges overlap on purpose: teal is greenish *and*
// blueish, marigold is yellowish *and* orangeish, so it shows up in both.
export const FAMILIES = [
  { key: "red", label: "Reds", dot: "#C8312F" },
  { key: "orange", label: "Oranges", dot: "#E8742A" },
  { key: "yellow", label: "Yellows", dot: "#F2C14E" },
  { key: "green", label: "Greens", dot: "#5E8C3A" },
  { key: "blue", label: "Blues", dot: "#3366B8" },
  { key: "purple", label: "Purples", dot: "#7A4FB0" },
  { key: "pink", label: "Pinks", dot: "#E06A9A" },
  { key: "brown", label: "Browns", dot: "#7B4A2A" },
  { key: "neutral", label: "Neutrals", dot: "#B8B0A6" },
];

// HSV hue in degrees (0–360), or null for pure greys.
export function hueOf(hex) {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return null;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

const inHue = (h, from, to) => (from <= to ? h >= from && h < to : h >= from || h < to);

// "#RRGGBB" → the family keys it belongs to (usually one, sometimes two).
export function familiesOf(hex) {
  const [L, a, b] = hexToLab(hex);
  const C = Math.hypot(a, b);
  const h = hueOf(hex);
  const out = [];
  if (C < 14) out.push("neutral");
  if (C < 10 || h == null) return out;
  if (inHue(h, 340, 18) && L <= 75) out.push("red");
  if (inHue(h, 12, 45)) out.push("orange");
  if (inHue(h, 40, 72)) out.push("yellow");
  if (inHue(h, 56, 182)) out.push("green");
  if (inHue(h, 168, 262)) out.push("blue");
  if (inHue(h, 255, 310)) out.push("purple");
  if (inHue(h, 290, 350) || (inHue(h, 340, 18) && L > 68)) out.push("pink");
  if (inHue(h, 8, 60) && L < 48) out.push("brown");
  return out;
}

// Rainbow order for sorting: reds → oranges → … → pinks, then neutrals
// from light to dark. Returns a number to sort ascending.
export function rainbowKey(hex) {
  const [L, a, b] = hexToLab(hex);
  const h = hueOf(hex);
  if (h == null || Math.hypot(a, b) < 10) return 1000 + (100 - L);
  return ((h + 20) % 360) + (100 - L) / 1000;
}
