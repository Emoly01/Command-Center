import { useEffect, useState } from "react";

// The Hearth's day runs on Berlin time, so "today" flips at local midnight —
// not at 01:00/02:00 like a UTC date would.
export const HEARTH_TZ = "Europe/Berlin";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: HEARTH_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// YYYY-MM-DD for the given instant, in Berlin.
export function dayKeyAt(date = new Date()) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

// ── Day override for testing rollover ──────────────────────────────────
// ?day=YYYY-MM-DD pretends it's that day (sticks for the tab via
// sessionStorage, so it survives in-app navigation). ?day=off clears it.
// Only honoured in `npm run dev`, or in builds made with
// VITE_ALLOW_DAY_OVERRIDE=true (e.g. Vercel Preview env only). Production
// builds strip this branch entirely.
const OVERRIDE_ALLOWED =
  import.meta.env.DEV || import.meta.env.VITE_ALLOW_DAY_OVERRIDE === "true";
const OVERRIDE_KEY = "hearth:dayOverride";

function dayOverride() {
  if (!OVERRIDE_ALLOWED || typeof window === "undefined") return null;
  try {
    const q = new URLSearchParams(window.location.search).get("day");
    if (q === "off") sessionStorage.removeItem(OVERRIDE_KEY);
    else if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) sessionStorage.setItem(OVERRIDE_KEY, q);
    return sessionStorage.getItem(OVERRIDE_KEY);
  } catch {
    return null;
  }
}

// Today's key — the one every per-day record should be filed under.
export function todayKey() {
  return dayOverride() || dayKeyAt();
}

// Re-renders when the day changes: checks every 30s and the moment the tab
// comes back (background timers get throttled, so midnight can slip past).
export function useToday() {
  const [key, setKey] = useState(todayKey);
  useEffect(() => {
    const check = () => setKey(todayKey());
    const id = setInterval(check, 30000);
    const onVis = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", check);
    };
  }, []);
  return key;
}
