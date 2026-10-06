import { Link, useNavigate, useParams } from "react-router-dom";
import ToolFrame from "../../ToolFrame";
import { setQty, setUsedUp, deleteItem, useStashPhoto } from "../../lib/stash";
import { catById, QtyStepper, Icon } from "./bits";

const BACK = { to: "/stash", label: "Stash" };

export default function ItemView({ items, status, categories }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const item = items.find((i) => i.id === id);
  const full = useStashPhoto(item?.id, !!item?.hasPhoto);

  if (!item) {
    return (
      <ToolFrame title="Item" status={status} back={BACK}>
        <p className="sl-empty">{status === "loading" ? "…" : "That one's gone. Deleted, or never was."}</p>
      </ToolFrame>
    );
  }

  const cat = catById(categories, item.categoryId);
  const usedUp = item.status === "used_up";
  const details = [
    ["Brand", item.brand],
    ["Fiber · weight", item.fiber],
    ["Lives in", item.location],
    ["Notes", item.notes],
  ].filter(([, v]) => v);

  const remove = () => {
    if (!window.confirm(`Delete “${item.name}” and its photo for good? This one can't be undone.`)) return;
    deleteItem(item.id);
    navigate("/stash", { replace: true });
  };

  return (
    <ToolFrame title={item.name} status={status} back={BACK}>
      <article className="sl-view">
        {item.hasPhoto && (
          <img className="sl-view-photo" src={full || item.thumb || undefined} alt={`Photo of ${item.name}`} data-loading={!full} />
        )}

        <span className="sl-label">{cat.name}{usedUp && " · used up"}</span>

        {item.colors?.length > 0 && (
          <ul className="sl-colors">
            {item.colors.map((c, i) => (
              <li key={i}>
                <Link to={`/stash/match?hex=${encodeURIComponent(c.hex)}`} className="sl-color" title="Find similar">
                  <span className="sl-sw" style={{ width: 28, height: 28, background: c.hex }} />
                  {c.name && <span>{c.name}</span>}
                  <span className="sl-mono sl-dim">{c.hex}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="sl-onhand">
          <span className="sl-label">On hand</span>
          <QtyStepper big qty={item.qty} unit={item.unit} label={item.name} onChange={(n) => setQty(item.id, n)} />
        </div>

        {(details.length > 0 || item.tags?.length > 0) && (
          <dl className="sl-dl">
            {details.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            {item.tags?.length > 0 && (
              <div>
                <dt>Tags</dt>
                <dd className="sl-tagrow">
                  {item.tags.map((t) => (
                    <span key={t} className="sl-tag">#{t}</span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="sl-actions">
          <Link to={`/stash/${item.id}/edit`} className="sl-pill sl-pill-wide">Edit</Link>
          {usedUp ? (
            <>
              <button type="button" className="sl-pill sl-pill-wide" onClick={() => setUsedUp(item.id, false)}>
                Restore to the stash
              </button>
              <button type="button" className="sl-pill sl-pill-wide sl-danger" onClick={remove}>
                Delete for good
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="sl-pill sl-pill-wide"
                onClick={() => {
                  setUsedUp(item.id, true);
                  navigate("/stash", { replace: true, state: { flash: `${item.name}: used up and archived. Rest in yarn.` } });
                }}
              >
                {Icon.archive} Mark used up
              </button>
              <span className="sl-hint sl-center">Goes to the archive. You can bring it back.</span>
            </>
          )}
        </div>
      </article>
    </ToolFrame>
  );
}
