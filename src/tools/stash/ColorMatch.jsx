import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ToolFrame from "../../ToolFrame";
import Eyedropper from "./Eyedropper";
import { preparePhoto } from "../../lib/image";
import { normHex } from "../../lib/color";
import { rankByColor } from "../../lib/stash";
import { catById, fmtQty, Thumb, Chip, Icon } from "./bits";

const BACK = { to: "/stash", label: "Stash" };

function verdict(top) {
  if (!top) return null;
  const where = top.item.location ? `, ${top.item.location}` : "";
  if (top.band.key === "twin") return `You already own this. ${top.item.name}${where}. Put it down, goblin queen.`;
  if (top.band.key === "close") return `Close enough to count. ${top.item.name}${where}. Just saying.`;
  if (top.band.key === "family") return "You own a cousin, not a twin. Your call. I'm not your accountant.";
  return "Nothing close. Fine. Call it research.";
}

// "Do I already own this?" Pick a color (or snap the thing in the shop and
// tap it) and see the nearest things in the stash.
export default function ColorMatch({ items, status, categories }) {
  const [params, setParams] = useSearchParams();
  const hex = normHex(params.get("hex") || "");
  const [cat, setCat] = useState("all");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const snapRef = useRef(null);
  const chooseRef = useRef(null);
  useEffect(() => () => photo?.revoke?.(), [photo]);

  const setHex = (h) => setParams(h ? { hex: h } : {}, { replace: true });

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      setPhoto(await preparePhoto(file, { encode: false }));
    } catch (x) {
      setErr(x.message || "Couldn't read that photo.");
    } finally {
      setBusy(false);
    }
  };

  const pool = items.filter((i) => i.status !== "used_up" && (cat === "all" || i.categoryId === cat));
  const results = hex ? rankByColor(pool, hex, 8) : [];
  const anyColors = items.some((i) => i.status !== "used_up" && i.colors?.length);

  return (
    <ToolFrame title="Do I own this?" status={status} back={BACK}>
      <input ref={snapRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={chooseRef} type="file" accept="image/*" hidden onChange={onFile} />

      <div className="sl-target">
        <span className="sl-target-sw" style={hex ? { background: hex } : undefined} data-empty={!hex} />
        <div className="sl-target-body">
          <span className="sl-label">In the shop</span>
          <span className="sl-mono sl-target-hex">{hex || "pick a color"}</span>
          <div className="sl-row-btns">
            <button type="button" className="sl-pill sl-pill-hot" onClick={() => snapRef.current.click()} disabled={busy}>
              {Icon.camera} Snap &amp; tap
            </button>
            <button type="button" className="sl-pill" onClick={() => chooseRef.current.click()} disabled={busy}>
              {Icon.image} Photo
            </button>
            <label className="sl-pill">
              <input
                type="color"
                className="sl-color-input"
                value={(hex || "#a3542f").toLowerCase()}
                onChange={(e) => setHex(normHex(e.target.value))}
              />
              Pick
            </label>
          </div>
        </div>
      </div>
      {err && <p className="sl-err" role="alert">{err}</p>}

      {photo && (
        <div className="sl-photo">
          <Eyedropper url={photo.url} sample={photo.sample} onPick={setHex} />
          <div className="sl-row-btns">
            <span className="sl-hint">Tap the thing you're holding. Drag to fine-tune.</span>
            <button type="button" className="sl-pill" onClick={() => setPhoto(null)}>
              Done with photo
            </button>
          </div>
        </div>
      )}

      <div className="sl-chips sl-scroll" role="group" aria-label="Only search in">
        <Chip on={cat === "all"} onClick={() => setCat("all")}>Everything</Chip>
        {categories.map((c) => (
          <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>

      {!anyColors && status !== "loading" && (
        <p className="sl-empty">Nothing in the stash has a color yet, so I've got nothing to compare. Add something first.</p>
      )}

      {hex && anyColors && (
        <>
          <p className="sl-verdict" aria-live="polite">
            {results.length ? verdict(results[0]) : "Nothing in this category has a color yet."}
          </p>
          <ul className="sl-list">
            {results.map((r) => {
              const c = catById(categories, r.item.categoryId);
              const strand = r.item.colors.length > 1 ? `${r.color.name || r.color.hex} strand · ` : "";
              return (
                <li key={r.item.id}>
                  <Link to={`/stash/${r.item.id}`} className="sl-match">
                    <span className="sl-split" aria-hidden="true">
                      <span style={{ background: hex }} />
                      <span style={{ background: r.color.hex }} />
                    </span>
                    <Thumb item={r.item} size={44} />
                    <span className="sl-match-body">
                      <span className="sl-item-name">{r.item.name}</span>
                      <span className="sl-item-meta">
                        {strand}
                        {fmtQty(r.item.qty, r.item.unit)} · {r.item.location || c.name}
                      </span>
                    </span>
                    <span className="sl-match-score">
                      <span className="sl-mono">ΔE {r.distance.toFixed(1)}</span>
                      <span className="sl-band" data-band={r.band.key}>{r.band.label}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="sl-fine">CIEDE2000 · matches any of an item's colors · used-up items skipped</p>
        </>
      )}
    </ToolFrame>
  );
}
