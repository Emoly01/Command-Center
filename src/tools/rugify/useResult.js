import { useEffect, useRef, useState } from "react";
import { loadImage } from "../../lib/image";
import { hexToLab } from "../../lib/color";
import { cropRect, gridSize, rugAspect } from "../../lib/rugify/crop";
import { gridFromLocked } from "../../lib/rugify/lock";

const MAX_PIXELS = 4_000_000; // what we draw for the worker, at most

// Default palette for a new rug: every active tufting yarn with a colour,
// best 5. If the stash hasn't loaded yet, autoFill asks the editor to fill
// it in once it has (unless you've touched the yarns by then).
export function tuftingPalette(items) {
  const tufting = items
    .filter((i) => i.status !== "used_up" && i.categoryId === "tufting" && i.colors?.length)
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    allowed: tufting.map((i) => i.id),
    maxColors: Math.max(1, Math.min(5, tufting.length || 5)),
    mode: "auto",
    snapshot: Object.fromEntries(tufting.map((i) => [i.id, { name: i.name, hex: i.colors[0].hex }])),
    autoFill: tufting.length === 0,
  };
}

// The yarns a project may use, in a stable order (by name), with their
// colour from the stash (or the project's snapshot if the yarn is gone).
export function candidatesFor(project, items) {
  const byId = new Map(items.map((i) => [i.id, i]));
  return (project.palette?.allowed || [])
    .map((id) => {
      const it = byId.get(id);
      const snap = project.palette?.snapshot?.[id];
      const hex = it?.colors?.[0]?.hex || snap?.hex;
      return hex ? { itemId: id, name: it?.name || snap?.name || "Unknown yarn", hex, variegated: (it?.colors?.length || 0) > 1 } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name) || a.itemId.localeCompare(b.itemId));
}

// Generate (or, when locked, redraw) a project's pattern in the worker.
// → { status: "idle" | "working" | "ready" | "error", result, error, note }
// result: { w, h, cellMm, shape, wCm, hCm, labels, legend, traced, counts }
export function useRugResult(project, sourceUrl, items) {
  const [state, setState] = useState({ status: "idle", result: null, error: null, note: null });
  // One worker per mount, created in the effect (not a memo) so a remount
  // never inherits a worker its own cleanup already terminated.
  const [worker, setWorker] = useState(null);
  useEffect(() => {
    const w = new Worker(new URL("../../lib/rugify/rugify.worker.js", import.meta.url), { type: "module" });
    w.addEventListener("error", (e) =>
      setState({ status: "error", result: null, note: null, error: `The pattern worker crashed: ${e.message || "unknown error"}` })
    );
    setWorker(w);
    return () => w.terminate();
  }, []);
  const job = useRef(0);
  const [img, setImg] = useState(null);

  // Decode the source once per URL.
  useEffect(() => {
    if (!sourceUrl) return;
    let alive = true;
    loadImage(sourceUrl).then(({ img }) => alive && setImg(img)).catch(() => alive && setImg(null));
    return () => {
      alive = false;
    };
  }, [sourceUrl]);

  const locked = project?.locked || null;
  const cands = project ? candidatesFor(project, items) : [];
  const key = JSON.stringify({
    locked: locked?.hash || null,
    crop: project?.crop, size: project?.size, settings: project?.settings,
    maxColors: project?.palette?.maxColors, mode: project?.palette?.mode,
    cands: cands.map((c) => c.itemId + c.hex),
    img: !!img,
  });

  useEffect(() => {
    if (!project || !worker) return;
    const id = ++job.current;
    const run = () => {
      const done = (fn) => (e) => {
        if (e.data.id !== id) return;
        worker.removeEventListener("message", onMsg);
        if (id === job.current) fn(e.data); // a newer run superseded this one
      };
      let onMsg;

      if (locked) {
        let labels;
        try {
          labels = gridFromLocked(locked);
        } catch (err) {
          setState({ status: "error", result: null, error: err.message, note: null });
          return;
        }
        onMsg = done((d) => {
          if (d.error) return setState({ status: "error", result: null, error: d.error, note: null });
          setState({
            status: "ready", error: null, note: null,
            result: { w: locked.w, h: locked.h, cellMm: locked.cellMm, shape: locked.shape, wCm: locked.wCm, hCm: locked.hCm, labels: d.labels, legend: locked.legend, traced: d.traced, counts: d.counts },
          });
        });
        worker.addEventListener("message", onMsg);
        setState((s) => ({ ...s, status: "working" }));
        worker.postMessage({ id, kind: "locked", labels, gw: locked.w, gh: locked.h, shape: locked.shape }, [labels.buffer]);
        return;
      }

      if (!img) return setState((s) => ({ ...s, status: sourceUrl === null ? "error" : "working", error: sourceUrl === null ? "The source photo is missing." : null }));
      if (!cands.length) return setState({ status: "error", result: null, error: "No yarns chosen yet. Pick some below.", note: null });
      const { maxColors = 5, mode = "auto" } = project.palette || {};
      if (mode === "exact" && cands.length > maxColors) {
        return setState({ status: "error", result: null, note: null, error: `That's ${cands.length} yarns but a maximum of ${maxColors}. Untick some, raise the maximum, or let me pick the best ${maxColors}.` });
      }

      const shape = project.crop?.shape || "rect";
      const size = { wCm: project.size.wCm, hCm: shape === "circle" ? project.size.wCm : project.size.hCm };
      const { gw, gh, cellMm } = gridSize(size, shape, project.settings.cellMm);
      const source = { w: img.naturalWidth, h: img.naturalHeight };
      const { sx, sy, sw, sh } = cropRect(source, project.crop || {}, rugAspect(size, shape));
      let S = Math.max(1, Math.min(4, Math.floor(sw / gw)));
      while (S > 1 && gw * S * gh * S > MAX_PIXELS) S--;
      const canvas = document.createElement("canvas");
      canvas.width = gw * S;
      canvas.height = gh * S;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      onMsg = done((d) => {
        if (d.error) return setState({ status: "error", result: null, error: d.error, note: null });
        setState({
          status: "ready", error: null,
          note: cellMm !== project.settings.cellMm ? `That's a big rug, so I used ${cellMm} mm cells to keep your phone happy.` : null,
          result: { w: gw, h: gh, cellMm, shape, wCm: size.wCm, hCm: size.hCm, labels: d.labels, legend: d.chosen.map((k) => cands[k]), traced: d.traced, counts: d.counts },
        });
      });
      worker.addEventListener("message", onMsg);
      setState((s) => ({ ...s, status: "working" }));
      worker.postMessage(
        {
          id, kind: "generate", rgba, gw, gh, S, shape,
          candidates: cands.map((c) => ({ lab: hexToLab(c.hex) })),
          maxColors, mode, minDetailCells: project.settings.minDetailMm / cellMm,
        },
        [rgba.buffer]
      );
    };
    // Settle for a moment while sliders are moving; locked patterns don't wait.
    const t = setTimeout(run, locked ? 0 : 250);
    return () => clearTimeout(t);
  }, [key, worker]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
