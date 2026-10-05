import { useId } from "react";

// The Ember Familiar — a little flame with opinions. Pure presentation: give
// it a mood and it shows it. All motion lives in index.css (ef-*), and every
// mood also reads without motion (size, brightness, which way it faces).

// Body silhouettes. Sulking leans its tip away; smug is rounder and wider.
const BODY = {
  sulking: "M61 24 C60 38 76 48 76 70 C76 85 64 96 50 96 C36 96 24 85 24 70 C24 53 40 45 46 35 C50 39 57 35 61 24 Z",
  content: "M50 12 C56 28 78 42 78 68 C78 85 65 96 50 96 C35 96 22 85 22 68 C22 50 38 40 44 26 C46 33 48 35 50 12 Z",
  smug:    "M50 20 C60 32 84 46 84 70 C84 87 69 97 50 97 C31 97 16 87 16 70 C16 50 34 42 42 30 C45 36 48 37 50 20 Z",
};

function Face({ mood }) {
  if (mood === "sulking") {
    // Half-lidded, eyes cut to the side, small pout — turned away from you.
    return (
      <g className="ef-face">
        <path d="M53 70 h7 a3.5 3 0 0 1 -7 0 Z" />
        <path d="M64 70 h7 a3.5 3 0 0 1 -7 0 Z" />
        <path className="ef-line" d="M59 82 q3.5 -2.5 7 0" />
      </g>
    );
  }
  if (mood === "smug") {
    // Eyes squeezed shut in satisfaction, lopsided smirk, a little blush.
    return (
      <g className="ef-face">
        <path className="ef-line" d="M35 67 q5 -6 10 0" />
        <path className="ef-line" d="M55 67 q5 -6 10 0" />
        <path className="ef-line" d="M44 78 q7 5 13 -2" />
        <ellipse className="ef-blush" cx="32" cy="75" rx="4.5" ry="2.5" />
        <ellipse className="ef-blush" cx="68" cy="75" rx="4.5" ry="2.5" />
      </g>
    );
  }
  return (
    <g className="ef-face">
      <g className="ef-eyes">
        <ellipse cx="41" cy="66" rx="3.4" ry="4.6" />
        <ellipse cx="59" cy="66" rx="3.4" ry="4.6" />
        <circle className="ef-shine" cx="42.2" cy="64.4" r="1.1" />
        <circle className="ef-shine" cx="60.2" cy="64.4" r="1.1" />
      </g>
      <path className="ef-line" d="M46 77 q4 3 8 0" />
    </g>
  );
}

// `pulse` — bump it to replay the little "gulp" (e.g. on each logged glass).
export default function EmberFamiliar({ mood = "content", pulse = 0 }) {
  const id = useId().replace(/:/g, "");
  const body = `ef-body-${id}`;
  const halo = `ef-halo-${id}`;
  return (
    <svg className="ef-creature" data-mood={mood} viewBox="0 0 100 108" aria-hidden="true">
      <defs>
        <radialGradient id={body} cx="50%" cy="70%" r="62%">
          <stop offset="0" className="ef-s-core" />
          <stop offset=".55" className="ef-s-mid" />
          <stop offset="1" className="ef-s-edge" />
        </radialGradient>
        <radialGradient id={halo}>
          <stop offset="0" className="ef-s-halo" />
          <stop offset="1" className="ef-s-halo" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="ef-halo" cx="50" cy="68" r="48" fill={`url(#${halo})`} />
      <ellipse className="ef-coal" cx="50" cy="99" rx="24" ry="4.5" />
      <g key={pulse} className="ef-pop">
        <g className="ef-bob">
          <g className="ef-body">
            <path className="ef-flame" d={BODY[mood] || BODY.content} fill={`url(#${body})`} />
            <Face mood={mood} />
          </g>
        </g>
      </g>
    </svg>
  );
}
