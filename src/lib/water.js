import { useEffect } from "react";
import { useSyncedState } from "./useSyncedState";
import { useToday } from "./day";

// Firestore: users/{uid}/tools/water
//   goal: glasses per day
//   days: { "YYYY-MM-DD" (Berlin): glasses logged that day }
// Older builds stored only today as { date (UTC), count }; those fields are
// folded into `days` once and then nulled out.
export const WATER_DEFAULT = { goal: 2, days: {} };
export const GOAL_MIN = 1;
export const GOAL_MAX = 20;

const utcToday = () => new Date().toISOString().slice(0, 10);

// useWater() → today's count, the goal, and the actions that change them.
// Shared by the Water page and the Ember Familiar so there's one source of truth.
export function useWater() {
  const [s, setS, status] = useSyncedState("water", WATER_DEFAULT);
  const day = useToday();

  // One-shot legacy migration. The old `date` was written as a UTC date, so
  // compare it to today's UTC date — between 00:00 and 02:00 Berlin the UTC
  // date still reads "yesterday", and comparing to the Berlin key would drop
  // the count.
  useEffect(() => {
    if (status !== "ready" || !s.date) return;
    setS((p) => {
      const days = { ...p.days };
      if (p.date === utcToday() && days[day] == null) days[day] = p.count ?? 0;
      return { ...p, days, date: null, count: null };
    });
  }, [status, s.date]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = s.days?.[day] ?? 0;
  const goal = s.goal ?? WATER_DEFAULT.goal;

  const bump = (delta) =>
    setS((p) => {
      const cur = p.days?.[day] ?? 0;
      return { ...p, days: { ...p.days, [day]: Math.max(0, cur + delta) } };
    });

  return {
    count,
    goal,
    day,
    status,
    log: () => bump(1),
    undo: () => bump(-1),
    resetToday: () => setS((p) => ({ ...p, days: { ...p.days, [day]: 0 } })),
    setGoal: (raw) => {
      const g = Math.min(GOAL_MAX, Math.max(GOAL_MIN, Math.round(Number(raw) || 0)));
      setS((p) => ({ ...p, goal: g }));
    },
  };
}

// What water feeds the Ember Familiar. See src/familiar/mood.js.
export function waterFeed(count, goal) {
  return {
    source: "water",
    progress: goal > 0 ? count / goal : 0,
    label: `${count} / ${goal} glass${goal === 1 ? "" : "es"}`,
  };
}
