import { useMemo, useRef, useState } from "react";
import { samplePatch } from "../../lib/color";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Tap (or press and drag) on the photo to pick a color. The loupe floats
// above the finger so you can see what you're on; the color is committed
// when you let go. It reads `sample`, a full-quality canvas of the photo, and
// averages a small patch so a single dark gap between strands doesn't win.
export default function Eyedropper({ url, sample, onPick }) {
  const imgRef = useRef(null);
  const dragging = useRef(false);
  const [probe, setProbe] = useState(null);
  const ctx = useMemo(() => sample.getContext("2d", { willReadFrequently: true }), [sample]);

  const read = (e) => {
    const r = imgRef.current.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const x = clamp(e.clientX - r.left, 0, r.width - 1);
    const y = clamp(e.clientY - r.top, 0, r.height - 1);
    const scale = sample.width / r.width;
    // About 7 screen pixels across, whatever the photo's resolution.
    const radius = Math.max(2, Math.round(3.5 * scale));
    const hex = samplePatch(ctx, x * scale, y * (sample.height / r.height), radius);
    return hex ? { x, y, hex, w: r.width } : null;
  };

  const down = (e) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = read(e);
    if (p) setProbe(p);
  };
  const move = (e) => {
    if (!dragging.current) return;
    const p = read(e);
    if (p) setProbe(p);
  };
  const up = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    const p = read(e);
    if (p) {
      setProbe(p);
      onPick(p.hex);
    }
  };

  const loupe = probe && {
    left: clamp(probe.x - 34, 0, probe.w - 68),
    // Above the finger; flip below near the top edge.
    top: probe.y > 96 ? probe.y - 92 : probe.y + 28,
    background: probe.hex,
  };

  return (
    <div className="sl-eye">
      <div
        className="sl-eye-frame"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => (dragging.current = false)}
      >
        <img ref={imgRef} src={url} alt="Your photo. Tap it to pick a color." draggable={false} />
        {probe && (
          <>
            <span className="sl-eye-dot" style={{ left: probe.x, top: probe.y }} aria-hidden="true" />
            <span className="sl-eye-loupe" style={loupe} aria-hidden="true"><i /></span>
          </>
        )}
      </div>
    </div>
  );
}
