import { encodeGrid, decodeGrid, gridHash } from "./codec.js";

// Locking freezes a pattern: the final cell grid (run-length encoded) and
// the legend go into the project doc. A locked project is drawn only from
// that grid, never regenerated, so neither an algorithm update nor a
// different browser's floating point can change it.
//
// locked: {
//   v: 1, at (ms), w, h (cells), cellMm, shape, wCm, hCm,
//   legend: [{ itemId, name, hex }],   number n = index + 1
//   cells: run-length text (codec.js), hash: FNV-1a of the grid
// }

export function lockedFromResult(result) {
  return {
    v: 1,
    at: Date.now(),
    w: result.w,
    h: result.h,
    cellMm: result.cellMm,
    shape: result.shape,
    wCm: result.wCm,
    hCm: result.hCm,
    legend: result.legend.map(({ itemId, name, hex }) => ({ itemId, name, hex })),
    cells: encodeGrid(result.labels),
    hash: gridHash(result.labels),
  };
}

// → labels (Uint8Array). Throws if the stored grid doesn't match its hash.
export function gridFromLocked(locked) {
  const labels = decodeGrid(locked.cells, locked.w, locked.h);
  if (gridHash(labels) !== locked.hash) throw new Error("This locked pattern doesn't match its checksum, so I won't draw it.");
  return labels;
}
