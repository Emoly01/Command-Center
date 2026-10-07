import { buildSvg } from "../../lib/rugify/render";

const slug = (s) => (s || "rug").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "rug";

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const outlineSvg = (result, mirror) =>
  buildSvg(result, { mode: "outline", mirror, legend: true, exportMm: true, lineWidth: 1.2 });

const fileName = (project, mirror, ext) => `${slug(project.name)}-outline${mirror ? "-mirrored" : ""}.${ext}`;

// Real-size SVG (width="…mm"), numbered, with the legend underneath.
export function exportSvg(project, result, mirror) {
  download(new Blob([outlineSvg(result, mirror)], { type: "image/svg+xml" }), fileName(project, mirror, "svg"));
}

// The same drawing as a PNG, 4000px on its long side.
export async function exportPng(project, result, mirror, longEdge = 4000) {
  const blob = await svgToPng(outlineSvg(result, mirror), longEdge, "#ffffff");
  download(blob, fileName(project, mirror, "png"));
}

// Rasterise an SVG string. → PNG Blob (or JPEG with type/quality).
export async function svgToPng(svg, longEdge, background, type = "image/png", quality) {
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
  const s = longEdge / Math.max(vb[2], vb[3]);
  const W = Math.round(vb[2] * s), H = Math.round(vb[3] * s);
  const sized = svg.replace(/<svg ([^>]*?)width="[^"]*" height="[^"]*"/, `<svg $1width="${W}" height="${H}"`);
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.drawImage(img, 0, 0, W, H);
    return await new Promise((res) => c.toBlob(res, type, quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Small JPEG of the preview, for the project list.
export async function previewThumb(result) {
  const blob = await svgToPng(buildSvg(result, { mode: "preview" }), 192, "#1a1210", "image/jpeg", 0.7);
  return await new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}
