import { Routes, Route } from "react-router-dom";
import { useRugs, useRugifySettings } from "../lib/rugs";
import { useStash } from "../lib/stash";
import RugList from "./rugify/RugList";
import NewRug from "./rugify/NewRug";
import Editor from "./rugify/Editor";
import RugSettings from "./rugify/Settings";

// Rug-ify: photo → tufting pattern in yarn you own. The projector lives on
// its own full-screen route (main.jsx); everything else shares these
// subscriptions.
export default function Rugify() {
  const { rugs, status } = useRugs();
  const { items } = useStash();
  const { settings, setSettings } = useRugifySettings();
  const ctx = { rugs, status, items, settings, setSettings };

  return (
    <Routes>
      <Route index element={<RugList {...ctx} />} />
      <Route path="new" element={<NewRug {...ctx} />} />
      <Route path="settings" element={<RugSettings {...ctx} />} />
      <Route path=":id" element={<Editor {...ctx} />} />
    </Routes>
  );
}
