import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Plus,
  ShoppingBasket,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { AppView, GroceryItem } from "../types/nutrition";

export const GROCERY_STORAGE_KEY = "nutrisense_grocery_list_v1";

const DEFAULT_GROCERY_ITEMS: GroceryItem[] = [
  { id: "g1", name: "Moong Dal / Toor Dal", category: "Grains & Pulses", completed: false, source: "Balanced Staple" },
  { id: "g2", name: "Fresh Low-Fat Paneer (200g)", category: "Proteins & Dairy", completed: false, source: "Balanced Staple" },
  { id: "g3", name: "Home-Set Curd / Greek Yogurt", category: "Proteins & Dairy", completed: false, source: "Balanced Staple" },
  { id: "g4", name: "Spinach, Cucumber & Tomatoes", category: "Produce & Herbs", completed: false, source: "Balanced Staple" },
  { id: "g5", name: "Whole Wheat Atta & Flattened Poha", category: "Grains & Pulses", completed: false, source: "Balanced Staple" },
  { id: "g6", name: "Roasted Peanuts & Chia Seeds", category: "Pantry & Spices", completed: false, source: "Balanced Staple" },
];

export function loadGroceryList(): GroceryItem[] {
  try {
    const raw = localStorage.getItem(GROCERY_STORAGE_KEY);
    if (!raw) return DEFAULT_GROCERY_ITEMS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GroceryItem[]) : DEFAULT_GROCERY_ITEMS;
  } catch {
    return DEFAULT_GROCERY_ITEMS;
  }
}

export function saveGroceryList(items: GroceryItem[]) {
  try {
    localStorage.setItem(GROCERY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota errors
  }
}

interface GroceryListViewProps {
  onNavigate: (view: AppView) => void;
}

const CATEGORIES: GroceryItem["category"][] = [
  "Proteins & Dairy",
  "Grains & Pulses",
  "Produce & Herbs",
  "Pantry & Spices",
];

export function GroceryListView({ onNavigate }: GroceryListViewProps) {
  const [items, setItems] = useState<GroceryItem[]>(() => loadGroceryList());
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] =
    useState<GroceryItem["category"]>("Produce & Herbs");

  function updateItems(updater: (prev: GroceryItem[]) => GroceryItem[]) {
    setItems((prev) => {
      const next = updater(prev);
      saveGroceryList(next);
      return next;
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    updateItems((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmed,
        category: newItemCategory,
        completed: false,
        source: "Manual",
      },
      ...prev,
    ]);
    setNewItemName("");
  }

  function toggleItem(id: string) {
    updateItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  }

  function removeItem(id: string) {
    updateItems((prev) => prev.filter((item) => item.id !== id));
  }

  function clearCompleted() {
    updateItems((prev) => prev.filter((item) => !item.completed));
  }

  const completedCount = items.filter((i) => i.completed).length;

  const grouped = useMemo(() => {
    return CATEGORIES.map((category) => ({
      category,
      list: items.filter((i) => i.category === category),
    }));
  }, [items]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121212] px-6 py-6 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-[#34D399]/10 blur-[100px]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <ShoppingBasket className="h-3.5 w-3.5" />
              Smart Grocery List
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">
              Organized Nutrition Grocery Checklist
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[#A1A1AA]">
              Manage ingredients synced from your Weekly Meal Planner or add
              everyday whole foods. Persists automatically in your browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate("planner")}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/40 bg-[#34D399]/10 px-4 py-2 text-xs font-semibold text-[#34D399] transition hover:bg-[#34D399]/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Open Meal Planner</span>
            </button>
            {completedCount > 0 && (
              <button
                type="button"
                onClick={clearCompleted}
                className="rounded-full border border-white/15 bg-[#171717] px-4 py-2 text-xs font-semibold text-white transition hover:border-rose-400/50 hover:text-rose-300"
              >
                Clear Completed ({completedCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Bar */}
      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#121212] p-4"
      >
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Add ingredient (e.g., Sprouted Moong, Tofu, Oats, Broccoli)..."
          className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#A3FF12]/60 focus:outline-none"
        />
        <select
          value={newItemCategory}
          onChange={(e) =>
            setNewItemCategory(e.target.value as GroceryItem["category"])
          }
          aria-label="Grocery category"
          className="rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 text-xs font-medium text-white focus:border-[#A3FF12]/60 focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-5 py-2.5 text-xs font-bold text-[#0A0A0A] transition hover:bg-[#b5ff3b]"
        >
          <Plus className="h-4 w-4" />
          <span>Add Item</span>
        </button>
      </form>

      {/* Progress Strip */}
      <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#121212] px-5 py-3 text-xs">
        <span className="text-[#A1A1AA]">
          Shopping Progress:{" "}
          <strong className="font-mono text-white">
            {completedCount} / {items.length}
          </strong>{" "}
          checked
        </span>
        <span className="font-mono font-semibold text-[#34D399]">
          {items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0}% ready
        </span>
      </div>

      {/* Categorized Checklists */}
      <div className="grid gap-6 md:grid-cols-2">
        {grouped.map((group) => (
          <div
            key={group.category}
            className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5"
          >
            <div className="mb-4 flex items-center justify-between border-b border-white/[0.07] pb-3">
              <h2 className="font-display text-base font-bold text-white">
                {group.category}
              </h2>
              <span className="rounded-full bg-[#0A0A0A] px-2.5 py-0.5 font-mono text-[11px] text-[#34D399]">
                {group.list.length} items
              </span>
            </div>

            {group.list.length === 0 ? (
              <p className="py-4 text-xs text-zinc-500">
                No items in this category yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {group.list.map((item) => (
                  <motion.li
                    layout
                    key={item.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                      item.completed
                        ? "border-[#34D399]/25 bg-[#34D399]/[0.06] text-zinc-400"
                        : "border-white/[0.06] bg-[#0A0A0A] text-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                          item.completed
                            ? "border-[#A3FF12] bg-[#A3FF12] text-[#0A0A0A]"
                            : "border-white/25 bg-transparent"
                        }`}
                      >
                        {item.completed && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`truncate font-medium ${
                            item.completed ? "line-through" : ""
                          }`}
                        >
                          {item.name}
                        </p>
                        {item.source && (
                          <p className="text-[10px] text-zinc-500">
                            {item.source}
                          </p>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-rose-500/15 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
