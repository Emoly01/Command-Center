// What the Ember Familiar says, by mood. Edit freely — one line is picked at
// random whenever the mood changes (or the familiar is tapped).
// House rule: snarky, affectionate, never shaming.
export const LINES = {
  sulking: [
    "I'm not saying I'm parched. I'm saying I'm dramatically parched.",
    "Water. I'm not asking twice. (I am. I always ask twice.)",
  ],
  content: [
    "Acceptable. Keep going.",
    "I'm glowing. Don't make it weird.",
  ],
  smug: [
    "Look at us. Hydrated. Insufferable.",
    "Goal hit. I'm going to be unbearable about this.",
  ],
};

// A random line for `mood`, avoiding `previous` when there's a choice.
export function pickLine(mood, previous) {
  const pool = LINES[mood] || LINES.content;
  const fresh = pool.length > 1 ? pool.filter((l) => l !== previous) : pool;
  return fresh[Math.floor(Math.random() * fresh.length)];
}
