import { rugMask, sampleGrid, smoothLab, VOID } from "./grid.js";
import { buildHistogram, distanceTable, choosePalette, mapCells } from "./palette.js";
import { cleanup } from "./cleanup.js";

// Photo pixels → a clean, tuftable label grid. Pure: no DOM, no Firestore,
// so the worker runs it and the tests call it directly.
//
// input:
//   rgba, gw, gh, S     the cropped photo drawn at (gw·S) × (gh·S)
//   shape               "rect" | "circle"
//   candidates          [{ lab: [L, a, b] }], the allowed yarns, in order
//   maxColors, mode     mode "auto": the best maxColors of the candidates;
//                       mode "exact": all of them (caller keeps it ≤ maxColors)
//   minDetailCells      minimum detail size, in cells
// → { labels, chosen }
//   labels: Uint8Array, one per cell: index into `chosen`, or VOID
//   chosen: candidate indices actually used, in candidate order
export function runPipeline({ rgba, gw, gh, S, shape, candidates, maxColors, mode, minDetailCells }) {
  const mask = rugMask(gw, gh, shape);
  const lab = smoothLab(sampleGrid(rgba, gw, gh, S), mask, gw, gh);
  const K = candidates.length;
  const candLabs = candidates.map((c) => c.lab);
  const { bins, counts, cellBin } = buildHistogram(lab, mask);
  const table = distanceTable(bins, candLabs);
  const picked = mode === "exact" ? [...Array(K).keys()] : choosePalette(table, counts, K, Math.min(maxColors, K));

  const palLab = new Float32Array(picked.length * 3);
  picked.forEach((k, i) => palLab.set(candLabs[k], i * 3));
  let labels = mapCells(cellBin, mask, table, K, picked);
  labels = cleanup(labels, gw, gh, lab, palLab, minDetailCells);

  // Drop yarns the cleanup squeezed out entirely, and renumber.
  const used = new Uint8Array(picked.length);
  for (const v of labels) if (v !== VOID) used[v] = 1;
  const remap = new Uint8Array(picked.length);
  const chosen = [];
  picked.forEach((k, i) => {
    if (used[i]) {
      remap[i] = chosen.length;
      chosen.push(k);
    }
  });
  for (let i = 0; i < labels.length; i++) if (labels[i] !== VOID) labels[i] = remap[labels[i]];
  return { labels, chosen };
}
