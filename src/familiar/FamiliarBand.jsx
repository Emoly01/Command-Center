import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EmberFamiliar from "./EmberFamiliar";
import { computeMood } from "./mood";
import { pickLine } from "./lines";
import { useWater, waterFeed } from "../lib/water";

const UNDO_MS = 8000;

// The dashboard band: the familiar, what it thinks, and the one-tap water log.
export default function FamiliarBand() {
  const { count, goal, status, log, undo } = useWater();
  const loading = status === "loading";

  // Everything that feeds the familiar. Only water, for now — future modules
  // add their own feed here (see README → "Feeding the Ember Familiar").
  const feeds = [waterFeed(count, goal)];
  const { mood } = computeMood(feeds);
  const shown = loading ? "content" : mood;

  const [line, setLine] = useState(null);
  const [pulse, setPulse] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const undoTimer = useRef(null);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  // New mood, new line.
  useEffect(() => {
    if (!loading) setLine((prev) => pickLine(mood, prev));
  }, [mood, loading]);

  const drink = () => {
    log();
    setPulse((p) => p + 1);
    setCanUndo(true);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setCanUndo(false), UNDO_MS);
  };
  const takeBack = () => {
    undo();
    setCanUndo(false);
    clearTimeout(undoTimer.current);
  };
  const poke = () => {
    if (loading) return;
    setLine((prev) => pickLine(mood, prev));
    setPulse((p) => p + 1);
  };

  return (
    <section className="ef-band" data-mood={shown} aria-label="Ember Familiar">
      <button
        type="button"
        className="ef-pet"
        onClick={poke}
        aria-label={`Ember Familiar, ${shown}. Tap for another line.`}
      >
        <EmberFamiliar mood={shown} pulse={pulse} />
      </button>

      <p className="ef-talk" aria-live="polite">
        {loading ? "…" : line}
      </p>

      <div className="ef-ctrl">
        <Link to="/water" className="ef-count" aria-label={`Water: ${count} of ${goal} glasses. Open water settings.`}>
          <span className="ef-count-num">
            {loading ? "–" : count}
            <span className="ef-count-goal">/{goal}</span>
          </span>
          <span className="ef-count-of">glass{goal === 1 ? "" : "es"}</span>
        </Link>
        <button
          type="button"
          className="ef-undo"
          onClick={takeBack}
          aria-label="Undo last glass"
          hidden={!(canUndo && count > 0)}
        >
          Undo
        </button>
        <button type="button" className="ef-log" onClick={drink} disabled={loading}>
          +1 glass
        </button>
      </div>
    </section>
  );
}
