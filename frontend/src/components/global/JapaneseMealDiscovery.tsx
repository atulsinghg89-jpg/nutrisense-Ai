import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Leaf,
  Loader2,
  Plus,
  Utensils,
} from "lucide-react";
import { fetchTraditionalJapaneseMeals } from "../../lib/api";
import type {
  TrackedFoodEntryCreate,
  TraditionalJapaneseMeal,
} from "../../types/nutrition";

interface JapaneseMealDiscoveryProps {
  profileId: number | null;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onLogFood: (payload: Omit<TrackedFoodEntryCreate, "profile_id">) => Promise<void>;
  onOpenAlternatives?: () => void;
  onNotify: (msg: string) => void;
}

export function JapaneseMealDiscovery({
  profileId,
  isAuthenticated,
  onOpenAuth,
  onLogFood,
  onOpenAlternatives,
  onNotify,
}: JapaneseMealDiscoveryProps) {
  const [meals, setMeals] = useState<TraditionalJapaneseMeal[]>([]);
  const [vegOnly, setVegOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchTraditionalJapaneseMeals({ vegetarian_only: vegOnly })
      .then((res) => {
        if (active) setMeals(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [vegOnly]);

  async function handleLogMeal(meal: TraditionalJapaneseMeal) {
    if (!isAuthenticated || !profileId) {
      onOpenAuth();
      return;
    }
    setBusyId(meal.id);
    try {
      await onLogFood({
        meal_name: meal.title,
        meal_type: "meal",
        measurement_source: "manual",
        total_portion_grams: meal.serving_grams,
        calories: meal.totals.calories,
        protein: meal.totals.protein,
        carbs: meal.totals.carbs,
        fats: meal.totals.fats,
        fibre: meal.totals.fibre,
        iron_mg: meal.totals.iron_mg,
        calcium_mg: meal.totals.calcium_mg,
        sodium_mg: meal.totals.sodium_mg,
        nutrition_sources: [meal.data_source],
        notes: `${meal.serving_label} • Traditional Japanese Meal Discovery`,
      });
      onNotify(`Logged "${meal.title}" to Food Tracker!`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
            <Utensils className="h-3.5 w-3.5" />
            Traditional Balanced Meal Combinations
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-white sm:text-3xl">
            Japanese Traditional Meal Discovery
          </h2>
          <p className="mt-1.5 text-sm text-[#A1A1AA]">
            Explore balanced combinations pairing grains, soup broth, soy/fish proteins, and
            greens — deterministically summed from MEXT composition rows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVegOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              vegOnly
                ? "border-[#34D399]/60 bg-[#34D399]/18 text-[#34D399]"
                : "border-white/10 bg-[#0A0A0A] text-zinc-300"
            }`}
          >
            <Leaf className="h-3.5 w-3.5" />
            Vegetarian Sets Only
          </button>
          {onOpenAlternatives && (
            <button
              type="button"
              onClick={onOpenAlternatives}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-semibold text-white hover:border-[#34D399]/50"
            >
              <span>Swaps Engine</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#A1A1AA]">
          <Loader2 className="h-4 w-4 animate-spin text-[#A3FF12]" />
          <span>Calculating meal combinations...</span>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {meals.map((meal) => (
            <article
              key={meal.id}
              className="flex flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121212]"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.07] bg-gradient-to-r from-[#171D18] to-[#0D110E] px-5 py-4">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#34D399]">
                      {meal.category}
                    </span>
                    <h3 className="mt-1 font-display text-lg font-bold text-white">
                      {meal.title}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                      meal.is_vegetarian
                        ? "border-[#34D399]/40 bg-[#34D399]/12 text-[#34D399]"
                        : "border-amber-400/40 bg-amber-400/12 text-amber-200"
                    }`}
                  >
                    {meal.is_vegetarian ? "Vegetarian" : "Pescatarian / Egg"}
                  </span>
                </div>

                <div className="space-y-4 p-5 text-xs">
                  <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-3 text-center font-mono">
                    <div>
                      <span className="block text-[9px] text-zinc-500">KCAL</span>
                      <strong className="text-[#A3FF12]">{Math.round(meal.totals.calories)}</strong>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-500">PRO</span>
                      <strong className="text-[#34D399]">{meal.totals.protein}g</strong>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-500">FIBRE</span>
                      <strong className="text-white">{meal.totals.fibre}g</strong>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-500">NA</span>
                      <strong className="text-zinc-300">{Math.round(meal.totals.sodium_mg)}mg</strong>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 font-bold text-zinc-200">
                      Ingredients ({meal.serving_label})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {meal.ingredient_breakdown.map((ing) => (
                        <span
                          key={ing.slug}
                          className="rounded-lg border border-white/10 bg-[#0A0A0A] px-2.5 py-1 text-[11px] text-zinc-300"
                        >
                          {ing.name} ({ing.grams}g)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 font-bold text-zinc-200">Preparation Steps</p>
                    <ul className="space-y-1 text-zinc-400">
                      {meal.cooking_instructions.map((step) => (
                        <li key={step} className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {meal.allergens.length > 0 && (
                    <p className="flex items-center gap-1.5 text-[11px] text-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Allergens: {meal.allergens.join(", ")}
                    </p>
                  )}

                  <p className="rounded-xl border border-[#34D399]/20 bg-[#34D399]/8 p-2.5 text-[11px] text-emerald-100">
                    <strong>Indian Meal Alternative:</strong> {meal.healthier_indian_alternative}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#0B0F0C] p-4">
                <span className="text-[10px] text-zinc-500">{meal.data_source}</span>
                <button
                  type="button"
                  disabled={busyId === meal.id}
                  onClick={() => void handleLogMeal(meal)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#050706] hover:bg-[#b8ff42] disabled:opacity-50"
                >
                  {busyId === meal.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add to Food Tracker
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
