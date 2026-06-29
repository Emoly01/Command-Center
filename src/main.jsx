import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import EmberField from "./EmberField";
import Home from "./Home";
import Water from "./tools/Water";
import Fox from "./tools/Fox";
import Cleaning from "./tools/Cleaning";
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
        {/* Fox and Cleaning are fullscreen — no shell wrapper */}
        <Route path="/fox" element={<Fox />} />
        <Route path="/cleaning" element={<Cleaning />} />
        <Route path="/" element={<Shell><Home /></Shell>} />
        <Route path="/water" element={<Shell><Water /></Shell>} />
        <Route path="/command" element={<Shell><Placeholder title="Command Center" note="Your daily command center docks here next, wired to sync." /></Shell>} />
        <Route path="/combat" element={<Shell><Placeholder title="Combat Tracker" note="Initiative and HP tracker — stays device-local since you GM from one spot." /></Shell>} />
        <Route path="*" element={<Shell><Home /></Shell>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
