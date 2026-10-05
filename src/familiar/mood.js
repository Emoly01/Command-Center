// The Ember Familiar's mood is derived, never stored. Each module that feeds
// it contributes a "feed" computed from its own data:
//
//   { source: "water", progress: 0..1+, weight?: 1, label?: "2 / 3 glasses" }
//
// progress is "how much of today's goal is done" (values over 1 are clamped).
// Undo, the daily reset and cross-device sync all come for free, because the
// mood is recomputed from whatever the source modules currently hold.

export const MOODS = ["sulking", "content", "smug"];

// Overall progress at or above `content` is on track; at `smug`, goal reached.
export const THRESHOLDS = { content: 0.25, smug: 1 };

const clamp01 = (n) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

// computeMood(feeds) → { mood, progress }
// progress is the weighted average across feeds, so "smug" means every feed
// has hit its goal.
export function computeMood(feeds = []) {
  const live = feeds.filter(Boolean);
  const total = live.reduce((w, f) => w + (f.weight ?? 1), 0);
  if (!total) return { mood: "sulking", progress: 0 };
  const progress =
    live.reduce((sum, f) => sum + clamp01(f.progress) * (f.weight ?? 1), 0) / total;
  const mood =
    progress >= THRESHOLDS.smug ? "smug" : progress >= THRESHOLDS.content ? "content" : "sulking";
  return { mood, progress };
}
