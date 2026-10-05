import { useEffect, useRef, useState } from "react";
import ToolFrame from "../ToolFrame";
import { useWater, GOAL_MIN, GOAL_MAX } from "../lib/water";

const UNDO_MS = 8000;

const AFFIRM = {
  start: ["{goal} glasses. That's the deal. Don't make me beg.",
          "Empty. Like my patience watching you skip water for coffee. Oh wait — no coffee now. Drink."],
  partway: ["Another one down. The gastritis arc thanks you. So do I.",
            "Progress. Don't get cocky, little rabbit. Keep going."],
  done: ["Goal hit. Look at you, hydrated and insufferable about it. Proud of you. 🖤",
         "Done. The fox approves. Go be magnificent."],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default function Water() {
  const { count, goal, status, log, undo, resetToday, setGoal } = useWater();
  const [msg, setMsg] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const undoTimer = useRef(null);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const loading = status === "loading";

  const drink = () => {
    const next = count + 1;
    log();
    setMsg(pick(next >= goal ? AFFIRM.done : AFFIRM.partway));
    setCanUndo(true);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setCanUndo(false), UNDO_MS);
  };
  const takeBack = () => {
    undo();
    setCanUndo(false);
    setMsg(null);
  };
  const reset = () => {
    resetToday();
    setCanUndo(false);
    setMsg(AFFIRM.start[0].replace("{goal}", goal));
  };

  // One glass per goal slot, plus any extras beyond the goal.
  const slots = Math.max(goal, count);
  const big = slots <= 3;

  const pill = {
    background: "transparent", border: "1px solid var(--ash-edge)", color: "var(--smoke)",
    borderRadius: 999, padding: "7px 16px", fontSize: 12, cursor: "pointer",
  };
  const fieldRow = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 12, padding: "10px 0",
  };
  const stepper = {
    ...pill, width: 44, height: 44, padding: 0, fontSize: 18, color: "var(--bone)",
  };

  return (
    <ToolFrame title="Water" status={status}>
      <div className="panel" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--smoke)", margin: "0 0 22px", fontSize: 14 }}>
          {goal === 2
            ? "One after waking. One when you're home from shift."
            : `${goal} glasses today. Spread them out.`}
        </p>

        <div aria-hidden="true" style={{ display: "flex", flexWrap: "wrap", gap: big ? 18 : 10,
          justifyContent: "center", marginBottom: 18 }}>
          {Array.from({ length: slots }, (_, i) => {
            const filled = count > i;
            return (
              <div
                key={i}
                style={{
                  width: big ? 78 : 40, height: big ? 104 : 54,
                  borderRadius: big ? "10px 10px 16px 16px" : "6px 6px 10px 10px",
                  border: `2px solid ${filled ? "var(--ember)" : "var(--ash-edge)"}`,
                  background: filled
                    ? "linear-gradient(180deg, rgba(255,195,107,.18), rgba(255,122,50,.32))"
                    : "var(--coal)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: big ? 30 : 16,
                  boxShadow: filled ? "0 0 22px -4px var(--glow), inset 0 -18px 24px -16px var(--ember)" : "none",
                  transition: "all .25s ease",
                }}
              >
                {filled ? "💧" : ""}
              </div>
            );
          })}
        </div>

        <div style={{ color: "var(--smoke)", fontSize: 12, marginBottom: 18 }}>
          {loading ? "…" : `${count} / ${goal} glass${goal === 1 ? "" : "es"} today`}
        </div>

        <button
          onClick={drink}
          disabled={loading}
          style={{
            minHeight: 56, minWidth: 180, padding: "0 28px", borderRadius: 999,
            border: "1px solid var(--ember)", background: "rgba(255,122,50,.14)",
            color: "var(--gold)", fontSize: 16, fontWeight: 600,
            cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1,
          }}
        >
          +1 glass
        </button>

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

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {canUndo && count > 0 && (
            <button onClick={takeBack} style={{ ...pill, minHeight: 44, color: "var(--bone)" }}>
              Undo last glass
            </button>
          )}
          <button onClick={reset} style={{ ...pill, minHeight: 44 }}>Reset today</button>
        </div>
      </div>

      {/* Settings */}
      <div className="panel" style={{ marginTop: 14 }}>
        <div style={{ color: "var(--smoke)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
          Settings
        </div>
        <div style={fieldRow}>
          <span style={{ fontSize: 14 }}>Daily goal</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              style={{ ...stepper, opacity: goal <= GOAL_MIN ? 0.4 : 1 }}
              aria-label="Lower daily goal"
              disabled={loading || goal <= GOAL_MIN}
              onClick={() => setGoal(goal - 1)}
            >−</button>
            <span style={{ minWidth: 28, textAlign: "center", fontSize: 16 }} aria-live="polite">
              {goal}
            </span>
            <button
              style={{ ...stepper, opacity: goal >= GOAL_MAX ? 0.4 : 1 }}
              aria-label="Raise daily goal"
              disabled={loading || goal >= GOAL_MAX}
              onClick={() => setGoal(goal + 1)}
            >+</button>
            <span style={{ color: "var(--smoke)", fontSize: 13 }}>glasses</span>
          </span>
        </div>
      </div>

      <style>{`@keyframes fadeUp{0%{opacity:0;transform:translateY(8px);}
        14%{opacity:1;transform:translateY(0);}86%{opacity:1;}100%{opacity:0;}}`}</style>
    </ToolFrame>
  );
}
