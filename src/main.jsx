import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import EmberField from "./EmberField";
import Home from "./Home";
import Water from "./tools/Water";
import Movement from "./tools/Movement";
import Fox from "./tools/Fox";
import Cleaning from "./tools/Cleaning";
import CommandCenter from "./tools/CommandCenter";
import Stash from "./tools/Stash";
import Rugify from "./tools/Rugify";
import RugProjector from "./tools/rugify/Projector";

function Shell({ children, wide }) {
  return (
    <>
      <EmberField />
      <div className={wide ? "shell shell-wide" : "shell"}>{children}</div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Fox, Cleaning, Command Center and the rug projector are fullscreen — no shell wrapper */}
        <Route path="/fox" element={<Fox />} />
        <Route path="/cleaning" element={<Cleaning />} />
        <Route path="/command" element={<CommandCenter />} />
        <Route path="/rugify/:id/project" element={<RugProjector />} />
        <Route path="/" element={<Shell wide><Home /></Shell>} />
        <Route path="/water" element={<Shell><Water /></Shell>} />
        <Route path="/movement" element={<Shell><Movement /></Shell>} />
        <Route path="/stash/*" element={<Shell><Stash /></Shell>} />
        <Route path="/rugify/*" element={<Shell><Rugify /></Shell>} />
        <Route path="*" element={<Shell wide><Home /></Shell>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
