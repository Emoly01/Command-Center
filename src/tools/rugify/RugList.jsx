import { Link } from "react-router-dom";
import ToolFrame from "../../ToolFrame";
import { Icon } from "../stash/bits";

const sizeOf = (r) => (r.crop?.shape === "circle" ? `Ø ${r.size.wCm} cm` : `${r.size.wCm} × ${r.size.hCm} cm`);

export default function RugList({ rugs, status }) {
  const sorted = [...rugs].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return (
    <ToolFrame title="Rug-ify" status={status}>
      <p className="sl-hint">Photo in, tuftable pattern out. Only yarn you actually own.</p>
      {status === "loading" && !rugs.length && <p className="sl-empty">…</p>}
      {status !== "loading" && !rugs.length && (
        <p className="sl-empty">No rugs yet. The tufting gun is getting dusty.</p>
      )}
      <ul className="sl-list rg-list">
        {sorted.map((r) => (
          <li key={r.id}>
            <Link to={`/rugify/${r.id}`} className="rg-card">
              {r.thumb ? <img src={r.thumb} alt="" className="rg-card-thumb" /> : <span className="rg-card-thumb" aria-hidden="true" />}
              <span className="rg-card-body">
                <span className="sl-item-name">{r.name}</span>
                <span className="sl-item-meta">
                  {sizeOf(r)}
                  {r.locked ? ` · locked, ${r.locked.legend.length} yarns` : ` · up to ${r.palette?.maxColors} yarns`}
                </span>
              </span>
              {r.locked && <span className="rg-badge">Locked</span>}
            </Link>
          </li>
        ))}
      </ul>
      <div className="sl-foot">
        <Link to="/rugify/settings" className="sl-foot-link">
          <span>Yarn calibration & defaults</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <Link to="/rugify/new" className="sl-fab">
        {Icon.plus} New rug
      </Link>
    </ToolFrame>
  );
}
