// Photo → cell grid at real-world scale.
//
// The main thread draws the cropped photo at (gw·S) × (gh·S) pixels, S
// pixels per cell side. Here each S×S block is averaged in linear light
// (so mixed light and dark pixels don't come out too dark) and converted to
// CIELAB. From then on the photo's own resolution no longer matters.

export const VOID = 255; // a cell outside a round rug

const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LIN[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

// Linear sRGB (0–1) → Lab, D65. Same constants as color.js.
export function linearToLab(r, g, b) {
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// Cells inside the rug: everything for a rectangle; for a circle, cells
// whose centre is inside the inscribed ellipse (a circle when w = h).
export function rugMask(gw, gh, shape) {
  const mask = new Uint8Array(gw * gh).fill(1);
  if (shape !== "circle") return mask;
  for (let y = 0; y < gh; y++) {
    const dy = (y + 0.5) / gh - 0.5;
    for (let x = 0; x < gw; x++) {
      const dx = (x + 0.5) / gw - 0.5;
      if (dx * dx + dy * dy > 0.25) mask[y * gw + x] = 0;
    }
  }
  return mask;
}

// rgba: Uint8ClampedArray, (gw·S) × (gh·S) pixels. → Float32Array of Lab, 3 per cell.
export function sampleGrid(rgba, gw, gh, S) {
  const lab = new Float32Array(gw * gh * 3);
  const rowStride = gw * S * 4;
  const n = S * S;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < S; sy++) {
        let p = (y * S + sy) * rowStride + x * S * 4;
        for (let sx = 0; sx < S; sx++, p += 4) {
          r += LIN[rgba[p]];
          g += LIN[rgba[p + 1]];
          b += LIN[rgba[p + 2]];
        }
      }
      const [L, A, B] = linearToLab(r / n, g / n, b / n);
      const o = (y * gw + x) * 3;
      lab[o] = L;
      lab[o + 1] = A;
      lab[o + 2] = B;
    }
  }
  return lab;
}

// Edge-preserving smoothing (a bilateral filter in Lab): photo grain and
// fabric texture flatten out, but a real edge between two colours stays put.
// This is what keeps speckle from ever reaching the palette step.
export function smoothLab(lab, mask, gw, gh, { radius = 2, sigmaSpace = 1.5, sigmaColor = 9, passes = 1 } = {}) {
  const offs = [];
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) offs.push([dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * sigmaSpace ** 2))]);
  const c2 = 2 * sigmaColor ** 2;
  let src = lab;
  for (let pass = 0; pass < passes; pass++) {
    const out = new Float32Array(src.length);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        const o = i * 3;
        if (!mask[i]) {
          out[o] = src[o]; out[o + 1] = src[o + 1]; out[o + 2] = src[o + 2];
          continue;
        }
        const L0 = src[o], a0 = src[o + 1], b0 = src[o + 2];
        let wsum = 0, L = 0, A = 0, B = 0;
        for (const [dx, dy, ws] of offs) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const j = ny * gw + nx;
          if (!mask[j]) continue;
          const q = j * 3;
          const dL = src[q] - L0, da = src[q + 1] - a0, db = src[q + 2] - b0;
          const w = ws * Math.exp(-(dL * dL + da * da + db * db) / c2);
          wsum += w;
          L += w * src[q]; A += w * src[q + 1]; B += w * src[q + 2];
        }
        out[o] = L / wsum; out[o + 1] = A / wsum; out[o + 2] = B / wsum;
      }
    }
    src = out;
  }
  return src;
}
