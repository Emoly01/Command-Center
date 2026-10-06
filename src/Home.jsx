import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FamiliarBand from "./familiar/FamiliarBand";
import { AccountBand, AccountNote } from "./AccountBand";

// Routed tools that live inside the Hearth.
const DAILY = [
  { to: "/water",    name: "Water",          desc: "One tap per glass. The ember's watching." },
  { to: "/cleaning", name: "Cleaning",       desc: "One zone at a time. XP & streaks." },
  { to: "/command",  name: "Command Center", desc: "The day, at a glance." },
  { to: "/movement", name: "Movement Nudge", desc: "Up you get. Every 45." },
];

// Companion sites that live on their own — open in a new tab.
const BEYOND = [
  { href: "https://witchlight-chronik.vercel.app/", name: "Witchlight Chronik", desc: "The Witchlight campaign chronicle." },
  { href: "https://goldhort.vercel.app/",           name: "Goldhort",           desc: "The gold hoard, counted." },
  { href: "https://arcana-academy.vercel.app/",     name: "Arcana Academy",     desc: "Lessons in the arcane." },
  { href: "https://marginalia-wheat.vercel.app/",   name: "Marginalia",         desc: "Notes in the margins." },
  { href: "https://sturmauge.vercel.app/",          name: "Sturmauge",          desc: "The eye of the storm." },
  { href: "https://tarot-theta-seven.vercel.app/",  name: "Tarot",              desc: "Draw a card." },
];

const ROOMS = DAILY.length + BEYOND.length + 1; // +1 for the Den
const pad = (i) => String(i).padStart(2, "0");

function greetingFor(h) {
  if (h < 5) return "Still up, Emily?";
  if (h < 11) return "Good morning, Emily.";
  if (h < 14) return "Midday, Emily.";
  if (h < 18) return "Good afternoon, Emily.";
  if (h < 22) return "Good evening, Emily.";
  return "Late fire, Emily.";
}

export default function Home() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const subline =
    now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) +
    " · " +
    now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <header className="hearth-head">
        <div className="hearth-id">
          <span className="hearth-eyebrow">Emily&rsquo;s Workshop</span>
          <h1 className="hearth-title">The Hearth</h1>
        </div>
        <div className="hearth-now">
          <span className="hearth-greeting">{greetingFor(now.getHours())}</span>
          <span className="hearth-subline">{subline}</span>
        </div>
      </header>

      <FamiliarBand />

      <AccountBand />

      <Link to="/fox" className="den">
        <div className="den-inner">
          <div className="den-copy">
            <span className="den-eyebrow">Today&rsquo;s fire &middot; opens full-screen</span>
            <h2 className="den-name">
              The Den <span className="den-dash">&mdash;</span> Ember Fox
            </h2>
            <p className="den-desc">
              Your focus retreat. Pomodoro, ambient hearth, and a fox with opinions.
            </p>
          </div>
          <div className="den-cta">
            Enter the den <span aria-hidden="true">&rarr;</span>
          </div>
        </div>
      </Link>

      <section className="hearth-section">
        <div className="section-head">
          <h2>Every day</h2>
          <i aria-hidden="true" />
        </div>
        <div className="grid">
          {DAILY.map((t, i) => (
            <Link key={t.to} to={t.to} className="card">
              <span className="card-num">{pad(i)}</span>
              <span className="card-name">{t.name}</span>
              <span className="card-desc">{t.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="hearth-section section-beyond">
        <div className="section-head">
          <h2>Beyond the hearth</h2>
          <i aria-hidden="true" />
        </div>
        <div className="grid grid-beyond">
          {BEYOND.map((s, i) => (
            <a
              key={s.href}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="row"
            >
              <span className="row-num">{pad(i + DAILY.length)}</span>
              <span className="row-copy">
                <span className="row-name">{s.name}</span>
                <span className="row-desc">{s.desc}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <footer className="hearth-foot">
        <span>Everything in one fire</span>
        <AccountNote />
        <span>{ROOMS} rooms</span>
      </footer>
    </>
  );
}
