import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ToolFrame from "../../ToolFrame";
import { createRug, prepareRugSource } from "../../lib/rugs";
import { Icon } from "../stash/bits";
import { tuftingPalette } from "./useResult";

const BACK = { to: "/rugify", label: "Rugs" };

// Pick or take a photo; it's shrunk, saved, and you land in the editor with
// your tufting yarn already ticked.
export default function NewRug({ status, items, settings }) {
  const navigate = useNavigate();
  const snapRef = useRef(null);
  const chooseRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  // Read the stash after the photo is shrunk, not when it was picked: on a
  // slow connection it may still be arriving.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const photo = await prepareRugSource(file);
      photo.revoke();
      const palette = tuftingPalette(itemsRef.current);
      const name = `Rug · ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
      const id = await createRug(
        {
          name,
          palette,
          settings: { cellMm: settings.cellMm, minDetailMm: settings.minDetailMm },
        },
        photo
      );
      navigate(`/rugify/${id}`, { replace: true });
    } catch (x) {
      setErr(x.message || "Couldn't read that image.");
      setBusy(false);
    }
  };

  return (
    <ToolFrame title="New rug" status={status} back={BACK}>
      <input ref={snapRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={chooseRef} type="file" accept="image/*" hidden onChange={onFile} />
      <div className="sl-photo-empty">
        <button type="button" className="sl-big-btn" disabled={busy} onClick={() => snapRef.current.click()}>
          {Icon.camera} Snap
        </button>
        <button type="button" className="sl-big-btn" disabled={busy} onClick={() => chooseRef.current.click()}>
          {Icon.image} Choose
        </button>
        <p className="sl-hint">{busy ? "Shrinking and saving your photo…" : "Any photo or image. You'll crop it to the rug next."}</p>
      </div>
      {err && <p className="sl-err" role="alert">{err}</p>}
    </ToolFrame>
  );
}
