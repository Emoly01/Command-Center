import { VOID } from "./grid.js";
import { regions as findRegions } from "./cleanup.js";

// Label grid → outlines, filled shapes and number positions.
//
// Shared-border tracing: the boundary between two regions is traced ONCE,
// as a chain of lattice edges running from one junction (where 3+ regions
// meet, or the rug's edge) to the next. Each chain is smoothed once, and
// both neighbouring regions use that same smoothed line. So the outline has
// no doubled lines, and the filled preview has no gaps or overlaps.
//
// Region identity, chain topology and number positions are all integer
// work on the grid, so a locked pattern numbers identically everywhere.
// Floating point only shapes how smooth the lines look.

const DX = [1, 0, -1, 0]; // E, S, W, N  (screen coordinates, y down)
const DY = [0, 1, 0, -1];
const right = (d) => (d + 1) & 3;
const left = (d) => (d + 3) & 3;

// ── smoothing helpers ──────────────────────────────────────────────────

function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (!len) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dx * (a[1] - p[1]) - dy * (a[0] - p[0])) / len;
}

// Douglas–Peucker, endpoints kept.
function simplify(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = -1, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(pts[i], pts[s], pts[e]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

// Chaikin corner cutting. Open lines keep their endpoints (the junctions).
function chaikin(pts, iterations, closed) {
  let p = pts;
  for (let it = 0; it < iterations; it++) {
    const out = closed ? [] : [p[0]];
    const n = p.length;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = p[i], b = p[(i + 1) % n];
      const q = [0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]];
      const r = [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]];
      if (!closed && i === 0) out.push(r);
      else if (!closed && i === segs - 1) out.push(q);
      else out.push(q, r);
    }
    if (!closed) out.push(p[n - 1]);
    p = out;
  }
  return p;
}

const flat = (pts) => {
  const out = new Array(pts.length * 2);
  for (let i = 0; i < pts.length; i++) {
    out[i * 2] = Math.round(pts[i][0] * 1000) / 1000;
    out[i * 2 + 1] = Math.round(pts[i][1] * 1000) / 1000;
  }
  return out;
};

// ── tracing ────────────────────────────────────────────────────────────

// labels: Uint8Array (palette index per cell, VOID outside); shape: "rect" | "circle".
// → { w, h, regions: [{ color, size, label: { x, y, room } }],
//     chains: [{ a, b, outer, closed, pts }],     a/b: region ids, -1 = outside
//     rings:  [{ region, pts }] }                 pts: flat [x0, y0, x1, y1, …] in cells
// With { lattice: true }, rings also carry their unsmoothed lattice outline
// (`lat`), which the tests use to check that every ring encloses its cells exactly.
export function trace(labels, w, h, shape, { lattice = false } = {}) {
  const { region, sizes, colors } = findRegions(labels, w, h);
  const rid = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : region[y * w + x]);
  const W1 = w + 1;
  const V = W1 * (h + 1);

  // Directed lattice edges, slot = vertex·4 + dir, owned by the region on
  // their right. Walking a region's edges goes clockwise around it.
  const owner = new Int32Array(V * 4).fill(-2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = region[y * w + x];
      if (r < 0) continue;
      if (rid(x, y - 1) !== r) owner[(y * W1 + x) * 4 + 0] = r; // top, going E
      if (rid(x + 1, y) !== r) owner[(y * W1 + x + 1) * 4 + 1] = r; // right, going S
      if (rid(x, y + 1) !== r) owner[((y + 1) * W1 + x + 1) * 4 + 2] = r; // bottom, going W
      if (rid(x - 1, y) !== r) owner[((y + 1) * W1 + x) * 4 + 3] = r; // left, going N
    }
  }
  // Outside-facing sides: the outside (-1) owns the reverse direction.
  for (let s = 0; s < V * 4; s++) {
    if (owner[s] < 0) continue;
    const v = s >> 2, d = s & 3;
    const u = v + DX[d] + DY[d] * W1;
    const rev = u * 4 + ((d + 2) & 3);
    if (owner[rev] === -2) owner[rev] = -1;
  }

  // Undirected edge key: the slot of its E or S direction.
  const undirected = (v, d) => (d < 2 ? v * 4 + d : (v + DX[d] + DY[d] * W1) * 4 + ((d + 2) & 3));
  const isEdge = (v, d) => {
    const x = v % W1, y = (v - x) / W1;
    const nx = x + DX[d], ny = y + DY[d];
    if (nx < 0 || ny < 0 || nx > w || ny > h) return false;
    return owner[v * 4 + d] !== -2;
  };
  const degree = new Uint8Array(V);
  for (let v = 0; v < V; v++) for (let d = 0; d < 4; d++) if (isEdge(v, d)) degree[v]++;

  // Vertices on the rug's outer edge (touching the outside).
  const onOuter = new Uint8Array(V);
  for (let s = 0; s < V * 4; s++) if (owner[s] === -1) {
    const v = s >> 2, d = s & 3;
    onOuter[v] = 1;
    onOuter[v + DX[d] + DY[d] * W1] = 1;
  }

  // Lattice vertex → position. A round rug's outer vertices sit on the circle.
  const cx = w / 2, cy = h / 2;
  const pos = (v) => {
    const x = v % W1, y = (v - x) / W1;
    if (shape === "circle" && onOuter[v]) {
      const ux = (x - cx) / cx, uy = (y - cy) / cy;
      const len = Math.hypot(ux, uy) || 1;
      return [cx + (ux / len) * cx, cy + (uy / len) * cy];
    }
    return [x, y];
  };

  // ── chains ──
  const edgeChain = new Int32Array(V * 4).fill(-1); // undirected key → chain
  const edgeIndex = new Int32Array(V * 4);
  const chainVerts = [];
  const chains = [];
  const isJunction = (v) => degree[v] > 0 && degree[v] !== 2;

  const walk = (start, d0) => {
    const id = chainVerts.length;
    const verts = [start];
    let v = start, d = d0;
    for (;;) {
      const key = undirected(v, d);
      edgeChain[key] = id;
      edgeIndex[key] = verts.length - 1;
      v = v + DX[d] + DY[d] * W1;
      verts.push(v);
      if (v === start || isJunction(v)) break;
      let next = -1;
      for (let nd = 0; nd < 4; nd++) {
        if (nd === ((d + 2) & 3) || !isEdge(v, nd)) continue;
        if (edgeChain[undirected(v, nd)] === -1) { next = nd; break; }
      }
      if (next < 0) break;
      d = next;
    }
    chainVerts.push(verts);
    // Regions either side, from the first edge.
    const a = owner[start * 4 + d0];
    const b = owner[(start + DX[d0] + DY[d0] * W1) * 4 + ((d0 + 2) & 3)];
    chains.push({ a, b, closed: verts[0] === verts[verts.length - 1] && !isJunction(verts[0]) });
  };
  for (let v = 0; v < V; v++) {
    if (!isJunction(v)) continue;
    for (let d = 0; d < 4; d++) if (isEdge(v, d) && edgeChain[undirected(v, d)] === -1) walk(v, d);
  }
  for (let v = 0; v < V; v++) {
    for (let d = 0; d < 2; d++) if (isEdge(v, d) && edgeChain[v * 4 + d] === -1) walk(v, d);
  }

  // Smooth each chain once. The rug's own edge stays straight (rectangle) or
  // on the circle (round rug); inner borders lose their stair-steps.
  const smooth = chainVerts.map((verts, i) => {
    const c = chains[i];
    const outer = c.a === -1 || c.b === -1;
    c.outer = outer;
    if (outer) {
      const pts = verts.map(pos);
      return shape === "circle" ? pts : simplify(pts, 0.01);
    }
    // Edge midpoints turn stair-steps into 45° chamfers before simplifying.
    const mids = [pos(verts[0])];
    for (let k = 0; k + 1 < verts.length; k++) {
      const p = pos(verts[k]), q = pos(verts[k + 1]);
      mids.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
    }
    if (c.closed) {
      mids.shift();
      // Split the loop at its farthest point so both halves keep their ends.
      let far = 0, farD = -1;
      for (let k = 1; k < mids.length; k++) {
        const d = Math.hypot(mids[k][0] - mids[0][0], mids[k][1] - mids[0][1]);
        if (d > farD) { farD = d; far = k; }
      }
      const s1 = simplify(mids.slice(0, far + 1), 0.75);
      const s2 = simplify([...mids.slice(far), mids[0]], 0.75);
      const loop = [...s1, ...s2.slice(1, -1)];
      return chaikin(loop.length >= 3 ? loop : mids, 3, true);
    }
    mids.push(pos(verts[verts.length - 1]));
    return chaikin(simplify(mids, 0.75), 3, false);
  });
  chains.forEach((c, i) => (c.pts = flat(smooth[i])));

  // ── rings: each region's boundary as a cycle of whole chains ──
  const visited = new Uint8Array(V * 4);
  const rings = [];
  for (let s = 0; s < V * 4; s++) {
    const r = owner[s];
    if (r < 0 || visited[s]) continue;
    const edges = []; // [vertex, dir]
    let v = s >> 2, d = s & 3;
    for (;;) {
      visited[v * 4 + d] = 1;
      edges.push([v, d]);
      v = v + DX[d] + DY[d] * W1;
      // Hug the region: prefer turning right, then straight, then left.
      let nd = -1;
      for (const t of [right(d), d, left(d)]) if (owner[v * 4 + t] === r) { nd = t; break; }
      if (nd < 0 || visited[v * 4 + nd]) break;
      d = nd;
    }
    // Group the ring's edges into whole chains, starting at a chain boundary.
    const ch = edges.map(([u, e]) => edgeChain[undirected(u, e)]);
    let start = 0;
    for (let k = 0; k < ch.length; k++) if (ch[k] !== ch[(k - 1 + ch.length) % ch.length]) { start = k; break; }
    const pts = [];
    for (let k = 0; k < ch.length; ) {
      const at = (start + k) % ch.length;
      const c = ch[at];
      let n = 0;
      while (n < ch.length - k && ch[(start + k + n) % ch.length] === c) n++;
      const [u, e] = edges[at];
      const forward = chainVerts[c][edgeIndex[undirected(u, e)]] === u;
      const sp = forward ? smooth[c] : smooth[c].slice().reverse();
      for (let j = pts.length ? 1 : 0; j < sp.length; j++) pts.push(sp[j]);
      k += n;
    }
    const ring = { region: r, pts: flat(pts) };
    if (lattice) {
      ring.lat = [];
      for (const [u] of edges) ring.lat.push(u % W1, (u - (u % W1)) / W1);
    }
    rings.push(ring);
  }

  // ── number positions: deepest cell of each region (3-4 chamfer distance) ──
  const n = w * h;
  const BIG = 1 << 30;
  const dist = new Int32Array(n).fill(BIG);
  for (let i = 0; i < n; i++) {
    const r = region[i];
    if (r < 0) continue;
    const x = i % w, y = (i - x) / w;
    if (rid(x - 1, y) !== r || rid(x + 1, y) !== r || rid(x, y - 1) !== r || rid(x, y + 1) !== r) dist[i] = 3;
  }
  const relax = (i, x, y, dx, dy, cost) => {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
    const j = ny * w + nx;
    if (region[j] === region[i] && dist[j] + cost < dist[i]) dist[i] = dist[j] + cost;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (region[i] < 0) continue;
    relax(i, x, y, -1, 0, 3); relax(i, x, y, 0, -1, 3); relax(i, x, y, -1, -1, 4); relax(i, x, y, 1, -1, 4);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (region[i] < 0) continue;
    relax(i, x, y, 1, 0, 3); relax(i, x, y, 0, 1, 3); relax(i, x, y, 1, 1, 4); relax(i, x, y, -1, 1, 4);
  }
  const best = new Int32Array(sizes.length).fill(-1);
  for (let i = 0; i < n; i++) {
    const r = region[i];
    if (r < 0) continue;
    if (best[r] < 0 || dist[i] > dist[best[r]]) best[r] = i;
  }
  const regionsOut = sizes.map((size, r) => {
    const i = best[r];
    const x = i % w, y = (i - x) / w;
    return { color: colors[r], size, label: { x: x + 0.5, y: y + 0.5, room: dist[i] / 3 } };
  });

  return { w, h, regions: regionsOut, chains, rings };
}

export const isVoid = (v) => v === VOID;
