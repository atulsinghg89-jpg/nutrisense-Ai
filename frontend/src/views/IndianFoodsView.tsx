import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpDown,
  Camera,
  Check,
  Info,
  Loader2,
  PlusCircle,
  Scale,
  Search,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { createMealLog, round2 } from "../lib/api";
import {
  DISCOVERY_CATEGORIES,
  INDIAN_FOODS_DATA,
  type DiscoveryCategoryTag,
  type IndianFoodItem,
} from "../data/indianFoods";
import type { AppView, MealType } from "../types/nutrition";
import {
  EASE_PREMIUM,
  staggerContainerVariants,
  staggerItemVariants,
} from "../components/MotionPrimitives";

interface IndianFoodsViewProps {
  onNavigate: (view: AppView) => void;
  onMealLogged?: (foodName?: string) => void;
}

type SortKey = "default" | "calories_asc" | "protein_desc" | "fiber_desc";

export function IndianFoodsView({
  onNavigate,
  onMealLogged,
}: IndianFoodsViewProps) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<"All" | DiscoveryCategoryTag>(
    "All",
  );
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [servingMultipliers, setServingMultipliers] = useState<
    Record<string, number>
  >({});
  const [detailFood, setDetailFood] = useState<IndianFoodItem | null>(null);
  const [logMealType, setLogMealType] = useState<MealType>("lunch");
  const [loggingFoodId, setLoggingFoodId] = useState<string | null>(null);
  const [loggedFoodIds, setLoggedFoodIds] = useState<Record<string, boolean>>({});
  const [logError, setLogError] = useState<string | null>(null);

  async function handleQuickLogFood(food: IndianFoodItem, mult: number) {
    setLoggingFoodId(food.id);
    setLogError(null);
    try {
      await createMealLog({
        meal_name: `${food.name} (${mult}x)`,
        meal_type: logMealType,
        notes: `Logged from Healthy Food Discovery (${food.servingLabel})`,
        items: [
          {
            name: food.name,
            portion_grams: round2(food.servingGrams * mult),
            calories: round2(food.calories * mult),
            protein: round2(food.protein * mult),
            carbs: round2(food.carbs * mult),
            fats: round2(food.fats * mult),
          },
        ],
      });
      setLoggedFoodIds((prev) => ({ ...prev, [food.id]: true }));
      onMealLogged?.(`${food.name} (${mult}x)`);
      window.setTimeout(() => {
        setLoggedFoodIds((prev) => ({ ...prev, [food.id]: false }));
      }, 2500);
    } catch (err) {
      setLogError(
        err instanceof Error
          ? err.message
          : "Unable to log meal right now. Ensure FastAPI backend is running.",
      );
    } finally {
      setLoggingFoodId(null);
    }
  }

  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = INDIAN_FOODS_DATA.filter((item) => {
      const matchesTag =
        selectedTag === "All" || item.discoveryTags.includes(selectedTag);
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.hindiName.includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.discoveryTags.some((t) => t.toLowerCase().includes(q));
      return matchesTag && matchesQuery;
    });

    if (sortBy === "calories_asc") {
      return [...list].sort((a, b) => a.calories - b.calories);
    }
    if (sortBy === "protein_desc") {
      return [...list].sort((a, b) => b.protein - a.protein);
    }
    if (sortBy === "fiber_desc") {
      return [...list].sort((a, b) => b.fiber - a.fiber);
    }
    return list;
  }, [query, selectedTag, sortBy]);

  function getMultiplier(id: string): number {
    return servingMultipliers[id] ?? 1;
  }

  function setMultiplier(id: string, mult: number) {
    setServingMultipliers((prev) => ({ ...prev, [id]: mult }));
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121212] px-6 py-6 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-[#A3FF12]/10 blur-[100px]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-1 text-xs font-semibold text-[#34D399]">
              <Utensils className="h-3.5 w-3.5" />
              Healthy Food Discovery &amp; Indian Food Intelligence
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">
              Discover Whole &amp; Everyday Indian Foods
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[#A1A1AA]">
              Filter verified nutritional profiles across High Protein, Low
              Calorie, Healthy Breakfast, Muscle Building, Weight Management,
              and traditional home-cooked Indian staples.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("scanner")}
            className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-5 py-2.5 text-xs font-bold text-[#0A0A0A] shadow-[0_0_20px_rgba(163,255,18,0.2)] transition hover:bg-[#b5ff3b]"
          >
            <Camera className="h-4 w-4" />
            <span>Scan Real Plate</span>
          </button>
        </div>
      </div>

      {/* Clear Accuracy Disclaimer */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-5 py-3.5 text-xs text-amber-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-white">
            Portion &amp; Preparation Note:
          </strong>{" "}
          Values below are representative standard home-cooked estimates. Actual
          calories and fats vary significantly with oil/ghee, coconut, cream, or
          serving bowl volume.
        </p>
      </div>

      {/* Search, Discovery Filter Chips & Sort Controls */}
      <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#121212] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[230px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roti, dal, paneer, idli, oats, sprouts..."
              className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] py-2 pr-3 pl-10 text-sm text-white placeholder-zinc-500 focus:border-[#A3FF12]/60 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2">
            <span className="text-[11px] text-[#A1A1AA]">Log as:</span>
            <select
              aria-label="Meal slot for quick logging"
              value={logMealType}
              onChange={(e) => setLogMealType(e.target.value as MealType)}
              className="bg-transparent text-xs font-semibold text-[#34D399] focus:outline-none"
            >
              <option value="breakfast" className="bg-[#121212]">Breakfast</option>
              <option value="lunch" className="bg-[#121212]">Lunch</option>
              <option value="snack" className="bg-[#121212]">Snack</option>
              <option value="dinner" className="bg-[#121212]">Dinner</option>
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#34D399]" />
            <select
              aria-label="Sort foods"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none"
            >
              <option value="default" className="bg-[#121212]">Sort: Recommended</option>
              <option value="protein_desc" className="bg-[#121212]">Protein: High → Low</option>
              <option value="calories_asc" className="bg-[#121212]">Calories: Low → High</option>
              <option value="fiber_desc" className="bg-[#121212]">Fiber: High → Low</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["All", ...DISCOVERY_CATEGORIES] as const).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedTag === tag
                  ? "bg-[#A3FF12] text-[#0A0A0A]"
                  : "border border-white/[0.07] bg-[#0A0A0A] text-[#A1A1AA] hover:border-white/25 hover:text-white"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Food Cards Grid */}
      {filteredFoods.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-10 text-center text-sm text-[#A1A1AA]">
          No foods matched &ldquo;{query}&rdquo; in {selectedTag}. Try clearing filters.
        </div>
      ) : (
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredFoods.map((food) => {
            const mult = getMultiplier(food.id);
            return (
              <motion.article
                key={food.id}
                variants={staggerItemVariants}
                whileHover={{ y: -4 }}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#141B16] transition-colors hover:border-[#B6FF38]/45"
              >
                <div>
                  {/* High-Resolution Editorial Food Photography Header */}
                  <button
                    type="button"
                    onClick={() => setDetailFood(food)}
                    className="relative block w-full overflow-hidden text-left focus:outline-none"
                  >
                    <img
                      src={food.imagePath}
                      alt={food.name}
                      loading="lazy"
                      className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#141B16] via-[#080B09]/25 to-transparent"
                    />
                    <span className="glass-surface absolute top-3 left-3 rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#34D399]">
                      {food.category}
                    </span>
                    <span className="glass-surface absolute top-3 right-3 rounded-full border border-[#B6FF38]/35 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#B6FF38]">
                      ~₹{food.estimatedCostInr}
                    </span>
                  </button>

                  <div className="px-5 pt-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-display text-lg font-bold text-white transition-colors group-hover:text-[#B6FF38]">
                          {food.name}
                        </h2>
                        <p className="text-xs text-[#A3ADA6]">
                          {food.hindiName} • {food.servingLabel} (
                          {Math.round(food.servingGrams * mult)}g)
                        </p>
                      </div>
                      <div className="shrink-0 rounded-xl border border-[#B6FF38]/25 bg-[#080B09] px-3 py-1.5 text-right font-mono">
                        <p className="text-base font-bold text-[#B6FF38] tabular-nums">
                          {Math.round(food.calories * mult)}
                        </p>
                        <p className="text-[10px] text-zinc-400">kcal</p>
                      </div>
                    </div>

                    {/* Serving Multiplier Buttons */}
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#080B09] px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-[#A3ADA6]">
                        <Scale className="h-3.5 w-3.5 text-[#34D399]" />
                        Servings
                      </span>
                      <div className="flex items-center gap-1">
                        {[0.5, 1, 1.5, 2].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => setMultiplier(food.id, step)}
                            className={`rounded-lg px-2 py-0.5 font-mono text-xs font-semibold transition ${
                              mult === step
                                ? "bg-[#B6FF38] text-[#080B09]"
                                : "text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                            }`}
                          >
                            {step}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Macro Tiles */}
                    <div className="mt-4 grid grid-cols-4 gap-2 font-mono text-xs tabular-nums">
                      <div className="rounded-xl border border-white/[0.06] bg-[#080B09] p-2.5 text-center">
                        <p className="text-[10px] text-[#A3ADA6]">Protein</p>
                        <p className="mt-0.5 font-bold text-[#34D399]">
                          {(food.protein * mult).toFixed(1)}g
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-[#080B09] p-2.5 text-center">
                        <p className="text-[10px] text-[#A3ADA6]">Carbs</p>
                        <p className="mt-0.5 font-bold text-emerald-300">
                          {(food.carbs * mult).toFixed(1)}g
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-[#080B09] p-2.5 text-center">
                        <p className="text-[10px] text-[#A3ADA6]">Fats</p>
                        <p className="mt-0.5 font-bold text-lime-200">
                          {(food.fats * mult).toFixed(1)}g
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-[#080B09] p-2.5 text-center">
                        <p className="text-[10px] text-[#A3ADA6]">Fiber</p>
                        <p className="mt-0.5 font-bold text-zinc-200">
                          {(food.fiber * mult).toFixed(1)}g
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-white/[0.07] px-5 pt-3 pb-5 text-xs">
                  <p className="flex items-start gap-1.5 text-[#34D399]">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{food.smartTip}</span>
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDetailFood(food)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 transition hover:text-[#B6FF38]"
                    >
                      <span>Details</span>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      type="button"
                      disabled={loggingFoodId === food.id}
                      onClick={() => void handleQuickLogFood(food, mult)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                        loggedFoodIds[food.id]
                          ? "bg-[#34D399] text-[#080B09]"
                          : "border border-[#B6FF38]/40 bg-[#B6FF38]/10 text-[#B6FF38] hover:bg-[#B6FF38] hover:text-[#080B09]"
                      } disabled:opacity-50`}
                    >
                      {loggingFoodId === food.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : loggedFoodIds[food.id] ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <PlusCircle className="h-3 w-3" />
                      )}
                      <span>
                        {loggedFoodIds[food.id] ? "Logged" : `Log ${mult}x`}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}

      {logError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
          {logError}
        </div>
      )}

      {/* Food Detail Modal */}
      <AnimatePresence>
        {detailFood && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailFood(null)}
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2, ease: EASE_PREMIUM }}
                className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#121212] p-6 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#34D399]">
                      {detailFood.category}
                    </span>
                    <h2 className="mt-2 font-display text-2xl font-bold text-white">
                      {detailFood.name}
                    </h2>
                    <p className="text-xs text-[#A1A1AA]">
                      {detailFood.hindiName} • {detailFood.servingLabel} (
                      {detailFood.servingGrams}g)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailFood(null)}
                    aria-label="Close food detail"
                    className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-5 gap-2 font-mono text-xs">
                  <div className="rounded-xl bg-[#0A0A0A] p-3 text-center">
                    <p className="text-[10px] text-zinc-500">KCAL</p>
                    <p className="mt-1 font-bold text-[#A3FF12]">
                      {detailFood.calories}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#0A0A0A] p-3 text-center">
                    <p className="text-[10px] text-zinc-500">PRO</p>
                    <p className="mt-1 font-bold text-[#34D399]">
                      {detailFood.protein}g
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#0A0A0A] p-3 text-center">
                    <p className="text-[10px] text-zinc-500">CARB</p>
                    <p className="mt-1 font-bold text-emerald-300">
                      {detailFood.carbs}g
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#0A0A0A] p-3 text-center">
                    <p className="text-[10px] text-zinc-500">FAT</p>
                    <p className="mt-1 font-bold text-lime-200">
                      {detailFood.fats}g
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#0A0A0A] p-3 text-center">
                    <p className="text-[10px] text-zinc-500">FIBER</p>
                    <p className="mt-1 font-bold text-white">
                      {detailFood.fiber}g
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-3.5 text-[#A1A1AA]">
                    <p className="font-semibold text-white">Prep &amp; Variance Note</p>
                    <p className="mt-1">{detailFood.note}</p>
                  </div>
                  <div className="rounded-xl border border-[#34D399]/25 bg-[#34D399]/10 p-3.5 text-[#34D399]">
                    <p className="font-semibold">Smart Pairing Tip</p>
                    <p className="mt-1 text-zinc-100">{detailFood.smartTip}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
