import ToolFrame from "../ToolFrame";

export default function Placeholder({ title, note }) {
  return (
    <ToolFrame title={title} status="ready">
      <div className="panel">
        <p style={{ color: "var(--smoke)", margin: 0, lineHeight: 1.6 }}>{note}</p>
      </div>
    </ToolFrame>
  );
}
