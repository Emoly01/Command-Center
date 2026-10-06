import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ToolFrame from "../../ToolFrame";
import { setQty, setUsedUp } from "../../lib/stash";
import { catById, Thumb, Swatches, QtyStepper, Chip, Icon } from "./bits";

const haystack = (it, catName) =>
  [it.name, it.brand, it.fiber, it.location, it.notes, catName, ...(it.tags || []), ...(it.colors || []).flatMap((c) => [c.name, c.hex])]
    .join(" ")
    .toLowerCase();

// The list: search, filters, quick +/−, and the way into everything else.
export default function Ledger({ items, status, categories, view, setView }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Show the save/archive note once; drop it from history so Back doesn't replay it.
  const [flash] = useState(() => location.state?.flash);
  useEffect(() => {
    if (location.state?.flash) navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const { q, cat, tag, archived } = view;
  const set = (patch) => setView((v) => ({ ...v, ...patch }));

  const active = items.filter((i) => i.status !== "used_up");
  const usedUp = items.length - active.length;
  const pool = archived ? items.filter((i) => i.status === "used_up") : active;

  const inCat = (it) => cat === "all" || it.categoryId === cat;
  const needle = q.trim().toLowerCase();
  const shown = pool
    .filter((it) => inCat(it) && (!tag || it.tags?.includes(tag)))
    .filter((it) => !needle || haystack(it, catById(categories, it.categoryId).name).includes(needle))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  // Tags worth offering: the most used ones in the current category.
  const topTags = useMemo(() => {
    const n = {};
    for (const it of pool) if (inCat(it)) for (const t of it.tags || []) n[t] = (n[t] || 0) + 1;
    return Object.entries(n)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([t]) => t);
  }, [pool, cat]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = (id) => pool.filter((i) => i.categoryId === id).length;
  const loading = status === "loading" && !items.length;

  let empty = null;
  if (!loading && !shown.length) {
    if (archived) empty = "Nothing used up yet. Ambitious.";
    else if (!items.length) empty = "Nothing logged yet. The stash is a vibe, not a ledger. Tap Add and fix that.";
    else empty = "Nothing matches. Either you don't own it, or you bought it and didn't log it. I know which one I'd bet on.";
  }

  return (
    <ToolFrame title={archived ? "The archive" : "Stash Ledger"} status={status}>
      {flash && !archived && <p className="sl-flash" aria-live="polite">{flash}</p>}

      <div className="sl-searchrow">
        <label className="sl-search">
          {Icon.search}
          <input
            type="search"
            placeholder="Name, brand, tag, bin, color…"
            aria-label="Search the stash"
            value={q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </label>
        <Link to="/stash/match" className="sl-iconbtn" aria-label="Search by color">
          {Icon.dropper}
        </Link>
      </div>

      <div className="sl-chips sl-scroll" role="group" aria-label="Category">
        <Chip on={cat === "all"} onClick={() => set({ cat: "all", tag: null })}>
          All <small>{pool.length}</small>
        </Chip>
        {categories.map((c) => (
          <Chip key={c.id} on={cat === c.id} onClick={() => set({ cat: c.id, tag: null })}>
            {c.name} <small>{count(c.id)}</small>
          </Chip>
        ))}
      </div>

      {topTags.length > 0 && (
        <div className="sl-chips sl-scroll sl-tags" role="group" aria-label="Tag">
          {topTags.map((t) => (
            <Chip key={t} on={tag === t} onClick={() => set({ tag: tag === t ? null : t })}>
              #{t}
            </Chip>
          ))}
        </div>
      )}

      {loading && <p className="sl-empty">…</p>}
      {empty && <p className="sl-empty">{empty}</p>}

      <ul className="sl-list">
        {shown.map((it) => {
          const c = catById(categories, it.categoryId);
          const meta = [c.name, it.brand, it.location].filter(Boolean).join(" · ");
          return (
            <li key={it.id} className="sl-item">
              <Link to={`/stash/${it.id}`} className="sl-item-thumb" aria-label={`Open ${it.name}`}>
                <Thumb item={it} />
              </Link>
              <div className="sl-item-body">
                <Link to={`/stash/${it.id}`} className="sl-item-name">{it.name}</Link>
                {meta && <span className="sl-item-meta">{meta}</span>}
                <div className="sl-item-foot">
                  <Swatches colors={it.colors} />
                  {archived ? (
                    <button type="button" className="sl-pill" onClick={() => setUsedUp(it.id, false)}>
                      Restore
                    </button>
                  ) : (
                    <QtyStepper qty={it.qty} unit={it.unit} label={it.name} onChange={(n) => setQty(it.id, n)} />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sl-foot">
        <button type="button" className="sl-foot-link" onClick={() => set({ archived: !archived, tag: null })}>
          <span>{archived ? "Back to the stash" : `Used up · ${usedUp} in the archive`}</span>
          <span aria-hidden="true">→</span>
        </button>
        <Link to="/stash/categories" className="sl-foot-link">
          <span>Categories</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {!archived && (
        <Link to="/stash/new" className="sl-fab">
          {Icon.plus} Add to stash
        </Link>
      )}
    </ToolFrame>
  );
}
