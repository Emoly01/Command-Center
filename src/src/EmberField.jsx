import { useMemo } from "react";

export default function EmberField({ count = 18 }) {
  const motes = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        dur: 7 + Math.random() * 9,
        delay: Math.random() * 9,
        drift: `${Math.random() * 60 - 30}px`,
        scale: 0.6 + Math.random() * 1.3,
      })),
    [count]
  );
  return (
    <div className="ember-field" aria-hidden="true">
      {motes.map((m, i) => (
        <i
          key={i}
          style={{
            left: `${m.left}%`,
            animationDuration: `${m.dur}s`,
            animationDelay: `${m.delay}s`,
            transform: `scale(${m.scale})`,
            "--drift": m.drift,
          }}
        />
      ))}
    </div>
  );
}
