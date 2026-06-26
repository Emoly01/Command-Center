import { Link } from "react-router-dom";

const TOOLS = [
  { to: "/water",   glyph: "💧", name: "Water",          desc: "Two glasses. That's the deal." },
  { to: "/cleaning",glyph: "🌿", name: "Cleaning",       desc: "One zone at a time. XP & streaks." },
  { to: "/command", glyph: "🜂", name: "Command Center", desc: "The day, at a glance." },
  { to: "/combat",  glyph: "⚔", name: "Combat Tracker", desc: "Initiative, HP, the lot." },
];

export default function Home() {
  return (
    <>
      <header className="hearth-head">
        <div className="hearth-eyebrow">Emily's workshop</div>
        <h1 className="hearth-title">The Hearth</h1>
        <p className="hearth-sub">Everything in one fire. Pick where to warm your hands.</p>
      </header>

      <nav className="grid">
        {TOOLS.map((t) => (
          <Link key={t.to} to={t.to} className="card">
            <span className="card-glyph">{t.glyph}</span>
            <span className="card-name">{t.name}</span>
            <span className="card-desc">{t.desc}</span>
          </Link>
        ))}

        <Link to="/fox" className="card full">
          <span className="card-glyph">🦊</span>
          <span className="card-name">The Den — Ember Fox</span>
          <span className="card-desc">
            Your focus retreat. Pomodoro, ambient hearth, and a fox with opinions. Opens full-screen.
          </span>
        </Link>
      </nav>
    </>
  );
}
