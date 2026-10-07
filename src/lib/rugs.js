import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { db, uidReady } from "./firebase";
import { useSyncedState } from "./useSyncedState";
import { preparePhoto } from "./image";

// ── Firestore layout (same approach as the Stash Ledger) ───────────────
//   users/{uid}/tools/rugify          settings (useSyncedState), below
//   users/{uid}/rugs/{id}             one project, shape below
//   users/{uid}/rugSources/{id}       { full: JPEG data URL }: the uncropped
//                                     source photo, read only when needed
//
// Project:
//   v: 1, name
//   source: { w, h }                   pixel size of the stored source
//   crop: { shape: "rect" | "circle", cx, cy, z }
//         cx, cy: crop centre as a fraction of the source; z: zoom (≥ 1)
//   size: { wCm, hCm }                  a circle uses wCm as its diameter
//   palette: { allowed: [stash itemId], maxColors, mode: "auto" | "exact",
//              snapshot: { [itemId]: { name, hex } } }
//   settings: { cellMm, minDetailMm }
//   thumb: small JPEG data URL of the last result, or null
//   locked: null, or a frozen pattern (see lockRug)
//   createdAt, updatedAt: ms since epoch
//
// Results are regenerated from all of that, never stored, until a pattern
// is locked.

export const SETTINGS_DEFAULT = {
  gPerM2: null, // yarn per m² of tufting: null until calibrated
  wastePct: 10,
  unitGrams: {}, // { [stash itemId]: grams per skein/cone/ball/m/yd }
  cellMm: 4,
  minDetailMm: 15,
};

export const SOURCE_EDGE = 1600;
const SOURCE_MIN_EDGE = 800;
// A project doc holds a locked grid; keep the whole doc well under 1 MiB.
const DOC_MAX_CHARS = 900_000;

export class RugTooBigError extends Error {}

const rugsCol = (uid) => collection(db, "users", uid, "rugs");
const rugRef = (uid, id) => doc(db, "users", uid, "rugs", id);
const sourceRef = (uid, id) => doc(db, "users", uid, "rugSources", id);
const settle = (p) => p.catch((e) => console.error("rug write failed", e));

function guardSize(data, what) {
  const n = JSON.stringify(data).length;
  if (n > DOC_MAX_CHARS) {
    throw new RugTooBigError(
      `${what} comes to about ${Math.round(n / 1000)} KB, over the ${DOC_MAX_CHARS / 1000} KB I allow per document. ` +
        "Nothing was saved. Try bigger cells or a bigger minimum detail."
    );
  }
}

// ── Reading ────────────────────────────────────────────────────────────

export function useRugifySettings() {
  const [s, setS, status] = useSyncedState("rugify", SETTINGS_DEFAULT);
  return { settings: { ...SETTINGS_DEFAULT, ...s }, setSettings: setS, status };
}

export function useRugs() {
  const [rugs, setRugs] = useState([]);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let alive = true;
    let unsub = () => {};
    uidReady.then((uid) => {
      if (!alive) return;
      unsub = onSnapshot(
        rugsCol(uid),
        { includeMetadataChanges: true },
        (snap) => {
          setRugs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
  return { rugs, status };
}

// The stored source photo: undefined while loading, null if missing.
export function useRugSource(id) {
  const [full, setFull] = useState(undefined);
  useEffect(() => {
    if (!id) return;
    setFull(undefined);
    let alive = true;
    let unsub = () => {};
    uidReady.then((uid) => {
      if (!alive) return;
      unsub = onSnapshot(
        sourceRef(uid, id),
        (snap) => setFull(snap.exists() ? snap.data().full : null),
        () => setFull(null)
      );
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [id]);
  return full;
}

// ── Writing ────────────────────────────────────────────────────────────

// Shrink a picked photo for storage. Throws PhotoTooBigError (with a message
// to show) if it can't get under the limit at a usable size.
export const prepareRugSource = (file) =>
  preparePhoto(file, { fullEdge: SOURCE_EDGE, minEdge: SOURCE_MIN_EDGE });

export async function createRug(fields, source) {
  const uid = await uidReady;
  const ref = doc(rugsCol(uid));
  const now = Date.now();
  const data = {
    v: 1,
    name: "Untitled rug",
    crop: { shape: "rect", cx: 0.5, cy: 0.5, z: 1 },
    size: { wCm: 60, hCm: 80 },
    palette: { allowed: [], maxColors: 5, mode: "auto", snapshot: {} },
    settings: { cellMm: SETTINGS_DEFAULT.cellMm, minDetailMm: SETTINGS_DEFAULT.minDetailMm },
    thumb: null,
    locked: null,
    ...fields,
    source: { w: source.width, h: source.height },
    createdAt: now,
    updatedAt: now,
  };
  guardSize({ full: source.full }, "The photo");
  guardSize(data, "This project");
  const batch = writeBatch(db);
  batch.set(ref, data);
  batch.set(sourceRef(uid, ref.id), { full: source.full });
  settle(batch.commit());
  return ref.id;
}

// Top-level fields are replaced whole (crop, size, palette, settings…).
export async function updateRug(id, patch) {
  const uid = await uidReady;
  const data = { ...patch, updatedAt: Date.now() };
  guardSize(data, "This change");
  const batch = writeBatch(db);
  batch.update(rugRef(uid, id), data);
  settle(batch.commit());
}

// Freeze a pattern. `locked` comes from lockedFromResult() in rugify/lock.js:
// { v, at, w, h, cellMm, shape, wCm, hCm, legend, cells, hash }.
export const lockRug = (id, locked) => updateRug(id, { locked });
export const unlockRug = (id) => updateRug(id, { locked: null });

// The project and its source photo go together: nothing orphaned.
export async function deleteRug(id) {
  const uid = await uidReady;
  const batch = writeBatch(db);
  batch.delete(rugRef(uid, id));
  batch.delete(sourceRef(uid, id));
  settle(batch.commit());
}
