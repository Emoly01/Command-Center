import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useRugs, useRugSource } from "../../lib/rugs";
import { useStash } from "../../lib/stash";
import { buildSvg } from "../../lib/rugify/render";
import { useRugResult } from "./useResult";

const HIDE_MS = 3500;

// Fullscreen, white on black, mirrored for the back of the cloth by default.
// Controls fade away so nothing but the pattern hits the wall; tap to bring
// them back. Keeps the screen awake while it's open.
export default function RugProjector() {
  const { id } = useParams();
  const { rugs, status } = useRugs();
  const { items } = useStash();
  const rug = rugs.find((r) => r.id === id);
  const source = useRugSource(rug && !rug.locked ? id : null);
  const { result, status: gen, error } = useRugResult(rug, source, items);

  const [mirror, setMirror] = useState(true);
  const [lineWidth, setLineWidth] = useState(3);
  const [numberSize, setNumberSize] = useState(1.2);
  const [scaleBar, setScaleBar] = useState(true);
  const [ui, setUi] = useState(true);
  const hide = useRef(null);

  const poke = () => {
    setUi(true);
    clearTimeout(hide.current);
    hide.current = setTimeout(() => setUi(false), HIDE_MS);
  };
  useEffect(() => {
    poke();
    return () => clearTimeout(hide.current);
  }, []);

  // Screen wake lock: re-acquired when the tab comes back.
  useEffect(() => {
    let lock = null;
    const get = () => navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    get();
    const onVis = () => !document.hidden && get();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release?.().catch(() => {});
    };
  }, []);

  const svg = useMemo(
    () => (result ? buildSvg(result, { mode: "projector", mirror, lineWidth, numberSize, scaleBar }) : ""),
    [result, mirror, lineWidth, numberSize, scaleBar]
  );

  const fullscreen = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  };

  return (
    <div className="rg-proj" onPointerDown={poke} onPointerMove={poke} data-ui={ui}>
      {svg ? (
        <div className="rg-proj-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="rg-proj-msg">{error || (status !== "loading" && !rug ? "That rug's gone." : gen === "working" ? "Rug-ifying…" : "…")}</p>
      )}
      <div className="rg-proj-ui" aria-hidden={!ui}>
        <Link to={`/rugify/${id}`} className="sl-pill">← Back</Link>
        <label className="rg-toggle">
          <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} />
          Mirror for back of cloth
        </label>
        <label className="rg-range">
          <span>Lines</span>
          <input type="range" min="1" max="10" step="0.5" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} />
        </label>
        <label className="rg-range">
          <span>Numbers</span>
          <input type="range" min="0.5" max="2.5" step="0.1" value={numberSize} onChange={(e) => setNumberSize(Number(e.target.value))} />
        </label>
        <label className="rg-toggle">
          <input type="checkbox" checked={scaleBar} onChange={(e) => setScaleBar(e.target.checked)} />
          10 cm bar
        </label>
        <button type="button" className="sl-pill" onClick={fullscreen}>Fullscreen</button>
      </div>
    </div>
  );
}
