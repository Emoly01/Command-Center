import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSyncedState } from "../lib/useSyncedState";

const TODAY = new Date().toISOString().slice(0, 10);
const THIS_MONTH = TODAY.slice(0, 7);

const XP_VALUES = { daily: 10, sweep: 5, zoneTask: 5, zoneBonus: 15, monthly: 50 };

const LEVELS = [
  { min: 0,    max: 99,   name: "Sleepy Familiar",   creature: "🐱", desc: "Just waking up..." },
  { min: 100,  max: 249,  name: "Curious Sprite",    creature: "🐱", desc: "Starting to stir!" },
  { min: 250,  max: 499,  name: "Tidy Apprentice",   creature: "🐈", desc: "Learning the craft!" },
  { min: 500,  max: 799,  name: "Hearth Keeper",     creature: "🐈‍⬛", desc: "The home feels cozier." },
  { min: 800,  max: 1199, name: "Moon Witch",        creature: "🦊", desc: "Magic is in the air!" },
  { min: 1200, max: 1799, name: "Grove Guardian",    creature: "🦊", desc: "The forest approves." },
  { min: 1800, max: 9999, name: "Arcane Keeper",     creature: "🐉", desc: "Legendary tidiness." },
];

const BADGES = [
  { id: "first_zone",    emoji: "⭐", name: "First Steps",      desc: "Complete your first zone",           check: (s) => s.totalZones >= 1 },
  { id: "three_sweeps",  emoji: "⚡", name: "Quick Spark",      desc: "Do 3 sweeps in one day",             check: (s) => s.maxSweepsDay >= 3 },
  { id: "streak3",       emoji: "🔥", name: "On a Roll",        desc: "3 day activity streak",              check: (s) => s.streak >= 3 },
  { id: "streak7",       emoji: "🌕", name: "Moon Cycle",       desc: "7 day activity streak",              check: (s) => s.streak >= 7 },
  { id: "allzones",      emoji: "🏡", name: "Full House",       desc: "Complete every zone at least once",  check: (s) => s.zonesUnlocked >= 5 },
  { id: "monthly1",      emoji: "🌿", name: "Deep Roots",       desc: "Complete a monthly task",            check: (s) => s.totalMonthly >= 1 },
  { id: "monthly5",      emoji: "🌙", name: "Ritual Keeper",   desc: "Complete 5 monthly tasks",           check: (s) => s.totalMonthly >= 5 },
  { id: "xp500",         emoji: "✨", name: "Spellbound",       desc: "Reach 500 XP",                       check: (s) => s.xp >= 500 },
  { id: "xp1000",        emoji: "🔮", name: "Arcane Mastery",   desc: "Reach 1000 XP",                      check: (s) => s.xp >= 1000 },
  { id: "dailystreak",   emoji: "☀️", name: "Morning Light",    desc: "Complete all daily habits 5 times",  check: (s) => s.fullDailyDays >= 5 },
];

const dailyHabits = [
  { id: "dishes",       emoji: "🍽️", label: "Dishes washed or in dishwasher before bed" },
  { id: "laundry-move", emoji: "🧺", label: "Move laundry along (start / switch / fold one pile)" },
  { id: "tidy-sweep",   emoji: "📦", label: "2-min tidy sweep — put things back where they belong" },
];

const miniSweeps = [
  { id: "ms1", label: "Sink refresh — quick rinse of sink & wipe of tap" },
  { id: "ms2", label: "Counter clear — clear one surface completely" },
  { id: "ms3", label: "Floor grab — pick up anything on the floor in one room" },
  { id: "ms4", label: "Trash check — empty any bin that's full or smelly" },
  { id: "ms5", label: "Mirror wipe — one mirror with a damp cloth" },
  { id: "ms6", label: "Doorknobs & light switches — quick disinfectant wipe" },
  { id: "ms7", label: "Pile sort — pick one clutter pile and put 5 things away" },
  { id: "ms8", label: "Entrance reset — shoes, coats, bags all in their place" },
];

const zones = [
  { id: "bathroom", emoji: "🛁", label: "Bathroom + Toilet", tasks: [
    "Empty bathroom bin & replace bag","Wipe toilet inside and out","Clean sink and taps","Wipe mirror","Clean shower or bath","Wipe surfaces & shelves (top → bottom)","Sweep & mop/wipe floor",
  ]},
  { id: "kitchen", emoji: "🍳", label: "Kitchen", tasks: [
    "Empty kitchen bin & replace bag","Check recycling — take out if full","Clear and wipe all counters","Clean stovetop","Wipe down appliances","Clean sink","Wipe cabinet fronts","Sweep & mop floor",
  ]},
  { id: "bedroom", emoji: "🛏️", label: "Bedroom", tasks: [
    "Empty bedroom bin & replace bag","Put away or sort all laundry off the floor","Dust surfaces (top → bottom, left → right)","Wipe down bedside tables","Change bedsheets if needed","Vacuum floor",
  ]},
  { id: "living", emoji: "🛋️", label: "Living Room + Hallway", tasks: [
    "Collect & empty any bins or stray trash","Tidy clutter — everything back in its place","Dust surfaces (top → bottom, left → right)","Wipe down coffee table, shelves","Vacuum sofa if needed","Vacuum/sweep floor","Wipe hallway surfaces, hang up anything stray",
  ]},
  { id: "laundry", emoji: "🧺", label: "Laundry Day", tasks: [
    "Check pockets before washing","Sort laundry into piles","Start first wash load","Move to dryer / hang when done","Fold everything that's dry","Put folded laundry away — all of it",
  ]},
];

const monthlyTasks = [
  { id: "mt1",  emoji: "🔥", label: "Clean the oven inside" },
  { id: "mt2",  emoji: "🪟", label: "Wipe down all windows" },
  { id: "mt3",  emoji: "❄️", label: "Clean out the fridge" },
  { id: "mt4",  emoji: "🌀", label: "Clean washing machine (drum clean cycle)" },
  { id: "mt5",  emoji: "💨", label: "Check & replace air/ventilation filters" },
  { id: "mt6",  emoji: "🕸️", label: "Dust corners & cobwebs in all rooms" },
  { id: "mt7",  emoji: "🛋️", label: "Vacuum under & behind furniture" },
  { id: "mt8",  emoji: "🚿", label: "Descale showerhead & taps" },
  { id: "mt9",  emoji: "🌿", label: "Wipe down plants & pots" },
  { id: "mt10", emoji: "📦", label: "Declutter one drawer or shelf" },
  { id: "mt11", emoji: "🧴", label: "Check & toss expired products (bathroom/kitchen)" },
  { id: "mt12", emoji: "🌬️", label: "Clean out dryer lint trap & hose" },
];

const getLevel = (xp) => LEVELS.findLast(l => xp >= l.min) || LEVELS[0];

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
};

// Badge stats derived purely from a progress snapshot.
const computeStats = (history, totalMonthly, xp) => {
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
  return { totalZones, totalMonthly, maxSweepsDay, zonesUnlocked, fullDailyDays, streak, xp };
};

// Rebuild today's history entry from the current check maps.
const buildHistory = (history, dc, sc, zc) => {
  const sweepCount = miniSweeps.filter(s => sc[s.id]).length;
  const completedZone = zones.find(z => z.tasks.every((_, i) => zc[`${z.id}-${i}`]));
  const allDaily = dailyHabits.every(h => dc[h.id]);
  const prev = history[TODAY] || {};
  return { ...history, [TODAY]: { zone: completedZone?.id || prev.zone || null, sweeps: sweepCount, allDaily } };
};

// Add XP to a snapshot; returns the next snapshot plus any level-up / badge to surface.
const grantXp = (state, amount, history) => {
  const oldLevel = getLevel(state.xp);
  const newXp = state.xp + amount;
  const newLvl = getLevel(newXp);
  const stats = computeStats(history, state.totalMonthly || 0, newXp);
  const badges = [...state.badges];
  let badgeUnlocked = null;
  BADGES.forEach(b => {
    if (!badges.includes(b.id) && b.check(stats)) { badges.push(b.id); badgeUnlocked = b; }
  });
  return {
    state: { ...state, xp: newXp, badges, history },
    leveledTo: newLvl.name !== oldLevel.name ? newLvl : null,
    badgeUnlocked,
  };
};

export default function Cleaning() {
  const [s, setS, status] = useSyncedState("cleaning", DEFAULT_STATE);
  const [tab, setTab] = useState("home");
  const [activeZone, setActiveZone] = useState(null);
  const [newBadge, setNewBadge] = useState(null);
  const [newLevel, setNewLevel] = useState(null);

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

  // Read the synced doc through the names the view code already uses.
  const dailyChecked = s.daily.checked;
  const sweepChecked = s.sweeps.checked;
  const zoneChecked = s.zones.checked;
  const monthlyChecked = s.monthly.checked;
  const history = s.history;
  const xp = s.xp;
  const badges = s.badges;

  const sweepDone = miniSweeps.filter(s => sweepChecked[s.id]).length;
  const currentZone = zones.find(z => z.id === activeZone);
  const zoneDone = currentZone ? currentZone.tasks.filter((_, i) => zoneChecked[`${activeZone}-${i}`]).length : 0;
  const allDailyDone = dailyHabits.every(h => dailyChecked[h.id]);
  const level = getLevel(xp);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const xpInLevel = xp - level.min;
  const xpNeeded = (nextLevel ? nextLevel.min : level.max + 1) - level.min;
  const progress = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  const toggleDaily = (id) => {
    const checked = { ...dailyChecked, [id]: !dailyChecked[id] };
    if (dailyChecked[id]) { setS({ ...s, daily: { ...s.daily, checked } }); return; }
    const hist = buildHistory(history, checked, sweepChecked, zoneChecked);
    let next = { ...s, daily: { ...s.daily, checked } };
    let leveled = null, badge = null;
    let r = grantXp(next, XP_VALUES.daily, hist); next = r.state;
    if (r.leveledTo) leveled = r.leveledTo;
    if (r.badgeUnlocked) badge = r.badgeUnlocked;
    if (dailyHabits.every(h => checked[h.id])) { // bonus for all 3
      r = grantXp(next, 15, hist); next = r.state;
      if (r.leveledTo) leveled = r.leveledTo;
      if (r.badgeUnlocked) badge = r.badgeUnlocked;
    }
    setS(next);
    if (leveled) setNewLevel(leveled);
    if (badge) setNewBadge(badge);
  };

  const toggleSweep = (id) => {
    const checked = { ...sweepChecked, [id]: !sweepChecked[id] };
    if (sweepChecked[id]) { setS({ ...s, sweeps: { ...s.sweeps, checked } }); return; }
    const hist = buildHistory(history, dailyChecked, checked, zoneChecked);
    const r = grantXp({ ...s, sweeps: { ...s.sweeps, checked } }, XP_VALUES.sweep, hist);
    setS(r.state);
    if (r.leveledTo) setNewLevel(r.leveledTo);
    if (r.badgeUnlocked) setNewBadge(r.badgeUnlocked);
  };

  const toggleZone = (zId, i) => {
    const key = `${zId}-${i}`;
    const checked = { ...zoneChecked, [key]: !zoneChecked[key] };
    if (zoneChecked[key]) { setS({ ...s, zones: { ...s.zones, checked } }); return; }
    const zone = zones.find(z => z.id === zId);
    const hist = buildHistory(history, dailyChecked, sweepChecked, checked);
    let next = { ...s, zones: { ...s.zones, checked } };
    let leveled = null, badge = null;
    let r = grantXp(next, XP_VALUES.zoneTask, hist); next = r.state; // XP for the task
    if (r.leveledTo) leveled = r.leveledTo;
    if (r.badgeUnlocked) badge = r.badgeUnlocked;
    if (zone?.tasks.every((_, idx) => checked[`${zId}-${idx}`])) { // bonus on completion
      r = grantXp(next, XP_VALUES.zoneBonus, hist); next = r.state;
      if (r.leveledTo) leveled = r.leveledTo;
      if (r.badgeUnlocked) badge = r.badgeUnlocked;
    }
    setS(next);
    if (leveled) setNewLevel(leveled);
    if (badge) setNewBadge(badge);
  };

  const toggleMonthly = (id) => {
    const checked = { ...monthlyChecked, [id]: !monthlyChecked[id] };
    if (monthlyChecked[id]) { setS({ ...s, monthly: { ...s.monthly, checked } }); return; }
    const next = { ...s, monthly: { ...s.monthly, checked }, totalMonthly: (s.totalMonthly || 0) + 1 };
    const r = grantXp(next, XP_VALUES.monthly, history);
    setS(r.state);
    if (r.leveledTo) setNewLevel(r.leveledTo);
    if (r.badgeUnlocked) setNewBadge(r.badgeUnlocked);
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

  const rollRandom = (type) => {
    setRolling(type);
    setRolledZone(null);
    setRolledSweep(null);
    let count = 0;
    const interval = setInterval(() => {
      if (type === "zone") setRolledZone(zones[Math.floor(Math.random() * zones.length)]);
      else setRolledSweep(miniSweeps[Math.floor(Math.random() * miniSweeps.length)]);
      count++;
      if (count > 10) {
        clearInterval(interval);
        setRolling(null);
        if (type === "zone") setRolledZone(zones[Math.floor(Math.random() * zones.length)]);
        else setRolledSweep(miniSweeps[Math.floor(Math.random() * miniSweeps.length)]);
      }
    }, 80);
  };

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });

  const tabs = [
    { id: "home",    label: "🏡 Home" },
    { id: "daily",   label: "☀️ Daily" },
    { id: "sweeps",  label: "⚡ Sweeps" },
    { id: "zones",   label: "🗂️ Zones" },
    { id: "monthly", label: "🌙 Monthly" },
    { id: "history", label: "📅 History" },
  ];

  const CheckItem = ({ checked, onToggle, emoji, label }) => (
    <div onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 12, background: "#fff",
      borderRadius: 12, padding: "13px 15px", marginBottom: 9, cursor: "pointer",
      border: `1.5px solid ${checked ? "#a8c5a0" : "#e0d8ce"}`, opacity: checked ? 0.7 : 1,
    }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: `2px solid ${checked ? "#6a9e62" : "#c5b9ac"}`, background: checked ? "#6a9e62" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {checked && <span style={{ color: "#fff", fontSize: 13 }}>✓</span>}
      </div>
      {emoji && <span style={{ fontSize: 18 }}>{emoji}</span>}
      <span style={{ fontSize: 13, color: "#3a3028", textDecoration: checked ? "line-through" : "none", flex: 1 }}>{label}</span>
    </div>
  );

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#f0ede6", minHeight: "100vh", paddingBottom: 32 }}>

      {/* Back to the Hearth hub */}
      <Link to="/" style={{
        position: "fixed", top: 12, left: 12, zIndex: 50,
        background: "rgba(45,31,61,0.85)", color: "#e8d5ff", textDecoration: "none",
        fontSize: 12, padding: "6px 12px", borderRadius: 999,
        border: "1px solid #7b5ea7", fontFamily: "Georgia, serif",
      }}>← Hearth</Link>

      {/* Sync status */}
      <div style={{
        position: "fixed", top: 12, right: 12, zIndex: 50, fontSize: 11,
        padding: "5px 11px", borderRadius: 999, fontFamily: "Georgia, serif",
        background: "rgba(45,31,61,0.85)", border: "1px solid #7b5ea7",
        color: status === "offline" ? "#f0b8b8" : "#c9a9ff",
      }}>
        {status === "ready" ? "✓ synced" : status === "offline" ? "● on device" : "⋯ syncing"}
      </div>

      {/* Badge popup */}
      {(newBadge || newLevel) && (
        <div onClick={() => { setNewBadge(null); setNewLevel(null); }} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{ background: "#2d1f3d", borderRadius: 20, padding: "32px 28px", textAlign: "center", maxWidth: 300, border: "2px solid #7b5ea7" }}>
            {newLevel && <>
              <div style={{ fontSize: 48 }}>{newLevel.creature}</div>
              <div style={{ color: "#e8d5ff", fontSize: 18, fontWeight: "bold", margin: "8px 0 4px" }}>Level Up!</div>
              <div style={{ color: "#c9a9ff", fontSize: 15 }}>{newLevel.name}</div>
              <div style={{ color: "#9a7abf", fontSize: 13, marginTop: 6 }}>{newLevel.desc}</div>
            </>}
            {newBadge && !newLevel && <>
              <div style={{ fontSize: 48 }}>{newBadge.emoji}</div>
              <div style={{ color: "#e8d5ff", fontSize: 18, fontWeight: "bold", margin: "8px 0 4px" }}>Badge Unlocked!</div>
              <div style={{ color: "#c9a9ff", fontSize: 15 }}>{newBadge.name}</div>
              <div style={{ color: "#9a7abf", fontSize: 13, marginTop: 6 }}>{newBadge.desc}</div>
            </>}
            <div style={{ color: "#7b5ea7", fontSize: 12, marginTop: 16 }}>tap to close</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #2d1f3d 0%, #4a3060 100%)", padding: "24px 20px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 36 }}>{level.creature}</div>
        <div style={{ color: "#e8d5ff", fontSize: 11, marginTop: 2 }}>{level.name}</div>
        <div style={{ color: "#c9a9ff", fontSize: 18, fontWeight: "bold", margin: "4px 0 2px" }}>Emily's Cleaning Grimoire</div>
        <div style={{ color: "#9a7abf", fontSize: 12 }}>{level.desc}</div>
        {/* XP bar */}
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.1)", borderRadius: 20, height: 8, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #a78bda, #e0aaff)", borderRadius: 20, transition: "width 0.5s" }} />
        </div>
        <div style={{ color: "#9a7abf", fontSize: 11, marginTop: 4 }}>{xp} XP · {nextLevel ? `${nextLevel.min - xp} to ${nextLevel.name}` : "Max level!"}</div>
      </div>

      {/* Tabs — scrollable */}
      <div style={{ display: "flex", overflowX: "auto", background: "#fff", borderBottom: "1px solid #e0d8ce", scrollbarWidth: "none" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setActiveZone(null); }} style={{
            flexShrink: 0, padding: "12px 14px", border: "none", cursor: "pointer", fontSize: 12,
            fontFamily: "Georgia, serif", whiteSpace: "nowrap",
            background: tab === t.id ? "#f0ede6" : "#fff",
            color: tab === t.id ? "#4a3060" : "#9a8a7a",
            fontWeight: tab === t.id ? "bold" : "normal",
            borderBottom: tab === t.id ? "2px solid #7b5ea7" : "2px solid transparent",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>

        {/* HOME */}
        {tab === "home" && (
          <div>
            <div style={{ background: "#2d1f3d", borderRadius: 16, padding: "20px", marginBottom: 16, border: "1px solid #4a3060" }}>
              <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                {[["☀️", allDailyDone ? "✅" : `${dailyHabits.filter(h=>dailyChecked[h.id]).length}/3`, "Daily"],
                  ["⚡", sweepDone, "Sweeps"],
                  ["🌙", `${Object.keys(monthlyChecked).filter(k=>monthlyChecked[k]).length}/${monthlyTasks.length}`, "Monthly"]
                ].map(([e,v,l]) => (
                  <div key={l}>
                    <div style={{ fontSize: 20 }}>{e}</div>
                    <div style={{ fontSize: 18, fontWeight: "bold", color: "#e8d5ff" }}>{v}</div>
                    <div style={{ fontSize: 11, color: "#9a7abf" }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Badges preview */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "16px", marginBottom: 16, border: "1px solid #e0d8ce" }}>
              <div style={{ fontSize: 13, fontWeight: "bold", color: "#3a3028", marginBottom: 10 }}>✨ Badges ({badges.length}/{BADGES.length}) — {badges.length === BADGES.length ? "all unlocked! 🔮" : `${BADGES.length - badges.length} remaining`}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {BADGES.map(b => {
                  const earned = badges.includes(b.id);
                  return (
                    <div key={b.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: earned ? "#f0e8ff" : "#f5f2ee",
                      border: `1.5px solid ${earned ? "#c9a9ff" : "#e0d8ce"}`,
                      borderRadius: 12, padding: "10px 14px",
                      opacity: earned ? 1 : 0.5,
                    }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{b.emoji}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: "bold", color: earned ? "#4a3060" : "#9a8a7a" }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: earned ? "#7b5ea7" : "#b0a8a0" }}>{b.desc}</div>
                      </div>
                      {earned && <span style={{ marginLeft: "auto", fontSize: 14 }}>✅</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Randomizer */}
            <div style={{ background: "#2d1f3d", borderRadius: 16, padding: "16px", marginBottom: 16, border: "1px solid #4a3060" }}>
              <div style={{ fontSize: 13, color: "#c9a9ff", fontWeight: "bold", marginBottom: 12, textAlign: "center" }}>🎲 Can't decide? Let fate choose!</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => rollRandom("zone")} style={{
                  flex: 1, padding: "12px 8px", borderRadius: 12, border: "1.5px solid #7b5ea7",
                  background: rolling === "zone" ? "#7b5ea7" : "#3d2a54", color: "#e8d5ff",
                  fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif",
                }}>🗂️ Random Zone</button>
                <button onClick={() => rollRandom("sweep")} style={{
                  flex: 1, padding: "12px 8px", borderRadius: 12, border: "1.5px solid #7b5ea7",
                  background: rolling === "sweep" ? "#7b5ea7" : "#3d2a54", color: "#e8d5ff",
                  fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif",
                }}>⚡ Random Sweep</button>
              </div>
              {rolledZone && (
                <div onClick={() => { setTab("zones"); setActiveZone(rolledZone.id); }} style={{
                  marginTop: 12, background: "#f0e8ff", borderRadius: 12, padding: "12px 16px",
                  border: "1.5px solid #c9a9ff", cursor: "pointer", textAlign: "center",
                }}>
                  <div style={{ fontSize: 22 }}>{rolledZone.emoji}</div>
                  <div style={{ fontSize: 14, fontWeight: "bold", color: "#4a3060" }}>{rolledZone.label}</div>
                  <div style={{ fontSize: 11, color: "#7b5ea7", marginTop: 3 }}>tap to go there →</div>
                </div>
              )}
              {rolledSweep && (
                <div style={{
                  marginTop: 12, background: "#f0e8ff", borderRadius: 12, padding: "12px 16px",
                  border: "1.5px solid #c9a9ff", textAlign: "center",
                }}>
                  <div style={{ fontSize: 22 }}>⚡</div>
                  <div style={{ fontSize: 14, fontWeight: "bold", color: "#4a3060" }}>{rolledSweep.label}</div>
                </div>
              )}
            </div>

            <div style={{ background: "#fdf6ed", borderRadius: 12, padding: "12px 16px", border: "1px solid #e8d8c0" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#7a6a5a", fontStyle: "italic" }}>💡 One zone per day off. Daily habits every day. Sweeps whenever you have 2 minutes. You've got this 🌿</p>
            </div>
          </div>
        )}

        {/* DAILY */}
        {tab === "daily" && (
          <div>
            <p style={{ color: "#7a6a5a", fontSize: 13, marginBottom: 16 }}>5 minutes a day keeps the chaos away. +{XP_VALUES.daily} XP each, +15 bonus for all three! ⭐</p>
            {dailyHabits.map(h => <CheckItem key={h.id} checked={!!dailyChecked[h.id]} onToggle={() => toggleDaily(h.id)} emoji={h.emoji} label={h.label} />)}
            {allDailyDone && (
              <div style={{ textAlign: "center", marginTop: 8, padding: "12px", background: "#f0e8ff", borderRadius: 12, border: "1px solid #c9a9ff" }}>
                <span style={{ fontSize: 20 }}>⭐</span> <span style={{ fontSize: 14, color: "#4a3060", fontWeight: "bold" }}>All done! +15 bonus XP!</span>
              </div>
            )}
          </div>
        )}

        {/* SWEEPS */}
        {tab === "sweeps" && (
          <div>
            <p style={{ color: "#7a6a5a", fontSize: 13, marginBottom: 16 }}>Quick wins! +{XP_VALUES.sweep} XP each. No commitment needed.</p>
            {miniSweeps.map(s => <CheckItem key={s.id} checked={!!sweepChecked[s.id]} onToggle={() => toggleSweep(s.id)} label={s.label} />)}
            <div style={{ textAlign: "center", marginTop: 8, color: "#7a6a5a", fontSize: 13 }}>
              {sweepDone} sweep{sweepDone !== 1 ? "s" : ""} today {sweepDone >= 3 ? "⚡ On a roll!" : sweepDone >= 1 ? "👍 Good start!" : ""}
            </div>
          </div>
        )}

        {/* ZONES */}
        {tab === "zones" && (
          <div>
            {!activeZone ? (
              <>
                <p style={{ color: "#7a6a5a", fontSize: 13, marginBottom: 16 }}>One zone per day off. +{XP_VALUES.zoneBonus} XP for completing a full zone! 💚</p>
                {zones.map(z => {
                  const done = z.tasks.filter((_, i) => zoneChecked[`${z.id}-${i}`]).length;
                  const complete = done === z.tasks.length;
                  return (
                    <div key={z.id} onClick={() => setActiveZone(z.id)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: complete ? "#edf5eb" : "#fff", borderRadius: 12, padding: "14px 16px",
                      marginBottom: 10, cursor: "pointer", border: `1.5px solid ${complete ? "#a8c5a0" : "#e0d8ce"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 22 }}>{z.emoji}</span>
                        <div>
                          <div style={{ fontSize: 15, color: "#3a3028", fontWeight: "bold" }}>{z.label}</div>
                          <div style={{ fontSize: 12, color: "#9a8a7a" }}>{z.tasks.length} tasks</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {done > 0 && <span style={{ fontSize: 12, color: "#6a9e62" }}>{done}/{z.tasks.length}</span>}
                        {complete ? <span>✅</span> : <span style={{ color: "#c5b9ac" }}>›</span>}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <button onClick={() => setActiveZone(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a3060", fontSize: 14, fontFamily: "Georgia, serif", marginBottom: 16, padding: 0 }}>← Back to zones</button>
                <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: "1.5px solid #e0d8ce" }}>
                  <div style={{ background: "linear-gradient(135deg, #2d1f3d, #4a3060)", padding: "16px 20px" }}>
                    <div style={{ fontSize: 26 }}>{currentZone.emoji}</div>
                    <div style={{ color: "#fff", fontSize: 17, fontWeight: "bold" }}>{currentZone.label}</div>
                    <div style={{ color: "#c9a9ff", fontSize: 12, marginTop: 2 }}>{zoneDone}/{currentZone.tasks.length} tasks · +{XP_VALUES.zoneTask} XP per task · +{XP_VALUES.zoneBonus} bonus on completion</div>
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    {currentZone.tasks.map((task, i) => {
                      const key = `${activeZone}-${i}`;
                      const checked = !!zoneChecked[key];
                      const isTrash = task.toLowerCase().includes("bin") || task.toLowerCase().includes("trash") || task.toLowerCase().includes("recycling");
                      return (
                        <div key={i} onClick={() => toggleZone(activeZone, i)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px", borderBottom: i < currentZone.tasks.length - 1 ? "1px solid #f0e8e0" : "none", cursor: "pointer" }}>
                          <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: `2px solid ${checked ? "#6a9e62" : "#c5b9ac"}`, background: checked ? "#6a9e62" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {checked && <span style={{ color: "#fff", fontSize: 12 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 14, color: "#3a3028", textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.6 : 1 }}>
                            {isTrash ? "🗑️ " : ""}{task}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {zoneDone === currentZone.tasks.length && (
                  <div style={{ textAlign: "center", marginTop: 16, padding: "12px", background: "#f0e8ff", borderRadius: 12, border: "1px solid #c9a9ff" }}>
                    <span style={{ fontSize: 14, color: "#4a3060", fontWeight: "bold" }}>✨ Zone complete! +{XP_VALUES.zoneBonus} XP!</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* MONTHLY */}
        {tab === "monthly" && (
          <div>
            <p style={{ color: "#7a6a5a", fontSize: 13, marginBottom: 4 }}>Big tasks — once a month is enough. +{XP_VALUES.monthly} XP each! 🌙</p>
            <p style={{ color: "#9a8a7a", fontSize: 12, marginBottom: 16 }}>Resets at the start of each month. {Object.keys(monthlyChecked).filter(k=>monthlyChecked[k]).length}/{monthlyTasks.length} done this month.</p>
            {monthlyTasks.map(t => <CheckItem key={t.id} checked={!!monthlyChecked[t.id]} onToggle={() => toggleMonthly(t.id)} emoji={t.emoji} label={t.label} />)}
          </div>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div>
            <p style={{ color: "#7a6a5a", fontSize: 13, marginBottom: 16 }}>Your last 30 days. ⭐ zone · ✨ sweeps · 🌟 both!</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 20 }}>
              {last30.map(date => {
                const entry = history[date] || {};
                const hasZone = !!entry.zone;
                const hasSweeps = entry.sweeps > 0;
                const isToday = date === TODAY;
                const zoneInfo = zones.find(z => z.id === entry.zone);
                const star = hasZone && hasSweeps ? "🌟" : hasZone ? "⭐" : hasSweeps ? "✨" : null;
                return (
                  <div key={date} style={{
                    background: isToday ? "#4a3060" : "#fff",
                    border: `1.5px solid ${isToday ? "#7b5ea7" : hasZone || hasSweeps ? "#a8c5a0" : "#e0d8ce"}`,
                    borderRadius: 10, padding: "6px 4px", textAlign: "center",
                    minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                  }}>
                    <div style={{ fontSize: 10, color: isToday ? "#e8d5ff" : "#9a8a7a" }}>{parseInt(date.slice(8,10))}</div>
                    {star ? <div style={{ fontSize: 16 }}>{star}</div> : <div style={{ fontSize: 16, color: "#d0c8be" }}>·</div>}
                    {zoneInfo && <div style={{ fontSize: 12 }}>{zoneInfo.emoji}</div>}
                    {hasSweeps && <div style={{ fontSize: 9, color: isToday ? "#c9a9ff" : "#9a8a7a" }}>{entry.sweeps}⚡</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: "16px", border: "1px solid #e0d8ce" }}>
              <div style={{ fontSize: 13, fontWeight: "bold", color: "#3a3028", marginBottom: 10 }}>Last 30 days</div>
              <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                {[["⭐","Zones",last30.filter(d=>history[d]?.zone).length],["⚡","Sweep days",last30.filter(d=>history[d]?.sweeps>0).length],["🌟","Full days",last30.filter(d=>history[d]?.zone&&history[d]?.sweeps>0).length]].map(([e,l,c]) => (
                  <div key={l}>
                    <div style={{ fontSize: 22 }}>{e}</div>
                    <div style={{ fontSize: 20, fontWeight: "bold", color: "#3a3028" }}>{c}</div>
                    <div style={{ fontSize: 11, color: "#9a8a7a" }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={resetToday} style={{ background: "none", border: "1px solid #c5b9ac", borderRadius: 8, padding: "6px 16px", color: "#9a8a7a", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>Reset today</button>
        </div>
      </div>
    </div>
  );
}
