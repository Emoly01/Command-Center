import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  linkWithPopup,
  signInWithCredential,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

// ── Your existing project: dnd-tools-1dd87 ──────────────────────────
// These values are safe to ship in client code (Firebase web config is
// public by design — real protection comes from Firestore Security Rules).
// Fill these in from Firebase Console → Project settings → Your apps → SDK config.
const firebaseConfig = {
  apiKey: "AIzaSyDNgGC-3qksHbOWsKcEh50_5ZE6wH3n8aQ",
  authDomain: "dnd-tools-1dd87.firebaseapp.com",
  projectId: "dnd-tools-1dd87",
  storageBucket: "dnd-tools-1dd87.appspot.com",
  messagingSenderId: "866582352851",
  appId: "1:866582352851:web:269ec8b40fc5764425d526",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Resolves to the signed-in uid. Every tool waits on this so reads/writes
// always land under the same identity.
//
// A browser starts out anonymous. That identity lives only in this browser's
// storage: clear site data (or let iOS Safari expire it) and it's gone, and a
// second device gets a different one. Linking Google (linkGoogle below) keeps
// the same uid, so nothing moves, and lets other devices sign in to it.
let uidResolve;
export const uidReady = new Promise((res) => (uidResolve = res));

onAuthStateChanged(auth, (user) => {
  if (user) uidResolve(user.uid);
  // Only go anonymous when nobody is signed in. Calling signInAnonymously
  // over a Google session would replace it with a fresh anonymous user.
  else signInAnonymously(auth).catch((e) => console.error("anon auth failed", e));
});

// Per-user collections a second device brings along when it signs in to an
// account that already exists. See linkGoogle.
const CARRY_OVER = ["tools"];

// Bind this browser's identity to Google.
//
// First device: links in place → same uid, same data. { switched: false }
//
// Any later device: Google is already bound to the first device's uid, so
// linking fails with credential-already-in-use. Then we read this browser's
// anonymous docs, sign in to the Google account, and copy over only the docs
// that account doesn't have yet. Nothing is overwritten, and the anonymous
// copies stay where they were. → { switched: true, copied, kept }
// The caller should reload, since live subscriptions still point at the old uid.
export async function linkGoogle() {
  const user = auth.currentUser;
  if (!user) throw new Error("not signed in yet");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await linkWithPopup(user, provider);
    return { switched: false };
  } catch (e) {
    if (e.code !== "auth/credential-already-in-use") throw e;
    const cred = GoogleAuthProvider.credentialFromError(e);
    if (!cred) throw e;

    const oldUid = user.uid;
    const local = [];
    for (const name of CARRY_OVER) {
      const snap = await getDocsFromServer(collection(db, "users", oldUid, name));
      snap.forEach((d) => local.push({ name, id: d.id, data: d.data() }));
    }

    await signInWithCredential(auth, cred);
    const newUid = auth.currentUser.uid;

    const copied = [];
    const kept = [];
    for (const d of local) {
      const target = doc(db, "users", newUid, d.name, d.id);
      const label = `${d.name}/${d.id}`;
      if ((await getDocFromServer(target)).exists()) kept.push(label);
      else {
        await setDoc(target, d.data);
        copied.push(label);
      }
    }
    return { switched: true, copied, kept };
  }
}

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
