import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  Globe2,
  Info,
  Leaf,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Utensils,
} from "lucide-react";
import { fetchGlobalFoods } from "../../lib/api";
import type {
  GlobalFoodItem,
  TrackedFoodEntryCreate,
} from "../../types/nutrition";
import { GlobalFoodSearch } from "./GlobalFoodSearch";

interface JapaneseFoodIntelligenceProps {
  profileId: number | null;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onLogFood: (payload: Omit<TrackedFoodEntryCreate, "profile_id">) => Promise<void>;
  onCompareFood?: (slug: string) => void;
  onNotify: (msg: string) => void;
}

function FoodMediaHeader({ food }: { food: GlobalFoodItem }) {
  if (food.has_verified_image && food.image_path) {
    return (
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0B0F0C]">
        <img
          src={food.image_path}
          alt={food.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-black/35" />
      </div>
    );
  }
  return (
    <div className="flex aspect-[16/9] w-full flex-col items-center justify-center border-b border-white/[0.06] bg-gradient-to-br from-[#171D18] via-[#101411] to-[#080B09] p-4 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]">
        <Utensils className="h-5 w-5" />
      </div>
      <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#A3FF12]">
        {food.country_code === "JP" ? "Japanese Reference" : "Indian Reference"} •{" "}
        {food.food_category}
      </p>
      <p className="mt-0.5 text-[11px] text-[#A1A1AA]">
        Standardized Per-100g Composition Entry
      </p>
    </div>
  );
}

export function JapaneseFoodIntelligence({
  profileId,
  isAuthenticated,
  onOpenAuth,
  onLogFood,
  onCompareFood,
  onNotify,
}: JapaneseFoodIntelligenceProps) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState<"ALL" | "JP" | "IN">("JP");
  const [category, setCategory] = useState("all");
  const [vegetarianOnly, setVegetarianOnly] = useState(false);

  const [foods, setFoods] = useState<GlobalFoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingSlug, setLoggingSlug] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchGlobalFoods({
      country: country === "ALL" ? undefined : country,
      category: category === "all" ? undefined : category,
      q: query.trim() || undefined,
      vegetarian_only: vegetarianOnly,
    })
      .then((res) => {
        if (active) setFoods(res);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load composition database.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [country, category, query, vegetarianOnly]);

  const categories = useMemo(
    () => Array.from(new Set(foods.map((f) => f.food_category))).sort(),
    [foods],
  );

  async function handleLogServing(food: GlobalFoodItem) {
    if (!isAuthenticated || !profileId) {
      onOpenAuth();
      return;
    }
    setLoggingSlug(food.slug);
    try {
      const factor = food.serving_grams / 100.0;
      await onLogFood({
        meal_name: food.name,
        meal_type: "meal",
        measurement_source: "manual",
        total_portion_grams: food.serving_grams,
        calories: Number((food.calories_per_100g * factor).toFixed(1)),
        protein: Number((food.protein_per_100g * factor).toFixed(1)),
        carbs: Number((food.carbs_per_100g * factor).toFixed(1)),
        fats: Number((food.fats_per_100g * factor).toFixed(1)),
        fibre: Number((food.fibre_per_100g * factor).toFixed(1)),
        calcium_mg: Number((food.calcium_mg_per_100g * factor).toFixed(1)),
        iron_mg: Number((food.iron_mg_per_100g * factor).toFixed(1)),
        sodium_mg: Number((food.sodium_mg_per_100g * factor).toFixed(1)),
        nutrition_sources: [`${food.data_source} (${food.source_version})`],
        notes: `${food.serving_label} • Logged from Food Intelligence`,
      });
      onNotify(`Added ${food.name} (${food.serving_label}) to your Food Tracker.`);
    } finally {
      setLoggingSlug(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-3 py-1 text-xs font-semibold text-[#34D399]">
              <Database className="h-3.5 w-3.5" />
              Verified Food Composition Tables • Per 100g Reference
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-white sm:text-3xl">
              Japanese &amp; Global Food Intelligence
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#A1A1AA]">
              Explore Japanese and Indian staples with standardized per-100g nutrients (Calories,
              Protein, Carbohydrates, Fat, Fibre, Iron, Calcium, Sodium), preparation states,
              alternatives, and explicit publication sources.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-3.5 text-[11px] text-[#A1A1AA]">
            <p className="flex items-center gap-1.5 font-semibold text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-[#A3FF12]" />
              Zero Estimated Guessing
            </p>
            <p className="mt-1 max-w-xs">
              Records label exact source publication year and distinguish verified single-food
              rows from computed composite dishes.
            </p>
          </div>
        </div>
      </div>

      <GlobalFoodSearch
        query={query}
        onQueryChange={setQuery}
        country={country}
        onCountryChange={(c) => {
          setCountry(c);
          setCategory("all");
        }}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        vegetarianOnly={vegetarianOnly}
        onVegetarianOnlyChange={setVegetarianOnly}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#A1A1AA]">
          <Loader2 className="h-4 w-4 animate-spin text-[#A3FF12]" />
          <span>Querying PostgreSQL food composition records...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
          {error}
        </div>
      ) : foods.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-xs text-[#A1A1AA]">
          No food composition records matched your filter criteria.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {foods.map((food) => (
            <article
              key={food.id}
              className="flex flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121212] transition hover:border-[#34D399]/40"
            >
              <div>
                <div className="relative">
                  <FoodMediaHeader food={food} />
                  <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/75 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#A3FF12] backdrop-blur-md">
                      <Globe2 className="h-3 w-3" />
                      {food.country_code === "JP" ? "JAPAN" : "INDIA"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md ${
                        food.is_vegetarian
                          ? "border-[#34D399]/50 bg-black/75 text-[#34D399]"
                          : "border-amber-400/50 bg-black/75 text-amber-200"
                      }`}
                    >
                      <Leaf className="h-3 w-3" />
                      {food.is_vegetarian ? "Vegetarian" : "Non-Vegetarian"}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#34D399]">
                    {food.food_category} • {food.preparation_state}
                  </span>
                  <h3 className="mt-1 font-display text-lg font-bold text-white">
                    {food.name}
                  </h3>
                  <p className="mt-1 text-xs text-[#A1A1AA]">{food.preparation_method}</p>

                  {/* Verified Per 100g Grid */}
                  <div className="mt-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] p-3">
                    <div className="mb-2 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="font-bold uppercase tracking-wider text-zinc-300">
                        Composition Per 100g
                      </span>
                      <span className="font-mono text-[#A3FF12]">
                        {food.calories_per_100g} kcal
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                      <div className="rounded-lg bg-[#121212] p-1.5">
                        <span className="block text-[9px] text-zinc-500">PRO</span>
                        <strong className="text-[#34D399]">{food.protein_per_100g}g</strong>
                      </div>
                      <div className="rounded-lg bg-[#121212] p-1.5">
                        <span className="block text-[9px] text-zinc-500">CARB</span>
                        <strong className="text-white">{food.carbs_per_100g}g</strong>
                      </div>
                      <div className="rounded-lg bg-[#121212] p-1.5">
                        <span className="block text-[9px] text-zinc-500">FAT</span>
                        <strong className="text-lime-200">{food.fats_per_100g}g</strong>
                      </div>
                      <div className="rounded-lg bg-[#121212] p-1.5">
                        <span className="block text-[9px] text-zinc-500">FIBRE</span>
                        <strong className="text-emerald-300">{food.fibre_per_100g}g</strong>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center font-mono text-[10px] text-zinc-300">
                      <div className="rounded-lg bg-[#121212] py-1">
                        Iron: {food.iron_mg_per_100g}mg
                      </div>
                      <div className="rounded-lg bg-[#121212] py-1">
                        Ca: {food.calcium_mg_per_100g}mg
                      </div>
                      <div className="rounded-lg bg-[#121212] py-1">
                        Na: {food.sodium_mg_per_100g}mg
                      </div>
                    </div>
                  </div>

                  {/* Healthier Swap + Source Citation */}
                  <div className="mt-3 space-y-2 text-[11px]">
                    <p className="rounded-xl border border-[#34D399]/20 bg-[#34D399]/8 p-2.5 text-zinc-200">
                      <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[#34D399]" />
                      <strong>Healthy Alternative Note:</strong> {food.healthier_swap_note}
                    </p>
                    <div className="flex items-start gap-1.5 text-[10px] text-[#A1A1AA]">
                      <Info className="mt-0.5 h-3 w-3 shrink-0 text-[#34D399]" />
                      <span>
                        {food.data_source} ({food.source_version}, {food.publication_year}) •{" "}
                        <strong className="text-zinc-300">
                          {food.verification_status === "verified_table"
                            ? "Verified Composition Row"
                            : "Computed Composite"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-white/[0.08] bg-[#0B0F0C] p-3.5">
                <button
                  type="button"
                  disabled={loggingSlug === food.slug}
                  onClick={() => handleLogServing(food)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#A3FF12] px-3 py-2 text-xs font-bold text-[#050706] transition hover:bg-[#b8ff42] disabled:opacity-50"
                >
                  {loggingSlug === food.slug ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Log {food.serving_grams}g
                </button>
                {onCompareFood && (
                  <button
                    type="button"
                    onClick={() => onCompareFood(food.slug)}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-[#121212] px-3 py-2 text-xs font-semibold text-white hover:border-[#34D399]/50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#34D399]" />
                    Compare
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
