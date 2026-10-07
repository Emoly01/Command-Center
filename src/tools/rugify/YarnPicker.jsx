import { useState } from "react";
import { Link } from "react-router-dom";
import { fmtQty } from "../stash/bits";

const MAX = 12;

// Which stash yarns this rug may use, how many at most, and whether I pick
// the best N or use exactly the ticked ones.
export default function YarnPicker({ palette, items, onChange }) {
  const [all, setAll] = useState(false);
  const pool = items
    .filter((i) => i.status !== "used_up" && i.colors?.length && (all || i.categoryId === "tufting"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const allowed = new Set(palette.allowed);
  const { maxColors = 5, mode = "auto" } = palette;

  const snapshotFor = (ids) => {
    const snap = {};
    for (const id of ids) {
      const it = items.find((i) => i.id === id);
      snap[id] = it ? { name: it.name, hex: it.colors[0].hex } : palette.snapshot?.[id];
    }
    return snap;
  };
  const setAllowed = (ids) => onChange({ ...palette, allowed: ids, snapshot: snapshotFor(ids), autoFill: false });
  const toggle = (id) => setAllowed(allowed.has(id) ? palette.allowed.filter((x) => x !== id) : [...palette.allowed, id]);

  const missing = palette.allowed.filter((id) => !items.some((i) => i.id === id));

  return (
    <div className="rg-yarns">
      <div className="rg-row">
        <span className="sl-seg" role="group" aria-label="How to choose">
          <button type="button" aria-pressed={mode === "auto"} onClick={() => onChange({ ...palette, mode: "auto" })}>
            Best {maxColors}
          </button>
          <button type="button" aria-pressed={mode === "exact"} onClick={() => onChange({ ...palette, mode: "exact" })}>
            Exactly these
          </button>
        </span>
        <span className="sl-step" aria-label="Maximum colours">
          <button type="button" aria-label="Fewer colours" disabled={maxColors <= 1} onClick={() => onChange({ ...palette, maxColors: maxColors - 1 })}>−</button>
          <span className="sl-step-val">max {maxColors}</span>
          <button type="button" aria-label="More colours" disabled={maxColors >= MAX} onClick={() => onChange({ ...palette, maxColors: maxColors + 1 })}>+</button>
        </span>
      </div>
      <p className="sl-hint">
        {mode === "auto"
          ? `Tick everything you'd be happy to use. I'll pick the ${maxColors} that match the photo best.`
          : `I'll use every ticked yarn. Keep it to ${maxColors} or fewer.`}
      </p>

      {!pool.length ? (
        <p className="sl-empty">
          No {all ? "yarn with a colour" : "tufting yarn"} in the stash yet.{" "}
          <Link to="/stash/new">Log some</Link>, or{" "}
          {!all && <button type="button" className="rg-linkbtn" onClick={() => setAll(true)}>use any yarn</button>}.
        </p>
      ) : (
        <ul className="rg-yarnlist">
          {pool.map((it) => (
            <li key={it.id}>
              <label className="rg-yarn" data-on={allowed.has(it.id)}>
                <input type="checkbox" checked={allowed.has(it.id)} onChange={() => toggle(it.id)} />
                <span className="sl-sw" style={{ width: 26, height: 26, background: it.colors[0].hex }} />
                <span className="rg-yarn-name">
                  {it.name}
                  {it.colors.length > 1 && <small> · variegated, using its main colour</small>}
                </span>
                <span className="sl-mono sl-dim">{fmtQty(it.qty, it.unit)}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && <p className="sl-hint">{missing.length} chosen yarn{missing.length === 1 ? " is" : "s are"} gone from the stash; I'm using the colour I saved.</p>}

      <div className="rg-row">
        <button type="button" className="sl-pill" onClick={() => setAllowed([...new Set([...palette.allowed, ...pool.map((i) => i.id)])])}>
          Tick all
        </button>
        <button type="button" className="sl-pill" onClick={() => setAllowed([])}>Untick all</button>
        <button type="button" className="sl-pill" aria-pressed={all} onClick={() => setAll(!all)}>
          {all ? "Tufting yarn only" : "Show all yarn"}
        </button>
      </div>
    </div>
  );
}
