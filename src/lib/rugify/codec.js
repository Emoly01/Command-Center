// Compact text form of a finished cell grid, for locked patterns.
//
// A grid is a Uint8Array, row-major, w × h. Each cell holds a palette index
// (0–35), or VOID (255) for cells outside a round rug. It's run-length
// encoded as "<symbol><run length in base 36>," per run, where the symbol is
// one base-36 digit for a palette index or "_" for void. A 150×200 rug with
// smooth regions is a few KB.
//
// Everything here is integer-only, so every device decodes the same grid.

export const VOID = 255;
const SYMBOLS = "0123456789abcdefghijklmnopqrstuvwxyz";
export const MAX_PALETTE = SYMBOLS.length;

export function encodeGrid(cells) {
  let out = "";
  let i = 0;
  while (i < cells.length) {
    const v = cells[i];
    let j = i + 1;
    while (j < cells.length && cells[j] === v) j++;
    if (v !== VOID && v >= MAX_PALETTE) throw new Error(`palette index ${v} can't be encoded`);
    out += (v === VOID ? "_" : SYMBOLS[v]) + (j - i).toString(36) + ",";
    i = j;
  }
  return out;
}

export function decodeGrid(text, w, h) {
  const cells = new Uint8Array(w * h);
  let at = 0;
  for (const tok of text.split(",")) {
    if (!tok) continue;
    const sym = tok[0];
    const v = sym === "_" ? VOID : SYMBOLS.indexOf(sym);
    const n = parseInt(tok.slice(1), 36);
    if (v < 0 || !(n > 0) || at + n > cells.length) throw new Error("locked pattern is damaged");
    cells.fill(v, at, at + n);
    at += n;
  }
  if (at !== cells.length) throw new Error("locked pattern is damaged");
  return cells;
}

// FNV-1a over the cells: stored with a lock so a damaged grid is caught
// instead of quietly showing a different pattern.
export function gridHash(cells) {
  let h = 0x811c9dc5;
  for (let i = 0; i < cells.length; i++) {
    h ^= cells[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
