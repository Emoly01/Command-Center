import { Link } from "react-router-dom";
import { estimateYarn } from "../../lib/rugify/estimate";

const fmtG = (g) => (g == null ? "–" : g >= 1000 ? `${(g / 1000).toFixed(g >= 10000 ? 0 : 2)} kg` : `${Math.round(g)} g`);
const STATUS = {
  short: "Short",
  tight: "Tight",
  ok: "OK",
  unknown: "?",
  uncalibrated: "–",
};
const TITLE = {
  short: "You don't have enough",
  tight: "Enough, but within 15%",
  ok: "Enough",
  unknown: "Can't compare: tell me the grams per unit",
  uncalibrated: "Calibrate grams per m² first",
};
const MASS = new Set(["g", "kg"]);

// Area and yarn per colour, against what the stash holds.
export default function Estimate({ result, items, settings, setSettings }) {
  const rows = estimateYarn({
    counts: result.counts,
    cellMm: result.cellMm,
    legend: result.legend,
    gPerM2: settings.gPerM2,
    wastePct: settings.wastePct,
    items,
    unitGrams: settings.unitGrams,
  });
  const short = rows.filter((r) => r.status === "short");
  const setUnitGrams = (id, v) => setSettings((s) => ({ ...s, unitGrams: { ...s.unitGrams, [id]: Number(v) || null } }));

  return (
    <div className="rg-est">
      {!settings.gPerM2 ? (
        <p className="rg-warn">
          Uncalibrated: I don't know how much yarn your gun eats per m² yet, so I'm only showing areas.{" "}
          <Link to="/rugify/settings">Calibrate with a test swatch</Link>.
        </p>
      ) : short.length ? (
        <p className="rg-warn" aria-live="polite">
          You're short on {short.map((r) => `#${r.n} ${r.name}`).join(", ")}. Buy more, shrink the rug, or swap the yarn.
        </p>
      ) : rows.every((r) => r.status === "ok" || r.status === "tight") ? (
        <p className="sl-hint">You have enough of everything{rows.some((r) => r.status === "tight") ? ", but some of it is tight" : ""}.</p>
      ) : null}

      <div className="rg-table-wrap">
        <table className="rg-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Yarn</th>
              <th scope="col">Area</th>
              <th scope="col">Need</th>
              <th scope="col">Have</th>
              <th scope="col"><span className="sr-only">Status</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.n} data-status={r.status}>
                <td className="sl-mono">{r.n}</td>
                <td>
                  <span className="rg-cell-yarn">
                    <span className="sl-sw" style={{ width: 16, height: 16, background: r.hex }} />
                    {r.name}
                  </span>
                </td>
                <td className="sl-mono">{r.areaM2 < 0.01 ? `${Math.round(r.areaM2 * 10000)} cm²` : `${r.areaM2.toFixed(2)} m²`}</td>
                <td className="sl-mono">{fmtG(r.needG)}</td>
                <td className="sl-mono">
                  {r.status === "unknown" && r.unit && !MASS.has(r.unit) ? (
                    <label className="rg-unitg">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="g"
                        aria-label={`Grams per ${r.unit} of ${r.name}`}
                        defaultValue={settings.unitGrams?.[r.itemId] || ""}
                        onBlur={(e) => setUnitGrams(r.itemId, e.target.value.replace(",", "."))}
                      />
                      <small>g per {r.unit.replace(/s$/, "")}</small>
                    </label>
                  ) : (
                    fmtG(r.haveG)
                  )}
                </td>
                <td>
                  <span className="rg-status" data-status={r.status} title={TITLE[r.status]}>{STATUS[r.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {settings.gPerM2 > 0 && (
        <p className="sl-fine">
          {settings.gPerM2} g/m² + {settings.wastePct}% waste · <Link to="/rugify/settings">change</Link>
        </p>
      )}
    </div>
  );
}
