import { VOID } from "./grid.js";

// Tuftability: nothing narrower or smaller than the minimum detail size
// survives. Works on a label grid (palette index per cell, VOID outside).
//
//   1. smooth edges (majority vote)
//   2. remove thin bits (morphological opening, per colour)
//   3. refill what was removed from the neighbours
//   4. merge small islands into their closest-coloured neighbour
// …then once more, because smoothing can leave new crumbs. The last step
// is always the merge, so the area guarantee holds at the end.
//
// Every pass reads from a copy and writes all its changes at once, and every
// tie has a fixed rule, so the same grid always cleans up the same way.

const UNSET = 254;

// 3×3 majority vote: a cell changes only when 5+ of its 9 neighbours agree
// on another colour. Rounds off stair-step jaggies and single-cell specks.
export function majority(labels, w, h, passes = 1) {
  let src = labels;
  const count = new Uint16Array(256);
  for (let p = 0; p < passes; p++) {
    const out = src.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const cur = src[i];
        if (cur === VOID) continue;
        const seen = [];
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const v = src[ny * w + nx];
            if (v === VOID) continue;
            if (!count[v]) seen.push(v);
            count[v]++;
          }
        }
        // Most votes wins; a tie keeps the current colour, else the lower index.
        let win = cur;
        let winN = count[cur];
        for (const v of seen) {
          if (count[v] > winN || (count[v] === winN && win !== cur && v < win)) {
            win = v;
            winN = count[v];
          }
        }
        if (win !== cur && winN >= 5) out[i] = win;
        for (const v of seen) count[v] = 0;
      }
    }
    src = out;
  }
  return src;
}

function discOffsets(r) {
  const offs = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r) offs.push([dx, dy]);
  return offs;
}

// Opening with a disc of radius r: a cell survives only if some disc that
// fits entirely inside its own colour covers it. Lines and slivers narrower
// than the disc don't survive; they become UNSET. The rug's edge and the
// outside of a round rug count as "fits", so regions aren't eaten from the edge.
export function removeThin(labels, w, h, r) {
  if (r < 1) return labels;
  const offs = discOffsets(r);
  const n = labels.length;
  const eroded = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = labels[i];
      if (v === VOID) continue;
      let ok = 1;
      for (const [dx, dy] of offs) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const u = labels[ny * w + nx];
        if (u !== v && u !== VOID) {
          ok = 0;
          break;
        }
      }
      eroded[i] = ok;
    }
  }
  const out = labels.slice();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = labels[i];
      if (v === VOID || eroded[i]) continue;
      let kept = false;
      for (const [dx, dy] of offs) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (eroded[j] && labels[j] === v) {
          kept = true;
          break;
        }
      }
      if (!kept) out[i] = UNSET;
    }
  }
  return out;
}

const dist2 = (p, a, b) => {
  const dL = p[a * 3] - p[b * 3], da = p[a * 3 + 1] - p[b * 3 + 1], db = p[a * 3 + 2] - p[b * 3 + 2];
  return dL * dL + da * da + db * db;
};

// Fill UNSET cells from the outside in. Each round, every UNSET cell next to
// a set cell takes the neighbouring colour closest to its own photo colour
// (ties: more neighbours of that colour, then the lower index).
// cellLab: Lab per cell; palLab: flat Lab per palette index.
export function refill(labels, w, h, cellLab, palLab) {
  let src = labels;
  const nPal = palLab.length / 3;
  for (;;) {
    const out = src.slice();
    let pending = 0, changed = 0;
    for (let i = 0; i < src.length; i++) {
      if (src[i] !== UNSET) continue;
      pending++;
      const x = i % w, y = (i - x) / w;
      const nb = [];
      if (x > 0) nb.push(src[i - 1]);
      if (x < w - 1) nb.push(src[i + 1]);
      if (y > 0) nb.push(src[i - w]);
      if (y < h - 1) nb.push(src[i + w]);
      let best = -1, bestD = Infinity, bestN = 0;
      for (const v of nb) {
        if (v === UNSET || v === VOID) continue;
        let n = 0;
        for (const u of nb) if (u === v) n++;
        const dL = cellLab[i * 3] - palLab[v * 3], da = cellLab[i * 3 + 1] - palLab[v * 3 + 1], db = cellLab[i * 3 + 2] - palLab[v * 3 + 2];
        const d = dL * dL + da * da + db * db;
        if (d < bestD || (d === bestD && (n > bestN || (n === bestN && v < best)))) {
          best = v; bestD = d; bestN = n;
        }
      }
      if (best >= 0) {
        out[i] = best;
        changed++;
      }
    }
    src = out;
    if (!pending) return src;
    if (!changed) {
      // Nothing set anywhere nearby (the whole rug was thin): nearest colour.
      for (let i = 0; i < src.length; i++) {
        if (src[i] !== UNSET) continue;
        let best = 0, bestD = Infinity;
        for (let v = 0; v < nPal; v++) {
          const dL = cellLab[i * 3] - palLab[v * 3], da = cellLab[i * 3 + 1] - palLab[v * 3 + 1], db = cellLab[i * 3 + 2] - palLab[v * 3 + 2];
          const d = dL * dL + da * da + db * db;
          if (d < bestD) { bestD = d; best = v; }
        }
        src[i] = best;
      }
      return src;
    }
  }
}

// Connected regions (4-neighbour). → { region: Int32Array (-1 outside),
// sizes, colors } with regions numbered in raster order of their first cell.
export function regions(labels, w, h) {
  const region = new Int32Array(labels.length).fill(-1);
  const sizes = [];
  const colors = [];
  const stack = [];
  for (let s = 0; s < labels.length; s++) {
    if (region[s] !== -1 || labels[s] === VOID) continue;
    const id = sizes.length;
    const v = labels[s];
    let size = 0;
    region[s] = id;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop();
      size++;
      const x = i % w;
      if (x > 0 && region[i - 1] === -1 && labels[i - 1] === v) { region[i - 1] = id; stack.push(i - 1); }
      if (x < w - 1 && region[i + 1] === -1 && labels[i + 1] === v) { region[i + 1] = id; stack.push(i + 1); }
      if (i >= w && region[i - w] === -1 && labels[i - w] === v) { region[i - w] = id; stack.push(i - w); }
      if (i + w < labels.length && region[i + w] === -1 && labels[i + w] === v) { region[i + w] = id; stack.push(i + w); }
    }
    sizes.push(size);
    colors.push(v);
  }
  return { region, sizes, colors };
}

// Merge every region smaller than minArea into a neighbour: the one whose
// colour is closest (ties: longer shared border, then lower region number).
// Smallest first; a merge that touches another region of the same colour
// joins it too, because touching same-colour cells are one region.
export function mergeSmall(labels, w, h, palLab, minArea) {
  const { region, sizes, colors } = regions(labels, w, h);
  const R = sizes.length;
  if (R < 2) return labels;
  const parent = Int32Array.from({ length: R }, (_, i) => i);
  const find = (a) => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  const size = sizes.slice();
  const color = colors.slice();
  const adj = Array.from({ length: R }, () => new Map());
  const link = (a, b) => {
    adj[a].set(b, (adj[a].get(b) || 0) + 1);
    adj[b].set(a, (adj[b].get(a) || 0) + 1);
  };
  for (let i = 0; i < labels.length; i++) {
    const a = region[i];
    if (a < 0) continue;
    if (i % w < w - 1) { const b = region[i + 1]; if (b >= 0 && b !== a) link(a, b); }
    if (i + w < labels.length) { const b = region[i + w]; if (b >= 0 && b !== a) link(a, b); }
  }
  const union = (keep, gone) => {
    parent[gone] = keep;
    size[keep] += size[gone];
    for (const [n, len] of adj[gone]) {
      if (n === keep) continue;
      adj[keep].set(n, (adj[keep].get(n) || 0) + len);
      const back = adj[n];
      back.set(keep, (back.get(keep) || 0) + (back.get(gone) || 0));
      back.delete(gone);
    }
    adj[keep].delete(gone);
    adj[gone] = new Map();
  };

  // Min-heap of [size, id].
  const heap = [];
  const less = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const push = (e) => {
    heap.push(e);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!less(heap[i], heap[p])) break;
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]];
        i = m;
      }
    }
    return top;
  };
  for (let r = 0; r < R; r++) if (size[r] < minArea) push([size[r], r]);

  while (heap.length) {
    const [s, r] = pop();
    if (find(r) !== r || size[r] !== s || s >= minArea || !adj[r].size) continue;
    let best = -1, bestD = Infinity, bestLen = -1;
    for (const [n, len] of adj[r]) {
      const d = (palLab[color[r] * 3] - palLab[color[n] * 3]) ** 2 +
        (palLab[color[r] * 3 + 1] - palLab[color[n] * 3 + 1]) ** 2 +
        (palLab[color[r] * 3 + 2] - palLab[color[n] * 3 + 2]) ** 2;
      if (d < bestD || (d === bestD && (len > bestLen || (len === bestLen && n < best)))) {
        best = n; bestD = d; bestLen = len;
      }
    }
    union(best, r);
    // Now touching another region of the same colour? Then it's one region.
    for (const n of [...adj[best].keys()].sort((a, b) => a - b)) {
      if (find(n) === n && n !== best && color[n] === color[best] && adj[best].has(n)) union(best, n);
    }
    if (size[best] < minArea) push([size[best], best]);
  }

  const out = labels.slice();
  for (let i = 0; i < out.length; i++) if (region[i] >= 0) out[i] = color[find(region[i])];
  return out;
}

// The full cleanup. minDetailCells: minimum detail size in cells (may be
// fractional). Returns the cleaned labels.
export function cleanup(labels, w, h, cellLab, palLab, minDetailCells) {
  const d = Math.max(1, minDetailCells);
  const r = d >= 2 ? Math.min(12, Math.floor(d / 2)) : 0;
  const minArea = Math.max(1, Math.ceil((Math.PI / 4) * d * d));
  let L = majority(labels, w, h, 2);
  for (let round = 0; round < 2; round++) {
    L = refill(removeThin(L, w, h, r), w, h, cellLab, palLab);
    L = mergeSmall(L, w, h, palLab, minArea);
    if (round === 0) L = majority(L, w, h, 1);
  }
  return L;
}

export const minAreaCells = (minDetailCells) => Math.max(1, Math.ceil((Math.PI / 4) * Math.max(1, minDetailCells) ** 2));
