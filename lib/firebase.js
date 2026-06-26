import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

// ── Your existing project: dnd-tools-1dd87 ──────────────────────────
// These values are safe to ship in client code (Firebase web config is
// public by design — real protection comes from Firestore Security Rules).
// Fill these in from Firebase Console → Project settings → Your apps → SDK config.
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "dnd-tools-1dd87.firebaseapp.com",
  projectId: "dnd-tools-1dd87",
  storageBucket: "dnd-tools-1dd87.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const auth = getAuth(app);

// Resolves to the anonymous uid once signed in. Every tool waits on this
// so reads/writes always land under the same per-device-shared identity.
let uidResolve;
export const uidReady = new Promise((res) => (uidResolve = res));

onAuthStateChanged(auth, (user) => {
  if (user) uidResolve(user.uid);
});
signInAnonymously(auth).catch((e) => console.error("anon auth failed", e));

// Path convention: users/{uid}/tools/{toolId}  (one doc per tool)
function toolDoc(uid, toolId) {
  return doc(db, "users", uid, "tools", toolId);
}

// One-shot read with a fallback default.
export async function loadTool(toolId, fallback = {}) {
  const uid = await uidReady;
  const snap = await getDoc(toolDoc(uid, toolId));
  return snap.exists() ? { ...fallback, ...snap.data() } : fallback;
}

// Write (merge) — safe to call often; merge avoids clobbering other fields.
export async function saveTool(toolId, data) {
  const uid = await uidReady;
  await setDoc(toolDoc(uid, toolId), data, { merge: true });
}

// Live subscription — fires immediately and on every cross-device change.
export async function subscribeTool(toolId, fallback, cb) {
  const uid = await uidReady;
  return onSnapshot(toolDoc(uid, toolId), (snap) => {
    cb(snap.exists() ? { ...fallback, ...snap.data() } : fallback);
  });
}
