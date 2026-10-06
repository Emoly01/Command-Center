import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ToolFrame from "../../ToolFrame";
import Eyedropper from "./Eyedropper";
import { preparePhoto } from "../../lib/image";
import { normHex, samplePatch } from "../../lib/color";
import { addItem, updateItem, useStashPhoto, MAX_COLORS } from "../../lib/stash";
import { catById, START_QTY, stepQty, Chip, Icon, pick } from "./bits";

const LAST_CAT = "hearth:stash:lastCategory";
const SAVED = [
  "Into the stash. Now you'll actually know you own it.",
  "Logged. Future you, standing in the craft store, says thanks.",
  "Filed. One less “do I already have this?” panic.",
];

function readLastCat() {
  try {
    return localStorage.getItem(LAST_CAT);
  } catch {
    return null;
  }
}
function writeLastCat(id) {
  try {
    localStorage.setItem(LAST_CAT, id);
  } catch {
    /* per-device nicety only */
  }
}

const slotsFrom = (colors) =>
  Array.from({ length: MAX_COLORS }, (_, i) => (colors?.[i] ? { hex: colors[i].hex, name: colors[i].name || "" } : null));

// New item (/stash/new) or edit (/stash/:id/edit).
export default function ItemForm({ items, status, categories, editing = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const item = editing ? items.find((i) => i.id === id) : null;

  if (editing && !item) {
    return (
      <ToolFrame title="Edit" status={status} back={{ to: "/stash", label: "Stash" }}>
        <p className="sl-empty">{status === "loading" ? "…" : "That one's gone. Deleted, or never was."}</p>
      </ToolFrame>
    );
  }
  return <Form key={item?.id || "new"} item={item} status={status} categories={categories} navigate={navigate} />;
}

function Form({ item, status, categories, navigate }) {
  const editing = !!item;
  const [categoryId, setCategoryId] = useState(
    () => item?.categoryId ?? (categories.find((c) => c.id === readLastCat()) || categories[0]).id
  );
  const cat = catById(categories, categoryId);
  const [unit, setUnit] = useState(() => item?.unit ?? cat.units[0]);
  const [qty, setQty] = useState(() => String(item?.qty ?? START_QTY[unit] ?? 1));
  const [slots, setSlots] = useState(() => slotsFrom(item?.colors));
  const [active, setActive] = useState(0);
  const [hexDraft, setHexDraft] = useState("");
  const [name, setName] = useState(item?.name ?? "");
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [fiber, setFiber] = useState(item?.fiber ?? "");
  const [location, setLocation] = useState(item?.location ?? "");
  const [tags, setTags] = useState((item?.tags || []).join(", "));
  const [notes, setNotes] = useState(item?.notes ?? "");

  const [photo, setPhoto] = useState(null); // a new photo, from preparePhoto()
  const [removedPhoto, setRemovedPhoto] = useState(false);
  const [existing, setExisting] = useState(null); // the stored photo, ready to re-pick from
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [guessed, setGuessed] = useState(false);
  const snapRef = useRef(null);
  const chooseRef = useRef(null);

  const stored = useStashPhoto(editing ? item.id : null, editing && !!item.hasPhoto);
  useEffect(() => {
    if (!stored) return;
    let alive = true;
    preparePhoto(stored, { encode: false })
      .then((p) => alive && setExisting(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [stored]);
  useEffect(() => () => photo?.revoke?.(), [photo]);

  const slot = slots[active];
  useEffect(() => setHexDraft(slot?.hex || ""), [active, slot?.hex]);

  const setSlot = (i, next) =>
    setSlots((s) => {
      const n = [...s];
      n[i] = next;
      return n;
    });

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const p = await preparePhoto(file);
      setPhoto(p);
      setRemovedPhoto(false);
      // No color yet: guess from the middle of the frame, so a straight-on
      // shot of one skein is already done. A tap on the photo corrects it.
      if (!slots[0]) {
        const ctx = p.sample.getContext("2d", { willReadFrequently: true });
        const r = Math.max(3, Math.round(p.sample.width * 0.015));
        const hex = samplePatch(ctx, p.sample.width / 2, p.sample.height / 2, r);
        if (hex) {
          setSlot(0, { hex, name: "" });
          setActive(0);
          setGuessed(true);
        }
      }
    } catch (x) {
      setErr(x.message || "Couldn't read that photo.");
    } finally {
      setBusy(false);
    }
  };

  const putColor = (hex) => {
    setGuessed(false);
    setSlot(active, { hex, name: slot?.name || "" });
  };

  const chooseCat = (c) => {
    setCategoryId(c.id);
    if (!editing || !c.units.includes(unit)) {
      setUnit(c.units[0]);
      setQty(String(START_QTY[c.units[0]] ?? 1));
    }
  };
  const chooseUnit = (u) => {
    setUnit(u);
    if (!editing) setQty(String(START_QTY[u] ?? 1));
  };
  const qtyNum = Number(String(qty).replace(",", ".")) || 0;

  const shown = photo || (!removedPhoto && existing) || null;
  const autoName = `${cat.name} · ${slots[0]?.hex || "no color"}`;

  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    const fields = {
      name: name.trim() || autoName,
      categoryId,
      unit,
      qty: qtyNum,
      colors: slots.filter(Boolean),
      brand,
      fiber,
      location,
      notes,
      tags,
    };
    const newPhoto = photo ? { thumb: photo.thumb, full: photo.full } : null;
    if (editing) {
      await updateItem(item.id, fields, newPhoto || (removedPhoto ? null : undefined));
      navigate(`/stash/${item.id}`, { replace: true });
    } else {
      writeLastCat(categoryId);
      await addItem(fields, newPhoto);
      navigate("/stash", { replace: true, state: { flash: pick(SAVED) } });
    }
  };

  const back = editing ? { to: `/stash/${item.id}`, label: "Item" } : { to: "/stash", label: "Stash" };

  return (
    <ToolFrame title={editing ? "Edit" : "Quick add"} status={status} back={back}>
      <form className="sl-form" onSubmit={save}>
        <input ref={snapRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        <input ref={chooseRef} type="file" accept="image/*" hidden onChange={onFile} />

        {shown ? (
          <div className="sl-photo">
            <Eyedropper url={shown.url} sample={shown.sample} onPick={putColor} />
            <p className="sl-hint">
              {guessed
                ? "I guessed from the middle. Tap the yarn if I'm wrong; drag to fine-tune."
                : "Tap the yarn, not the shadow between strands. I average a little patch anyway."}
            </p>
            <div className="sl-row-btns">
              <button type="button" className="sl-pill" onClick={() => snapRef.current.click()}>
                {Icon.camera} Retake
              </button>
              <button type="button" className="sl-pill" onClick={() => chooseRef.current.click()}>
                {Icon.image} Another
              </button>
              {editing && (
                <button
                  type="button"
                  className="sl-pill"
                  onClick={() => {
                    setPhoto(null);
                    setRemovedPhoto(true);
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        ) : editing && item.hasPhoto && !removedPhoto ? (
          <div className="sl-photo-wait">{item.thumb && <img src={item.thumb} alt="" />}</div>
        ) : (
          <div className="sl-photo-empty">
            <button type="button" className="sl-big-btn" onClick={() => snapRef.current.click()} disabled={busy}>
              {Icon.camera} Snap
            </button>
            <button type="button" className="sl-big-btn" onClick={() => chooseRef.current.click()} disabled={busy}>
              {Icon.image} Choose
            </button>
            <p className="sl-hint">{busy ? "Shrinking your photo…" : "Or skip the photo and set the color by hand below."}</p>
          </div>
        )}
        {err && <p className="sl-err" role="alert">{err}</p>}

        <fieldset className="sl-field">
          <legend>Colors</legend>
          <div className="sl-slots">
            {slots.map((s, i) => (
              <div key={i} className="sl-slot" data-active={i === active}>
                <button type="button" className="sl-slot-pick" aria-pressed={i === active} onClick={() => setActive(i)}>
                  <span
                    className="sl-slot-sw"
                    style={s ? { background: s.hex } : undefined}
                    data-empty={!s}
                  />
                  <span className="sl-slot-txt">
                    <span>{i === 0 ? "Primary" : "Extra"}</span>
                    <b>{s ? s.hex : i === active ? "tap photo" : "+ add"}</b>
                  </span>
                </button>
                {s && (
                  <button
                    type="button"
                    className="sl-slot-x"
                    aria-label={`Clear ${i === 0 ? "primary" : "extra"} color`}
                    onClick={() => setSlot(i, null)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="sl-tune">
            <input
              type="color"
              aria-label="Pick or fine-tune this color"
              value={(slot?.hex || "#888888").toLowerCase()}
              onChange={(e) => putColor(normHex(e.target.value))}
            />
            <input
              type="text"
              className="sl-input sl-mono"
              aria-label="Hex code"
              placeholder="#A3542F"
              value={hexDraft}
              maxLength={7}
              onChange={(e) => {
                setHexDraft(e.target.value);
                const h = normHex(e.target.value);
                if (h && e.target.value.replace("#", "").length === 6) putColor(h);
              }}
            />
            <input
              type="text"
              className="sl-input"
              aria-label="Color name"
              placeholder="Name (optional)"
              value={slot?.name || ""}
              disabled={!slot}
              maxLength={40}
              onChange={(e) => setSlot(active, { ...slot, name: e.target.value })}
            />
          </div>
        </fieldset>

        <label className="sl-field">
          <span className="sl-label">Name</span>
          <input
            type="text"
            className="sl-input"
            placeholder={`Optional · else “${autoName}”`}
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <fieldset className="sl-field">
          <legend>Category</legend>
          <div className="sl-chips sl-wrap">
            {categories.map((c) => (
              <Chip key={c.id} on={c.id === categoryId} onClick={() => chooseCat(c)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="sl-field">
          <legend>Quantity</legend>
          <div className="sl-qty">
            <span className="sl-step sl-step-big">
              <button type="button" aria-label="Less" onClick={() => setQty(String(stepQty(qtyNum, unit, -1)))}>
                −
              </button>
              <input
                type="text"
                inputMode="decimal"
                className="sl-qty-input"
                aria-label={`Amount in ${unit}`}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <button type="button" aria-label="More" onClick={() => setQty(String(stepQty(qtyNum, unit, 1)))}>
                +
              </button>
            </span>
            {cat.units.length > 1 ? (
              <span className="sl-seg" role="group" aria-label="Unit">
                {cat.units.map((u) => (
                  <button key={u} type="button" aria-pressed={u === unit} onClick={() => chooseUnit(u)}>
                    {u}
                  </button>
                ))}
              </span>
            ) : (
              <span className="sl-unit">{unit}</span>
            )}
          </div>
        </fieldset>

        <details className="sl-more" open={editing}>
          <summary>Brand, fiber, bin, tags, notes (optional)</summary>
          <div className="sl-more-body">
            <input className="sl-input" placeholder="Brand" aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            <input
              className="sl-input"
              placeholder="Fiber / weight · merino, DK"
              aria-label="Fiber and weight"
              value={fiber}
              onChange={(e) => setFiber(e.target.value)}
            />
            <input
              className="sl-input"
              placeholder="Where it lives · Bin 2, top shelf"
              aria-label="Storage location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <input
              className="sl-input"
              placeholder="Tags · amigurumi, gift"
              aria-label="Tags, separated by commas"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <textarea
              className="sl-input"
              rows={3}
              placeholder="Notes"
              aria-label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </details>

        <div className="sl-savebar">
          <button type="submit" className="sl-cta" disabled={busy}>
            {editing ? "Save changes" : "Into the stash"}
          </button>
        </div>
      </form>
    </ToolFrame>
  );
}
