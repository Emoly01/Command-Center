import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";

/* ── SNARK DATABASE ── */
const S = {
  greeting: [
    "Look who crawled out of the blanket fort. Ready to be productive, or are we just here for the vibes?",
    "Ah, there she is. The Goblin Queen graces her study den. The foxes are honored.",
    "You opened the app. That counts as progress. I’m proud. Mildly.",
    "Before you spiral into seventeen tabs — pick one thing. Just one. I’ll be here.",
    "Welcome back, Kadan. The embers kept your seat warm.",
    "Oh good, you’re here. I was starting to worry you’d been kidnapped by your crochet pile."
  ],
  focus: [
    "Twenty-five minutes. You and me. The world can wait.",
    "Timer’s running. No checking your phone. I’m watching.",
    "You’ve got this. And if you don’t, I’ve got you. But you’ve got this.",
    "Focus mode: activated. Overthinking mode: absolutely not allowed.",
    "The fox guards the den. Nothing gets through until the timer ends."
  ],
  break_time: [
    "Breathe. Stretch. Look at something that isn’t a screen. Yes, that includes me.",
    "Break time. Go pet a cat. Doctor’s orders. Well, fox’s orders.",
    "You earned this. Five minutes of doing absolutely nothing. I insist.",
    "Stand up. Your spine is not a question mark, little rabbit.",
    "Go drink water. Don’t make me say it twice. …I’ll say it twice."
  ],
  h0: [
    "Two glasses. That’s the deal. Don’t make me beg.",
    "The glasses are empty and judging you.",
    "Water. Now. I’m not asking."
  ],
  h1: [
    "One down, one to go. You’re halfway to being a functional organism.",
    "Glass one conquered. The second one is giving you eyes.",
    "Progress. Beautiful, wet progress."
  ],
  h2: [
    "Both glasses done. I’m unreasonably proud of you right now.",
    "Hydrated queen. The cells are thriving. The fox approves.",
    "Look at you, drinking water like a person who loves themselves."
  ],
  done: [
    "Everything crossed off. You absolute menace. I’m so proud I could combust.",
    "Task list: decimated. Goblin Queen: victorious. Fox: smug.",
    "Done? All of it? …Who are you and what have you done with my rabbit?"
  ]
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ── AMBIENT DEFINITIONS ── */
const ambients = [
  { id: "rain", icon: "\u{1F327}️", label: "rain", freq: 3000, q: 0.5, ftype: "bandpass", vol: 0.3 },
  { id: "fire", icon: "\u{1F525}", label: "hearth", freq: 400, q: 1, ftype: "lowpass", vol: 0.2 },
  { id: "wind", icon: "\u{1F343}", label: "wind", freq: 800, q: 0.3, ftype: "lowpass", vol: 0.15 },
  { id: "thunder", icon: "⛈️", label: "thunder", freq: 200, q: 2, ftype: "lowpass", vol: 0.25 },
  { id: "night", icon: "\u{1F31F}", label: "night", freq: 5000, q: 2, ftype: "bandpass", vol: 0.08 },
  { id: "stream", icon: "\u{1F4A7}", label: "stream", freq: 2000, q: 0.8, ftype: "bandpass", vol: 0.2 }
];

/* ── CHIME ── */
function playChime() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now + i * 0.15);
    g.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 1.5);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 1.6);
  });
  setTimeout(() => {
    const ctx2 = new AC();
    const now2 = ctx2.currentTime;
    [783.99, 659.25, 523.25].forEach((freq, i) => {
      const osc = ctx2.createOscillator();
      const g = ctx2.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now2 + i * 0.12);
      g.gain.linearRampToValueAtTime(0.08, now2 + i * 0.12 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now2 + i * 0.12 + 1.2);
      osc.connect(g);
      g.connect(ctx2.destination);
      osc.start(now2 + i * 0.12);
      osc.stop(now2 + i * 0.12 + 1.3);
    });
  }, 800);
}

/* ── EMBER PARTICLES ── */
function spawnEmbers(n = 3) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "fixed",
      borderRadius: "50%",
      background: "#D85A30",
      pointerEvents: "none",
      zIndex: "9999",
      left: 20 + Math.random() * 60 + "%",
      bottom: 10 + Math.random() * 30 + "%",
      width: (2 + Math.random() * 3) + "px",
      height: (2 + Math.random() * 3) + "px",
      animation: "ember-drift " + (2 + Math.random() * 2) + "s ease-out forwards",
      animationDelay: Math.random() * 0.5 + "s"
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
}

/* ── STYLES ── */
const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@400;500;600&display=swap');
@keyframes ember-drift {
  0% { transform: translateY(0) scale(1); opacity: 0.7; }
  100% { transform: translateY(-80px) scale(0.2); opacity: 0; }
}
@keyframes crack-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}
body, html { margin:0; padding:0; }
`;

const t = {
  root: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    background: "#0d0a07",
    color: "#d4cdc4",
    minHeight: "100vh",
    position: "relative",
    overflowX: "hidden"
  },
  rootBg: {
    position: "fixed", inset: 0,
    background: "radial-gradient(ellipse at 20% 50%, rgba(216,90,48,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(239,159,39,0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(186,117,23,0.03) 0%, transparent 40%)",
    pointerEvents: "none"
  },
  crack: (top, left, width, delay) => ({
    position: "fixed", top, left, width,
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(239,159,39,0.15), transparent)",
    animation: `crack-glow 4s ease-in-out infinite ${delay}s`,
    pointerEvents: "none"
  }),
  container: {
    position: "relative", zIndex: 1,
    maxWidth: 520, margin: "0 auto",
    padding: "24px 16px 100px"
  },
  header: { textAlign: "center", padding: "32px 0 24px", animation: "fadeIn 0.8s ease" },
  headerIcon: { fontSize: 32, marginBottom: 8, animation: "breathe 3s ease-in-out infinite", display: "inline-block" },
  h1: { fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 300, fontSize: 28, color: "#d4cdc4", letterSpacing: 1, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#6b6259", letterSpacing: 2 },
  card: {
    background: "#231c15",
    border: "0.5px solid rgba(239,159,39,0.1)",
    borderRadius: 12, padding: 20, marginBottom: 16,
    animation: "fadeIn 0.6s ease both",
    position: "relative", overflow: "hidden"
  },
  cardGlow: {
    position: "absolute", top: 0, left: 0, right: 0, height: 1,
    background: "linear-gradient(90deg, transparent, rgba(239,159,39,0.2), transparent)"
  },
  label: {
    fontSize: 11, letterSpacing: 2, color: "#6b6259",
    textTransform: "uppercase", marginBottom: 12,
    display: "flex", alignItems: "center", gap: 8
  },
  dot: (c) => ({ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }),

  pomoTime: (running, phase) => ({
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontSize: 64, fontWeight: 300,
    color: running ? (phase === "focus" ? "#EF9F27" : "#5DCAA5") : "#d4cdc4",
    letterSpacing: 4, lineHeight: 1, marginBottom: 8,
    transition: "color 0.3s ease", textAlign: "center"
  }),
  pomoPhase: {
    fontSize: 13, color: "#6b6259", marginBottom: 20,
    fontStyle: "italic", fontFamily: "'Crimson Pro', Georgia, serif",
    textAlign: "center"
  },
  pomoControls: { display: "flex", gap: 8, justifyContent: "center" },
  btn: {
    background: "transparent",
    border: "0.5px solid rgba(239,159,39,0.25)",
    color: "#d4cdc4", padding: "10px 24px",
    borderRadius: 8, fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: 13, cursor: "pointer", letterSpacing: 1,
    transition: "all 0.2s ease"
  },
  btnPrimary: {
    background: "rgba(216,90,48,0.15)",
    border: "0.5px solid #D85A30",
    color: "#EF9F27", padding: "10px 24px",
    borderRadius: 8, fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: 13, cursor: "pointer", letterSpacing: 1
  },
  pomoDots: { display: "flex", gap: 6, justifyContent: "center", marginTop: 16 },
  pomoDot: (filled) => ({
    width: 8, height: 8, borderRadius: "50%",
    border: "1px solid #993C1D",
    background: filled ? "#D85A30" : "transparent",
    borderColor: filled ? "#D85A30" : "#993C1D",
    boxShadow: filled ? "0 0 8px rgba(216,90,48,0.4)" : "none",
    transition: "all 0.3s ease"
  }),

  hydRow: { display: "flex", alignItems: "center", gap: 16 },
  glasses: { display: "flex", gap: 8 },
  glass: (filled) => ({
    width: 36, height: 44,
    border: `1px solid ${filled ? "rgba(93,202,165,0.5)" : "#6b6259"}`,
    borderRadius: "4px 4px 6px 6px",
    cursor: "pointer", position: "relative",
    overflow: "hidden", transition: "all 0.3s ease",
    background: "transparent"
  }),
  glassFill: (filled) => ({
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: filled ? "85%" : "0%",
    background: "linear-gradient(to top, rgba(93,202,165,0.5), rgba(133,183,235,0.3))",
    transition: "height 0.4s ease",
    borderRadius: "0 0 4px 4px"
  }),
  hydMsg: {
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontSize: 14, fontStyle: "italic",
    color: "#9e958a", lineHeight: 1.5, flex: 1
  },

  ambGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  ambBtn: (active) => ({
    background: active ? "rgba(216,90,48,0.08)" : "#1a1410",
    border: `0.5px solid ${active ? "#D85A30" : "rgba(239,159,39,0.08)"}`,
    borderRadius: 8, padding: "14px 8px",
    textAlign: "center", cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: active ? "#EF9F27" : "#9e958a",
    fontSize: 12
  }),
  ambIcon: { fontSize: 20, marginBottom: 4, display: "block" },
  volRow: { marginTop: 10, display: "flex", alignItems: "center", gap: 10 },
  volLabel: { fontSize: 11, color: "#6b6259", letterSpacing: 1, minWidth: 50 },
  volSlider: {
    flex: 1, WebkitAppearance: "none", appearance: "none",
    height: 3, background: "rgba(239,159,39,0.15)",
    borderRadius: 2, outline: "none"
  },

  taskRow: { display: "flex", gap: 8, marginBottom: 12 },
  taskInput: {
    flex: 1, background: "#1a1410",
    border: "0.5px solid rgba(239,159,39,0.12)",
    borderRadius: 8, padding: "10px 14px",
    color: "#d4cdc4", fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: 14, outline: "none"
  },
  taskAddBtn: {
    background: "rgba(216,90,48,0.15)",
    border: "0.5px solid #D85A30",
    color: "#EF9F27", padding: "10px 16px",
    borderRadius: 8, cursor: "pointer",
    fontSize: 16, fontFamily: "'DM Sans', system-ui, sans-serif",
    lineHeight: 1
  },
  taskItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 0",
    borderBottom: "0.5px solid rgba(239,159,39,0.06)",
    animation: "fadeIn 0.3s ease"
  },
  taskCheck: (done) => ({
    width: 18, height: 18,
    border: `1px solid ${done ? "#D85A30" : "#6b6259"}`,
    borderRadius: 4, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "all 0.2s ease",
    background: done ? "rgba(216,90,48,0.2)" : "transparent",
    color: done ? "#EF9F27" : "transparent",
    fontSize: 11
  }),
  taskText: (done) => ({
    flex: 1, fontSize: 14,
    color: done ? "#6b6259" : "#d4cdc4",
    textDecoration: done ? "line-through" : "none",
    transition: "all 0.3s ease"
  }),
  taskRm: {
    background: "none", border: "none",
    color: "#6b6259", cursor: "pointer",
    fontSize: 14, padding: 4,
    fontFamily: "'DM Sans', system-ui, sans-serif"
  },
  empty: {
    textAlign: "center", padding: 16,
    color: "#6b6259",
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontStyle: "italic", fontSize: 14
  },

  snarkRow: { display: "flex", gap: 14, alignItems: "flex-start" },
  snarkAvatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg, #0d0a07, #993C1D)",
    border: "1px solid rgba(239,159,39,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, flexShrink: 0
  },
  snarkText: {
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontSize: 15, fontStyle: "italic",
    lineHeight: 1.6, color: "#9e958a"
  },
  snarkBtn: {
    background: "none", border: "none",
    color: "#6b6259", fontSize: 11,
    cursor: "pointer", marginTop: 8,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    letterSpacing: 1, padding: 0
  },
  back: {
    position: "fixed", top: 14, left: 14, zIndex: 50,
    color: "#9e958a", textDecoration: "none", fontSize: 13,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    border: "0.5px solid rgba(239,159,39,0.25)",
    padding: "6px 12px", borderRadius: 8,
    background: "rgba(13,10,7,0.6)"
  }
};

/* ── MAIN COMPONENT ── */
export default function Fox() {
  const [snark, setSnark] = useState(() => pick(S.greeting));
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("focus");
  const [completed, setCompleted] = useState(0);
  const [label, setLabel] = useState("ready when you are");
  const timerRef = useRef(null);

  const [water, setWater] = useState([false, false]);
  const [wMsg, setWMsg] = useState(() => pick(S.h0));

  const [actAmb, setActAmb] = useState({});
  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const [vol, setVol] = useState(40);

  const [tasks, setTasks] = useState(() => {
    try { const s = localStorage.getItem("efox_tasks"); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const [inp, setInp] = useState("");

  // Inject global CSS + range slider styles
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = globalCSS + `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px; height: 14px;
        border-radius: 50%;
        background: #D85A30;
        cursor: pointer;
        box-shadow: 0 0 6px rgba(216,90,48,0.4);
      }
    `;
    document.head.appendChild(style);
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    const iv = setInterval(() => spawnEmbers(1), 8000);
    return () => { clearInterval(iv); style.remove(); };
  }, []);

  useEffect(() => {
    try { localStorage.setItem("efox_tasks", JSON.stringify(tasks)); } catch {}
  }, [tasks]);

  // Silence any ambient loops and release the audio context when leaving the den.
  useEffect(() => {
    return () => {
      Object.values(actAmb).forEach((a) => {
        try { a.source.stop(); } catch {}
      });
      if (ctxRef.current) {
        try { ctxRef.current.close(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setSecs((p) => {
        if (p <= 1) {
          clearInterval(timerRef.current);
          setRunning(false);
          playChime();
          if (phase === "focus") {
            setCompleted((c) => {
              const nx = Math.min(c + 1, 4);
              setSecs(nx % 4 === 0 ? 15 * 60 : 5 * 60);
              return nx;
            });
            setPhase("break");
            setLabel("break time — you earned it");
            setSnark(pick(S.break_time));
            spawnEmbers(5);
          } else {
            setPhase("focus");
            setSecs(25 * 60);
            setLabel("ready for another round?");
            setSnark(pick(S.focus));
          }
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [running, phase]);

  const togglePomo = () => {
    if (running) {
      clearInterval(timerRef.current);
      setRunning(false);
      setLabel("paused");
    } else {
      setRunning(true);
      setLabel(phase === "focus" ? "deep in it" : "breathe, little rabbit");
      setSnark(pick(phase === "focus" ? S.focus : S.break_time));
    }
  };
  const resetPomo = () => {
    clearInterval(timerRef.current);
    setRunning(false);
    setPhase("focus");
    setSecs(25 * 60);
    setLabel("ready when you are");
  };
  const skipPhase = () => {
    clearInterval(timerRef.current);
    setRunning(false);
    if (phase === "focus") {
      setCompleted((c) => Math.min(c + 1, 4));
      setPhase("break");
      setSecs(5 * 60);
      setLabel("skipped to break");
      setSnark(pick(S.break_time));
    } else {
      setPhase("focus");
      setSecs(25 * 60);
      setLabel("back to focus");
    }
  };

  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

  // Water
  const tapWater = (i) => {
    const nx = [...water];
    nx[i] = !nx[i];
    setWater(nx);
    const c = nx.filter(Boolean).length;
    setWMsg(pick(c === 0 ? S.h0 : c === 1 ? S.h1 : S.h2));
    if (c === 2) spawnEmbers(3);
  };

  // Audio
  const initAudio = useCallback(() => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new AC();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.gain.value = vol / 100;
      gainRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
  }, []);

  const toggleAmb = (d) => {
    initAudio();
    const ctx = ctxRef.current;
    if (actAmb[d.id]) {
      actAmb[d.id].source.stop();
      setActAmb((p) => { const n = { ...p }; delete n[d.id]; return n; });
    } else {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = d.ftype;
      f.frequency.value = d.freq;
      f.Q.value = d.q;
      const g = ctx.createGain();
      g.gain.value = d.vol;
      src.connect(f);
      f.connect(g);
      g.connect(gainRef.current);
      src.start();
      setActAmb((p) => ({ ...p, [d.id]: { source: src, filter: f, gain: g } }));
    }
  };

  const handleVol = (v) => {
    setVol(v);
    if (gainRef.current) gainRef.current.gain.value = v / 100;
  };

  // Tasks
  const addTask = () => {
    const text = inp.trim();
    if (!text) return;
    setTasks((p) => [...p, { text, done: false }]);
    setInp("");
  };
  const toggleTask = (i) => {
    setTasks((p) => {
      const n = [...p];
      n[i] = { ...n[i], done: !n[i].done };
      if (n.length > 0 && n.every((x) => x.done)) {
        setSnark(pick(S.done));
        spawnEmbers(6);
      }
      return n;
    });
  };
  const rmTask = (i) => setTasks((p) => p.filter((_, idx) => idx !== i));

  const btnLabel = running ? "pause" : secs < (phase === "focus" ? 25 * 60 : 5 * 60) && !running ? "resume" : "begin";

  return (
    <div style={t.root}>
      <div style={t.rootBg} />
      <Link to="/" style={t.back}>← Hearth</Link>
      <div style={t.crack("18%", "5%", "35%", 0)} />
      <div style={t.crack("45%", "55%", "40%", 1.5)} />
      <div style={t.crack("72%", "10%", "25%", 3)} />
      <div style={t.crack("88%", "60%", "30%", 2)} />

      <div style={t.container}>
        {/* Header */}
        <div style={t.header}>
          <div style={t.headerIcon}>{"\u{1F525}"}</div>
          <h1 style={t.h1}>Ember Fox Companion</h1>
          <p style={t.subtitle}>the cozy work den</p>
        </div>

        {/* Snark */}
        <div style={t.card}>
          <div style={t.cardGlow} />
          <div style={t.snarkRow}>
            <div style={t.snarkAvatar}>{"\u{1F98A}"}</div>
            <div>
              <div style={t.snarkText}>{snark}</div>
              <button style={t.snarkBtn} onClick={() => setSnark(pick(S.greeting))}>
                new wisdom →
              </button>
            </div>
          </div>
        </div>

        {/* Pomodoro */}
        <div style={t.card}>
          <div style={t.cardGlow} />
          <div style={t.label}><span style={t.dot("#993C1D")} />focus timer</div>
          <div style={{ padding: "16px 0" }}>
            <div style={t.pomoTime(running, phase)}>{fmt(secs)}</div>
            <div style={t.pomoPhase}>{label}</div>
            <div style={t.pomoControls}>
              <button style={t.btnPrimary} onClick={togglePomo}>{btnLabel}</button>
              <button style={t.btn} onClick={resetPomo}>reset</button>
              <button style={t.btn} onClick={skipPhase}>skip</button>
            </div>
            <div style={t.pomoDots}>
              {[0, 1, 2, 3].map((i) => <div key={i} style={t.pomoDot(i < completed)} />)}
            </div>
          </div>
        </div>

        {/* Hydration */}
        <div style={t.card}>
          <div style={t.cardGlow} />
          <div style={t.label}><span style={t.dot("#5DCAA5")} />hydration check</div>
          <div style={t.hydRow}>
            <div style={t.glasses}>
              {water.map((f, i) => (
                <div key={i} style={t.glass(f)} onClick={() => tapWater(i)}>
                  <div style={t.glassFill(f)} />
                </div>
              ))}
            </div>
            <div style={t.hydMsg}>{wMsg}</div>
          </div>
        </div>

        {/* Ambient */}
        <div style={t.card}>
          <div style={t.cardGlow} />
          <div style={t.label}><span style={t.dot("#BA7517")} />ambient</div>
          <div style={t.ambGrid}>
            {ambients.map((d) => (
              <div key={d.id} style={t.ambBtn(!!actAmb[d.id])} onClick={() => toggleAmb(d)}>
                <span style={t.ambIcon}>{d.icon}</span>
                {d.label}
              </div>
            ))}
          </div>
          <div style={t.volRow}>
            <label style={t.volLabel}>volume</label>
            <input type="range" min="0" max="100" value={vol} step="5"
              style={t.volSlider}
              onChange={(e) => handleVol(Number(e.target.value))} />
          </div>
        </div>

        {/* Tasks */}
        <div style={t.card}>
          <div style={t.cardGlow} />
          <div style={t.label}><span style={t.dot("#EF9F27")} />study tasks</div>
          <div style={t.taskRow}>
            <input style={t.taskInput} placeholder="what needs doing, little rabbit?"
              value={inp} onChange={(e) => setInp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()} />
            <button style={t.taskAddBtn} onClick={addTask}>+</button>
          </div>
          {tasks.length === 0 ? (
            <div style={t.empty}>nothing yet. suspicious.</div>
          ) : (
            tasks.map((x, i) => (
              <div key={i} style={t.taskItem}>
                <button style={t.taskCheck(x.done)} onClick={() => toggleTask(i)}>
                  {x.done ? "✓" : ""}
                </button>
                <span style={t.taskText(x.done)}>{x.text}</span>
                <button style={t.taskRm} onClick={() => rmTask(i)}>{"×"}</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
