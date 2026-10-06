import { UNIT_STEP } from "../../lib/stash";

// Small shared pieces for the Stash Ledger screens.

export const pick = (a) => a[Math.floor(Math.random() * a.length)];

const UNCATEGORIZED = { id: "", name: "Uncategorized", units: ["pcs"] };
export const catById = (categories, id) => categories.find((c) => c.id === id) || UNCATEGORIZED;

// A sensible starting amount when the unit changes.
export const START_QTY = { skeins: 1, balls: 1, cones: 1, g: 100, kg: 1, m: 1, yd: 1, pcs: 1 };

const SINGULAR = { skeins: "skein", balls: "ball", cones: "cone" };
const round2 = (n) => Math.round(n * 100) / 100;

export function fmtQty(qty, unit) {
  const n = round2(Number(qty) || 0);
  return `${n} ${n === 1 && SINGULAR[unit] ? SINGULAR[unit] : unit}`;
}

export const stepQty = (qty, unit, dir) =>
  Math.max(0, round2((Number(qty) || 0) + dir * (UNIT_STEP[unit] || 1)));

// Photo thumbnail, or the item's colors as a striped tile when there's no photo.
export function Thumb({ item, size = 64 }) {
  const style = { width: size, height: size };
  if (item.thumb) return <img className="sl-thumb" src={item.thumb} alt="" style={style} />;
  const hexes = (item.colors || []).map((c) => c.hex);
  const bg = !hexes.length
    ? undefined
    : hexes.length === 1
      ? hexes[0]
      : `linear-gradient(135deg, ${hexes
          .map((h, i) => `${h} ${(i * 100) / hexes.length}% ${((i + 1) * 100) / hexes.length}%`)
          .join(", ")})`;
  return <span className="sl-thumb sl-thumb-none" style={{ ...style, background: bg }} aria-hidden="true" />;
}

export function Swatches({ colors, size = 16 }) {
  if (!colors?.length) return null;
  return (
    <span className="sl-swatches">
      {colors.map((c, i) => (
        <span
          key={i}
          className="sl-sw"
          title={`${c.name ? c.name + " " : ""}${c.hex}`}
          style={{ width: size, height: size, background: c.hex }}
        />
      ))}
    </span>
  );
}

// − amount + ; `big` for the item page.
export function QtyStepper({ qty, unit, onChange, label, big = false }) {
  const cls = big ? "sl-step sl-step-big" : "sl-step";
  return (
    <span className={cls}>
      <button
        type="button"
        onClick={() => onChange(stepQty(qty, unit, -1))}
        disabled={!(qty > 0)}
        aria-label={`Less ${label}`}
      >
        −
      </button>
      <span className="sl-step-val" aria-live="polite">{fmtQty(qty, unit)}</span>
      <button type="button" onClick={() => onChange(stepQty(qty, unit, 1))} aria-label={`More ${label}`}>
        +
      </button>
    </span>
  );
}

// Pill toggle used for categories, tags and units.
export function Chip({ on, onClick, children, ...rest }) {
  return (
    <button type="button" className="sl-chip" aria-pressed={!!on} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}

// Inline stroke icons, sized by font.
export const Icon = {
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
  ),
  dropper: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.5 4.5a2.1 2.1 0 0 0-3 0L14 7l3 3 2.5-2.5a2.1 2.1 0 0 0 0-3z" />
      <path d="M14 7l-8.5 8.5L5 19l3.5-.5L17 10" />
      <path d="M12.5 5.5l6 6" />
    </svg>
  ),
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  camera: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 16l5-5 4 4 2-2 5 5" /><circle cx="15.5" cy="9.5" r="1.5" />
    </svg>
  ),
  archive: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10h14V9" /><path d="M10 13h4" /></svg>
  ),
};
