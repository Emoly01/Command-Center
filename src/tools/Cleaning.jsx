import { Fragment, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSyncedState } from "../lib/useSyncedState";

const TODAY = new Date().toISOString().slice(0, 10);
const THIS_MONTH = TODAY.slice(0, 7);

const SERIF = "'Instrument Serif', Georgia, serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

const XP_VALUES = { daily: 10, sweep: 5, zoneTask: 5, zoneBonus: 15, monthly: 50, boss: 40 };

const LEVELS = [
  { min: 0,    max: 99,   roman: "I",   name: "Sleepy Familiar",  desc: "Just waking up." },
  { min: 100,  max: 249,  roman: "II",  name: "Curious Sprite",   desc: "Starting to stir." },
  { min: 250,  max: 499,  roman: "III", name: "Tidy Apprentice",  desc: "Learning the craft." },
  { min: 500,  max: 799,  roman: "IV",  name: "Hearth Keeper",    desc: "The home feels cosier." },
  { min: 800,  max: 1199, roman: "V",   name: "Moon Witch",       desc: "Magic is in the air." },
  { min: 1200, max: 1799, roman: "VI",  name: "Grove Guardian",   desc: "The forest approves." },
  { min: 1800, max: 9999, roman: "VII", name: "Arcane Keeper",    desc: "Legendary tidiness." },
];

// The Familiar: a pixel creature that sprouts limbs, wings and bulk per level.
// One 11×9 frame per level, drawn from the level's accent colour — x is body,
// o is an eye, . is empty.
const SPRITE = [
  ["...........", "...........", "....xx.....", "...xxxx....", "..xxoxxx...", "..xxxxxx...", "...xxxx....", "...........", "..........."],
  ["...........", "...........", "...xxxx....", "..xxxxxx...", "..xoxxox...", "..xxxxxx...", "...xxxx....", "...x..x....", "..........."],
  ["...........", "...x...x...", "...xxxxx...", "..xxxxxxx..", "..xoxxxox..", "..xxxxxxx..", "...xxxxx...", "...x...x...", "..........."],
  ["...........", "..x.....x..", "..xx...xx..", "..xxxxxxx..", "..xoxxxox..", "..xxxxxxx..", "...xxxxx.x.", "...xxxxx.x.", "..xx...xxx."],
  [".x.......x.", ".xx.....xx.", "..xxxxxxx..", "..xoxxxox..", ".xxxxxxxxx.", "..xxxxxxx..", "...xxxxx.x.", "..xxxxxx.x.", "..xx...xxx."],
  [".x.......x.", ".xx.....xx.", "..xxxxxxx..", ".xxoxxxoxx.", "xxxxxxxxxxx", ".xxxxxxxxx.", "..xxxxxxx..", "..xx...xx..", ".xx.....xx."],
  ["x.x.....x.x", ".xxx...xxx.", ".xxxxxxxxx.", "xxxoxxxoxxx", "xxxxxxxxxxx", ".xxxxxxxxx.", "..xxxxxxx..", ".xxx...xxx.", "xx.x...x.xx"],
];

const BADGES = [
  { id: "first_zone",   mark: "✦", name: "First Steps",      desc: "Complete your first zone",      check: (s) => s.totalZones >= 1 },
  { id: "three_sweeps", mark: "⁂", name: "Quick Spark",      desc: "Three sweeps in one day",       check: (s) => s.maxSweepsDay >= 3 },
  { id: "streak3",      mark: "△", name: "On a Roll",        desc: "Three day streak",              check: (s) => s.streak >= 3 },
  { id: "streak7",      mark: "☾", name: "Moon Cycle",       desc: "Seven day streak",              check: (s) => s.streak >= 7 },
  { id: "allzones",     mark: "⌂", name: "Full House",       desc: "Every zone at least once",      check: (s) => s.zonesUnlocked >= 5 },
  { id: "monthly1",     mark: "❧", name: "Deep Roots",       desc: "Complete a monthly task",       check: (s) => s.totalMonthly >= 1 },
  { id: "monthly5",     mark: "◈", name: "Ritual Keeper",    desc: "Five monthly tasks",            check: (s) => s.totalMonthly >= 5 },
  { id: "xp500",        mark: "✧", name: "Spellbound",       desc: "Reach 500 XP",                  check: (s) => s.xp >= 500 },
  { id: "xp1000",       mark: "◎", name: "Arcane Mastery",   desc: "Reach 1000 XP",                 check: (s) => s.xp >= 1000 },
  { id: "dailystreak",  mark: "☀", name: "Morning Light",    desc: "All daily habits, five times",  check: (s) => s.fullDailyDays >= 5 },
  { id: "boss1",        mark: "†", name: "Boss Slayer",      desc: "Defeat your first boss",        check: (s) => s.bossesDefeated >= 1 },
  { id: "boss5",        mark: "⬡", name: "Dungeon Regular",  desc: "Defeat five bosses",            check: (s) => s.bossesDefeated >= 5 },
];

const dailyHabits = [
  { id: "dishes",       label: "Dishes washed or in the dishwasher before bed" },
  { id: "laundry-move", label: "Move laundry along — start, switch or fold one pile" },
  { id: "tidy-sweep",   label: "Two-minute tidy sweep — things back where they belong" },
];

const miniSweeps = [
  { id: "ms1", label: "Sink refresh — quick rinse of sink and wipe of tap" },
  { id: "ms2", label: "Counter clear — clear one surface completely" },
  { id: "ms3", label: "Floor grab — pick up anything on the floor in one room" },
  { id: "ms4", label: "Trash check — empty any bin that's full or smelly" },
  { id: "ms5", label: "Mirror wipe — one mirror with a damp cloth" },
  { id: "ms6", label: "Doorknobs and light switches — a disinfectant wipe" },
  { id: "ms7", label: "Pile sort — pick one clutter pile, put five things away" },
  { id: "ms8", label: "Entrance reset — shoes, coats, bags all in their place" },
];

const zones = [
  { id: "bathroom", label: "Bathroom & Toilet", tasks: [
    "Empty bathroom bin and replace bag", "Wipe toilet inside and out", "Clean sink and taps", "Wipe mirror", "Clean shower or bath", "Wipe surfaces and shelves, top to bottom", "Sweep and mop the floor",
  ]},
  { id: "kitchen", label: "Kitchen", tasks: [
    "Empty kitchen bin and replace bag", "Check recycling — take out if full", "Clear and wipe all counters", "Clean stovetop", "Wipe down appliances", "Clean sink", "Wipe cabinet fronts", "Sweep and mop floor",
  ]},
  { id: "bedroom", label: "Bedroom", tasks: [
    "Empty bedroom bin and replace bag", "Put away or sort all laundry off the floor", "Dust surfaces, top to bottom", "Wipe down bedside tables", "Change bedsheets if needed", "Vacuum floor",
  ]},
  { id: "living", label: "Living Room & Hallway", tasks: [
    "Collect and empty any bins or stray trash", "Tidy clutter — everything back in its place", "Dust surfaces, top to bottom", "Wipe down coffee table and shelves", "Vacuum sofa if needed", "Vacuum or sweep floor", "Wipe hallway surfaces, hang up anything stray",
  ]},
  { id: "laundry", label: "Laundry Day", tasks: [
    "Check pockets before washing", "Sort laundry into piles", "Start first wash load", "Move to dryer or hang when done", "Fold everything that's dry", "Put folded laundry away — all of it",
  ]},
];

// effort ≈ minutes the task realistically takes; the energy filter uses it.
const monthlyTasks = [
  { id: "mt1",  label: "Clean the oven inside",                     effort: 30 },
  { id: "mt2",  label: "Wipe down all windows",                     effort: 30 },
  { id: "mt3",  label: "Clean out the fridge",                      effort: 30 },
  { id: "mt4",  label: "Run the washing machine drum clean",        effort: 10 },
  { id: "mt5",  label: "Check and replace ventilation filters",     effort: 10 },
  { id: "mt6",  label: "Dust corners and cobwebs in all rooms",     effort: 10 },
  { id: "mt7",  label: "Vacuum under and behind furniture",         effort: 30 },
  { id: "mt8",  label: "Descale showerhead and taps",               effort: 10 },
  { id: "mt9",  label: "Wipe down plants and pots",                 effort: 10 },
  { id: "mt10", label: "Declutter one drawer or shelf",             effort: 10 },
  { id: "mt11", label: "Toss expired products, bath and kitchen",   effort: 10 },
  { id: "mt12", label: "Clean out dryer lint trap and hose",        effort: 10 },
];

const getLevel = (xp) => LEVELS.findLast(l => xp >= l.min) || LEVELS[0];

// Unlockable colour themes. They tint accents only — the shell stays the
// Hearth's coal and ember. minXp lines up with a LEVELS threshold so the
// picker can say which level unlocks each one. Slots: glow (accent marks &
// text), edge (accent borders), panel (raised surfaces), xp1/xp2 (XP bar
// gradient and the Familiar's glow), dim (quiet accent text).
const THEMES = [
  { id: "twilight", name: "Twilight Veil", minXp: 0,    glow: "#c9a9ff", edge: "rgba(155,124,205,.34)", panel: "linear-gradient(160deg,rgba(58,42,80,.5) 0%,rgba(24,19,28,.75) 100%)",  xp1: "#a78bda", xp2: "#e0aaff", dim: "#9a7abf" },
  { id: "sea",      name: "Moonlit Sea",   minXp: 250,  glow: "#a9c6ff", edge: "rgba(110,142,190,.34)", panel: "linear-gradient(160deg,rgba(36,54,80,.5) 0%,rgba(18,22,28,.75) 100%)",  xp1: "#8badd0", xp2: "#aad2ff", dim: "#7a93bf" },
  { id: "grove",    name: "Forest Grove",  minXp: 500,  glow: "#a9e6bd", edge: "rgba(94,167,122,.34)",  panel: "linear-gradient(160deg,rgba(36,74,52,.45) 0%,rgba(17,24,20,.75) 100%)", xp1: "#8bd0a4", xp2: "#aaf0c4", dim: "#7ab391" },
  { id: "ember",    name: "Ember Hearth",  minXp: 800,  glow: "#ffc6a9", edge: "rgba(232,133,58,.34)",  panel: "linear-gradient(160deg,rgba(80,48,32,.5) 0%,rgba(26,18,16,.75) 100%)",  xp1: "#d0a48b", xp2: "#ffd2aa", dim: "#bf937a" },
  { id: "rose",     name: "Rose Arcana",   minXp: 1200, glow: "#ffa9c9", edge: "rgba(167,94,126,.34)",  panel: "linear-gradient(160deg,rgba(80,36,54,.5) 0%,rgba(26,16,20,.75) 100%)",  xp1: "#d08bab", xp2: "#ffaad0", dim: "#bf7a97" },
  { id: "dragon",   name: "Dragon Gold",   minXp: 1800, glow: "#f2d391", edge: "rgba(167,139,78,.34)",  panel: "linear-gradient(160deg,rgba(74,61,34,.5) 0%,rgba(24,20,14,.75) 100%)",  xp1: "#c9ad72", xp2: "#f2d99b", dim: "#b39c6e" },
];

// Monday of the current week — the boss is nominated once per week.
const WEEK_KEY = (() => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
})();

const daysSince = (date) =>
  date ? Math.max(0, Math.round((new Date(TODAY) - new Date(date)) / 86400000)) : null;

// Staleness for weighting: never-done counts as 3 weeks, capped so one
// ancient item doesn't drown out everything else.
const staleDays = (date) => {
  const d = daysSince(date);
  return d === null ? 21 : Math.min(d, 21);
};

// Random pick weighted by how long each item has gone undone.
const weightedPick = (items, lastFor) => {
  const weights = items.map(it => Math.max(1, staleDays(lastFor(it))));
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
};

// Latest completion date per zone: explicit lastDone plus anything already
// recorded in history (so pre-existing data seeds the staleness weights).
const zoneLastMap = (history, lastZones) => {
  const map = { ...lastZones };
  Object.entries(history || {}).forEach(([date, e]) => {
    if (e?.zone && (!map[e.zone] || date > map[e.zone])) map[e.zone] = date;
  });
  return map;
};

// The whole tool lives in one synced Firestore doc. The daily/sweep/zone maps
// carry the date they belong to (so we can roll them over at midnight) and
// monthly carries its month; history/xp/badges/totalMonthly accumulate.
const DEFAULT_STATE = {
  daily:   { date: TODAY,       checked: {} },
  sweeps:  { date: TODAY,       checked: {} },
  zones:   { date: TODAY,       checked: {} },
  monthly: { month: THIS_MONTH, checked: {} },
  history: {},
  xp: 0,
  badges: [],
  totalMonthly: 0,
  lastDone: { zones: {}, sweeps: {} },
  boss: null,
  bossesDefeated: 0,
  theme: "twilight",
};

// Badge stats derived purely from a progress snapshot.
const computeStats = (history, totalMonthly, xp, bossesDefeated = 0) => {
  const days = Object.keys(history);
  const totalZones = days.filter(d => history[d]?.zone).length;
  const maxSweepsDay = Math.max(0, ...days.map(d => history[d]?.sweeps || 0));
  const zonesUnlocked = new Set(days.map(d => history[d]?.zone).filter(Boolean)).size;
  const fullDailyDays = days.filter(d => history[d]?.allDaily).length;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (history[key]?.zone || history[key]?.sweeps > 0 || history[key]?.allDaily) streak++;
    else break;
  }
  return { totalZones, totalMonthly, maxSweepsDay, zonesUnlocked, fullDailyDays, streak, xp, bossesDefeated };
};

// Rebuild today's history entry from the current check maps.
const buildHistory = (history, dc, sc, zc) => {
  const sweepCount = miniSweeps.filter(s => sc[s.id]).length;
  const completedZone = zones.find(z => z.tasks.every((_, i) => zc[`${z.id}-${i}`]));
  const allDaily = dailyHabits.every(h => dc[h.id]);
  const prev = history[TODAY] || {};
  return { ...history, [TODAY]: { zone: completedZone?.id || prev.zone || null, sweeps: sweepCount, allDaily } };
};

// Add XP to a snapshot; returns the next snapshot plus a popup for whatever
// it unlocked — a level-up outranks a badge.
const grantXp = (state, amount, history) => {
  const oldLevel = getLevel(state.xp);
  const newXp = state.xp + amount;
  const newLvl = getLevel(newXp);
  const stats = computeStats(history, state.totalMonthly || 0, newXp, state.bossesDefeated || 0);
  const badges = [...state.badges];
  let badgeUnlocked = null;
  BADGES.forEach(b => {
    if (!badges.includes(b.id) && b.check(stats)) { badges.push(b.id); badgeUnlocked = b; }
  });
  const popup = newLvl.name !== oldLevel.name
    ? { kind: "Level up", title: newLvl.name, desc: newLvl.desc, lvl: LEVELS.indexOf(newLvl) }
    : badgeUnlocked
      ? { kind: "Badge unlocked", mark: badgeUnlocked.mark, title: badgeUnlocked.name, desc: badgeUnlocked.desc }
      : null;
  return { state: { ...state, xp: newXp, badges, history }, popup };
};

// The Familiar itself — a grid of px-sized cells, hatching in on mount and
// bobbing forever after. Brighter and glowing at the higher levels.
function Familiar({ idx, theme, px }) {
  const art = SPRITE[idx] || SPRITE[0];
  const glow = idx >= 4;
  return (
    <span
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(11, ${px}px)`,
        gap: 1,
        animation: `gr-hatch .5s cubic-bezier(.2,1.3,.4,1), gr-bob ${3.6 - idx * 0.2}s ease-in-out infinite .5s`,
      }}
    >
      {art.flatMap((row, y) =>
        row.split("").map((c, x) => (
          <span
            key={`${y}-${x}`}
            style={{
              width: px, height: px, borderRadius: 1,
              background: c === "x" ? theme.glow : c === "o" ? "rgba(14,10,8,.9)" : "transparent",
              opacity: c === "x" ? 0.55 + idx * 0.075 : 1,
              boxShadow: c === "x" && glow ? `0 0 4px ${theme.xp2}` : "none",
            }}
          />
        ))
      )}
    </span>
  );
}

// One tappable checklist line — used by Daily, Sweeps, Zones and Monthly.
function Row({ checked, onToggle, label, tag, theme }) {
  return (
    <button onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left",
      padding: "15px 16px", borderRadius: 13, cursor: "pointer", fontFamily: "inherit",
      background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
    }}>
      <span style={{
        width: 19, height: 19, flex: "0 0 19px", borderRadius: 6, display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: 11,
        border: `1px solid ${checked ? "transparent" : "rgba(232,133,58,.3)"}`,
        background: checked ? theme.glow : "transparent", color: "#1a0f0a",
      }}>{checked ? "✓" : ""}</span>
      <span style={{
        flex: 1, fontSize: 13.5, lineHeight: 1.45, textWrap: "pretty",
        color: checked ? "#7d6b5f" : "#e8dbd0",
        textDecoration: checked ? "line-through" : "none",
      }}>{label}</span>
      {tag && <span style={{
        fontFamily: MONO, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase",
        color: "#6d5c50", whiteSpace: "nowrap",
      }}>{tag}</span>}
    </button>
  );
}

const sectionLabel = {
  fontFamily: MONO, fontSize: 9.5, letterSpacing: ".2em",
  textTransform: "uppercase", color: "#8a7566",
};
const intro = {
  margin: "0 0 6px", fontFamily: SERIF, fontStyle: "italic",
  fontSize: 17, lineHeight: 1.4, color: "#a08c7e",
};
const listCol = { display: "flex", flexDirection: "column", gap: 9, paddingTop: 26 };

export default function Cleaning() {
  const [s, setS, status] = useSyncedState("cleaning", DEFAULT_STATE);
  const [tab, setTab] = useState("home");
  const [activeZone, setActiveZone] = useState(null);
  const [popup, setPopup] = useState(null);
  const [energy, setEnergy] = useState(null);

  // Roll the daily/sweep/zone maps over at midnight, monthly at month start.
  useEffect(() => {
    const stale =
      s.daily.date !== TODAY || s.sweeps.date !== TODAY ||
      s.zones.date !== TODAY || s.monthly.month !== THIS_MONTH;
    if (!stale) return;
    setS((prev) => ({
      ...prev,
      daily:   prev.daily.date  === TODAY        ? prev.daily   : { date: TODAY, checked: {} },
      sweeps:  prev.sweeps.date === TODAY        ? prev.sweeps  : { date: TODAY, checked: {} },
      zones:   prev.zones.date  === TODAY        ? prev.zones   : { date: TODAY, checked: {} },
      monthly: prev.monthly.month === THIS_MONTH ? prev.monthly : { month: THIS_MONTH, checked: {} },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.daily.date, s.sweeps.date, s.zones.date, s.monthly.month]);

  // Nominate this week's boss: the zone untouched the longest. Waits for the
  // synced doc to load so we don't pick (and write) against the fallback.
  useEffect(() => {
    if (status === "loading") return;
    if (s.boss && s.boss.week === WEEK_KEY) return;
    const map = zoneLastMap(s.history, s.lastDone?.zones || {});
    const target = [...zones].sort((a, b) => staleDays(map[b.id]) - staleDays(map[a.id]))[0];
    setS((prev) => ({ ...prev, boss: { week: WEEK_KEY, zoneId: target.id, defeated: false } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, s.boss]);

  // Read the synced doc through the names the view code already uses.
  const dailyChecked = s.daily.checked;
  const sweepChecked = s.sweeps.checked;
  const zoneChecked = s.zones.checked;
  const monthlyChecked = s.monthly.checked;
  const history = s.history;
  const xp = s.xp;
  const badges = s.badges;
  const ld = s.lastDone || { zones: {}, sweeps: {} };
  const zoneLast = zoneLastMap(history, ld.zones || {});
  const boss = s.boss && s.boss.week === WEEK_KEY ? s.boss : null;
  const bossZone = boss ? zones.find(z => z.id === boss.zoneId) : null;
  const bossDays = bossZone ? daysSince(zoneLast[bossZone.id]) : null;
  const T = THEMES.find(t => t.id === s.theme && xp >= t.minXp) || THEMES[0];

  const dailyDone = dailyHabits.filter(h => dailyChecked[h.id]).length;
  const sweepDone = miniSweeps.filter(sw => sweepChecked[sw.id]).length;
  const monthlyDone = monthlyTasks.filter(t => monthlyChecked[t.id]).length;
  const currentZone = zones.find(z => z.id === activeZone);
  const zoneDone = currentZone ? currentZone.tasks.filter((_, i) => zoneChecked[`${activeZone}-${i}`]).length : 0;
  const allDailyDone = dailyHabits.every(h => dailyChecked[h.id]);
  const streak = computeStats(history, s.totalMonthly || 0, xp, s.bossesDefeated || 0).streak;

  const level = getLevel(xp);
  const levelIdx = LEVELS.indexOf(level);
  const nextLevel = LEVELS[levelIdx + 1];
  const xpNeeded = (nextLevel ? nextLevel.min : level.max + 1) - level.min;
  const progress = Math.min(100, Math.round(((xp - level.min) / xpNeeded) * 100));

  const toggleDaily = (id) => {
    const checked = { ...dailyChecked, [id]: !dailyChecked[id] };
    if (dailyChecked[id]) { setS({ ...s, daily: { ...s.daily, checked } }); return; }
    const hist = buildHistory(history, checked, sweepChecked, zoneChecked);
    let next = { ...s, daily: { ...s.daily, checked } };
    let r = grantXp(next, XP_VALUES.daily, hist); next = r.state;
    let pop = r.popup;
    if (dailyHabits.every(h => checked[h.id])) { // bonus for all 3
      r = grantXp(next, 15, hist); next = r.state;
      pop = r.popup || pop;
    }
    setS(next);
    if (pop) setPopup(pop);
  };

  const toggleSweep = (id) => {
    const checked = { ...sweepChecked, [id]: !sweepChecked[id] };
    if (sweepChecked[id]) { setS({ ...s, sweeps: { ...s.sweeps, checked } }); return; }
    const hist = buildHistory(history, dailyChecked, checked, zoneChecked);
    const lastDone = { ...ld, sweeps: { ...(ld.sweeps || {}), [id]: TODAY } };
    const r = grantXp({ ...s, sweeps: { ...s.sweeps, checked }, lastDone }, XP_VALUES.sweep, hist);
    setS(r.state);
    if (r.popup) setPopup(r.popup);
  };

  const toggleZone = (zId, i) => {
    const key = `${zId}-${i}`;
    const checked = { ...zoneChecked, [key]: !zoneChecked[key] };
    if (zoneChecked[key]) { setS({ ...s, zones: { ...s.zones, checked } }); return; }
    const zone = zones.find(z => z.id === zId);
    const hist = buildHistory(history, dailyChecked, sweepChecked, checked);
    let next = { ...s, zones: { ...s.zones, checked } };
    let r = grantXp(next, XP_VALUES.zoneTask, hist); next = r.state; // XP for the task
    let pop = r.popup;
    if (zone?.tasks.every((_, idx) => checked[`${zId}-${idx}`])) { // bonus on completion
      next = { ...next, lastDone: { ...ld, zones: { ...(ld.zones || {}), [zId]: TODAY } } };
      r = grantXp(next, XP_VALUES.zoneBonus, hist); next = r.state;
      pop = r.popup || pop;
      if (next.boss && next.boss.week === WEEK_KEY && next.boss.zoneId === zId && !next.boss.defeated) {
        next = { ...next, boss: { ...next.boss, defeated: true }, bossesDefeated: (next.bossesDefeated || 0) + 1 };
        r = grantXp(next, XP_VALUES.boss, hist); next = r.state;
        pop = r.popup || pop || {
          kind: "Boss defeated", mark: "†", title: zone.label,
          desc: `+${XP_VALUES.boss} bonus XP. The dungeon is swept.`,
        };
      }
    }
    setS(next);
    if (pop) setPopup(pop);
  };

  const toggleMonthly = (id) => {
    const checked = { ...monthlyChecked, [id]: !monthlyChecked[id] };
    if (monthlyChecked[id]) { setS({ ...s, monthly: { ...s.monthly, checked } }); return; }
    const next = { ...s, monthly: { ...s.monthly, checked }, totalMonthly: (s.totalMonthly || 0) + 1 };
    const r = grantXp(next, XP_VALUES.monthly, history);
    setS(r.state);
    if (r.popup) setPopup(r.popup);
  };

  const resetToday = () => setS((prev) => ({
    ...prev,
    daily:  { date: TODAY, checked: {} },
    sweeps: { date: TODAY, checked: {} },
    zones:  { date: TODAY, checked: {} },
  }));

  const [rolledZone, setRolledZone] = useState(null);
  const [rolledSweep, setRolledSweep] = useState(null);
  const [rolling, setRolling] = useState(null);

  // The spin animation cycles uniformly for show; the final pick is weighted
  // toward whatever has gone undone the longest.
  const rollRandom = (type) => {
    setRolling(type);
    setRolledZone(null);
    setRolledSweep(null);
    let count = 0;
    const interval = setInterval(() => {
      if (type === "zone") setRolledZone(zones[Math.floor(Math.random() * zones.length)]);
      else setRolledSweep(miniSweeps[Math.floor(Math.random() * miniSweeps.length)]);
      count++;
      if (count > 9) {
        clearInterval(interval);
        setRolling(null);
        if (type === "zone") setRolledZone(weightedPick(zones, z => zoneLast[z.id]));
        else setRolledSweep(weightedPick(miniSweeps, sw => (ld.sweeps || {})[sw.id]));
      }
    }, 80);
  };

  // Unchecked tasks that fit the chosen energy budget, dustiest first.
  const suggestFor = (mins) => {
    const out = [];
    if (mins >= 30) {
      [...zones]
        .filter(z => !z.tasks.every((_, i) => zoneChecked[`${z.id}-${i}`]))
        .sort((a, b) => staleDays(zoneLast[b.id]) - staleDays(zoneLast[a.id]))
        .slice(0, 2)
        .forEach(z => out.push({ key: `z-${z.id}`, label: z.label, tag: "30 min", go: () => { setTab("zones"); setActiveZone(z.id); } }));
    }
    monthlyTasks
      .filter(t => t.effort <= mins && !monthlyChecked[t.id])
      .slice(0, 2)
      .forEach(t => out.push({ key: `m-${t.id}`, label: t.label, tag: `${t.effort} min`, go: () => toggleMonthly(t.id) }));
    dailyHabits
      .filter(h => !dailyChecked[h.id])
      .forEach(h => out.push({ key: `d-${h.id}`, label: h.label, tag: "2 min", go: () => toggleDaily(h.id) }));
    [...miniSweeps]
      .filter(sw => !sweepChecked[sw.id])
      .sort((a, b) => staleDays((ld.sweeps || {})[b.id]) - staleDays((ld.sweeps || {})[a.id]))
      .slice(0, 3)
      .forEach(sw => out.push({ key: `s-${sw.id}`, label: sw.label, tag: "2 min", go: () => toggleSweep(sw.id) }));
    return out.slice(0, 6);
  };
  const suggestions = energy ? suggestFor(energy) : [];

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });

  const tabs = [
    ["home", "Home"], ["daily", "Daily"], ["sweeps", "Sweeps"],
    ["zones", "Zones"], ["monthly", "Monthly"], ["history", "History"],
  ];

  const syncLabel = status === "ready" ? "Synced" : status === "offline" ? "On device" : "Syncing";
  const syncDot = status === "ready" ? "#6ee7a8" : status === "offline" ? "#d65a4a" : "#ffc79a";

  return (
    <div style={{
      minHeight: "100vh", fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      color: "#f6ede5", display: "flex", justifyContent: "center", padding: "0 0 64px",
      background: "radial-gradient(120% 70% at 50% -10%,#2b1a10 0%,#1a1210 38%,#120e0c 100%) fixed",
    }}>
      <div style={{ width: "100%", maxWidth: 430, padding: "26px 20px 0", position: "relative" }}>

        {/* Back to the Hearth, and how safe today's progress is */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link to="/" className="back">← Hearth</Link>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO,
            fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase",
            color: status === "offline" ? "#e0a29a" : "#9c8371",
          }}>
            <b style={{
              width: 7, height: 7, borderRadius: "50%", display: "inline-block",
              background: syncDot, boxShadow: `0 0 6px ${syncDot}`,
            }} />{syncLabel}
          </span>
        </div>

        <h1 style={{
          margin: "10px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: 44,
          lineHeight: .95, letterSpacing: "-.015em", color: "#f4a15d",
        }}>Cleaning<br />Grimoire</h1>

        {/* The Familiar and the level it has grown into */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 22 }}>
          <div style={{
            width: 56, height: 56, flex: "0 0 56px", borderRadius: 16, position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            border: `1px solid ${T.edge}`, background: T.panel,
          }}>
            <Familiar idx={levelIdx} theme={T} px={4} />
            <span style={{
              position: "absolute", right: 3, bottom: 2, fontFamily: MONO,
              fontSize: 8, letterSpacing: ".1em", color: T.dim,
            }}>{level.roman}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.1, color: "#f4e6da" }}>{level.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", color: "#9c8371" }}>{xp} XP</span>
            </div>
            <div style={{ height: 3, borderRadius: 99, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99, transition: "width .5s ease",
                width: `${progress}%`, background: `linear-gradient(90deg,${T.xp1},${T.xp2})`,
              }} />
            </div>
            <span style={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: ".1em",
              textTransform: "uppercase", color: "#7d6b5f",
            }}>
              {nextLevel ? `${nextLevel.min - xp} XP to ${nextLevel.name}` : "Highest level reached"}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 20, overflowX: "auto", margin: "26px -20px 0",
          padding: "0 20px 10px", borderBottom: "1px solid rgba(232,133,58,.14)", scrollbarWidth: "none",
        }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setActiveZone(null); }} style={{
              flex: "0 0 auto", background: "none", border: "none", padding: "0 0 9px", margin: "0 0 -11px",
              cursor: "pointer", fontFamily: MONO, fontSize: 10.5, letterSpacing: ".18em",
              textTransform: "uppercase", whiteSpace: "nowrap",
              color: tab === id ? "#f6ede5" : "#8a7566",
              borderBottom: `1px solid ${tab === id ? T.glow : "transparent"}`,
            }}>{label}</button>
          ))}
        </div>

        {/* HOME */}
        {tab === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 26, paddingTop: 26 }}>

            <div style={{ display: "flex", borderRadius: 16, border: "1px solid rgba(232,133,58,.14)", overflow: "hidden" }}>
              {[[`${dailyDone}/3`, "Daily"], [String(sweepDone), "Sweeps"], [String(streak), "Streak"]].map(([v, l], i) => (
                <Fragment key={l}>
                  {i > 0 && <div style={{ width: 1, background: "rgba(232,133,58,.14)" }} />}
                  <div style={{ flex: 1, padding: "16px 8px", textAlign: "center" }}>
                    <div style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1, color: "#f4e6da" }}>{v}</div>
                    <div style={{
                      fontFamily: MONO, fontSize: 9, letterSpacing: ".18em",
                      textTransform: "uppercase", color: "#8a7566", marginTop: 6,
                    }}>{l}</div>
                  </div>
                </Fragment>
              ))}
            </div>

            {/* This week's boss — the zone that has gone longest untouched */}
            {bossZone && (
              <button
                onClick={() => { if (!boss.defeated) { setTab("zones"); setActiveZone(bossZone.id); } }}
                style={{
                  display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left",
                  padding: "16px 18px", borderRadius: 16, cursor: boss.defeated ? "default" : "pointer",
                  fontFamily: "inherit", background: T.panel, border: `1px solid ${T.edge}`,
                  opacity: boss.defeated ? .65 : 1,
                }}
              >
                <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1, width: 34, textAlign: "center", color: T.glow }}>
                  {boss.defeated ? "✓" : "†"}
                </span>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 9, letterSpacing: ".2em",
                    textTransform: "uppercase", color: "#c86b2a",
                  }}>This week&rsquo;s boss</span>
                  <span style={{ fontFamily: SERIF, fontSize: 21, lineHeight: 1.1, color: "#f6ede5" }}>{bossZone.label}</span>
                  <span style={{ fontSize: 11.5, color: "#a08c7e" }}>
                    {boss.defeated ? `Defeated — +${XP_VALUES.boss} XP claimed`
                      : bossDays === null ? `Never fully cleared · +${XP_VALUES.boss} XP`
                      : `Untouched ${bossDays} day${bossDays === 1 ? "" : "s"} · +${XP_VALUES.boss} XP`}
                  </span>
                </span>
              </button>
            )}

            {/* Energy filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={sectionLabel}>What can you face right now</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[[2, "2 min"], [10, "10 min"], [30, "30 min+"]].map(([mins, label]) => {
                  const on = energy === mins;
                  return (
                    <button key={mins} onClick={() => setEnergy(on ? null : mins)} style={{
                      flex: 1, padding: "11px 6px", borderRadius: 11, cursor: "pointer",
                      fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase",
                      background: on ? T.panel : "rgba(255,255,255,.03)",
                      border: `1px solid ${on ? T.edge : "rgba(255,255,255,.08)"}`,
                      color: on ? T.glow : "#9c8371",
                    }}>{label}</button>
                  );
                })}
              </div>
              {energy && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {suggestions.map(sg => (
                    <button key={sg.key} onClick={sg.go} style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
                      padding: "13px 15px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                      background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
                    }}>
                      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4, color: "#e8dbd0", textWrap: "pretty" }}>{sg.label}</span>
                      <span style={{
                        fontFamily: MONO, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase",
                        color: "#8a7566", whiteSpace: "nowrap",
                      }}>{sg.tag}</span>
                    </button>
                  ))}
                  {suggestions.length === 0 && (
                    <p style={{
                      margin: "2px 0 0", fontSize: 12.5, fontStyle: "italic", fontFamily: SERIF,
                      color: "#a08c7e", textAlign: "center",
                    }}>Everything that size is done. Go rest.</p>
                  )}
                </div>
              )}
            </div>

            {/* Randomiser — weighted toward the dustiest corners */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={sectionLabel}>Let fate decide</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["zone", "Random zone"], ["sweep", "Random sweep"]].map(([type, label]) => (
                  <button key={type} onClick={() => rollRandom(type)} style={{
                    flex: 1, padding: "12px 8px", borderRadius: 11, cursor: "pointer",
                    fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase",
                    background: rolling === type ? T.panel : "rgba(255,255,255,.03)",
                    border: `1px solid ${rolling === type ? T.edge : "rgba(255,255,255,.09)"}`,
                    color: "#e8dbd0",
                  }}>{label}</button>
                ))}
              </div>
              {rolledZone && (
                <button onClick={() => { setTab("zones"); setActiveZone(rolledZone.id); }} style={{
                  width: "100%", textAlign: "center", padding: 16, borderRadius: 14, cursor: "pointer",
                  fontFamily: "inherit", background: T.panel, border: `1px solid ${T.edge}`,
                }}>
                  <span style={{ display: "block", fontFamily: SERIF, fontSize: 22, lineHeight: 1.15, color: "#f6ede5" }}>
                    {rolledZone.label}
                  </span>
                  {!rolling && (
                    <span style={{ display: "block", fontSize: 11.5, color: "#a08c7e", marginTop: 4 }}>
                      {(d => d === null ? "Never fully cleared" : d === 0 ? "Cleared today" : `Last cleared ${d} day${d === 1 ? "" : "s"} ago`)(daysSince(zoneLast[rolledZone.id]))}
                    </span>
                  )}
                </button>
              )}
              {rolledSweep && (
                <div style={{
                  width: "100%", textAlign: "center", padding: 16, borderRadius: 14,
                  background: T.panel, border: `1px solid ${T.edge}`,
                }}>
                  <span style={{ display: "block", fontFamily: SERIF, fontSize: 19, lineHeight: 1.25, color: "#f6ede5", textWrap: "pretty" }}>
                    {rolledSweep.label}
                  </span>
                </div>
              )}
            </div>

            {/* Badges */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <span style={sectionLabel}>Badges</span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".12em", color: "#6d5c50" }}>
                  {badges.length} of {BADGES.length}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {BADGES.map(b => {
                  const earned = badges.includes(b.id);
                  return (
                    <div key={b.id} title={b.desc} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      padding: "12px 6px", borderRadius: 13, textAlign: "center",
                      border: `1px solid ${earned ? T.edge : "rgba(255,255,255,.06)"}`,
                      background: earned ? T.panel : "transparent",
                    }}>
                      <span style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1, color: earned ? T.glow : "#5d4e45" }}>{b.mark}</span>
                      <span style={{ fontSize: 10, lineHeight: 1.25, textWrap: "pretty", color: earned ? "#e8dbd0" : "#6d5c50" }}>{b.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Themes — unlocked by XP, tinting accents only */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={sectionLabel}>Grimoire themes</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {THEMES.map(t => {
                  const unlocked = xp >= t.minXp;
                  const sel = T.id === t.id;
                  const lvl = LEVELS.find(l => l.min === t.minXp);
                  return (
                    <div key={t.id} onClick={() => { if (unlocked) setS({ ...s, theme: t.id }); }} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                      padding: "12px 4px", borderRadius: 13, cursor: unlocked ? "pointer" : "default",
                      border: `1px solid ${sel ? t.edge : "rgba(255,255,255,.06)"}`,
                      background: sel ? t.panel : "transparent", opacity: unlocked ? 1 : .4,
                    }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: `linear-gradient(135deg,${t.xp1},${t.xp2})`,
                        border: `1px solid ${t.edge}`,
                      }} />
                      <span style={{ fontSize: 10.5, color: sel ? "#f6ede5" : "#a08c7e" }}>{t.name}</span>
                      <span style={{
                        fontFamily: MONO, fontSize: 10, letterSpacing: ".12em",
                        textTransform: "uppercase", color: "#9c8371",
                      }}>{unlocked ? (sel ? "In use" : "Wear") : (lvl ? lvl.name : "")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p style={{
              margin: 0, paddingTop: 6, borderTop: "1px solid rgba(232,133,58,.12)",
              fontFamily: SERIF, fontStyle: "italic", fontSize: 15, lineHeight: 1.5,
              color: "#8a7566", textWrap: "pretty",
            }}>
              One zone per day off. Daily habits every day. Sweeps whenever you have two minutes.
            </p>
          </div>
        )}

        {/* DAILY */}
        {tab === "daily" && (
          <div style={listCol}>
            <p style={intro}>Five minutes a day keeps the chaos away. {XP_VALUES.daily} XP each, 15 more for all three.</p>
            {dailyHabits.map(h => (
              <Row key={h.id} theme={T} checked={!!dailyChecked[h.id]} onToggle={() => toggleDaily(h.id)} label={h.label} />
            ))}
            {allDailyDone && (
              <div style={{
                marginTop: 6, textAlign: "center", padding: 14, borderRadius: 13,
                background: T.panel, border: `1px solid ${T.edge}`,
                fontFamily: SERIF, fontSize: 19, color: T.glow,
              }}>All three done. +15 bonus XP.</div>
            )}
          </div>
        )}

        {/* SWEEPS */}
        {tab === "sweeps" && (
          <div style={listCol}>
            <p style={intro}>Quick wins, {XP_VALUES.sweep} XP each. No commitment needed.</p>
            {miniSweeps.map(sw => (
              <Row key={sw.id} theme={T} checked={!!sweepChecked[sw.id]} onToggle={() => toggleSweep(sw.id)} label={sw.label} />
            ))}
            <div style={{
              textAlign: "center", marginTop: 8, fontFamily: MONO, fontSize: 10,
              letterSpacing: ".16em", textTransform: "uppercase", color: "#8a7566",
            }}>
              {sweepDone} sweep{sweepDone === 1 ? "" : "s"} today{sweepDone >= 3 ? " — on a roll" : ""}
            </div>
          </div>
        )}

        {/* ZONES — the list, then one zone opened */}
        {tab === "zones" && !currentZone && (
          <div style={listCol}>
            <p style={intro}>One zone per day off. {XP_VALUES.zoneBonus} XP for clearing a whole one.</p>
            {zones.map((z, i) => {
              const done = z.tasks.filter((_, k) => zoneChecked[`${z.id}-${k}`]).length;
              const complete = done === z.tasks.length;
              const isBoss = !!bossZone && bossZone.id === z.id && !!boss && !boss.defeated;
              return (
                <button key={z.id} onClick={() => setActiveZone(z.id)} style={{
                  display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left",
                  padding: "15px 18px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
                  background: complete ? T.panel : "rgba(255,255,255,.03)",
                  border: `1px solid ${complete || isBoss ? T.edge : "rgba(255,255,255,.07)"}`,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", color: "#8a7566" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.15, color: "#f4e6da" }}>{z.label}</span>
                    <span style={{
                      fontFamily: MONO, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase",
                      color: complete || isBoss ? T.glow : "#8a7566",
                    }}>
                      {complete ? "Complete" : `${done} of ${z.tasks.length}`}{isBoss ? " · Boss" : ""}
                    </span>
                  </span>
                  <span style={{ color: "#6d5c50", fontSize: 15 }}>›</span>
                </button>
              );
            })}
          </div>
        )}

        {tab === "zones" && currentZone && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 26 }}>
            <button onClick={() => setActiveZone(null)} style={{
              alignSelf: "flex-start", background: "none", border: "none", padding: 0, cursor: "pointer",
              fontFamily: MONO, fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#a08c7e",
            }}>← All zones</button>
            <div style={{ padding: 20, borderRadius: 16, background: T.panel, border: `1px solid ${T.edge}` }}>
              <div style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1.05, color: "#f6ede5" }}>{currentZone.label}</div>
              <div style={{
                fontFamily: MONO, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase",
                color: T.glow, marginTop: 8,
              }}>
                {zoneDone} of {currentZone.tasks.length} · {XP_VALUES.zoneTask} XP each, {XP_VALUES.zoneBonus} on completion
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {currentZone.tasks.map((task, i) => (
                <Row key={i} theme={T} checked={!!zoneChecked[`${currentZone.id}-${i}`]}
                     onToggle={() => toggleZone(currentZone.id, i)} label={task} />
              ))}
            </div>
            {zoneDone === currentZone.tasks.length && (
              <div style={{
                textAlign: "center", padding: 14, borderRadius: 13, background: T.panel,
                border: `1px solid ${T.edge}`, fontFamily: SERIF, fontSize: 19, color: T.glow,
              }}>Zone complete. +{XP_VALUES.zoneBonus} XP.</div>
            )}
          </div>
        )}

        {/* MONTHLY */}
        {tab === "monthly" && (
          <div style={listCol}>
            <p style={{ ...intro, margin: 0 }}>Big tasks — once a month is enough. {XP_VALUES.monthly} XP each.</p>
            <div style={{
              marginBottom: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: ".14em",
              textTransform: "uppercase", color: "#6d5c50",
            }}>
              {monthlyDone} of {monthlyTasks.length} done this month · resets on the 1st
            </div>
            {monthlyTasks.map(t => (
              <Row key={t.id} theme={T} checked={!!monthlyChecked[t.id]} onToggle={() => toggleMonthly(t.id)}
                   label={t.label} tag={`${t.effort} min`} />
            ))}
          </div>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 26 }}>
            <div style={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: ".16em",
              textTransform: "uppercase", color: "#8a7566",
            }}>Last 30 days · ◆ zone · ✦ zone and sweeps</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
              {last30.map(date => {
                const e = history[date] || {};
                const active = !!e.zone || e.sweeps > 0 || e.allDaily;
                const isToday = date === TODAY;
                const mark = e.zone && e.sweeps > 0 ? "✦" : e.zone ? "◆" : e.sweeps > 0 ? "·" : "";
                return (
                  <div key={date} style={{
                    aspectRatio: "1", borderRadius: 9, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 2,
                    border: `1px solid ${isToday ? T.edge : active ? "rgba(232,133,58,.22)" : "rgba(255,255,255,.06)"}`,
                    background: isToday ? T.panel : active ? "rgba(255,255,255,.035)" : "transparent",
                  }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: active || isToday ? "#a08c7e" : "#5d4e45" }}>
                      {parseInt(date.slice(8, 10), 10)}
                    </span>
                    <span style={{ fontSize: 12, lineHeight: 1, color: e.zone ? T.glow : "#8a7566" }}>{mark}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={resetToday} style={{
          display: "block", margin: "34px auto 0", background: "none", border: "none", padding: 6,
          cursor: "pointer", fontFamily: MONO, fontSize: 9, letterSpacing: ".18em",
          textTransform: "uppercase", color: "#5d4e45",
        }}>Reset today</button>
      </div>

      {/* Level up / badge / boss */}
      {popup && (
        <div onClick={() => setPopup(null)} style={{
          position: "fixed", inset: 0, background: "rgba(8,5,4,.72)", backdropFilter: "blur(3px)",
          zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 28,
        }}>
          <div style={{
            width: "100%", maxWidth: 300, textAlign: "center", padding: "34px 26px", borderRadius: 20,
            background: "linear-gradient(160deg,#241811 0%,#17110f 100%)",
            border: `1px solid ${T.edge}`, animation: "gr-rise .28s ease both",
          }}>
            {popup.lvl != null ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 100 }}>
                <Familiar idx={popup.lvl} theme={T} px={8} />
              </div>
            ) : (
              <div style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 1, color: T.glow }}>{popup.mark}</div>
            )}
            <div style={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: ".22em",
              textTransform: "uppercase", color: "#c86b2a", marginTop: 14,
            }}>{popup.kind}</div>
            <div style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.12, color: "#f6ede5", marginTop: 6 }}>{popup.title}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "#a08c7e", marginTop: 8, textWrap: "pretty" }}>{popup.desc}</div>
            <div style={{
              fontFamily: MONO, fontSize: 9, letterSpacing: ".18em",
              textTransform: "uppercase", color: "#6d5c50", marginTop: 20,
            }}>Tap to close</div>
          </div>
        </div>
      )}
    </div>
  );
}
