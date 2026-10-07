import { runPipeline } from "./pipeline.js";
import { trace } from "./trace.js";
import { VOID } from "./grid.js";

// Heavy lifting off the main thread, so the phone stays responsive.
//
// { id, kind: "generate", rgba, gw, gh, S, shape, candidates, maxColors, mode, minDetailCells }
// { id, kind: "locked", labels, gw, gh, shape }
// → { id, labels, chosen?, traced, counts } or { id, error }
self.onmessage = (e) => {
  const msg = e.data;
  try {
    let labels, chosen;
    if (msg.kind === "generate") {
      ({ labels, chosen } = runPipeline(msg));
    } else {
      labels = msg.labels;
    }
    const traced = trace(labels, msg.gw, msg.gh, msg.shape);
    const counts = [];
    for (const v of labels) if (v !== VOID) counts[v] = (counts[v] || 0) + 1;
    self.postMessage({ id: msg.id, labels, chosen, traced, counts: Array.from(counts, (c) => c || 0) }, [labels.buffer]);
  } catch (err) {
    self.postMessage({ id: msg.id, error: err.message || String(err) });
  }
};
