import { Link } from "react-router-dom";

// Fullscreen retreat — no hub chrome. The real den (pomodoro, ambient
// Web Audio, chime, tasks) drops in here next pass.
export default function Fox() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
      <Link to="/" className="back" style={{ position: "fixed", top: 18, left: 18 }}>← Hearth</Link>
      <div style={{ fontSize: 64, marginBottom: 12 }}>🦊</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 30,
        margin: 0, color: "var(--gold)" }}>The Den</h1>
      <p style={{ color: "var(--smoke)", maxWidth: 320, marginTop: 12, lineHeight: 1.5 }}>
        Your full-screen retreat lives here. The fox is just stretching —
        pomodoro, ambient hearth and the chime move in next.
      </p>
    </div>
  );
}
