import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  IndianRupee,
  ShoppingBasket,
  Sparkles,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { INDIAN_FOODS_DATA, type IndianFoodItem } from "../data/indianFoods";
import type { AppView, GroceryItem } from "../types/nutrition";
import { loadGroceryList, saveGroceryList } from "./GroceryListView";
import { AnimatedNumber, EASE_PREMIUM } from "../components/MotionPrimitives";

interface BudgetNutritionViewProps {
  onNavigate: (view: AppView) => void;
  onNotify?: (msg: string) => void;
}

const BUDGET_PRESETS = [50, 100, 150, 200] as const;

interface BudgetPlanBundle {
  breakfast: IndianFoodItem[];
  lunch: IndianFoodItem[];
  snack: IndianFoodItem[];
  dinner: IndianFoodItem[];
}

function buildAffordablePlan(budgetInr: number): BudgetPlanBundle {
  const byId = (id: string) =>
    INDIAN_FOODS_DATA.find((f) => f.id === id) ?? INDIAN_FOODS_DATA[0];

  if (budgetInr < 85) {
    // <= ₹50–₹80 Ultra-frugal whole-food staples (~₹52–₹76)
    return {
      breakfast: [byId("poha")],
      lunch: [byId("roti"), byId("dal")],
      snack: [byId("roasted-chana")],
      dinner: [byId("khichdi")],
    };
  }
  if (budgetInr < 130) {
    // ₹100/day Balanced High-Value Plan (~₹97)
    return {
      breakfast: [byId("sprouts-chaat"), byId("curd")],
      lunch: [byId("roti"), byId("roti"), byId("rajma")],
      snack: [byId("roasted-chana")],
      dinner: [byId("dal"), byId("rice")],
    };
  }
  if (budgetInr < 175) {
    // ₹150/day Elevated Protein Indian Plan (~₹142)
    return {
      breakfast: [byId("moong-chilla"), byId("curd")],
      lunch: [byId("roti"), byId("roti"), byId("chole")],
      snack: [byId("sprouts-chaat"), byId("roasted-chana")],
      dinner: [byId("khichdi"), byId("curd")],
    };
  }
  // ₹200/day Peak High-Protein & Variety (~₹186)
  return {
    breakfast: [byId("moong-chilla"), byId("masala-oats")],
    lunch: [byId("roti"), byId("roti"), byId("rajma"), byId("curd")],
    snack: [byId("sprouts-chaat"), byId("roasted-chana")],
    dinner: [byId("paneer"), byId("roti"), byId("dal")],
  };
}

export function BudgetNutritionView({
  onNavigate,
  onNotify,
}: BudgetNutritionViewProps) {
  const [dailyBudget, setDailyBudget] = useState<number>(100);
  const [vegetarianOnly, setVegetarianOnly] = useState<boolean>(true);
  const [syncedNotice, setSyncedNotice] = useState<boolean>(false);

  const bundle = useMemo(() => buildAffordablePlan(dailyBudget), [dailyBudget]);

  const allBundleItems = useMemo(
    () => [
      ...bundle.breakfast,
      ...bundle.lunch,
      ...bundle.snack,
      ...bundle.dinner,
    ],
    [bundle],
  );

  const bundleTotals = useMemo(() => {
    return allBundleItems.reduce(
      (acc, f) => ({
        cost: acc.cost + f.estimatedCostInr,
        calories: acc.calories + f.calories,
        protein: Math.round((acc.protein + f.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + f.carbs) * 10) / 10,
        fats: Math.round((acc.fats + f.fats) * 10) / 10,
        fiber: Math.round((acc.fiber + f.fiber) * 10) / 10,
      }),
      { cost: 0, calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
    );
  }, [allBundleItems]);

  const proteinEfficiencyRanked = useMemo(() => {
    return INDIAN_FOODS_DATA.filter((f) =>
      vegetarianOnly ? f.discoveryTags.includes("Vegetarian") : true,
    )
      .map((f) => ({
        ...f,
        proteinPer10Inr: Math.round((f.protein / Math.max(f.estimatedCostInr, 1)) * 100) / 10,
      }))
      .sort((a, b) => b.proteinPer10Inr - a.proteinPer10Inr)
      .slice(0, 8);
  }, [vegetarianOnly]);

  function handleSyncWeeklyGroceries() {
    const existing = loadGroceryList();
    const existingSet = new Set(existing.map((i) => i.name.toLowerCase()));
    const added: GroceryItem[] = [];
    for (const food of allBundleItems) {
      if (existingSet.has(food.name.toLowerCase())) continue;
      existingSet.add(food.name.toLowerCase());
      added.push({
        id: `${Date.now()}-${food.id}`,
        name: `${food.name} staples (~₹${food.estimatedCostInr * 7}/wk)`,
        category:
          food.category === "Protein & Paneer"
            ? "Proteins & Dairy"
            : "Grains & Pulses",
        completed: false,
        source: `₹${dailyBudget}/day Budget Plan`,
      });
    }
    saveGroceryList([...added, ...existing]);
    setSyncedNotice(true);
    onNotify?.(`Added ${added.length} budget grocery staples to your list`);
    window.setTimeout(() => setSyncedNotice(false), 3000);
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#141B16] px-6 py-6 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-[#B6FF38]/12 blur-[100px]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B6FF38]/30 bg-[#B6FF38]/10 px-3 py-1 text-xs font-semibold text-[#B6FF38]">
              <IndianRupee className="h-3.5 w-3.5" />
              Budget Nutrition Intelligence
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">
              Eat Nutritious on Any Indian Budget
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[#A3ADA6]">
              Explore high protein-per-rupee home-cooked combinations across ₹50,
              ₹100, ₹150, and ₹200 daily food budgets with transparent ingredient
              cost estimates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSyncWeeklyGroceries}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#B6FF38] px-4 py-2 text-xs font-bold text-[#080B09] transition hover:bg-[#c8ff66]"
            >
              <ShoppingBasket className="h-3.5 w-3.5" />
              <span>Export Weekly Groceries</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("indian-foods")}
              className="rounded-full border border-white/15 bg-[#101713] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/30"
            >
              Browse All Foods
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Budget Selector & Animated Slider */}
      <section className="rounded-3xl border border-white/10 bg-[#141B16] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#34D399]">
              Daily Food Budget Target
            </p>
            <p className="mt-1 font-mono text-3xl font-extrabold text-[#B6FF38] tabular-nums">
              ₹<AnimatedNumber value={dailyBudget} />
              <span className="ml-1 text-sm font-normal text-[#A3ADA6]">
                / day (~₹{(bundleTotals.cost * 7).toLocaleString()}/week est.)
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {BUDGET_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDailyBudget(preset)}
                className={`rounded-full px-4 py-2 font-mono text-xs font-bold transition ${
                  dailyBudget === preset
                    ? "bg-[#B6FF38] text-[#080B09] shadow-[0_0_20px_rgba(182,255,56,0.25)]"
                    : "border border-white/10 bg-[#080B09] text-[#A3ADA6] hover:border-white/25 hover:text-white"
                }`}
              >
                ₹{preset}/day
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <input
            type="range"
            min={50}
            max={250}
            step={10}
            aria-label="Daily budget slider in rupees"
            value={dailyBudget}
            onChange={(e) => setDailyBudget(Number(e.target.value))}
            className="nutri-slider w-full"
            style={{
              background: `linear-gradient(to right, #B6FF38 0%, #34D399 ${((dailyBudget - 50) / 200) * 100}%, rgba(255,255,255,0.12) ${((dailyBudget - 50) / 200) * 100}%, rgba(255,255,255,0.12) 100%)`,
            }}
          />
          <div className="mt-1.5 flex justify-between font-mono text-[11px] text-[#A3ADA6]">
            <span>₹50/day</span>
            <span>₹100/day</span>
            <span>₹150/day</span>
            <span>₹200/day</span>
            <span>₹250/day</span>
          </div>
        </div>

        {/* Daily Nutritional Totals Strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-white/[0.08] bg-[#080B09] p-3.5 text-center">
            <p className="text-[11px] text-[#A3ADA6]">Est. Daily Spend</p>
            <p className="mt-1 font-mono text-xl font-bold text-[#B6FF38]">
              ₹<AnimatedNumber value={bundleTotals.cost} />
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#080B09] p-3.5 text-center">
            <p className="text-[11px] text-[#A3ADA6]">Calories</p>
            <p className="mt-1 font-mono text-xl font-bold text-white">
              <AnimatedNumber value={bundleTotals.calories} />
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#080B09] p-3.5 text-center">
            <p className="text-[11px] text-[#A3ADA6]">Protein</p>
            <p className="mt-1 font-mono text-xl font-bold text-[#34D399]">
              <AnimatedNumber value={bundleTotals.protein} decimals={1} suffix="g" />
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#080B09] p-3.5 text-center">
            <p className="text-[11px] text-[#A3ADA6]">Carbs</p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-300">
              <AnimatedNumber value={bundleTotals.carbs} decimals={1} suffix="g" />
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#080B09] p-3.5 text-center">
            <p className="text-[11px] text-[#A3ADA6]">Weekly Groceries</p>
            <p className="mt-1 font-mono text-xl font-bold text-lime-200">
              ₹<AnimatedNumber value={bundleTotals.cost * 7} />
            </p>
          </div>
        </div>

        {syncedNotice && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#34D399]">
            <Check className="h-4 w-4" />
            Exported weekly budget staples to your Smart Grocery List!
          </p>
        )}
      </section>

      {/* Recommended Day Meal Plan for Selected Budget */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {(
          [
            { slot: "Breakfast", items: bundle.breakfast },
            { slot: "Lunch", items: bundle.lunch },
            { slot: "Evening Snack", items: bundle.snack },
            { slot: "Dinner", items: bundle.dinner },
          ] as const
        ).map((group) => {
          const slotCost = group.items.reduce((s, i) => s + i.estimatedCostInr, 0);
          const slotProtein = group.items.reduce((s, i) => s + i.protein, 0);
          const slotCalories = group.items.reduce((s, i) => s + i.calories, 0);
          return (
            <motion.div
              key={group.slot}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE_PREMIUM }}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#141B16] p-5"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#34D399]">
                    <Utensils className="h-3.5 w-3.5" />
                    {group.slot}
                  </span>
                  <span className="rounded-full bg-[#080B09] px-2.5 py-0.5 font-mono text-xs font-bold text-[#B6FF38]">
                    ~₹{slotCost}
                  </span>
                </div>

                <ul className="mt-4 space-y-2.5">
                  {group.items.map((item, idx) => (
                    <li
                      key={`${item.id}-${idx}`}
                      className="rounded-xl border border-white/[0.06] bg-[#080B09] p-3 text-xs"
                    >
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-[#A3ADA6]">
                        {item.servingLabel} • {item.protein}g protein • ₹{item.estimatedCostInr}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3 font-mono text-[11px] text-[#A3ADA6]">
                <span>{Math.round(slotCalories)} kcal</span>
                <span className="font-semibold text-[#34D399]">
                  {slotProtein.toFixed(1)}g Protein
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Highest Protein-Per-Rupee Leaderboard */}
      <section className="rounded-3xl border border-white/10 bg-[#141B16] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#34D399]">
              <TrendingUp className="h-3.5 w-3.5" />
              Protein Efficiency Index
            </span>
            <h2 className="mt-1 font-display text-xl font-bold text-white">
              Best Protein per Rupee (g Protein / ₹10 Spent)
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setVegetarianOnly((v) => !v)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              vegetarianOnly
                ? "border-[#34D399]/40 bg-[#34D399]/15 text-[#34D399]"
                : "border-white/10 bg-[#080B09] text-[#A3ADA6]"
            }`}
          >
            Vegetarian Only: {vegetarianOnly ? "ON" : "OFF"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {proteinEfficiencyRanked.map((food) => (
            <div
              key={food.id}
              className="rounded-2xl border border-white/[0.08] bg-[#080B09] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold text-white">{food.name}</p>
                <span className="shrink-0 rounded-full bg-[#B6FF38]/15 px-2 py-0.5 font-mono text-[11px] font-bold text-[#B6FF38]">
                  ~₹{food.estimatedCostInr}
                </span>
              </div>
              <p className="mt-2 font-mono text-lg font-extrabold text-[#34D399]">
                {food.proteinPer10Inr}g{" "}
                <span className="text-[11px] font-normal text-[#A3ADA6]">
                  protein / ₹10
                </span>
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {food.protein}g protein • {food.calories} kcal per serving
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-[#A3ADA6]">
          <Sparkles className="h-3.5 w-3.5 text-[#34D399]" />
          Estimated home-cooking ingredient costs in INR vary by city, market season, and wholesale vs. retail purchase.
        </p>
      </section>
    </div>
  );
}
