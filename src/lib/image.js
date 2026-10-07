// Photos are shrunk in the browser and stored as JPEG data URLs in Firestore
// (this project has no Cloud Storage bucket, and Spark can't create one).
// The size caps keep every doc well under Firestore's 1 MiB limit.

export const FULL_EDGE = 1280; // longest side of the stored photo
export const THUMB_EDGE = 192; // square centre crop, shown at 64px
export const SAMPLE_EDGE = 2048; // the eyedropper reads this, never a JPEG
// A data URL is ASCII, so its length is its size in bytes. 700 KB leaves
// headroom under Firestore's 1 MiB per-doc limit for the doc's other fields.
export const DOC_IMAGE_MAX_CHARS = 700_000;
const FULL_MAX_CHARS = DOC_IMAGE_MAX_CHARS;
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

// Lower the quality until it fits, then shrink and try again, but never
// below minEdge on the long side. → data URL, or null if it can't fit.
function toJpeg(canvas, maxChars, minEdge = 0) {
  for (const q of QUALITIES) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length <= maxChars) return url;
  }
  const next = Math.floor(Math.max(canvas.width, canvas.height) * 0.75);
  if (next < minEdge || next < 16) return null;
  return toJpeg(scaledCanvas(canvas, next, { matte: true }), maxChars, minEdge);
}

export class PhotoTooBigError extends Error {}

// A new photo, ready for the eyedropper and for saving.
// → { url, revoke, sample, full, thumb }
//   url:    show this (the original, revoke() when done)
//   sample: canvas the eyedropper reads
//   full / thumb: JPEG data URLs to store (skipped with { encode: false })
//
// Options: fullEdge (long side of `full`), fullMaxChars (its size cap) and
// minEdge (the smallest long side `full` may shrink to). If it can't fit,
// this throws PhotoTooBigError with a message fit to show as-is.
export async function preparePhoto(
  src,
  { encode = true, fullEdge = FULL_EDGE, fullMaxChars = FULL_MAX_CHARS, minEdge = 320 } = {}
) {
  const { img, url, revoke } = await loadImage(src);
  const sample = scaledCanvas(img, SAMPLE_EDGE, { readable: true });
  if (!encode) return { url, revoke, sample };
  const fullCanvas = scaledCanvas(img, fullEdge, { matte: true });
  const full = toJpeg(fullCanvas, fullMaxChars, minEdge);
  if (!full) {
    revoke();
    throw new PhotoTooBigError(
      `This image won't squeeze under ${Math.round(fullMaxChars / 1000)} KB without dropping below ` +
        `${minEdge}px, so I didn't save it. Try a smaller or simpler image, or crop it first.`
    );
  }
  return {
    url,
    revoke,
    sample,
    full,
    width: fullCanvas.width,
    height: fullCanvas.height,
    thumb: toJpeg(squareCanvas(img, THUMB_EDGE), THUMB_MAX_CHARS),
  };
}
