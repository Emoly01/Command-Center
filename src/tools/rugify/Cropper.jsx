import { useEffect, useRef, useState } from "react";
import { clampCrop, cropRect } from "../../lib/rugify/crop";

const MAX_ZOOM = 8;

// Drag to move the photo, pinch (or the slider) to zoom. The frame always
// has the rug's real aspect ratio; a round rug gets a circle mask.
export default function Cropper({ url, source, crop, aspect, circle, onChange }) {
  const frame = useRef(null);
  const [F, setF] = useState(0);
  const pointers = useRef(new Map());
  const last = useRef(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setF(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rect = cropRect(source, crop, aspect);
  const s = F ? F / rect.sw : 0;

  const apply = (next) => onChange(clampCrop(source, next, aspect));

  const gesture = () => {
    const ps = [...pointers.current.values()];
    if (!ps.length) return null;
    const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length;
    const cy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
    const spread = ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0;
    return { cx, cy, spread, n: ps.length };
  };

  const down = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    last.current = gesture();
  };
  const move = (e) => {
    if (!pointers.current.has(e.pointerId) || !s) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture();
    const prev = last.current;
    last.current = g;
    if (!prev || prev.n !== g.n) return;
    let { cx, cy, z = 1 } = crop;
    cx -= (g.cx - prev.cx) / s / source.w;
    cy -= (g.cy - prev.cy) / s / source.h;
    if (g.n > 1 && prev.spread > 0) z = Math.min(MAX_ZOOM, Math.max(1, z * (g.spread / prev.spread)));
    apply({ ...crop, cx, cy, z });
  };
  const up = (e) => {
    pointers.current.delete(e.pointerId);
    last.current = gesture();
  };

  return (
    <div className="rg-crop">
      <div
        ref={frame}
        className="rg-crop-frame"
        style={{ aspectRatio: String(aspect) }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {s > 0 && (
          <img
            src={url}
            alt="Your photo, positioned in the rug frame"
            draggable={false}
            style={{ width: source.w * s, height: source.h * s, left: -rect.sx * s, top: -rect.sy * s }}
          />
        )}
        {circle && <span className="rg-crop-circle" aria-hidden="true" />}
      </div>
      <label className="rg-range">
        <span>Zoom</span>
        <input
          type="range"
          min="1"
          max={MAX_ZOOM}
          step="0.01"
          value={crop.z || 1}
          onChange={(e) => apply({ ...crop, z: Number(e.target.value) })}
        />
      </label>
      <p className="sl-hint">Drag to move, pinch or slide to zoom. The frame is your rug, to scale.</p>
    </div>
  );
}
