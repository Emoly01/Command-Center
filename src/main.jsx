import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import EmberField from "./EmberField";
import Home from "./Home";
import Water from "./tools/Water";
import Fox from "./tools/Fox";
import Placeholder from "./tools/Placeholder";

function Shell({ children }) {
  return (
    <>
      <EmberField />
      <div className="shell">{children}</div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Fox is fullscreen — no shell wrapper */}
        <Route path="/fox" element={<Fox />} />
        <Route path="/" element={<Shell><Home /></Shell>} />
        <Route path="/water" element={<Shell><Water /></Shell>} />
        <Route path="/cleaning" element={<Shell><Placeholder title="Cleaning" note="Zones, daily habits, XP and the leveling familiar move in here next — repainted from lavender to ember, with streaks/badges synced via Firebase." /></Shell>} />
        <Route path="/command" element={<Shell><Placeholder title="Command Center" note="Your daily command center docks here next, wired to sync." /></Shell>} />
        <Route path="/combat" element={<Shell><Placeholder title="Combat Tracker" note="Initiative and HP tracker — stays device-local since you GM from one spot." /></Shell>} />
        <Route path="*" element={<Shell><Home /></Shell>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
