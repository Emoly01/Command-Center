import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ToolFrame from "../../ToolFrame";
import Cropper from "./Cropper";
import YarnPicker from "./YarnPicker";
import Estimate from "./Estimate";
import { useRugResult, tuftingPalette } from "./useResult";
import { exportPng, exportSvg, previewThumb } from "./exportFiles";
import { buildSvg } from "../../lib/rugify/render";
import { lockedFromResult } from "../../lib/rugify/lock";
import { gridSize, rugAspect } from "../../lib/rugify/crop";
import { updateRug, lockRug, unlockRug, deleteRug, useRugSource } from "../../lib/rugs";

const BACK = { to: "/rugify", label: "Rugs" };
const EDITABLE = ["name", "crop", "size", "palette", "settings"];
const pickEditable = (rug) => Object.fromEntries(EDITABLE.map((k) => [k, rug[k]]));
const clampNum = (v, lo, hi, fallback) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const fmtDate = (ms) => new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function Editor({ rugs, status, ...rest }) {
  const { id } = useParams();
  const rug = rugs.find((r) => r.id === id);
  if (!rug) {
    return (
      <ToolFrame title="Rug" status={status} back={BACK}>
        <p className="sl-empty">{status === "loading" ? "…" : "That rug's gone. Deleted, or never was."}</p>
      </ToolFrame>
    );
  }
  return <EditorInner key={rug.id} rug={rug} status={status} {...rest} />;
}

function EditorInner({ rug, status, items, settings, setSettings }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => pickEditable(rug));
  const [view, setView] = useState("preview");
  const [mirror, setMirror] = useState(true);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // Edits show at once and save shortly after the last change.
  const pending = useRef({});
  const timer = useRef(null);
  const flush = () => {
    clearTimeout(timer.current);
    const p = pending.current;
    pending.current = {};
    if (Object.keys(p).length) updateRug(rug.id, p).catch((e) => setMsg(e.message));
  };
  const change = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    pending.current = { ...pending.current, ...patch };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // A rug created before the stash had loaded: tick the tufting yarn once it arrives.
  useEffect(() => {
    if (!draft.palette?.autoFill) return;
    const p = tuftingPalette(items);
    if (p.allowed.length) change({ palette: { ...p, autoFill: false } });
  }, [items, draft.palette?.autoFill]); // eslint-disable-line react-hooks/exhaustive-deps

  const locked = rug.locked || null;
  const project = useMemo(() => ({ ...rug, ...draft, locked }), [rug, draft, locked]);
  const source = useRugSource(rug.id);
  const { status: gen, result, error, note } = useRugResult(project, source, items);

  // Keep the list thumbnail in step with the result.
  useEffect(() => {
    if (gen !== "ready" || !result) return;
    const t = setTimeout(() => {
      previewThumb(result)
        .then((thumb) => thumb !== rug.thumb && updateRug(rug.id, { thumb }))
        .catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [gen, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const svg = useMemo(
    () => (result ? buildSvg(result, view === "preview" ? { mode: "preview" } : { mode: "outline", mirror, lineWidth: 1.5 }) : ""),
    [result, view, mirror]
  );

  const shape = draft.crop?.shape || "rect";
  const size = draft.size;
  const aspect = rugAspect(size, shape);
  const grid = gridSize({ wCm: size.wCm, hCm: shape === "circle" ? size.wCm : size.hCm }, shape, draft.settings.cellMm);

  const doLock = () => {
    if (!result || gen !== "ready") return;
    if (!window.confirm("Lock this pattern? From now on it's drawn only from the saved grid: no algorithm update or other device can change it. You can unlock it later.")) return;
    flush();
    try {
      lockRug(rug.id, lockedFromResult(result)).catch((e) => setMsg(e.message));
      setMsg("Locked. Carved in stone, or at least in Firestore.");
    } catch (e) {
      setMsg(e.message);
    }
  };
  const doUnlock = () => {
    if (!window.confirm("Unlock & edit? The pattern goes back to being regenerated from the photo and settings, so it may change. Lock again when you're happy.")) return;
    unlockRug(rug.id).catch((e) => setMsg(e.message));
    setMsg(null);
  };
  const doDelete = () => {
    if (!window.confirm(`Delete “${draft.name}” and its photo for good?`)) return;
    deleteRug(rug.id);
    navigate("/rugify", { replace: true });
  };
  const doExport = async (kind) => {
    if (!result) return;
    setBusy(true);
    try {
      if (kind === "svg") exportSvg(project, result, mirror);
      else await exportPng(project, result, mirror);
    } catch (e) {
      setMsg(`Export failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolFrame title={draft.name || "Untitled rug"} status={status} back={BACK}>
      <div className="rg-editor">
        <label className="sl-field">
          <span className="sl-label">Name</span>
          <input className="sl-input" value={draft.name} maxLength={80} onChange={(e) => change({ name: e.target.value })} />
        </label>

        {locked ? (
          <section className="rg-locked" aria-label="Locked pattern">
            <span className="sl-label">Locked · {fmtDate(locked.at)}</span>
            <p>
              This pattern is frozen: {locked.wCm} × {locked.hCm} cm, {locked.legend.length} yarns, {locked.cellMm} mm cells.
              It's drawn from the saved grid only, so it looks the same on every device, forever.
            </p>
            <button type="button" className="sl-pill" onClick={doUnlock}>Unlock & edit</button>
          </section>
        ) : (
          <>
            <section className="panel rg-panel" aria-label="Shape and size">
              <h2 className="sl-label">Shape & size</h2>
              <div className="rg-row">
                <span className="sl-seg" role="group" aria-label="Shape">
                  <button type="button" aria-pressed={shape === "rect"} onClick={() => change({ crop: { ...draft.crop, shape: "rect" } })}>Rectangle</button>
                  <button type="button" aria-pressed={shape === "circle"} onClick={() => change({ crop: { ...draft.crop, shape: "circle" } })}>Circle</button>
                </span>
              </div>
              <div className="rg-dims">
                <label>
                  <span>{shape === "circle" ? "Diameter" : "Width"}</span>
                  <input
                    className="sl-input"
                    inputMode="decimal"
                    defaultValue={size.wCm}
                    key={`w${shape}`}
                    onBlur={(e) => change({ size: { ...size, wCm: clampNum(e.target.value, 10, 400, size.wCm) } })}
                  />
                  <small>cm</small>
                </label>
                {shape !== "circle" && (
                  <label>
                    <span>Height</span>
                    <input
                      className="sl-input"
                      inputMode="decimal"
                      defaultValue={size.hCm}
                      onBlur={(e) => change({ size: { ...size, hCm: clampNum(e.target.value, 10, 400, size.hCm) } })}
                    />
                    <small>cm</small>
                  </label>
                )}
              </div>
            </section>

            <section className="panel rg-panel" aria-label="Crop">
              <h2 className="sl-label">Crop</h2>
              {source ? (
                <Cropper
                  url={source}
                  source={rug.source}
                  crop={draft.crop}
                  aspect={aspect}
                  circle={shape === "circle"}
                  onChange={(crop) => change({ crop })}
                />
              ) : (
                <p className="sl-hint">{source === null ? "The source photo is missing." : "Loading the photo…"}</p>
              )}
            </section>

            <section className="panel rg-panel" aria-label="Yarns">
              <h2 className="sl-label">Yarns</h2>
              <YarnPicker palette={draft.palette} items={items} onChange={(palette) => change({ palette })} />
            </section>

            <section className="panel rg-panel" aria-label="Tuftability">
              <h2 className="sl-label">Tuftability</h2>
              <label className="rg-range">
                <span>Minimum detail</span>
                <input
                  type="range" min="4" max="80" step="1"
                  value={draft.settings.minDetailMm}
                  onChange={(e) => change({ settings: { ...draft.settings, minDetailMm: Number(e.target.value) } })}
                />
                <b className="sl-mono">{draft.settings.minDetailMm} mm</b>
              </label>
              <p className="sl-hint">Nothing narrower or smaller than this survives. Set it to the thinnest line your gun can do cleanly.</p>
              <label className="rg-range">
                <span>Cell size</span>
                <input
                  type="range" min="2" max="10" step="0.5"
                  value={draft.settings.cellMm}
                  onChange={(e) => change({ settings: { ...draft.settings, cellMm: Number(e.target.value) } })}
                />
                <b className="sl-mono">{draft.settings.cellMm} mm</b>
              </label>
              <p className="sl-hint">
                {grid.gw} × {grid.gh} cells. Smaller cells follow the photo more closely; the detail size above is what keeps it tuftable.
              </p>
            </section>
          </>
        )}

        <section className="panel rg-panel" aria-label="Pattern">
          <div className="rg-row rg-row-split">
            <span className="sl-seg" role="group" aria-label="View">
              <button type="button" aria-pressed={view === "preview"} onClick={() => setView("preview")}>Preview</button>
              <button type="button" aria-pressed={view === "outline"} onClick={() => setView("outline")}>Outline</button>
            </span>
            {view === "outline" && (
              <label className="rg-toggle">
                <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} />
                Mirror (back of cloth)
              </label>
            )}
          </div>
          <div className="rg-stage" data-view={view} data-busy={gen === "working"} aria-busy={gen === "working"}>
            {svg ? <div className="rg-svg" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="sl-hint">{error || "Rug-ifying…"}</p>}
          </div>
          <p className="sl-hint" aria-live="polite">
            {gen === "working" ? "Rug-ifying…" : error ? error : note || (result ? `${result.traced.regions.length} regions, ${result.legend.length} yarns, every one tuftable.` : "")}
          </p>

          {result && (
            <ol className="rg-legend">
              {result.legend.map((l, i) => (
                <li key={l.itemId}>
                  <span className="rg-num">{i + 1}</span>
                  <span className="sl-sw" style={{ width: 22, height: 22, background: l.hex }} />
                  <span className="rg-legend-name">{l.name}</span>
                  <span className="sl-mono sl-dim">{l.hex}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {result && (
          <section className="panel rg-panel" aria-label="Yarn estimate">
            <h2 className="sl-label">Yarn estimate</h2>
            <Estimate result={result} items={items} settings={settings} setSettings={setSettings} />
          </section>
        )}

        {msg && <p className="sl-flash" role="status">{msg}</p>}

        <div className="rg-actions">
          <Link to={`/rugify/${rug.id}/project`} className={`sl-pill sl-pill-wide sl-pill-hot${result ? "" : " rg-disabled"}`} aria-disabled={!result}>
            Projector mode
          </Link>
          <div className="rg-row">
            <button type="button" className="sl-pill" disabled={!result || busy} onClick={() => doExport("svg")}>
              Export SVG{mirror ? " (mirrored)" : ""}
            </button>
            <button type="button" className="sl-pill" disabled={!result || busy} onClick={() => doExport("png")}>
              {busy ? "Exporting…" : `Export PNG${mirror ? " (mirrored)" : ""}`}
            </button>
          </div>
          {!locked && (
            <button type="button" className="sl-pill sl-pill-wide" disabled={!result || gen !== "ready"} onClick={doLock}>
              Lock pattern
            </button>
          )}
          <p className="sl-hint sl-center">
            {locked ? "Exports and the projector use the locked grid." : "Lock it before you start tufting, so it can never shift under you."}
          </p>
          <button type="button" className="sl-pill sl-pill-wide sl-danger" onClick={doDelete}>Delete rug</button>
        </div>
      </div>
    </ToolFrame>
  );
}
