import { Link } from "react-router-dom";

const TOOLS = [
  { to: "/water",   glyph: "💧", name: "Water",          desc: "Two glasses. That's the deal." },
  { to: "/cleaning",glyph: "🌿", name: "Cleaning",       desc: "One zone at a time. XP & streaks." },
  { to: "/command", glyph: "🜂", name: "Command Center", desc: "The day, at a glance." },
];

// Companion sites that live on their own — open in a new tab.
const SITES = [
  { href: "https://witchlight-chronik.vercel.app/", glyph: "📜", name: "Witchlight Chronik", desc: "The Witchlight campaign chronicle." },
  { href: "https://witchlight-hoard.vercel.app/",   glyph: "🐉", name: "Witchlight Hoard",   desc: "Loot & lore for the Hoard table." },
  { href: "https://goldhort.vercel.app/",           glyph: "🪙", name: "Goldhort",           desc: "The gold hoard, counted." },
  { href: "https://arcana-academy.vercel.app/",     glyph: "🔮", name: "Arcana Academy",     desc: "Lessons in the arcane." },
  { href: "https://marginalia-wheat.vercel.app/",   glyph: "✒️", name: "Marginalia",         desc: "Notes in the margins." },
  { href: "https://sturmauge.vercel.app/",          glyph: "🌩️", name: "Sturmauge",          desc: "The eye of the storm." },
  { href: "https://tarot-theta-seven.vercel.app/",  glyph: "🃏", name: "Tarot",              desc: "Draw a card." },
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

      <div className="hearth-eyebrow section-label">Beyond the Hearth</div>
      <nav className="grid">
        {SITES.map((s) => (
          <a
            key={s.href}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="card"
          >
            <span className="card-glyph">{s.glyph}</span>
            <span className="card-name">
              {s.name} <span className="card-ext">↗</span>
            </span>
            <span className="card-desc">{s.desc}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
