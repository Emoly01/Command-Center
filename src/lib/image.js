// Photos are shrunk in the browser and stored as JPEG data URLs in Firestore
// (this project has no Cloud Storage bucket, and Spark can't create one).
// The size caps keep every doc well under Firestore's 1 MiB limit.

export const FULL_EDGE = 1280; // longest side of the stored photo
export const THUMB_EDGE = 192; // square centre crop, shown at 64px
export const SAMPLE_EDGE = 2048; // the eyedropper reads this, never a JPEG
const FULL_MAX_CHARS = 700_000;
const THUMB_MAX_CHARS = 40_000;
const QUALITIES = [0.82, 0.72, 0.62, 0.52];
const MATTE = "#1a1210"; // what transparent PNG areas become in a JPEG

// File/Blob or URL → a decoded <img>. Drawing an <img> applies the photo's
// EXIF orientation in every current browser, so sideways phone shots come out upright.
export async function loadImage(src) {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const revoke = () => {
    if (typeof src !== "string") URL.revokeObjectURL(url);
  };
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  try {
    await img.decode();
  } catch {
    revoke();
    throw new Error("That file isn't an image this browser can open.");
  }
  return { img, url, revoke };
}

function scaledCanvas(img, maxEdge, { readable = false, matte = false } = {}) {
  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  const s = Math.min(1, maxEdge / Math.max(w0, h0));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w0 * s));
  c.height = Math.max(1, Math.round(h0 * s));
  const ctx = c.getContext("2d", readable ? { willReadFrequently: true } : undefined);
  ctx.imageSmoothingQuality = "high";
  if (matte) {
    ctx.fillStyle = MATTE;
    ctx.fillRect(0, 0, c.width, c.height);
  }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function squareCanvas(img, edge) {
  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  const side = Math.min(w0, h0);
  const c = document.createElement("canvas");
  c.width = c.height = Math.min(edge, side);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = MATTE;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, (w0 - side) / 2, (h0 - side) / 2, side, side, 0, 0, c.width, c.height);
  return c;
}

// Lower the quality until it fits, then shrink and try again.
function toJpeg(canvas, maxChars) {
  for (const q of QUALITIES) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length <= maxChars) return url;
  }
  return toJpeg(scaledCanvas(canvas, Math.max(canvas.width, canvas.height) * 0.75, { matte: true }), maxChars);
}

// A new photo, ready for the eyedropper and for saving.
// → { url, revoke, sample, full, thumb }
//   url:    show this (the original, revoke() when done)
//   sample: canvas the eyedropper reads
//   full / thumb: JPEG data URLs to store (skipped with { encode: false })
export async function preparePhoto(src, { encode = true } = {}) {
  const { img, url, revoke } = await loadImage(src);
  const sample = scaledCanvas(img, SAMPLE_EDGE, { readable: true });
  if (!encode) return { url, revoke, sample };
  return {
    url,
    revoke,
    sample,
    full: toJpeg(scaledCanvas(img, FULL_EDGE, { matte: true }), FULL_MAX_CHARS),
    thumb: toJpeg(squareCanvas(img, THUMB_EDGE), THUMB_MAX_CHARS),
  };
}
