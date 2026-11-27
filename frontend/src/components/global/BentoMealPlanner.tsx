import { useEffect, useState } from "react";
import {
  BookmarkPlus,
  Box,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import {
  fetchWorkspaceState,
  generateBentoPlan,
  saveWorkspaceState,
} from "../../lib/api";
import type {
  BentoPlanResponse,
  GroceryItem,
  TrackedFoodEntryCreate,
} from "../../types/nutrition";

interface BentoMealPlannerProps {
  profileId: number | null;
  profileAllergies?: string[];
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onLogFood: (payload: Omit<TrackedFoodEntryCreate, "profile_id">) => Promise<void>;
  onNotify: (msg: string) => void;
}

const BENTO_CATEGORIES = [
  { id: "office", label: "Healthy Office Box" },
  { id: "college", label: "College Lunch Box" },
  { id: "vegetarian", label: "Vegetarian Bento" },
  { id: "high_protein", label: "High-Protein Bento" },
  { id: "low_budget", label: "Low-Budget Bento" },
  { id: "family", label: "Family Bento" },
  { id: "breakfast", label: "Balanced Breakfast" },
  { id: "dinner", label: "Light Evening Box" },
] as const;

export function BentoMealPlanner({
  profileId,
  profileAllergies = [],
  isAuthenticated,
  onOpenAuth,
  onLogFood,
  onNotify,
}: BentoMealPlannerProps) {
  const [mealCategory, setMealCategory] = useState<string>("office");
  const [calorieTarget, setCalorieTarget] = useState<number>(580);
  const [proteinTarget, setProteinTarget] = useState<number>(26);
  const [dietPref, setDietPref] = useState<"any" | "vegetarian">("any");
  const [budget, setBudget] = useState<"low_budget" | "balanced" | "flexible">("balanced");
  const [exclusionsText, setExclusionsText] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const [bento, setBento] = useState<BentoPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function runGenerate(customOverrides?: Record<string, string>, saveNow = false) {
    setLoading(true);
    try {
      const excl = exclusionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await generateBentoPlan({
        profile_id: isAuthenticated ? profileId : null,
        meal_category: mealCategory,
        calorie_target: calorieTarget,
        protein_target: proteinTarget,
        diet_preference: mealCategory === "vegetarian" ? "vegetarian" : dietPref,
        allergies: profileAllergies,
        exclusions: excl,
        budget: mealCategory === "low_budget" ? "low_budget" : budget,
        ingredient_overrides: customOverrides ?? overrides,
        save_plan: saveNow,
      });
      setBento(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runGenerate({}, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReplaceSlot(slot: string, newSlug: string) {
    const nextOverrides = { ...overrides, [slot]: newSlug };
    setOverrides(nextOverrides);
    await runGenerate(nextOverrides, false);
    onNotify("Updated Bento compartment & recalculated deterministic macros.");
  }

  async function handleSaveToMealPlan() {
    if (!bento) return;
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    setBusyAction("plan");
    try {
      const ws = await fetchWorkspaceState();
      const existing = ws.saved_meal_plan ?? [];
      const day1 = existing[0] ?? {
        day: "Day 1",
        breakfast: "Balanced morning tray",
        lunch: bento.plan_title,
        snack: "Edamame & tea",
        dinner: "Light whole dinner",
        estimated_calories: 0,
        estimated_protein_g: 0,
        grocery_items: [],
      };
      const slotField =
        bento.meal_category === "breakfast"
          ? "breakfast"
          : bento.meal_category === "dinner"
            ? "dinner"
            : "lunch";
      const updated = {
        ...day1,
        [slotField]: `${bento.plan_title}: ${bento.items.map((i) => `${i.name} (${i.grams}g)`).join(", ")}`,
        estimated_calories: Math.round((day1.estimated_calories || 0) + bento.totals.calories),
        estimated_protein_g: Math.round((day1.estimated_protein_g || 0) + bento.totals.protein),
        grocery_items: Array.from(new Set([...(day1.grocery_items ?? []), ...bento.grocery_items])),
      };
      await saveWorkspaceState({
        saved_meal_plan: existing.length > 0 ? [updated, ...existing.slice(1)] : [updated],
        planner_source: "global_bento_planner",
      });
      await runGenerate(overrides, true);
      onNotify(`Saved "${bento.plan_title}" to Smart Weekly Meal Planner!`);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAddToTracker() {
    if (!bento) return;
    if (!isAuthenticated || !profileId) {
      onOpenAuth();
      return;
    }
    setBusyAction("track");
    try {
      await onLogFood({
        meal_name: bento.plan_title,
        meal_type: bento.meal_category,
        measurement_source: "manual",
        total_portion_grams: bento.totals.total_grams,
        calories: bento.totals.calories,
        protein: bento.totals.protein,
        carbs: bento.totals.carbs,
        fats: bento.totals.fats,
        fibre: bento.totals.fibre,
        calcium_mg: bento.totals.calcium_mg,
        iron_mg: bento.totals.iron_mg,
        sodium_mg: bento.totals.sodium_mg,
        nutrition_sources: [bento.source_attribution],
        notes: bento.items.map((i) => `${i.name} ${i.grams}g`).join(" + "),
      });
      onNotify(`Logged "${bento.plan_title}" (${Math.round(bento.totals.calories)} kcal) to Food Tracker!`);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateGroceryList() {
    if (!bento) return;
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    setBusyAction("grocery");
    try {
      const ws = await fetchWorkspaceState();
      const curList = ws.grocery_items ?? [];
      const existingNames = new Set(curList.map((g) => g.name.toLowerCase()));
      const additions: GroceryItem[] = bento.grocery_items
        .filter((name) => !existingNames.has(name.toLowerCase()))
        .map((name, i) => ({
          id: `bento-${Date.now()}-${i}`,
          name,
          category: "Proteins & Dairy",
          completed: false,
          source: "Bento Planner",
        }));
      await saveWorkspaceState({
        grocery_items: [...curList, ...additions],
      });
      onNotify(`Added ${additions.length} new Bento ingredients to Smart Grocery List!`);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
          <Box className="h-3.5 w-3.5" />
          Japanese-Inspired Portion-Balanced Bento Builder
        </span>
        <h2 className="mt-3 font-display text-2xl font-extrabold text-white sm:text-3xl">
          Balanced Bento &amp; Meal Box Planner
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-[#A1A1AA]">
          Customize office, college, vegetarian, high-protein, low-budget, or family boxes using
          deterministic MEXT &amp; ICMR–NIN values. Swap compartments freely to recalculate macros.
        </p>

        {/* Controls Grid */}
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {BENTO_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setMealCategory(cat.id);
                  setOverrides({});
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  mealCategory === cat.id
                    ? "bg-[#A3FF12] text-[#050706]"
                    : "border border-white/10 bg-[#0A0A0A] text-zinc-300 hover:border-white/25"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-semibold text-zinc-300">
              Meal Calories Target
              <input
                type="number"
                min={250}
                max={1800}
                step={25}
                value={calorieTarget}
                onChange={(e) => setCalorieTarget(Math.max(250, Number(e.target.value) || 550))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
              />
            </label>
            <label className="text-xs font-semibold text-zinc-300">
              Min Protein Target (g)
              <input
                type="number"
                min={8}
                max={120}
                value={proteinTarget}
                onChange={(e) => setProteinTarget(Math.max(8, Number(e.target.value) || 25))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
              />
            </label>
            <label className="text-xs font-semibold text-zinc-300">
              Diet Preference
              <select
                value={dietPref}
                onChange={(e) => setDietPref(e.target.value as "any" | "vegetarian")}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                <option value="any">Flexible (Veg + Fish)</option>
                <option value="vegetarian">Vegetarian Strictly</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-zinc-300">
              Budget Level
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value as typeof budget)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                <option value="low_budget">Low-Budget Staples</option>
                <option value="balanced">Balanced Daily</option>
                <option value="flexible">Flexible</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-zinc-300">
              Exclusions (comma list)
              <input
                type="text"
                value={exclusionsText}
                onChange={(e) => setExclusionsText(e.target.value)}
                placeholder="e.g., salmon, buckwheat"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => void runGenerate({}, false)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#A3FF12] px-5 py-2.5 text-xs font-bold text-[#050706] hover:bg-[#b8ff42] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Custom Bento Box
          </button>
        </div>
      </div>

      {bento && (
        <div className="space-y-5">
          {/* Totals Bar */}
          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-[#34D399]/30 bg-[#121212] p-5 sm:grid-cols-6">
            <div>
              <span className="text-[10px] uppercase text-zinc-400">Weight</span>
              <p className="font-mono text-base font-bold text-white">{bento.totals.total_grams}g</p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-400">Calories</span>
              <p className="font-mono text-base font-bold text-[#A3FF12]">
                {Math.round(bento.totals.calories)} kcal
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-400">Protein</span>
              <p className="font-mono text-base font-bold text-[#34D399]">{bento.totals.protein}g</p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-400">Carbs / Fibre</span>
              <p className="font-mono text-xs font-bold text-white">
                {bento.totals.carbs}g / {bento.totals.fibre}g
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-400">Iron / Ca</span>
              <p className="font-mono text-xs font-bold text-emerald-300">
                {bento.totals.iron_mg}mg / {bento.totals.calcium_mg}mg
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-400">Sodium</span>
              <p className="font-mono text-xs font-bold text-zinc-200">{bento.totals.sodium_mg}mg</p>
            </div>
          </div>

          {/* 4 Bento Compartments with Swap Dropdown */}
          <div className="grid gap-4 md:grid-cols-2">
            {bento.items.map((item) => (
              <div
                key={item.slot}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121212] p-5 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#A3FF12]">
                      Compartment: {item.slot.replace("_", " ")}
                    </span>
                    <span className="font-mono font-bold text-[#34D399]">{item.grams}g</span>
                  </div>
                  <h4 className="mt-1 font-display text-base font-bold text-white">{item.name}</h4>
                  <p className="mt-1 font-mono text-[11px] text-zinc-300">
                    {item.calories} kcal • P:{item.protein}g • C:{item.carbs}g • F:{item.fats}g
                  </p>
                </div>

                {item.replacement_options.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                    <RefreshCw className="h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                    <select
                      aria-label={`Replace ${item.slot} ingredient`}
                      value=""
                      onChange={(e) => {
                        if (e.target.value) void handleReplaceSlot(item.slot, e.target.value);
                      }}
                      className="flex-1 rounded-xl border border-white/10 bg-[#0A0A0A] px-2.5 py-1.5 text-[11px] text-white"
                    >
                      <option value="">Replace ingredient &amp; recalculate...</option>
                      {item.replacement_options.map((opt) => (
                        <option key={opt.slug} value={opt.slug}>
                          Swap to {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Prep Instructions & Sync Actions */}
          <div className="grid gap-5 rounded-3xl border border-white/[0.08] bg-[#121212] p-6 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-7">
              <h4 className="font-display text-base font-bold text-white">
                Bento Assembly &amp; Preparation Guide
              </h4>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {bento.preparation_instructions.map((st) => (
                  <li key={st} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                    <span>{st}</span>
                  </li>
                ))}
              </ul>
              <p className="pt-1 text-[10px] text-zinc-500">{bento.source_attribution}</p>
            </div>

            <div className="flex flex-col justify-center gap-2.5 lg:col-span-5">
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleSaveToMealPlan()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#34D399]/50 bg-[#34D399]/15 px-4 py-2.5 text-xs font-bold text-[#34D399] hover:bg-[#34D399]/25"
              >
                <BookmarkPlus className="h-4 w-4" />
                Save to Meal Plan
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleAddToTracker()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#A3FF12] px-4 py-2.5 text-xs font-bold text-[#050706] hover:bg-[#b8ff42]"
              >
                <Plus className="h-4 w-4" />
                Add Bento to Food Tracker
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleGenerateGroceryList()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#0A0A0A] px-4 py-2.5 text-xs font-semibold text-white hover:border-white/30"
              >
                <ShoppingBasket className="h-4 w-4 text-[#A3FF12]" />
                Generate Smart Grocery Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
