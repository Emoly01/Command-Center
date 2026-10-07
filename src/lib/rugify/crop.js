// Crop geometry and grid sizing, shared by the cropper and the generator.

export const MAX_CELLS = 250_000; // keeps a run well under a second on a phone

// The rug's aspect ratio (width / height). A circle is 1.
export const rugAspect = (size, shape) => (shape === "circle" ? 1 : size.wCm / size.hCm);

// crop: { cx, cy, z }, the centre as a fraction of the source plus zoom ≥ 1.
// At z = 1 the crop is as large as fits in the source at this aspect.
// → { sx, sy, sw, sh } in source pixels, always inside the source.
export function cropRect(source, crop, aspect) {
  const maxW = Math.min(source.w, source.h * aspect);
  const sw = maxW / Math.max(1, crop.z || 1);
  const sh = sw / aspect;
  const cx = Math.min(source.w - sw / 2, Math.max(sw / 2, (crop.cx ?? 0.5) * source.w));
  const cy = Math.min(source.h - sh / 2, Math.max(sh / 2, (crop.cy ?? 0.5) * source.h));
  return { sx: cx - sw / 2, sy: cy - sh / 2, sw, sh };
}

// Keep a crop's centre where it can actually be, after a pan or zoom.
export function clampCrop(source, crop, aspect) {
  const { sx, sy, sw, sh } = cropRect(source, crop, aspect);
  return { ...crop, cx: (sx + sw / 2) / source.w, cy: (sy + sh / 2) / source.h };
}

// Grid size for a rug. Cells grow if the rug would need more than
// MAX_CELLS. → { gw, gh, cellMm } (cellMm as actually used)
export function gridSize(size, shape, cellMm) {
  const wMm = size.wCm * 10;
  const hMm = (shape === "circle" ? size.wCm : size.hCm) * 10;
  let c = Math.max(1, cellMm);
  while (Math.round(wMm / c) * Math.round(hMm / c) > MAX_CELLS) c = Math.round((c + 0.5) * 10) / 10;
  return { gw: Math.max(4, Math.round(wMm / c)), gh: Math.max(4, Math.round(hMm / c)), cellMm: c };
}
