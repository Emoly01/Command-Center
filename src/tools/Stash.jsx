import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useStash, useStashSettings } from "../lib/stash";
import Ledger from "./stash/Ledger";
import ItemForm from "./stash/ItemForm";
import ItemView from "./stash/ItemView";
import ColorMatch from "./stash/ColorMatch";
import Categories from "./stash/Categories";

// Stash Ledger: what craft supplies are in the cupboard. One live
// subscription for every screen under /stash, and the list's filters live
// here so they survive a trip into an item and back.
export default function Stash() {
  const { items, status } = useStash();
  const { categories, setCategories } = useStashSettings();
  const [view, setView] = useState({ q: "", cat: "all", tag: null, fam: null, sort: "recent", archived: false });
  const ctx = { items, status, categories };

  return (
    <Routes>
      <Route index element={<Ledger {...ctx} view={view} setView={setView} />} />
      <Route path="new" element={<ItemForm {...ctx} />} />
      <Route path="match" element={<ColorMatch {...ctx} />} />
      <Route path="categories" element={<Categories {...ctx} setCategories={setCategories} />} />
      <Route path=":id" element={<ItemView {...ctx} />} />
      <Route path=":id/edit" element={<ItemForm {...ctx} editing />} />
    </Routes>
  );
}
