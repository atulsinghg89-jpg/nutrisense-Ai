import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookmarkPlus,
  Camera,
  CheckCircle2,
  Droplets,
  Info,
  Loader2,
  Plus,
  ShoppingBag,
  Sparkles,
  Utensils,
} from "lucide-react";
import {
  WOMEN_MEAL_TEMPLATES,
  type WomenMealTemplate,
} from "../../data/womensWellnessData";
import {
  fetchWorkspaceState,
  saveWorkspaceState,
} from "../../lib/api";
import type {
  AccountProfile,
  AppView,
  ProfileDashboardData,
  TrackedFoodEntryCreate,
} from "../../types/nutrition";

interface WomenNutritionPanelProps {
  profile: AccountProfile | null;
  profileId: number | null;
  dashboard: ProfileDashboardData | null;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onNavigate: (view: AppView) => void;
  onLogFood: (payload: Omit<TrackedFoodEntryCreate, "profile_id">) => Promise<void>;
  onLogHydration: (amountMl: number, note?: string) => Promise<void>;
  onNotify: (msg: string) => void;
}

const MEAL_SLOTS = [
  "All",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Healthy Snack",
  "Pre-Workout",
  "Post-Workout",
  "Hydration",
  "Quick College / Work",
] as const;

export function WomenNutritionPanel({
  profile,
  profileId,
  dashboard,
  isAuthenticated,
  onOpenAuth,
  onNavigate,
  onLogFood,
  onLogHydration,
  onNotify,
}: WomenNutritionPanelProps) {
  const [dietFilter, setDietFilter] = useState<"all" | "vegetarian" | "non_vegetarian">("all");
  const [slotFilter, setSlotFilter] = useState<(typeof MEAL_SLOTS)[number]>("All");
  const [hideAllergens, setHideAllergens] = useState(true);
  const [waterInput, setWaterInput] = useState("250");
  const [busyId, setBusyId] = useState<string | null>(null);

  const recordedAllergies = useMemo(
    () => (profile?.allergies ?? []).map((a) => a.trim().toLowerCase()).filter(Boolean),
    [profile],
  );

  const mealsWithFlags = useMemo(() => {
    return WOMEN_MEAL_TEMPLATES.filter((meal) => {
      if (dietFilter !== "all" && meal.dietType !== dietFilter) return false;
      if (slotFilter !== "All" && meal.slot !== slotFilter) return false;
      const matchesAllergy = meal.allergens.some((al) =>
        recordedAllergies.some((rec) => rec.includes(al) || al.includes(rec)),
      );
      if (hideAllergens && matchesAllergy) return false;
      return true;
    }).map((meal) => {
      const allergenConflicts = meal.allergens.filter((al) =>
        recordedAllergies.some((rec) => rec.includes(al) || al.includes(rec)),
      );
      return { meal, allergenConflicts };
    });
  }, [dietFilter, slotFilter, hideAllergens, recordedAllergies]);

  async function handleSaveToMealPlan(meal: WomenMealTemplate) {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    setBusyId(`plan:${meal.id}`);
    try {
      const ws = await fetchWorkspaceState();
      const existingPlan = ws.saved_meal_plan ?? [];
      const firstDay = existingPlan[0] ?? {
        day: "Day 1",
        breakfast: "Balanced morning meal",
        lunch: "Nourishing lunch plate",
        snack: "Wholesome afternoon snack",
        dinner: "Light evening meal",
        estimated_calories: 0,
        estimated_protein_g: 0,
        grocery_items: [],
      };
      const slotLower = meal.slot.toLowerCase();
      const targetKey: "breakfast" | "lunch" | "dinner" | "snack" =
        slotLower.includes("breakfast")
          ? "breakfast"
          : slotLower.includes("lunch")
            ? "lunch"
            : slotLower.includes("dinner")
              ? "dinner"
              : "snack";
      const updatedFirstDay = {
        ...firstDay,
        [targetKey]: `${meal.title} (${meal.servingLabel})`,
        estimated_calories: Math.round((firstDay.estimated_calories || 0) + meal.calories),
        estimated_protein_g: Math.round((firstDay.estimated_protein_g || 0) + meal.protein),
        grocery_items: Array.from(
          new Set([...(firstDay.grocery_items ?? []), ...meal.ingredients]),
        ),
      };
      const updatedPlan =
        existingPlan.length > 0
          ? [updatedFirstDay, ...existingPlan.slice(1)]
          : [updatedFirstDay];

      await saveWorkspaceState({
        saved_meal_plan: updatedPlan,
        planner_source: "women_wellness_companion",
      });
      onNotify(`Saved "${meal.title}" to your weekly Meal Plan workspace.`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddToTracker(meal: WomenMealTemplate) {
    if (!isAuthenticated || !profileId) {
      onOpenAuth();
      return;
    }
    setBusyId(`log:${meal.id}`);
    try {
      await onLogFood({
        meal_name: meal.title,
        meal_type: meal.slot.toLowerCase().replace(/[^a-z]+/g, "_"),
        measurement_source: "manual",
        total_portion_grams: meal.grams,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        fibre: meal.fibre,
        iron_mg: meal.ironMg,
        nutrition_sources: [meal.sourceLabel],
        notes: `${meal.servingLabel} • Women's Nutrition companion`,
      });
      onNotify(`Added "${meal.title}" to your Food Tracker.`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleQuickWater(amountMl: number) {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    setBusyId(`water:${amountMl}`);
    try {
      await onLogHydration(amountMl, "Logged from Women's Nutrition companion");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + Summary Bridge */}
      <div className="grid gap-4 rounded-3xl border border-[#ebd4dc] bg-[#fff8fa] p-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6c5ce] bg-white px-3 py-1 text-xs font-semibold text-[#9b3d57]">
            <Utensils className="h-3.5 w-3.5" />
            Personalized Everyday Nutrition • ICMR–NIN &amp; USDA Estimates
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-[#2d1a24] sm:text-3xl">
            Nourishing Plates Without Strict Rules
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#644a57]">
            Filter vegetarian, non-vegetarian, or busy college/work options. Save dishes straight
            into your Meal Plan workspace or log them in one click to your unified Food Tracker.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate("scanner")}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#9b3d57] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#842f48]"
            >
              <Camera className="h-3.5 w-3.5" />
              Scan a Real Meal with AI Vision
            </button>
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[#e6c5ce] bg-white px-4 py-2 text-xs font-semibold text-[#5d4250] hover:bg-[#fdf0f4]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#3f6f52]" />
              Open Full Tracker Dashboard
            </button>
          </div>
        </div>

        {/* Today's Synced Summary Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#f0dce2] bg-white p-4 lg:col-span-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9b3d57]">
              Synced Daily Totals
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl bg-[#fff8fa] p-2.5">
                <span className="text-[10px] text-[#7a5d69]">Calories</span>
                <p className="font-mono text-sm font-bold text-[#2d1a24]">
                  {dashboard ? Math.round(dashboard.nutrition_summary.calories) : 0} kcal
                </p>
              </div>
              <div className="rounded-xl bg-[#f4f8f4] p-2.5">
                <span className="text-[10px] text-[#4c6957]">Protein &amp; Iron</span>
                <p className="font-mono text-sm font-bold text-[#2b5239]">
                  {dashboard ? dashboard.nutrition_summary.protein.toFixed(1) : "0"}g •{" "}
                  {dashboard ? dashboard.nutrition_summary.iron_mg.toFixed(1) : "0"}mg
                </p>
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-xl bg-[#faf7fd] p-2.5">
                <div>
                  <span className="flex items-center gap-1 text-[10px] text-[#5c4570]">
                    <Droplets className="h-3 w-3" /> Hydration Logged Today
                  </span>
                  <p className="font-mono text-sm font-bold text-[#4a3261]">
                    {dashboard ? Math.round(dashboard.hydration_summary.total_ml) : 0} mL
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={50}
                    max={1500}
                    step={50}
                    value={waterInput}
                    onChange={(e) => setWaterInput(e.target.value)}
                    aria-label="Water amount in mL"
                    className="w-16 rounded-lg border border-[#e3d8ee] bg-white px-2 py-1 text-xs text-[#2d1a24]"
                  />
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => handleQuickWater(Math.max(50, Number(waterInput) || 250))}
                    className="rounded-lg bg-[#7d5b96] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#694980]"
                  >
                    +mL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ebd4dc] bg-white p-4">
        <div className="flex flex-wrap gap-1.5">
          {MEAL_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSlotFilter(slot)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                slotFilter === slot
                  ? "bg-[#9b3d57] text-white"
                  : "border border-[#ebd4dc] bg-[#fffaf8] text-[#5d4250] hover:bg-[#fdf0f4]"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["all", "vegetarian", "non_vegetarian"] as const).map((dt) => (
            <button
              key={dt}
              type="button"
              onClick={() => setDietFilter(dt)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                dietFilter === dt
                  ? "bg-[#3f6f52] text-white"
                  : "border border-[#d8e6dc] bg-[#f7fbf8] text-[#3f5d49]"
              }`}
            >
              {dt === "all" ? "Veg & Non-Veg" : dt === "vegetarian" ? "Vegetarian" : "Non-Vegetarian"}
            </button>
          ))}

          {recordedAllergies.length > 0 && (
            <label className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800">
              <input
                type="checkbox"
                checked={hideAllergens}
                onChange={(e) => setHideAllergens(e.target.checked)}
                className="accent-amber-600"
              />
              Hide Allergy Matches ({recordedAllergies.join(", ")})
            </label>
          )}
        </div>
      </div>

      {/* Meal Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {mealsWithFlags.map(({ meal, allergenConflicts }) => (
          <article
            key={meal.id}
            className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#ebd4dc] bg-white shadow-[0_10px_28px_-18px_rgba(155,61,87,0.2)]"
          >
            <div>
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#fdf0f4]">
                <img
                  src={meal.imagePath}
                  alt={meal.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-[#9b3d57]">
                    {meal.slot}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      meal.dietType === "vegetarian"
                        ? "bg-[#eef6f1] text-[#2b5239]"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {meal.dietType === "vegetarian" ? "Vegetarian" : "Non-Veg"}
                  </span>
                </div>
                <p className="absolute right-3 bottom-2 left-3 text-[11px] font-medium text-white/95">
                  {meal.servingLabel}
                </p>
              </div>

              <div className="p-5">
                {allergenConflicts.length > 0 && (
                  <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Contains recorded allergen: {allergenConflicts.join(", ")}
                  </div>
                )}

                <h3 className="font-display text-base font-bold text-[#2d1a24]">{meal.title}</h3>
                <p className="mt-1 text-xs text-[#644a57]">{meal.note}</p>

                {/* Macros Strip */}
                <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-2xl border border-[#f0dce2] bg-[#fff8fa] p-2.5 text-center text-[11px]">
                  <div>
                    <span className="block text-[9px] uppercase text-[#8c6e7b]">Energy</span>
                    <strong className="font-mono text-[#2d1a24]">{meal.calories}</strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase text-[#8c6e7b]">Protein</span>
                    <strong className="font-mono text-[#2b5239]">{meal.protein}g</strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase text-[#8c6e7b]">Fibre</span>
                    <strong className="font-mono text-[#5e4078]">{meal.fibre}g</strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase text-[#8c6e7b]">Iron</span>
                    <strong className="font-mono text-[#9b3d57]">{meal.ironMg}mg</strong>
                  </div>
                </div>

                {/* Ingredients + Quick Prep */}
                <div className="mt-3 space-y-2 text-[11px] text-[#5d4250]">
                  <p>
                    <strong className="text-[#2d1a24]">Key Ingredients:</strong>{" "}
                    {meal.ingredients.join(" • ")}
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4 text-[#6f5762]">
                    {meal.prepSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                  <p className="flex items-start gap-1 text-[10px] text-[#3f6f52]">
                    <ShoppingBag className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{meal.storeSuggestionNote}</span>
                  </p>
                  <p className="flex items-start gap-1 text-[10px] text-[#8c6e7b]">
                    <Info className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{meal.sourceLabel} (approximate estimate)</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Dual Action Footer */}
            <div className="grid grid-cols-2 gap-2 border-t border-[#f0dce2] bg-[#fffaf8] p-3.5">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => handleSaveToMealPlan(meal)}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#e6c5ce] bg-white px-2.5 py-2 text-[11px] font-bold text-[#9b3d57] transition hover:bg-[#fdf0f4] disabled:opacity-50"
              >
                {busyId === `plan:${meal.id}` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BookmarkPlus className="h-3.5 w-3.5" />
                )}
                Save to Plan
              </button>

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => handleAddToTracker(meal)}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#9b3d57] px-2.5 py-2 text-[11px] font-bold text-white transition hover:bg-[#842f48] disabled:opacity-50"
              >
                {busyId === `log:${meal.id}` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add to Tracker
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Recent Logged Nutrition History Preview */}
      {dashboard && dashboard.recent_foods.length > 0 && (
        <div className="rounded-3xl border border-[#ebd4dc] bg-white p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-[#2d1a24]">
            <CheckCircle2 className="h-5 w-5 text-[#3f6f52]" />
            Recent Logged Foods From Your Shared Tracker
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard.recent_foods.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[#f0dce2] bg-[#fffaf8] p-3 text-xs"
              >
                <p className="font-bold text-[#2d1a24]">{item.meal_name}</p>
                <p className="mt-0.5 text-[11px] text-[#6f5762]">
                  {item.total_portion_grams} g •{" "}
                  <span className="font-mono font-semibold text-[#9b3d57]">
                    {Math.round(item.calories)} kcal
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
