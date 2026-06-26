import { useEffect, useRef, useState } from "react";
import { saveTool, subscribeTool } from "./firebase";

// useSyncedState(toolId, fallback)
// → [state, setState, status]
//
// - Subscribes to the tool's Firestore doc (cross-device live updates).
// - setState updates locally first (snappy UI), then debounce-writes to Firestore.
// - status: "loading" | "ready" | "offline"
export function useSyncedState(toolId, fallback) {
  const [state, setStateRaw] = useState(fallback);
  const [status, setStatus] = useState("loading");
  const writeTimer = useRef(null);
  const ignoreNextRemote = useRef(false);

  useEffect(() => {
    let unsub = () => {};
    subscribeTool(toolId, fallback, (remote) => {
      // Skip the echo of our own just-written change.
      if (ignoreNextRemote.current) {
        ignoreNextRemote.current = false;
        return;
      }
      setStateRaw(remote);
      setStatus("ready");
    })
      .then((u) => (unsub = u))
      .catch(() => setStatus("offline"));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);

  const setState = (updater) => {
    setStateRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(() => {
        ignoreNextRemote.current = true;
        saveTool(toolId, next).catch(() => setStatus("offline"));
      }, 400);
      return next;
    });
  };

  return [state, setState, status];
}
