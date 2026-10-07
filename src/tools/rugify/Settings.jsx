import { useState } from "react";
import ToolFrame from "../../ToolFrame";
import { gramsPerM2FromSwatch } from "../../lib/rugify/estimate";

const BACK = { to: "/rugify", label: "Rugs" };
const num = (v) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Calibration and defaults. Yarn per m² depends on pile height, gun and
// yarn, so the honest default is "unknown" until you measure.
export default function RugSettings({ status, settings, setSettings }) {
  const [sw, setSw] = useState({ w: "10", h: "10", g: "" });
  const fromSwatch = gramsPerM2FromSwatch(num(sw.w), num(sw.h), num(sw.g));
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));

  return (
    <ToolFrame title="Rug-ify settings" status={status} back={BACK}>
      <div className="rg-editor">
        <section className="panel rg-panel">
          <h2 className="sl-label">Yarn per square metre</h2>
          <p className="sl-hint">
            {settings.gPerM2
              ? `Calibrated at ${settings.gPerM2} g/m².`
              : "Not calibrated yet, so estimates only show areas. Your gun, pile height and yarn decide this; no default would be honest."}
          </p>
          <p className="sl-hint">Tuft a test square, weigh the yarn before and after, and tell me:</p>
          <div className="rg-dims">
            <label><span>Swatch width</span><input className="sl-input" inputMode="decimal" value={sw.w} onChange={(e) => setSw({ ...sw, w: e.target.value })} /><small>cm</small></label>
            <label><span>Swatch height</span><input className="sl-input" inputMode="decimal" value={sw.h} onChange={(e) => setSw({ ...sw, h: e.target.value })} /><small>cm</small></label>
            <label><span>Yarn used</span><input className="sl-input" inputMode="decimal" value={sw.g} placeholder="e.g. 24" onChange={(e) => setSw({ ...sw, g: e.target.value })} /><small>g</small></label>
          </div>
          <button type="button" className="sl-pill sl-pill-hot" disabled={!fromSwatch} onClick={() => set({ gPerM2: fromSwatch })}>
            {fromSwatch ? `Use ${fromSwatch} g/m²` : "Fill in the swatch"}
          </button>
          <label className="rg-dims">
            <span>Or type it</span>
            <input
              className="sl-input"
              inputMode="decimal"
              key={settings.gPerM2 ?? "none"}
              defaultValue={settings.gPerM2 ?? ""}
              placeholder="g/m²"
              onBlur={(e) => set({ gPerM2: num(e.target.value) })}
            />
            <small>g/m²</small>
          </label>
          <label className="rg-range">
            <span>Waste & trimming</span>
            <input type="range" min="0" max="40" step="1" value={settings.wastePct} onChange={(e) => set({ wastePct: Number(e.target.value) })} />
            <b className="sl-mono">{settings.wastePct}%</b>
          </label>
        </section>

        <section className="panel rg-panel">
          <h2 className="sl-label">Defaults for new rugs</h2>
          <label className="rg-range">
            <span>Minimum detail</span>
            <input type="range" min="4" max="80" step="1" value={settings.minDetailMm} onChange={(e) => set({ minDetailMm: Number(e.target.value) })} />
            <b className="sl-mono">{settings.minDetailMm} mm</b>
          </label>
          <label className="rg-range">
            <span>Cell size</span>
            <input type="range" min="2" max="10" step="0.5" value={settings.cellMm} onChange={(e) => set({ cellMm: Number(e.target.value) })} />
            <b className="sl-mono">{settings.cellMm} mm</b>
          </label>
        </section>
      </div>
    </ToolFrame>
  );
}
