import { useEffect, useRef, useState } from "react";
import ToolFrame from "../ToolFrame";
import { useSyncedState } from "../lib/useSyncedState";

const today = () => new Date().toISOString().slice(0, 10);
const MIN = 60000;

const DEFAULT = {
  intervalMin: 45,
  sound: true,
  activeHours: { enabled: false, start: "08:00", end: "22:00" },
  running: false,
  endsAt: null,        // ms timestamp the next nudge fires (when running)
  remainingMs: null,   // frozen remaining when paused
  moves: { date: today(), count: 0 },
};

// Cheeky-but-kind nudges. The fox does not negotiate.
const NUDGES = [
  "Up you get — walk it off, your circulation will thank you.",
  "Stand and stretch, little rabbit. The chair will survive without you.",
  "Movement break! Go bother a cat for thirty seconds.",
  "Your spine filed a complaint. Time to stand.",
  "Get up, wander, hydrate the legs. Two minutes, then back to it.",
  "The embers say: rise. Even one lap of the room counts.",
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Whether `t` falls inside the configured active window (handles overnight ranges).
function withinHours(ah, t) {
  if (!ah?.enabled) return true;
  const d = new Date(t);
  const cur = d.getHours() * 60 + d.getMinutes();
  const [sh, sm] = ah.start.split(":").map(Number);
  const [eh, em] = ah.end.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return true;
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end; // wraps past midnight
}

function fmt(ms) {
  const tot = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(tot / 60);
  const s = tot % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Soft two-note chime via Web Audio — self-contained, no asset needed.
function chime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const now = ctx.currentTime;
    [659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const at = now + i * 0.18;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.12, at + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, at + 1.1);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 1.2);
    });
    setTimeout(() => { try { ctx.close(); } catch {} }, 1600);
  } catch {}
}

export default function Movement() {
  const [s, setS, status] = useSyncedState("movement", DEFAULT);
  const [now, setNow] = useState(Date.now());
  const [banner, setBanner] = useState(null);
  const [perm, setPerm] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  // Latest state + fire handler kept in refs so the 1s tick reads fresh values
  // without re-subscribing the interval.
  const sRef = useRef(s);
  sRef.current = s;
  const fireRef = useRef(() => {});

  // Daily reset of the "got up today" counter.
  useEffect(() => {
    if (s.moves.date !== today()) {
      setS((p) => ({ ...p, moves: { date: today(), count: 0 } }));
    }
  }, [s.moves.date]); // eslint-disable-line react-hooks/exhaustive-deps

  const showNotification = (text) => {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("The Hearth — move!", { body: text });
      }
    } catch {}
  };

  // A nudge fires: alert (if inside active hours), then roll the loop forward.
  fireRef.current = () => {
    const st = sRef.current;
    const t = Date.now();
    const line = pick(NUDGES);
    if (withinHours(st.activeHours, t)) {
      showNotification(line);
      setBanner(line);
      if (st.sound) chime();
    }
    setS((p) => ({ ...p, endsAt: t + p.intervalMin * MIN }));
  };

  // 1s tick: advance the display clock and check the timestamp deadline.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const st = sRef.current;
      if (st.running && st.endsAt && t >= st.endsAt) fireRef.current();
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Re-check the deadline the instant the tab is refocused (timers throttle in
  // background tabs, so the deadline may have passed unnoticed).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) return;
      const t = Date.now();
      setNow(t);
      const st = sRef.current;
      if (st.running && st.endsAt && t >= st.endsAt) fireRef.current();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const requestPerm = () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then(setPerm).catch(() => {});
    } else {
      setPerm(Notification.permission);
    }
  };

  // ── Controls ──────────────────────────────────────────────────────────────
  const start = () => {
    requestPerm();
    setS((p) => {
      const t = Date.now();
      const ms = p.remainingMs ?? p.intervalMin * MIN;
      return { ...p, running: true, endsAt: t + ms, remainingMs: null };
    });
  };
  const pause = () =>
    setS((p) => {
      const t = Date.now();
      return { ...p, running: false, remainingMs: Math.max(0, (p.endsAt ?? t) - t), endsAt: null };
    });
  const reset = () => {
    setBanner(null);
    setS((p) => {
      const t = Date.now();
      const ms = p.intervalMin * MIN;
      return { ...p, endsAt: p.running ? t + ms : null, remainingMs: p.running ? null : ms };
    });
  };
  const moved = () => {
    setBanner(null);
    setS((p) => {
      const t = Date.now();
      const ms = p.intervalMin * MIN;
      const moves =
        p.moves.date === today()
          ? { ...p.moves, count: p.moves.count + 1 }
          : { date: today(), count: 1 };
      return {
        ...p,
        moves,
        endsAt: p.running ? t + ms : null,
        remainingMs: p.running ? null : ms,
      };
    });
  };

  const changeInterval = (raw) => {
    const m = Math.min(180, Math.max(1, Math.round(Number(raw) || 0)));
    setS((p) => {
      const t = Date.now();
      const ms = m * MIN;
      return { ...p, intervalMin: m, endsAt: p.running ? t + ms : null, remainingMs: p.running ? null : ms };
    });
  };

  const setSound = (v) => setS((p) => ({ ...p, sound: v }));
  const setHours = (patch) =>
    setS((p) => ({ ...p, activeHours: { ...p.activeHours, ...patch } }));

  // ── Derived ───────────────────────────────────────────────────────────────
  const remaining = s.running ? Math.max(0, (s.endsAt ?? now) - now) : (s.remainingMs ?? s.intervalMin * MIN);
  const quiet = withinHours(s.activeHours, now) === false;
  const moveCount = s.moves.date === today() ? s.moves.count : 0;

  const pill = {
    background: "transparent",
    border: "1px solid var(--ash-edge)",
    color: "var(--smoke)",
    borderRadius: 999,
    padding: "8px 18px",
    fontSize: 13,
    cursor: "pointer",
  };
  const pillPrimary = {
    ...pill,
    border: "1px solid var(--ember)",
    color: "var(--gold)",
    background: "rgba(255,122,50,.12)",
  };
  const fieldRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid var(--ash-edge)",
  };
  const input = {
    background: "var(--coal)",
    border: "1px solid var(--ash-edge)",
    color: "var(--bone)",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 14,
    width: 72,
    textAlign: "center",
  };

  return (
    <ToolFrame title="Movement" status={status}>
      {/* In-app nudge banner */}
      {banner && (
        <div
          className="panel"
          style={{
            marginBottom: 14,
            borderColor: "var(--ember)",
            background: "linear-gradient(180deg, rgba(255,122,50,.14), rgba(255,122,50,.05))",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22 }}>🔥</span>
          <span style={{ flex: 1, color: "var(--bone)", fontSize: 14, fontStyle: "italic", fontFamily: "var(--font-display)" }}>
            {banner}
          </span>
          <button style={pillPrimary} onClick={moved}>I moved ✓</button>
        </div>
      )}

      <div className="panel" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--smoke)", margin: "0 0 18px", fontSize: 14 }}>
          {s.running
            ? quiet
              ? "Quiet hours — I'll hold the nudge."
              : "Next nudge in…"
            : "Paused. Start when you sit down to work."}
        </p>

        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 64,
            lineHeight: 1,
            letterSpacing: 2,
            color: s.running && !quiet ? "var(--gold)" : "var(--smoke)",
            marginBottom: 6,
          }}
        >
          {fmt(remaining)}
        </div>
        <div style={{ color: "var(--smoke)", fontSize: 12, marginBottom: 22 }}>
          every {s.intervalMin} min · {moveCount} move{moveCount === 1 ? "" : "s"} today
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {s.running ? (
            <button style={pillPrimary} onClick={pause}>Pause</button>
          ) : (
            <button style={pillPrimary} onClick={start}>Start</button>
          )}
          <button style={pill} onClick={reset}>Reset</button>
          <button style={pill} onClick={moved}>I moved ✓</button>
        </div>

        {perm !== "granted" && perm !== "unsupported" && (
          <div style={{ marginTop: 16 }}>
            {perm === "denied" ? (
              <p style={{ color: "var(--smoke)", fontSize: 12, margin: 0 }}>
                Notifications are blocked in your browser — the in-app banner still appears. Re-enable them in site settings for desktop alerts.
              </p>
            ) : (
              <button style={pill} onClick={requestPerm}>Enable notifications</button>
            )}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="panel" style={{ marginTop: 14 }}>
        <div style={{ color: "var(--smoke)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
          Settings
        </div>

        <div style={fieldRow}>
          <span style={{ fontSize: 14 }}>Interval</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              style={input}
              type="number"
              min="1"
              max="180"
              value={s.intervalMin}
              onChange={(e) => changeInterval(e.target.value)}
            />
            <span style={{ color: "var(--smoke)", fontSize: 13 }}>min</span>
          </span>
        </div>

        <div style={fieldRow}>
          <span style={{ fontSize: 14 }}>Soft chime</span>
          <button
            style={s.sound ? pillPrimary : pill}
            onClick={() => setSound(!s.sound)}
          >
            {s.sound ? "On" : "Off"}
          </button>
        </div>

        <div style={fieldRow}>
          <span style={{ fontSize: 14 }}>Active hours</span>
          <button
            style={s.activeHours.enabled ? pillPrimary : pill}
            onClick={() => setHours({ enabled: !s.activeHours.enabled })}
          >
            {s.activeHours.enabled ? "On" : "Off"}
          </button>
        </div>

        {s.activeHours.enabled && (
          <div style={{ ...fieldRow, borderBottom: "none" }}>
            <span style={{ fontSize: 14, color: "var(--smoke)" }}>Only nudge between</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                style={{ ...input, width: 96 }}
                type="time"
                value={s.activeHours.start}
                onChange={(e) => setHours({ start: e.target.value })}
              />
              <span style={{ color: "var(--smoke)" }}>–</span>
              <input
                style={{ ...input, width: 96 }}
                type="time"
                value={s.activeHours.end}
                onChange={(e) => setHours({ end: e.target.value })}
              />
            </span>
          </div>
        )}
      </div>
    </ToolFrame>
  );
}
