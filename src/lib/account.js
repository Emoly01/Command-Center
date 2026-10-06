import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, linkGoogle } from "./firebase";

const FLASH_KEY = "hearth:accountFlash";

const snapshot = (u) =>
  u ? { uid: u.uid, anonymous: u.isAnonymous, email: u.email || null } : null;

// Who's signed in right now. Linking keeps the same user object (and doesn't
// fire onAuthStateChanged), so bind() refreshes the snapshot itself.
export function useAccount() {
  const [user, setUser] = useState(() => snapshot(auth.currentUser));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(snapshot(u))), []);

  const bind = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await linkGoogle();
      if (res.switched) {
        // Live subscriptions still point at this browser's old anonymous uid.
        writeFlash(carryOverMessage(res));
        window.location.reload();
        return;
      }
      setUser(snapshot(auth.currentUser));
    } catch (e) {
      setError(bindError(e));
    } finally {
      setBusy(false);
    }
  }, []);

  return { user, bind, busy, error };
}

// One-shot message that survives the reload after switching accounts.
export function takeFlash() {
  try {
    const m = sessionStorage.getItem(FLASH_KEY);
    if (m) sessionStorage.removeItem(FLASH_KEY);
    return m;
  } catch {
    return null;
  }
}
function writeFlash(m) {
  try {
    sessionStorage.setItem(FLASH_KEY, m);
  } catch {
    /* private mode: they'll just not get the note */
  }
}

function carryOverMessage({ copied, kept }) {
  const names = (xs) => xs.map((x) => x.split("/").pop()).join(", ");
  if (!copied.length && !kept.length) return "Signed in. This browser had nothing to bring along.";
  const parts = [];
  if (copied.length) parts.push(`Brought over from this browser: ${names(copied)}.`);
  if (kept.length) parts.push(`Your account already had ${names(kept)}, so I kept those as they were.`);
  return parts.join(" ");
}

function bindError(e) {
  switch (e?.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/popup-blocked":
      return "Your browser blocked the Google popup. Allow popups for this site and try again.";
    case "auth/unauthorized-domain":
      return `Firebase doesn't trust this address yet. Add ${window.location.hostname} under Authentication → Settings → Authorized domains.`;
    case "auth/operation-not-allowed":
      return "Google sign-in is switched off. Firebase Console → Authentication → Sign-in method → enable Google.";
    case "auth/network-request-failed":
      return "No connection. Binding needs the internet, sadly.";
    default:
      return `Couldn't bind to Google (${e?.code || e?.message || "unknown error"}).`;
  }
}
