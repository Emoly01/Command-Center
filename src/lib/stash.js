import { useEffect, useState } from "react";
import { collection, doc, getDocs, onSnapshot, writeBatch } from "firebase/firestore";
import { db, uidReady } from "./firebase";
import { useSyncedState } from "./useSyncedState";
import { normHex, hexToLab, deltaE, matchBand } from "./color";

// ── Firestore layout ───────────────────────────────────────────────────
//   users/{uid}/tools/stash           settings (useSyncedState): { categories }
//   users/{uid}/stash/{itemId}        one doc per item, shape below
//   users/{uid}/stashPhotos/{itemId}  { full: JPEG data URL }, only read
//                                     when an item is opened
//
// Item:
//   v: 1
//   name, categoryId, qty (number), unit, status: "active" | "used_up"
//   colors: [{ hex: "#RRGGBB", name }], primary first, at most 3
//   brand, fiber, location, notes: strings ("" when unset)
//   tags: lowercase strings
//   thumb: JPEG data URL or null; hasPhoto: whether stashPhotos/{id} exists
//   createdAt, updatedAt: ms since epoch (client clock, so it works offline)
//
// Item IDs are Firestore auto IDs: assigned once, never changed or reused,
// so other tools (the pattern tracker, later) can link to them.
//
// Writes are never awaited for their commit: offline, a commit only resolves
// once the server has it, but the local cache (and the UI) update at once.

export const UNITS = ["skeins", "balls", "cones", "g", "kg", "m", "yd", "pcs"];
export const UNIT_STEP = { skeins: 1, balls: 1, cones: 1, g: 50, kg: 0.5, m: 0.5, yd: 1, pcs: 1 };
export const MAX_COLORS = 3;

export const DEFAULT_CATEGORIES = [
  { id: "crochet", name: "Crochet yarn", units: ["skeins", "g", "m"] },
  { id: "tufting", name: "Tufting yarn", units: ["g", "skeins", "m"] },
  { id: "clay", name: "Clay", units: ["kg"] },
  { id: "fabric", name: "Cosplay fabric", units: ["m"] },
  { id: "misc", name: "Misc", units: ["pcs"] },
];

const stashCol = (uid) => collection(db, "users", uid, "stash");
const itemRef = (uid, id) => doc(db, "users", uid, "stash", id);
const photoRef = (uid, id) => doc(db, "users", uid, "stashPhotos", id);

const settle = (p) => p.catch((e) => console.error("stash write failed", e));
const round2 = (n) => Math.round(n * 100) / 100;
const str = (v, max) => String(v ?? "").trim().slice(0, max);

// "Amigurumi, #gift  dk" → ["amigurumi", "gift", "dk"]
export function parseTags(v) {
  const raw = Array.isArray(v) ? v : String(v ?? "").split(/[,\s]+/);
  const out = [];
  for (const t of raw) {
    const tag = String(t).trim().replace(/^#/, "").toLowerCase().slice(0, 32);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, 20);
}

export function cleanColors(colors) {
  return (colors || [])
    .map((c) => ({ hex: normHex(c?.hex), name: str(c?.name, 40) }))
    .filter((c) => c.hex)
    .slice(0, MAX_COLORS);
}

// Normalise whichever item fields are present.
function clean(f) {
  const out = {};
  if ("name" in f) out.name = str(f.name, 120);
  if ("categoryId" in f) out.categoryId = str(f.categoryId, 64);
  if ("qty" in f) out.qty = Math.max(0, round2(Number(f.qty) || 0));
  if ("unit" in f) out.unit = UNITS.includes(f.unit) ? f.unit : "pcs";
  if ("colors" in f) out.colors = cleanColors(f.colors);
  for (const k of ["brand", "fiber", "location"]) if (k in f) out[k] = str(f[k], 120);
  if ("notes" in f) out.notes = str(f.notes, 2000);
  if ("tags" in f) out.tags = parseTags(f.tags);
  if ("status" in f) out.status = f.status === "used_up" ? "used_up" : "active";
  return out;
}

// ── Reading ────────────────────────────────────────────────────────────

export function useStashSettings() {
  const [s, setS, status] = useSyncedState("stash", { categories: DEFAULT_CATEGORIES });
  const categories = s.categories?.length ? s.categories : DEFAULT_CATEGORIES;
  const setCategories = (fn) =>
    setS((p) => ({ ...p, categories: fn(p.categories?.length ? p.categories : DEFAULT_CATEGORIES) }));
  return { categories, setCategories, status };
}

// Every item, live. status: "loading" | "ready" | "offline" (showing the
// device's cached copy because there's no connection).
export function useStash() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let alive = true;
    let unsub = () => {};
    uidReady.then((uid) => {
      if (!alive) return;
      unsub = onSnapshot(
        stashCol(uid),
        { includeMetadataChanges: true },
        (snap) => {
          setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          const cached = snap.metadata.fromCache;
          setStatus(!cached ? "ready" : navigator.onLine ? "loading" : "offline");
        },
        () => setStatus("offline")
      );
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  return { items, status };
}

// The full-size photo for one item: undefined while loading, null if none.
export function useStashPhoto(id, hasPhoto) {
  const [full, setFull] = useState(hasPhoto ? undefined : null);
  useEffect(() => {
    if (!id || !hasPhoto) {
      setFull(null);
      return;
    }
    setFull(undefined);
    let alive = true;
    let unsub = () => {};
    uidReady.then((uid) => {
      if (!alive) return;
      unsub = onSnapshot(
        photoRef(uid, id),
        (snap) => setFull(snap.exists() ? snap.data().full : null),
        () => setFull(null)
      );
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [id, hasPhoto]);
  return full;
}

// ── Writing ────────────────────────────────────────────────────────────

// photo: { thumb, full } from preparePhoto(), or null. → the new item's id.
export async function addItem(fields, photo) {
  const uid = await uidReady;
  const ref = doc(stashCol(uid));
  const now = Date.now();
  const batch = writeBatch(db);
  batch.set(ref, {
    v: 1,
    name: "",
    categoryId: "misc",
    qty: 1,
    unit: "pcs",
    colors: [],
    brand: "",
    fiber: "",
    location: "",
    notes: "",
    tags: [],
    ...clean(fields),
    status: "active",
    thumb: photo?.thumb ?? null,
    hasPhoto: !!photo?.full,
    createdAt: now,
    updatedAt: now,
  });
  if (photo?.full) batch.set(photoRef(uid, ref.id), { full: photo.full });
  settle(batch.commit());
  return ref.id;
}

// photo: undefined = leave it, null = remove it, { thumb, full } = replace it.
export async function updateItem(id, fields, photo) {
  const uid = await uidReady;
  const batch = writeBatch(db);
  const patch = { ...clean(fields), updatedAt: Date.now() };
  if (photo === null) {
    patch.thumb = null;
    patch.hasPhoto = false;
    batch.delete(photoRef(uid, id));
  } else if (photo) {
    patch.thumb = photo.thumb;
    patch.hasPhoto = true;
    batch.set(photoRef(uid, id), { full: photo.full });
  }
  batch.update(itemRef(uid, id), patch);
  settle(batch.commit());
}

export const setQty = (id, qty) => updateItem(id, { qty });
export const setUsedUp = (id, usedUp) => updateItem(id, { status: usedUp ? "used_up" : "active" });

// The item and its photo go together, in one batch: no orphaned photos.
export async function deleteItem(id) {
  const uid = await uidReady;
  const batch = writeBatch(db);
  batch.delete(itemRef(uid, id));
  batch.delete(photoRef(uid, id));
  settle(batch.commit());
}

// ── Color ─────────────────────────────────────────────────────────────

// Items closest to a color, nearest first. An item's distance is its
// closest color, so one strand of a variegated yarn is enough to match.
// → [{ item, color, distance, band }]
export function rankByColor(items, hex, limit = 8) {
  const target = hexToLab(hex);
  const out = [];
  for (const item of items) {
    let best = null;
    for (const c of item.colors || []) {
      const d = deltaE(target, hexToLab(c.hex));
      if (!best || d < best.distance) best = { item, color: c, distance: d };
    }
    if (best) out.push(best);
  }
  out.sort((a, b) => a.distance - b.distance);
  return out.slice(0, limit).map((r) => ({ ...r, band: matchBand(r.distance) }));
}

// For Rug-ify and friends: which colors do I own, and how much of each?
// Works offline from the device cache.
//   getStashPalette({ categoryIds: ["tufting"] })
//   → [{ id, name, categoryId, qty, unit, colors: [{ hex, name, lab }] }]
export async function getStashPalette({ categoryIds, includeUsedUp = false } = {}) {
  const uid = await uidReady;
  const snap = await getDocs(stashCol(uid));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(
      (it) =>
        (includeUsedUp || it.status !== "used_up") &&
        (!categoryIds || categoryIds.includes(it.categoryId)) &&
        it.colors?.length
    )
    .map((it) => ({
      id: it.id,
      name: it.name,
      categoryId: it.categoryId,
      qty: it.qty,
      unit: it.unit,
      colors: it.colors.map((c) => ({ hex: c.hex, name: c.name || "", lab: hexToLab(c.hex) })),
    }));
}
