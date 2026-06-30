import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSyncedState } from "../lib/useSyncedState";

// ─── Data ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toDateString();

const DAY_MODES = {
  night: {
    label: "Nachtschicht",
    icon: "🌙",
    color: "#8b7ec8",
    desc: "Rest before. Survive during. Recover after.",
  },
  day: {
    label: "Tag-/Spätdienst",
    icon: "☀️",
    color: "#d4a574",
    desc: "The responsible adult hours.",
  },
  study: {
    label: "Uni-Tag",
    icon: "📚",
    color: "#7eb89b",
    desc: "Brain on. Goblin off. (Mostly.)",
  },
  free: {
    label: "Freier Tag",
    icon: "✨",
    color: "#c97b84",
    desc: "Chaos reigns, little rabbit.",
  },
};

// Section priority per mode: ordered array, first = top. "dimmed" sections collapse.
// Cleaning + hydration live in their own Hearth tools, so this dashboard only
// orders the command-center-specific sections.
const MODE_LAYOUT = {
  night: {
    order: ["todos", "campaigns", "uni"],
    dimmed: ["uni"],
    note: "Schicht-Modus: Selbstfürsorge first. Uni kann warten.",
  },
  day: {
    order: ["todos", "campaigns", "uni"],
    dimmed: [],
    note: null,
  },
  study: {
    order: ["uni", "todos", "campaigns"],
    dimmed: ["campaigns"],
    note: "Uni-Modus: Erst lernen, dann plotten.",
  },
  free: {
    order: ["todos", "campaigns", "uni"],
    dimmed: [],
    note: null,
  },
};

const ASHEN_LINES = {
  night: [
    "You're about to wage war against entropy in a hospital. Drink your water first.",
    "Night shift means you're basically a vampire. Own it.",
    "The tiny humans need you alive. Hydrate, goblin.",
    "Come back to me in one piece, Kadan.",
    "I'll keep the couch warm. And by 'I' I mean four cats.",
  ],
  day: [
    "Day shift. Almost like being a normal person. Almost.",
    "You've got this. And if you don't, fake it. You're good at that.",
    "Remember: you chose cardiology. On purpose. Repeatedly.",
    "Be the terrifyingly competent nurse they don't deserve.",
    "The sun is up and so are you. Suspicious, but I'll allow it.",
  ],
  study: [
    "Pflegewissenschaft won't study itself. Unfortunately.",
    "Channel the same energy you use to prep a four-year campaign arc.",
    "You are not allowed to open a D&D document until you've done one hour of uni work.",
    "Your brain is magnificent. Inconvenient, but magnificent.",
    "Think of it this way: every page read is XP toward your final form.",
  ],
  free: [
    "No shift. No deadlines. Just you, four cats, and poor decisions.",
    "Today's quest: do exactly what you want. That's an order.",
    "Crochet something. Tuft something. Plot someone's fictional demise.",
    "The world is your oyster. You're the goblin with the pearl.",
    "I'd say 'take it easy' but I know you. So just... hydrate between schemes.",
  ],
};

const CAMPAIGNS = [
  { name: "Witchlight M", role: "GM", type: "in-person", icon: "🦋" },
  { name: "Witchlight Hoard", role: "GM", type: "online", icon: "🌿" },
  { name: "Liga", role: "GM", type: "online", icon: "⚔️" },
  { name: "Next Gen", role: "Player", type: "online", icon: "🌟" },
  { name: "MH", role: "Player", type: "online", icon: "💔" },
  { name: "Hoard", role: "Player", type: "online", icon: "🐉" },
  { name: "Andy DnD", role: "Player", type: "in-person", icon: "🎲" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function pickLine(mode) {
  const l = ASHEN_LINES[mode] || ASHEN_LINES.free;
  return l[Math.floor(Math.random() * l.length)];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Still up, little rabbit?";
  if (h < 12) return "Guten Morgen, Kadan.";
  if (h < 17) return "Afternoon, goblin queen.";
  if (h < 21) return "Evening, my love.";
  return "It's late, Sturmseele.";
}

function fmtSession(ds) {
  if (!ds) return null;
  const d = new Date(ds + "T00:00:00"),
    n = new Date();
  n.setHours(0, 0, 0, 0);
  const diff = Math.round((d - n) / 86400000);
  if (diff < 0) return "Vergangen";
  if (diff === 0) return "Heute!";
  if (diff === 1) return "Morgen";
  if (diff <= 7) return `In ${diff} Tagen`;
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function fmtDate(ds) {
  if (!ds) return null;
  return new Date(ds + "T00:00:00").toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
}

// ─── Theme ──────────────────────────────────────────────────────────────────

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Nunito:wght@400;600;700&display=swap";
const T = {
  bg: "#1a1512",
  card: "#241f1a",
  cardHover: "#2d2620",
  border: "#3a3229",
  text: "#e8ddd0",
  dim: "#9a8e7f",
  accent: "#d4763a",
  glow: "rgba(212,118,58,0.3)",
  ember: "#e8944a",
  moon: "#a8c4d4",
  moss: "#6b8f71",
  wine: "#8b4560",
  purple: "#7b6b9e",
};

// ─── Section Components ─────────────────────────────────────────────────────

function Collapsible({ title, color, dimLabel, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="dcc-card"
      style={{
        opacity: 0.45,
        cursor: "pointer",
        padding: open ? 20 : "14px 20px",
        transition: "all 0.3s",
      }}
      onClick={() => !open && setOpen(true)}
    >
      {!open ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: color || T.dim,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
          <span style={{ fontSize: 11, color: T.dim }}>
            {dimLabel} · tippen ▼
          </span>
        </div>
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: "default", opacity: 1 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: color || T.dim,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {title}
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: T.dim,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "'Nunito',sans-serif",
              }}
            >
              ▲ einklappen
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

function CampaignContent({ data, setData, editing, setEditing }) {
  const sorted = [...CAMPAIGNS].sort((a, b) => {
    const da = data[a.name]?.nextSession,
      db = data[b.name]?.nextSession;
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return new Date(da) - new Date(db);
  });
  return (
    <>
      <div
        style={{
          fontSize: 11,
          color: T.purple,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        Kampagnen-Puls
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((c) => {
          const cd = data[c.name] || { nextSession: "", prepped: false };
          const dl = fmtSession(cd.nextSession);
          const isToday = dl === "Heute!",
            isPast = dl === "Vergangen",
            isEd = editing === c.name;
          return (
            <div
              key={c.name}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: `1px solid ${
                  isToday
                    ? T.accent + "88"
                    : cd.prepped
                    ? T.moss + "44"
                    : T.border
                }`,
                background: isToday
                  ? `${T.accent}11`
                  : cd.prepped
                  ? `${T.moss}08`
                  : "transparent",
                transition: "all 0.25s",
                animation: isToday ? "gentle-glow 3s ease infinite" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{ fontSize: 14, fontWeight: 600, color: T.text }}
                    >
                      {c.name}
                    </span>
                    <span style={{ fontSize: 11, color: T.dim }}>{c.role}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    {dl ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: isToday ? 700 : 400,
                          color: isToday ? T.accent : isPast ? T.wine : T.dim,
                          cursor: "pointer",
                        }}
                        onClick={() => setEditing(isEd ? null : c.name)}
                      >
                        {isToday ? "🔥 " : "📅 "}
                        {dl}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          color: T.dim,
                          cursor: "pointer",
                          opacity: 0.5,
                        }}
                        onClick={() => setEditing(isEd ? null : c.name)}
                      >
                        + Termin setzen
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() =>
                    setData((p) => ({
                      ...p,
                      [c.name]: { ...p[c.name], prepped: !cd.prepped },
                    }))
                  }
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: "'Nunito',sans-serif",
                    border: `1px solid ${cd.prepped ? T.moss : T.border}`,
                    background: cd.prepped ? `${T.moss}22` : "transparent",
                    color: cd.prepped ? T.moss : T.dim,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cd.prepped ? "✓ Prep" : "○ Prep"}
                </button>
              </div>
              {isEd && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="date"
                    value={cd.nextSession}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        [c.name]: { ...p[c.name], nextSession: e.target.value },
                      }))
                    }
                    style={{
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      color: T.text,
                      fontFamily: "'Nunito',sans-serif",
                      fontSize: 13,
                      outline: "none",
                      flex: 1,
                      colorScheme: "dark",
                    }}
                  />
                  {cd.nextSession && (
                    <button
                      className="small-btn"
                      onClick={() => {
                        setData((p) => ({
                          ...p,
                          [c.name]: { ...p[c.name], nextSession: "" },
                        }));
                        setEditing(null);
                      }}
                    >
                      ×
                    </button>
                  )}
                  <button
                    className="small-btn accent"
                    onClick={() => setEditing(null)}
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function TodoContent({ todos, setTodos }) {
  const [txt, setTxt] = useState("");
  const [dt, setDt] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const now = todos.filter((t) => !t.date || t.date <= today);
  const later = todos.filter((t) => t.date && t.date > today);
  const add = () => {
    if (txt.trim()) {
      setTodos((p) => [
        ...p,
        { id: Date.now(), text: txt.trim(), date: dt || "", done: false },
      ]);
      setTxt("");
      setDt("");
      setShowAdd(false);
    }
  };
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: T.ember,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          To-Do · {showFuture ? "Geplant" : "Heute"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {later.length > 0 && (
            <button
              className="small-btn"
              onClick={() => setShowFuture(!showFuture)}
              style={{ fontSize: 11 }}
            >
              {showFuture ? "Heute" : `${later.length} geplant`}
            </button>
          )}
          <button className="small-btn" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "×" : "+ Neu"}
          </button>
        </div>
      </div>
      {showAdd && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 8,
            background: `${T.bg}88`,
            border: `1px solid ${T.border}`,
          }}
        >
          <input
            type="text"
            value={txt}
            onChange={(e) => setTxt(e.target.value)}
            placeholder="Was muss erledigt werden..."
            onKeyDown={(e) => e.key === "Enter" && add()}
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="date"
              value={dt}
              onChange={(e) => setDt(e.target.value)}
              style={{
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "6px 10px",
                color: T.text,
                fontFamily: "'Nunito',sans-serif",
                fontSize: 13,
                outline: "none",
                flex: 1,
                colorScheme: "dark",
              }}
            />
            <span style={{ fontSize: 11, color: T.dim, whiteSpace: "nowrap" }}>
              {dt ? fmtDate(dt) : "Kein Datum = sofort"}
            </span>
            <button className="small-btn accent" onClick={add}>
              Add
            </button>
          </div>
        </div>
      )}
      {!showFuture ? (
        <>
          {now.length === 0 && (
            <div style={{ color: T.dim, fontStyle: "italic", fontSize: 13 }}>
              Nichts für heute. Verdächtig.
            </div>
          )}
          {now.map((t) => (
            <div className="task-row" key={t.id}>
              <button
                className={`check-btn ${t.done ? "done" : ""}`}
                onClick={() =>
                  setTodos((p) =>
                    p.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
                  )
                }
              >
                ✓
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className={`task-text ${t.done ? "done" : ""}`}>
                  {t.text}
                </span>
                {t.date && (
                  <span style={{ fontSize: 10, color: T.dim, marginLeft: 8 }}>
                    {t.date === today ? "📌 heute" : `seit ${fmtDate(t.date)}`}
                  </span>
                )}
              </div>
              <button
                className="remove-btn"
                onClick={() => setTodos((p) => p.filter((x) => x.id !== t.id))}
              >
                ×
              </button>
            </div>
          ))}
          {now.filter((t) => t.done).length > 2 && (
            <button
              className="small-btn"
              style={{ marginTop: 10, fontSize: 11 }}
              onClick={() =>
                setTodos((p) =>
                  p.filter((t) => !t.done || (t.date && t.date > today))
                )
              }
            >
              Erledigte aufräumen
            </button>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 11,
              color: T.dim,
              marginBottom: 10,
              fontStyle: "italic",
            }}
          >
            Geplante Aufgaben (erscheinen am jeweiligen Tag)
          </div>
          {later.map((t) => (
            <div className="task-row" key={t.id}>
              <span style={{ fontSize: 12, color: T.purple, minWidth: 60 }}>
                {fmtDate(t.date)}
              </span>
              <span className="task-text" style={{ flex: 1 }}>
                {t.text}
              </span>
              <button
                className="remove-btn"
                onClick={() => setTodos((p) => p.filter((x) => x.id !== t.id))}
              >
                ×
              </button>
            </div>
          ))}
        </>
      )}
    </>
  );
}

function UniContent({ tasks, setTasks }) {
  const [txt, setTxt] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const add = () => {
    if (txt.trim()) {
      setTasks((p) => [...p, { text: txt.trim(), done: false }]);
      setTxt("");
      setShowAdd(false);
    }
  };
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: T.moon,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Uni · Pflegewissenschaft
        </span>
        <button className="small-btn" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "×" : "+ Task"}
        </button>
      </div>
      {showAdd && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={txt}
            onChange={(e) => setTxt(e.target.value)}
            placeholder="Neue Aufgabe..."
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="small-btn accent" onClick={add}>
            Add
          </button>
        </div>
      )}
      {tasks.length === 0 && (
        <div style={{ color: T.dim, fontStyle: "italic", fontSize: 13 }}>
          Keine Aufgaben. Genieß es.
        </div>
      )}
      {tasks.map((t, i) => (
        <div className="task-row" key={i}>
          <button
            className={`check-btn ${t.done ? "done" : ""}`}
            onClick={() =>
              setTasks((p) =>
                p.map((x, j) => (j === i ? { ...x, done: !x.done } : x))
              )
            }
          >
            ✓
          </button>
          <span
            className={`task-text ${t.done ? "done" : ""}`}
            style={{ flex: 1 }}
          >
            {t.text}
          </span>
          <button
            className="remove-btn"
            onClick={() => setTasks((p) => p.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
    </>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

// One synced Firestore doc holds the dashboard. `mode` carries the day it was
// chosen so it rolls back to "free" each morning; campaigns/uni/todos persist.
const DEFAULT_STATE = {
  mode: { date: TODAY, value: "free" },
  campaigns: Object.fromEntries(
    CAMPAIGNS.map((c) => [c.name, { nextSession: "", prepped: false }])
  ),
  uni: [
    { text: "Vorlesung nachholen", done: false },
    { text: "Paper lesen", done: false },
  ],
  todos: [],
};

export default function CommandCenter() {
  const [s, setS, status] = useSyncedState("command", DEFAULT_STATE);
  const [editCamp, setEditCamp] = useState(null);
  const [ashen, setAshen] = useState(() => pickLine(s.mode.value));

  // Reset the day mode to "free" each new day.
  useEffect(() => {
    if (s.mode.date !== TODAY) {
      setS((prev) => ({ ...prev, mode: { date: TODAY, value: "free" } }));
    }
  }, [s.mode.date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh Ashen's line whenever the mode changes (incl. on remote load).
  useEffect(() => {
    setAshen(pickLine(s.mode.value));
  }, [s.mode.value]);

  const mode = s.mode.value;
  const setMode = (m) =>
    setS((prev) => ({ ...prev, mode: { date: TODAY, value: m } }));

  // Slice the synced doc into the shapes the section components expect.
  const camps = s.campaigns;
  const setCamps = (u) =>
    setS((prev) => ({
      ...prev,
      campaigns: typeof u === "function" ? u(prev.campaigns) : u,
    }));
  const uni = s.uni;
  const setUni = (u) =>
    setS((prev) => ({ ...prev, uni: typeof u === "function" ? u(prev.uni) : u }));
  const todos = s.todos;
  const setTodos = (u) =>
    setS((prev) => ({
      ...prev,
      todos: typeof u === "function" ? u(prev.todos) : u,
    }));

  const md = DAY_MODES[mode];
  const layout = MODE_LAYOUT[mode];

  const SEC_META = {
    todos: { title: "TO-DO", color: T.ember, dim: "To-Dos" },
    campaigns: { title: "KAMPAGNEN-PULS", color: T.purple, dim: "Kampagnen" },
    uni: {
      title: "UNI · PFLEGEWISSENSCHAFT",
      color: T.moon,
      dim: "Uni kann warten",
    },
  };

  const renderInner = (key) => {
    switch (key) {
      case "todos":
        return <TodoContent todos={todos} setTodos={setTodos} />;
      case "campaigns":
        return (
          <CampaignContent
            data={camps}
            setData={setCamps}
            editing={editCamp}
            setEditing={setEditCamp}
          />
        );
      case "uni":
        return <UniContent tasks={uni} setTasks={setUni} />;
      default:
        return null;
    }
  };

  return (
    <>
      <link href={FONT_URL} rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ember-pulse{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes gentle-glow{0%,100%{box-shadow:0 0 8px ${T.glow}}50%{box-shadow:0 0 20px ${T.glow}}}
        .dcc-card{background:${T.card};border:1px solid ${T.border};border-radius:12px;padding:20px;transition:all .4s ease;animation:fadeUp .5s ease both;margin-bottom:16px}
        .dcc-card:hover{background:${T.cardHover};border-color:${T.accent}33}
        .check-btn{width:22px;height:22px;border-radius:50%;border:2px solid ${T.dim};background:transparent;cursor:pointer;transition:all .2s;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:transparent}
        .check-btn.done{border-color:${T.moss};background:${T.moss};color:#fff}
        .check-btn:hover{border-color:${T.accent};transform:scale(1.1)}
        .progress-track{height:4px;background:${T.border};border-radius:2px;overflow:hidden}
        .progress-fill{height:100%;border-radius:2px;transition:width .5s ease}
        .mode-btn{padding:10px 16px;border-radius:10px;border:1px solid ${T.border};background:transparent;color:${T.dim};cursor:pointer;font-family:'Nunito',sans-serif;font-size:14px;transition:all .25s ease;display:flex;align-items:center;gap:6px}
        .mode-btn:hover{border-color:${T.accent};color:${T.text}}
        .mode-btn.active{border-color:var(--mc);color:${T.text};background:color-mix(in srgb,var(--mc) 12%,transparent);box-shadow:0 0 12px color-mix(in srgb,var(--mc) 20%,transparent)}
        .task-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid ${T.border}22}
        .task-row:last-child{border-bottom:none}
        .task-text{font-family:'Nunito',sans-serif;font-size:14px;color:${T.text};transition:all .2s}
        .task-text.done{text-decoration:line-through;color:${T.dim}}
        input[type="text"]{background:${T.bg};border:1px solid ${T.border};border-radius:8px;padding:8px 12px;color:${T.text};font-family:'Nunito',sans-serif;font-size:14px;outline:none;width:100%}
        input[type="text"]:focus{border-color:${T.accent}}
        .small-btn{padding:6px 14px;border-radius:8px;border:1px solid ${T.border};background:transparent;color:${T.dim};cursor:pointer;font-family:'Nunito',sans-serif;font-size:13px;transition:all .2s}
        .small-btn:hover{border-color:${T.accent};color:${T.text}}
        .small-btn.accent{border-color:${T.accent};color:${T.accent}}
        .small-btn.accent:hover{background:${T.accent}22}
        .remove-btn{background:none;border:none;color:${T.dim}44;cursor:pointer;font-size:16px;padding:0 4px;transition:color .2s;line-height:1}
        .remove-btn:hover{color:${T.wine}}
      `}</style>

      {/* Back to the Hearth hub */}
      <Link
        to="/"
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 50,
          background: `${T.card}e6`,
          color: T.text,
          textDecoration: "none",
          fontSize: 12,
          padding: "6px 12px",
          borderRadius: 999,
          border: `1px solid ${T.border}`,
          fontFamily: "'Nunito',sans-serif",
        }}
      >
        ← Hearth
      </Link>

      {/* Sync status */}
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 50,
          fontSize: 11,
          padding: "5px 11px",
          borderRadius: 999,
          fontFamily: "'Nunito',sans-serif",
          background: `${T.card}e6`,
          border: `1px solid ${T.border}`,
          color: status === "offline" ? T.wine : T.dim,
        }}
      >
        {status === "ready"
          ? "✓ synced"
          : status === "offline"
          ? "● on device"
          : "⋯ syncing"}
      </div>

      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          color: T.text,
          padding: "24px 16px",
          fontFamily: "'Nunito',sans-serif",
          backgroundImage: `radial-gradient(ellipse at 20% 0%,${T.accent}08 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,${T.purple}06 0%,transparent 50%)`,
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 28,
              animation: "fadeUp .4s ease both",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: T.dim,
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {new Date().toLocaleDateString("de-DE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </div>
            <h1
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 32,
                fontWeight: 600,
                color: T.text,
                marginBottom: 4,
              }}
            >
              {greeting()}
            </h1>
            <div style={{ fontSize: 13, color: T.dim, fontStyle: "italic" }}>
              {md.desc}
            </div>
          </div>

          {/* Mode Selector */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 8,
              flexWrap: "wrap",
              justifyContent: "center",
              animation: "fadeUp .5s ease both",
              animationDelay: "0.05s",
            }}
          >
            {Object.entries(DAY_MODES).map(([k, v]) => (
              <button
                key={k}
                className={`mode-btn ${mode === k ? "active" : ""}`}
                style={{ "--mc": v.color }}
                onClick={() => setMode(k)}
              >
                <span>{v.icon}</span> {v.label}
              </button>
            ))}
          </div>

          {/* Mode note */}
          {layout.note ? (
            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                color: md.color,
                marginBottom: 16,
                padding: "6px 12px",
                borderRadius: 8,
                background: `color-mix(in srgb,${md.color} 8%,transparent)`,
                border: `1px solid color-mix(in srgb,${md.color} 20%,transparent)`,
                animation: "fadeUp .4s ease both",
                animationDelay: "0.08s",
              }}
            >
              {layout.note}
            </div>
          ) : (
            <div style={{ height: 8 }} />
          )}

          {/* Ashen Says */}
          <div
            className="dcc-card"
            style={{
              borderColor: `${T.accent}33`,
              position: "relative",
              overflow: "hidden",
              animationDelay: "0.1s",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg,transparent,${T.ember},transparent)`,
                animation: "ember-pulse 3s ease infinite",
              }}
            />
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 22, lineHeight: 1 }}>🦊</div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.accent,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Ashen says
                </div>
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: 16,
                    fontStyle: "italic",
                    color: T.text,
                    lineHeight: 1.5,
                  }}
                >
                  "{ashen}"
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic sections */}
          {layout.order.map((key, i) => {
            const meta = SEC_META[key];
            const isDimmed = layout.dimmed.includes(key);
            if (isDimmed) {
              return (
                <Collapsible
                  key={key + mode}
                  title={meta.title}
                  color={meta.color}
                  dimLabel={meta.dim}
                >
                  {renderInner(key)}
                </Collapsible>
              );
            }
            return (
              <div
                key={key + mode}
                className="dcc-card"
                style={{ animationDelay: `${0.15 + i * 0.05}s` }}
              >
                {renderInner(key)}
              </div>
            );
          })}

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              padding: "20px 0 8px",
              color: T.dim,
              fontSize: 11,
              letterSpacing: 1,
              animation: "fadeUp .5s ease both",
              animationDelay: "0.5s",
            }}
          >
            <span style={{ opacity: 0.5 }}>
              🌙 Built by a fox who worries about you 🌙
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
