import { deltaE } from "../color.js";
import { VOID } from "./grid.js";

// Choosing yarns and mapping cells to them. Distances are CIEDE2000, the
// same as the Stash Ledger's colour search. No dithering anywhere: every
// cell simply takes its nearest yarn, so areas come out solid.

// Group cells into small Lab bins (2 L × 3 a × 3 b) so the expensive
// distance work runs per bin, not per cell. A 30k-cell rug is usually a
// few thousand bins.
export function buildHistogram(lab, mask) {
  const n = mask.length;
  const cellBin = new Int32Array(n).fill(-1);
  const index = new Map();
  const sums = [];
  const counts = [];
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue;
    const o = i * 3;
    const key = Math.round(lab[o] / 2) * 10201 + (Math.round(lab[o + 1] / 3) + 50) * 101 + (Math.round(lab[o + 2] / 3) + 50);
    let b = index.get(key);
    if (b === undefined) {
      b = counts.length;
      index.set(key, b);
      counts.push(0);
      sums.push(0, 0, 0);
    }
    cellBin[i] = b;
    counts[b]++;
    sums[b * 3] += lab[o];
    sums[b * 3 + 1] += lab[o + 1];
    sums[b * 3 + 2] += lab[o + 2];
  }
  const bins = new Float32Array(sums.length);
  for (let b = 0; b < counts.length; b++) {
    bins[b * 3] = sums[b * 3] / counts[b];
    bins[b * 3 + 1] = sums[b * 3 + 1] / counts[b];
    bins[b * 3 + 2] = sums[b * 3 + 2] / counts[b];
  }
  return { bins, counts: Uint32Array.from(counts), cellBin };
}

// table[b·K + k] = CIEDE2000 from bin b to candidate yarn k.
export function distanceTable(bins, candLabs) {
  const nb = bins.length / 3;
  const K = candLabs.length;
  const t = new Float32Array(nb * K);
  for (let b = 0; b < nb; b++) {
    const lab = [bins[b * 3], bins[b * 3 + 1], bins[b * 3 + 2]];
    for (let k = 0; k < K; k++) t[b * K + k] = deltaE(lab, candLabs[k]);
  }
  return t;
}

// Total error of using `set` (candidate indices) for every cell.
function cost(table, counts, K, set) {
  let total = 0;
  for (let b = 0; b < counts.length; b++) {
    let best = Infinity;
    for (const k of set) {
      const d = table[b * K + k];
      if (d < best) best = d;
    }
    total += best * counts[b];
  }
  return total;
}

// The best `n` of K candidates: add whichever yarn cuts the total error most,
// then try swapping each pick for each unpicked yarn until nothing improves.
// Ties go to the earlier candidate, so the same input always picks the same
// yarns. → candidate indices in candidate order.
export function choosePalette(table, counts, K, n) {
  if (n >= K) return [...Array(K).keys()];
  const picked = [];
  let current = Infinity;
  while (picked.length < n) {
    let bestK = -1;
    let bestCost = Infinity;
    for (let k = 0; k < K; k++) {
      if (picked.includes(k)) continue;
      const c = cost(table, counts, K, [...picked, k]);
      if (c < bestCost - 1e-9) {
        bestCost = c;
        bestK = k;
      }
    }
    picked.push(bestK);
    current = bestCost;
  }
  for (let round = 0; round < 6; round++) {
    let improved = false;
    for (let i = 0; i < picked.length; i++) {
      for (let k = 0; k < K; k++) {
        if (picked.includes(k)) continue;
        const trial = picked.slice();
        trial[i] = k;
        const c = cost(table, counts, K, trial);
        if (c < current - 1e-6) {
          picked[i] = k;
          current = c;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return picked.sort((a, b) => a - b);
}

// Every cell → index into `chosen` (its nearest yarn), VOID outside the rug.
export function mapCells(cellBin, mask, table, K, chosen) {
  const nb = table.length / K;
  const binLabel = new Uint8Array(nb);
  for (let b = 0; b < nb; b++) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < chosen.length; i++) {
      const d = table[b * K + chosen[i]];
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    binLabel[b] = best;
  }
  const labels = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) labels[i] = mask[i] ? binLabel[cellBin[i]] : VOID;
  return labels;
}
