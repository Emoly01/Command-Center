import { Link } from "react-router-dom";

export default function ToolFrame({ title, status, children }) {
  const cls =
    status === "ready" ? "sync-ready" : status === "offline" ? "sync-offline" : "sync-loading";
  const label =
    status === "ready" ? "synced" : status === "offline" ? "offline — saved on device" : "syncing…";
  return (
    <>
      <div className="tool-top">
        <Link to="/" className="back">← Hearth</Link>
        <h1 className="tool-h">{title}</h1>
        <span className={`sync-dot ${cls}`}><b />{label}</span>
      </div>
      {children}
    </>
  );
}
