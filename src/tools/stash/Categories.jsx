import { useState } from "react";
import ToolFrame from "../../ToolFrame";
import { UNITS, DEFAULT_CATEGORIES } from "../../lib/stash";
import { Chip } from "./bits";

const BACK = { to: "/stash", label: "Stash" };
const newId = () => "c_" + Math.random().toString(36).slice(2, 10);

// Rename, re-unit, add, or remove categories. IDs never change, so renaming
// is safe; a category still holding items can't be deleted.
export default function Categories({ items, status, categories, setCategories }) {
  const [draft, setDraft] = useState("");
  const used = (id) => items.filter((i) => i.categoryId === id).length;

  const patch = (id, fn) => setCategories((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  const rename = (id, name) => patch(id, (c) => ({ ...c, name: name.slice(0, 40) }));
  const toggleUnit = (id, u) =>
    patch(id, (c) => {
      if (!c.units.includes(u)) return { ...c, units: [...c.units, u] };
      return c.units.length > 1 ? { ...c, units: c.units.filter((x) => x !== u) } : c;
    });
  const makeDefault = (id, u) => patch(id, (c) => ({ ...c, units: [u, ...c.units.filter((x) => x !== u)] }));
  const remove = (id) => setCategories((cs) => (cs.length > 1 ? cs.filter((c) => c.id !== id) : cs));
  const add = (e) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    setCategories((cs) => [...cs, { id: newId(), name: name.slice(0, 40), units: ["pcs"] }]);
    setDraft("");
  };

  return (
    <ToolFrame title="Categories" status={status} back={BACK}>
      <p className="sl-hint">The first unit is the default for new items. Renaming never touches what's filed under it.</p>
      <ul className="sl-cats">
        {categories.map((c) => {
          const n = used(c.id);
          return (
            <li key={c.id} className="panel sl-cat">
              <div className="sl-cat-head">
                <input
                  className="sl-input"
                  aria-label="Category name"
                  value={c.name}
                  onChange={(e) => rename(c.id, e.target.value)}
                  onBlur={(e) => !e.target.value.trim() && rename(c.id, "Untitled")}
                />
                <button
                  type="button"
                  className="sl-pill"
                  disabled={n > 0 || categories.length < 2}
                  title={n > 0 ? "Move or delete its items first" : undefined}
                  onClick={() => remove(c.id)}
                >
                  {n > 0 ? `${n} item${n === 1 ? "" : "s"}` : "Delete"}
                </button>
              </div>
              <div className="sl-chips sl-wrap" role="group" aria-label={`Units for ${c.name}`}>
                {UNITS.map((u) => (
                  <Chip key={u} on={c.units.includes(u)} onClick={() => toggleUnit(c.id, u)}>
                    {u}
                  </Chip>
                ))}
              </div>
              {c.units.length > 1 && (
                <label className="sl-default">
                  Default
                  <select className="sl-input" value={c.units[0]} onChange={(e) => makeDefault(c.id, e.target.value)}>
                    {c.units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          );
        })}
      </ul>

      <form className="sl-searchrow" onSubmit={add}>
        <input
          className="sl-input"
          placeholder="New category · beads, embroidery floss…"
          aria-label="New category name"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="sl-pill sl-pill-hot" disabled={!draft.trim()}>
          Add
        </button>
      </form>

      <button
        type="button"
        className="sl-foot-link"
        onClick={() => {
          const missing = DEFAULT_CATEGORIES.filter((d) => !categories.some((c) => c.id === d.id));
          if (missing.length) setCategories((cs) => [...cs, ...missing]);
        }}
      >
        <span>Bring back any missing defaults</span>
        <span aria-hidden="true">→</span>
      </button>
    </ToolFrame>
  );
}
