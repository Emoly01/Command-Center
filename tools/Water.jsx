import { useEffect, useState } from "react";
import ToolFrame from "../ToolFrame";
import { useSyncedState } from "../lib/useSyncedState";

const today = () => new Date().toISOString().slice(0, 10);

const AFFIRM = {
  0: ["Two glasses. That's the deal. Don't make me beg.",
      "Empty. Like my patience watching you skip water for coffee. Oh wait — no coffee now. Drink."],
  1: ["One down. The gastritis arc thanks you. So do I.",
      "Halfway. Don't get cocky, little rabbit. One more."],
  2: ["Both glasses. Look at you, hydrated and insufferable about it. Proud of you. 🖤",
      "Done. The fox approves. Go be magnificent."],
};

export default function Water() {
  const [s, setS, status] = useSyncedState("water", { date: today(), count: 0 });
  const [msg, setMsg] = useState(null);

  // Roll over at midnight / on a new day.
  useEffect(() => {
    if (s.date && s.date !== today()) setS({ date: today(), count: 0 });
  }, [s.date]); // eslint-disable-line

  const count = s.count ?? 0;

  const drink = () => {
    if (count >= 2) return;
    const next = count + 1;
    setS({ date: today(), count: next });
    const pool = AFFIRM[next] || AFFIRM[2];
    setMsg(pool[Math.floor(Math.random() * pool.length)]);
  };
  const reset = () => { setS({ date: today(), count: 0 }); setMsg(AFFIRM[0][0]); };

  return (
    <ToolFrame title="Water" status={status}>
      <div className="panel" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--smoke)", margin: "0 0 22px", fontSize: 14 }}>
          One after waking. One when you're home from shift.
        </p>

        <div style={{ display: "flex", gap: 18, justifyContent: "center", marginBottom: 22 }}>
          {[0, 1].map((i) => {
            const filled = count > i;
            return (
              <button
                key={i}
                onClick={drink}
                aria-label={filled ? "Glass filled" : "Fill a glass"}
                style={{
                  width: 78, height: 104, borderRadius: "10px 10px 16px 16px",
                  border: `2px solid ${filled ? "var(--ember)" : "var(--ash-edge)"}`,
                  background: filled
                    ? "linear-gradient(180deg, rgba(255,195,107,.18), rgba(255,122,50,.32))"
                    : "var(--coal)",
                  color: filled ? "var(--gold)" : "var(--smoke)",
                  fontSize: 30, cursor: count >= 2 ? "default" : "pointer",
                  boxShadow: filled ? "0 0 22px -4px var(--glow), inset 0 -18px 24px -16px var(--ember)" : "none",
                  transition: "all .25s ease",
                }}
              >
                {filled ? "💧" : ""}
              </button>
            );
          })}
        </div>

        <div style={{ minHeight: 52, display: "flex", alignItems: "center",
          justifyContent: "center", padding: "0 8px" }}>
          {msg && (
            <span key={msg} style={{
              fontFamily: "var(--font-display)", fontStyle: "italic",
              color: "var(--bone)", fontSize: 15, lineHeight: 1.4,
              animation: `fadeUp ${Math.max(3.2, msg.length * 0.05)}s ease forwards`,
            }}>{msg}</span>
          )}
        </div>

        <button onClick={reset} style={{
          marginTop: 8, background: "transparent", border: "1px solid var(--ash-edge)",
          color: "var(--smoke)", borderRadius: 999, padding: "7px 16px", fontSize: 12,
          cursor: "pointer",
        }}>Reset today</button>
      </div>

      <style>{`@keyframes fadeUp{0%{opacity:0;transform:translateY(8px);}
        14%{opacity:1;transform:translateY(0);}86%{opacity:1;}100%{opacity:0;}}`}</style>
    </ToolFrame>
  );
}
