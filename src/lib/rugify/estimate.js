// Yarn needed per colour vs what the stash holds.
//
// need (g) = area (m²) × grams per m² × (1 + waste). Grams per m² depends
// on pile height, gun and yarn, so there's no trusted default: until it's
// calibrated, rows say so instead of inventing a number.

export const TIGHT_MARGIN = 0.15; // within 15% of running out = "tight"

// Calibration: a tufted test swatch of wCm × hCm used `grams` of yarn.
export const gramsPerM2FromSwatch = (wCm, hCm, grams) => {
  const m2 = (wCm / 100) * (hCm / 100);
  return m2 > 0 && grams > 0 ? Math.round(grams / m2) : null;
};

// What a stash item holds, in grams, or null if its unit can't be converted.
export function stashGrams(item, unitGrams = {}) {
  if (!item) return null;
  const q = Number(item.qty) || 0;
  if (item.unit === "g") return q;
  if (item.unit === "kg") return q * 1000;
  const per = Number(unitGrams[item.id]);
  return per > 0 ? q * per : null;
}

// counts: cells per legend entry; legend: [{ itemId, name, hex }].
// → [{ n, itemId, name, hex, areaM2, needG, haveG, status }]
//   status: "uncalibrated" | "unknown" (can't convert the stash unit) | "short" | "tight" | "ok"
export function estimateYarn({ counts, cellMm, legend, gPerM2, wastePct = 10, items = [], unitGrams = {} }) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const cellM2 = (cellMm / 1000) ** 2;
  return legend.map((l, i) => {
    const areaM2 = counts[i] * cellM2;
    const needG = gPerM2 > 0 ? areaM2 * gPerM2 * (1 + (Number(wastePct) || 0) / 100) : null;
    const item = byId.get(l.itemId);
    const haveG = stashGrams(item, unitGrams);
    let status;
    if (needG == null) status = "uncalibrated";
    else if (haveG == null) status = "unknown";
    else if (haveG < needG) status = "short";
    else if (haveG < needG * (1 + TIGHT_MARGIN)) status = "tight";
    else status = "ok";
    return { n: i + 1, itemId: l.itemId, name: l.name, hex: l.hex, unit: item?.unit, areaM2, needG, haveG, status };
  });
}
