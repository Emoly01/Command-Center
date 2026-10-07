import { inkOn } from "../color.js";

// One SVG builder for every view, so the screen, the projector and the
// exported files can never disagree.
//
// result: { w, h, cellMm, shape, wCm, hCm, legend, traced } (coordinates in cells)
// opts:
//   mode       "preview" (yarn colours) | "outline" (dark lines on white)
//              | "projector" (white lines on black)
//   mirror     flip left-right for the back of the cloth (numbers stay readable)
//   lineWidth  on screen: px; in exports: mm
//   numberSize multiplier for the numbers
//   scaleBar   draw a 10 cm bar under the rug, to size a projection
//   legend     list the yarns under the rug (exports)
//   exportMm   true: real-size document (width="600mm"); false: fills its box

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const r2 = (v) => Math.round(v * 100) / 100;

function pathOf(flat, close) {
  let d = `M${r2(flat[0])} ${r2(flat[1])}`;
  for (let i = 2; i < flat.length; i += 2) d += `L${r2(flat[i])} ${r2(flat[i + 1])}`;
  return close ? d + "Z" : d;
}

const THEMES = {
  preview: { bg: null, line: "rgba(26,15,10,.45)", outer: "rgba(26,15,10,.7)", text: "#1a0f0a", halo: "#fff" },
  outline: { bg: "#ffffff", line: "#1a1a1a", outer: "#1a1a1a", text: "#1a1a1a", halo: "#ffffff" },
  projector: { bg: "#000000", line: "#ffffff", outer: "#ffffff", text: "#ffffff", halo: "#000000" },
};

export function buildSvg(result, opts = {}) {
  const { mode = "outline", mirror = false, lineWidth = 2, numberSize = 1, scaleBar = false, legend = false, exportMm = false } = opts;
  const { w, h, cellMm, traced } = result;
  const th = THEMES[mode];
  const mmToCells = (mm) => mm / cellMm;

  // Space under the rug for the scale bar and/or legend.
  const pad = mmToCells(20);
  const barH = scaleBar ? mmToCells(30) : 0;
  const rowH = mmToCells(14);
  const legendH = legend ? pad + rowH * result.legend.length : 0;
  const totalH = h + (scaleBar || legend ? pad : 0) + barH + legendH;
  const vb = `${r2(-pad / 2)} ${r2(-pad / 2)} ${r2(w + pad)} ${r2(totalH + pad)}`;
  const size = exportMm
    ? `width="${r2((w + pad) * cellMm)}mm" height="${r2((totalH + pad) * cellMm)}mm"`
    : `width="100%" height="100%" preserveAspectRatio="xMidYMid meet"`;
  // Screen: line widths in px whatever the zoom. Export: real millimetres.
  const stroke = exportMm ? `stroke-width="${r2(mmToCells(lineWidth))}"` : `stroke-width="${lineWidth}" vector-effect="non-scaling-stroke"`;

  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${size}>`];
  if (th.bg) out.push(`<rect x="${r2(-pad / 2)}" y="${r2(-pad / 2)}" width="${r2(w + pad)}" height="${r2(totalH + pad)}" fill="${th.bg}"/>`);
  out.push(mirror ? `<g transform="translate(${w} 0) scale(-1 1)">` : "<g>");

  if (mode === "preview") {
    // One path per region (outer rings + holes, even-odd), plus a hairline
    // in its own colour so anti-aliasing never shows a seam between fills.
    const byRegion = new Map();
    for (const ring of traced.rings) {
      if (!byRegion.has(ring.region)) byRegion.set(ring.region, []);
      byRegion.get(ring.region).push(pathOf(ring.pts, true));
    }
    for (const [r, ds] of byRegion) {
      const hex = result.legend[traced.regions[r].color].hex;
      out.push(`<path d="${ds.join("")}" fill="${hex}" fill-rule="evenodd" stroke="${hex}" stroke-width="0.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`);
    }
  }

  const inner = traced.chains.filter((c) => !c.outer).map((c) => pathOf(c.pts, c.closed)).join("");
  const outer = traced.chains.filter((c) => c.outer).map((c) => pathOf(c.pts, c.closed)).join("");
  if (inner) out.push(`<path d="${inner}" fill="none" stroke="${th.line}" ${stroke} stroke-linejoin="round" stroke-linecap="round"/>`);
  if (outer) out.push(`<path d="${outer}" fill="none" stroke="${th.outer}" ${stroke} stroke-linejoin="round" stroke-linecap="round"/>`);
  out.push("</g>");

  // Numbers: placed at mirrored positions but never mirrored themselves.
  const maxFont = mmToCells(30);
  const minFont = mmToCells(5);
  for (const g of traced.regions) {
    const n = g.color + 1;
    const fs = r2(Math.max(minFont, Math.min(maxFont, g.label.room * 1.15)) * numberSize);
    const x = r2(mirror ? w - g.label.x : g.label.x);
    const y = r2(g.label.y);
    const fill = mode === "preview" ? inkOn(result.legend[g.color].hex) : th.text;
    const halo = mode === "preview" ? (fill === "#1a0f0a" ? "#ffffff" : "#1a0f0a") : th.halo;
    out.push(
      `<text x="${x}" y="${y}" font-size="${fs}" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="600" ` +
        `text-anchor="middle" dominant-baseline="central" fill="${fill}" stroke="${halo}" stroke-width="${r2(fs * 0.18)}" ` +
        `paint-order="stroke" stroke-linejoin="round">${n}</text>`
    );
  }

  let y = h + pad;
  if (scaleBar) {
    const len = mmToCells(100);
    const t = mmToCells(3);
    const c = th.text;
    out.push(
      `<g fill="${c}"><rect x="0" y="${r2(y)}" width="${r2(len)}" height="${r2(t)}"/>` +
        `<rect x="0" y="${r2(y - t)}" width="${r2(t / 2)}" height="${r2(t * 3)}"/>` +
        `<rect x="${r2(len - t / 2)}" y="${r2(y - t)}" width="${r2(t / 2)}" height="${r2(t * 3)}"/>` +
        `<text x="${r2(len + t * 3)}" y="${r2(y + t / 2)}" font-size="${r2(mmToCells(9))}" font-family="IBM Plex Mono, monospace" dominant-baseline="central">10 cm</text></g>`
    );
    y += barH;
  }
  if (legend) {
    y += pad / 2;
    const fs = r2(mmToCells(7));
    result.legend.forEach((l, i) => {
      const ry = y + i * rowH;
      out.push(
        `<rect x="0" y="${r2(ry)}" width="${r2(mmToCells(10))}" height="${r2(mmToCells(10))}" fill="${l.hex}" stroke="${th.line}" stroke-width="${r2(mmToCells(0.4))}"/>` +
          `<text x="${r2(mmToCells(14))}" y="${r2(ry + mmToCells(5))}" font-size="${fs}" font-family="IBM Plex Sans, sans-serif" dominant-baseline="central" fill="${th.text}">` +
          `${i + 1}  ${esc(l.name)}  ${esc(l.hex)}</text>`
      );
    });
  }
  out.push("</svg>");
  return out.join("");
}
