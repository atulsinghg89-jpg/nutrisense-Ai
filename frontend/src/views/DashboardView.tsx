import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  Camera,
  Clock,
  Flame,
  LayoutDashboard,
  PieChart,
  RefreshCw,
  Sliders,
  Utensils,
} from "lucide-react";
import { MacroProgressBars } from "../components/MacroProgressBars";
import {
  AnimatedNumber,
  EASE_PREMIUM,
  staggerContainerVariants,
  staggerItemVariants,
} from "../components/MotionPrimitives";
import { API_BASE_URL, fetchMealLogs, round2 } from "../lib/api";
import type {
  AppView,
  DailyMacroTargets,
  DashboardFoodsResponse,
  MealLogResponse,
} from "../types/nutrition";

interface DashboardViewProps {
  dailyTargets: DailyMacroTargets;
  onUpdateTargets: (targets: DailyMacroTargets) => void;
  onNavigate: (view: AppView) => void;
  refreshTrigger: number;
}

type DateScope = "today" | "all" | "custom";

function formatLocalYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameLocalDay(isoString: string, targetYmd: string): boolean {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return false;
  return formatLocalYMD(parsed) === targetYmd;
}

export function DashboardView({
  dailyTargets,
  onUpdateTargets,
  onNavigate,
  refreshTrigger,
}: DashboardViewProps) {
  const prefersReduced = useReducedMotion();
  const [dashboardData, setDashboardData] =
    useState<DashboardFoodsResponse | null>(null);
  const [endpointUsed, setEndpointUsed] = useState<string>("/api/logs");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateScope, setDateScope] = useState<DateScope>("today");
  const [customDate, setCustomDate] = useState<string>(() =>
    formatLocalYMD(new Date()),
  );
  const [mealTypeFilter, setMealTypeFilter] = useState<string>("all");
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalDraft, setGoalDraft] = useState<DailyMacroTargets>(dailyTargets);

  useEffect(() => {
    setGoalDraft(dailyTargets);
  }, [dailyTargets]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchMealLogs({
        mealType: mealTypeFilter !== "all" ? mealTypeFilter : undefined,
        date: dateScope === "custom" ? customDate : undefined,
      });
      setDashboardData(result.data);
      setEndpointUsed(result.endpointUsed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to fetch meal logs from ${API_BASE_URL}/api/logs`,
      );
    } finally {
      setLoading(false);
    }
  }, [mealTypeFilter, dateScope, customDate]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs, refreshTrigger]);

  const todayYmd = formatLocalYMD(new Date());

  const displayedMeals = useMemo<MealLogResponse[]>(() => {
    const allMeals = dashboardData?.meals ?? [];
    if (dateScope === "today") {
      return allMeals.filter((meal) => isSameLocalDay(meal.logged_at, todayYmd));
    }
    return allMeals;
  }, [dashboardData, dateScope, todayYmd]);

  const dailyTotals = useMemo(() => {
    return displayedMeals.reduce(
      (acc, meal) => ({
        meals: acc.meals + 1,
        portion_grams: round2(acc.portion_grams + meal.total_portion_grams),
        calories: round2(acc.calories + meal.total_calories),
        protein: round2(acc.protein + meal.total_protein),
        carbs: round2(acc.carbs + meal.total_carbs),
        fats: round2(acc.fats + meal.total_fats),
      }),
      {
        meals: 0,
        portion_grams: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      },
    );
  }, [displayedMeals]);

  // Real calorie energy split derived strictly from logged protein/carbs/fats
  const macroEnergySplit = useMemo(() => {
    const proteinKcal = dailyTotals.protein * 4;
    const carbsKcal = dailyTotals.carbs * 4;
    const fatsKcal = dailyTotals.fats * 9;
    const totalMacroKcal = proteinKcal + carbsKcal + fatsKcal;
    if (totalMacroKcal <= 0) {
      return { proteinPct: 0, carbsPct: 0, fatsPct: 0, hasData: false };
    }
    const proteinPct = Math.round((proteinKcal / totalMacroKcal) * 100);
    const carbsPct = Math.round((carbsKcal / totalMacroKcal) * 100);
    const fatsPct = Math.max(0, 100 - proteinPct - carbsPct);
    return { proteinPct, carbsPct, fatsPct, hasData: true };
  }, [dailyTotals]);

  function handleSaveGoals() {
    onUpdateTargets({
      calories: Math.max(500, Number(goalDraft.calories) || 2200),
      protein: Math.max(10, Number(goalDraft.protein) || 150),
      carbs: Math.max(10, Number(goalDraft.carbs) || 250),
      fats: Math.max(10, Number(goalDraft.fats) || 70),
    });
    setEditingGoals(false);
  }

  const calorieRingPct = Math.min(
    100,
    Math.round((dailyTotals.calories / Math.max(dailyTargets.calories, 1)) * 100),
  );
  const ringCircumference = 2 * Math.PI * 36;
  const ringDashOffset =
    ringCircumference - (calorieRingPct / 100) * ringCircumference;

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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <LayoutDashboard className="h-3.5 w-3.5" />
              PostgreSQL • GET {endpointUsed}
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">
              Nutrition Dashboard
            </h1>
            <p className="mt-1.5 text-sm text-[#A1A1AA]">
              Monitor logged meals, macro calorie balance, and daily nutrition
              goals in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setEditingGoals((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                editingGoals
                  ? "border-[#34D399]/50 bg-[#34D399]/15 text-[#34D399]"
                  : "border-white/15 bg-[#171717] text-white hover:border-white/30"
              }`}
            >
              <Sliders className="h-3.5 w-3.5 text-[#34D399]" />
              <span>{editingGoals ? "Close Goals" : "Daily Goals"}</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => void loadLogs()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#171717] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/30 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#A3FF12] ${
                  loading ? "animate-spin" : ""
                }`}
              />
              <span>Refresh</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate("scanner")}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#0A0A0A] shadow-[0_0_20px_rgba(163,255,18,0.2)] transition hover:bg-[#b5ff3b]"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Scan &amp; Log Meal</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Inline Daily Goals Editor */}
      <AnimatePresence>
        {editingGoals && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: EASE_PREMIUM }}
            className="rounded-2xl border border-[#34D399]/35 bg-[#121212] p-5 shadow-xl sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  Customize Daily Macro Goals
                </h2>
                <p className="text-xs text-[#A1A1AA]">
                  Persisted in browser localStorage for Scanner and Dashboard
                  progress bars.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveGoals}
                className="rounded-xl bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#0A0A0A] transition hover:bg-[#b5ff3b]"
              >
                Save Goals
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  { key: "calories", label: "Calories (kcal)" },
                  { key: "protein", label: "Protein (g)" },
                  { key: "carbs", label: "Carbs (g)" },
                  { key: "fats", label: "Fat (g)" },
                ] as const
              ).map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`goal-${field.key}`}
                    className="mb-1 block text-xs text-[#A1A1AA]"
                  >
                    {field.label}
                  </label>
                  <input
                    id={`goal-${field.key}`}
                    type="number"
                    min={1}
                    value={goalDraft[field.key]}
                    onChange={(e) =>
                      setGoalDraft((prev) => ({
                        ...prev,
                        [field.key]: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 font-mono text-sm text-white focus:border-[#A3FF12]/60 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#121212] p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "today", label: "Today" },
              { id: "all", label: "All Logged" },
              { id: "custom", label: "Pick Date" },
            ] as const
          ).map((scope) => (
            <button
              key={scope.id}
              type="button"
              onClick={() => setDateScope(scope.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                dateScope === scope.id
                  ? "bg-[#A3FF12] text-[#0A0A0A]"
                  : "text-[#A1A1AA] hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {scope.label}
            </button>
          ))}

          {dateScope === "custom" && (
            <div className="ml-1 flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0A0A0A] px-2.5 py-1">
              <Calendar className="h-3.5 w-3.5 text-[#34D399]" />
              <input
                type="date"
                aria-label="Filter by date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-transparent font-mono text-xs text-white focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {["all", "breakfast", "lunch", "dinner", "snack"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealTypeFilter(type)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
                mealTypeFilter === type
                  ? "border border-[#34D399]/40 bg-[#34D399]/15 text-[#34D399]"
                  : "text-[#A1A1AA] hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-semibold text-white">Could not load meal logs</p>
              <p className="text-xs text-rose-200/90">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="rounded-xl border border-white/15 bg-[#0A0A0A] px-3.5 py-1.5 text-xs font-semibold text-white hover:border-white/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards + Calorie Ring + Macro Progress + Energy Split */}
      {loading && !dashboardData ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:col-span-7">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-32 animate-pulse rounded-2xl border border-white/[0.06] bg-[#121212]"
              />
            ))}
            <div className="col-span-2 h-24 animate-pulse rounded-2xl border border-white/[0.06] bg-[#121212] sm:col-span-4" />
          </div>
          <div className="h-60 animate-pulse rounded-2xl border border-white/[0.06] bg-[#121212] lg:col-span-5" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            {/* 4 Animated KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5 transition hover:border-[#A3FF12]/35">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Calories</span>
                  <Flame className="h-4 w-4 text-[#A3FF12]" />
                </div>
                <p className="mt-3 font-mono text-2xl font-bold text-[#A3FF12] tabular-nums">
                  <AnimatedNumber value={dailyTotals.calories} />
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  / {dailyTargets.calories.toLocaleString()} kcal
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5 transition hover:border-[#34D399]/35">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Protein</span>
                  <span className="font-mono text-[11px] font-semibold text-[#34D399]">
                    PRO
                  </span>
                </div>
                <p className="mt-3 font-mono text-2xl font-bold text-[#34D399] tabular-nums">
                  <AnimatedNumber
                    value={dailyTotals.protein}
                    decimals={1}
                    suffix="g"
                  />
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  / {dailyTargets.protein}g target
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5 transition hover:border-emerald-300/35">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Carbs</span>
                  <span className="font-mono text-[11px] font-semibold text-emerald-300">
                    CARB
                  </span>
                </div>
                <p className="mt-3 font-mono text-2xl font-bold text-emerald-300 tabular-nums">
                  <AnimatedNumber
                    value={dailyTotals.carbs}
                    decimals={1}
                    suffix="g"
                  />
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  / {dailyTargets.carbs}g target
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5 transition hover:border-lime-200/35">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Fats</span>
                  <span className="font-mono text-[11px] font-semibold text-lime-200">
                    FAT
                  </span>
                </div>
                <p className="mt-3 font-mono text-2xl font-bold text-lime-200 tabular-nums">
                  <AnimatedNumber
                    value={dailyTotals.fats}
                    decimals={1}
                    suffix="g"
                  />
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  / {dailyTargets.fats}g target
                </p>
              </div>
            </div>

            {/* Calorie Goal Ring + Macro Energy Split Visualization */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#121212] p-5">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 88 88">
                    <circle
                      cx="44"
                      cy="44"
                      r="36"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="44"
                      cy="44"
                      r="36"
                      fill="none"
                      stroke="url(#dashCalRing)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      initial={
                        prefersReduced
                          ? false
                          : { strokeDashoffset: ringCircumference }
                      }
                      animate={{ strokeDashoffset: ringDashOffset }}
                      transition={{ duration: 0.75, ease: EASE_PREMIUM }}
                    />
                    <defs>
                      <linearGradient
                        id="dashCalRing"
                        x1="0"
                        y1="0"
                        x2="88"
                        y2="88"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#A3FF12" />
                        <stop offset="1" stopColor="#34D399" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute text-center">
                    <span className="font-mono text-base font-bold text-white tabular-nums">
                      {calorieRingPct}%
                    </span>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#34D399]">
                    {dateScope === "today"
                      ? "Today's Goal"
                      : dateScope === "custom"
                        ? customDate
                        : "All Logged"}
                  </p>
                  <p className="mt-1 font-display text-lg font-bold text-white">
                    {dailyTotals.meals}{" "}
                    {dailyTotals.meals === 1 ? "meal" : "meals"}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-[#A1A1AA]">
                    {Math.round(dailyTotals.portion_grams).toLocaleString()} g total
                    weight
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121212] p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                    <PieChart className="h-4 w-4 text-[#34D399]" />
                    Calorie Energy Split
                  </span>
                  <span className="font-mono text-[11px] text-[#A1A1AA]">
                    {macroEnergySplit.hasData ? "Logged Macros" : "No Intake"}
                  </span>
                </div>

                {/* Segmented Energy Bar */}
                <div className="my-3 flex h-3 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  {macroEnergySplit.hasData && (
                    <>
                      <motion.div
                        initial={prefersReduced ? false : { width: 0 }}
                        animate={{ width: `${macroEnergySplit.proteinPct}%` }}
                        transition={{ duration: 0.6, ease: EASE_PREMIUM }}
                        className="h-full bg-[#34D399]"
                        title={`Protein ${macroEnergySplit.proteinPct}%`}
                      />
                      <motion.div
                        initial={prefersReduced ? false : { width: 0 }}
                        animate={{ width: `${macroEnergySplit.carbsPct}%` }}
                        transition={{ duration: 0.6, ease: EASE_PREMIUM }}
                        className="h-full bg-emerald-300"
                        title={`Carbs ${macroEnergySplit.carbsPct}%`}
                      />
                      <motion.div
                        initial={prefersReduced ? false : { width: 0 }}
                        animate={{ width: `${macroEnergySplit.fatsPct}%` }}
                        transition={{ duration: 0.6, ease: EASE_PREMIUM }}
                        className="h-full bg-[#A3FF12]"
                        title={`Fats ${macroEnergySplit.fatsPct}%`}
                      />
                    </>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums">
                  <span className="text-[#34D399]">
                    P {macroEnergySplit.proteinPct}%
                  </span>
                  <span className="text-center text-emerald-300">
                    C {macroEnergySplit.carbsPct}%
                  </span>
                  <span className="text-right text-[#A3FF12]">
                    F {macroEnergySplit.fatsPct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Progress Bars */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5 shadow-xl sm:p-6 lg:col-span-5">
            <h2 className="mb-4 font-display text-base font-bold text-white">
              {dateScope === "today"
                ? "Daily Macro Progress"
                : "Filtered Macro Progress"}
            </h2>
            <MacroProgressBars
              calories={dailyTotals.calories}
              protein={dailyTotals.protein}
              carbs={dailyTotals.carbs}
              fats={dailyTotals.fats}
              targets={dailyTargets}
            />
          </div>
        </div>
      )}

      {/* Logged Meals List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            Meal History
          </h2>
          <span className="rounded-full border border-white/[0.08] bg-[#121212] px-3 py-1 font-mono text-xs text-[#A1A1AA]">
            Showing {displayedMeals.length}{" "}
            {displayedMeals.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {loading && !dashboardData ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl border border-white/[0.06] bg-[#121212]"
              />
            ))}
          </div>
        ) : displayedMeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#121212] px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#0A0A0A] text-[#34D399]">
              <Utensils className="h-6 w-6" />
            </div>
            <p className="mt-4 font-display text-base font-bold text-white">
              {dateScope === "today" && (dashboardData?.meals.length ?? 0) > 0
                ? "No meals logged for today yet"
                : "No logged meals found"}
            </p>
            <p className="mt-1.5 max-w-md text-sm text-[#A1A1AA]">
              {dateScope === "today" && (dashboardData?.meals.length ?? 0) > 0
                ? "Switch to 'All Logged' to view previous days, or scan a new meal now."
                : "Scan your first meal in the AI Food Scanner and save it to start tracking daily macros."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate("scanner")}
                className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-5 py-2.5 text-xs font-bold text-[#0A0A0A] hover:bg-[#b5ff3b]"
              >
                <Camera className="h-4 w-4" />
                <span>Scan &amp; Log Meal</span>
              </button>
              {dateScope === "today" &&
                (dashboardData?.meals.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setDateScope("all")}
                    className="rounded-full border border-white/15 bg-[#171717] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.08]"
                  >
                    View All Logged Meals
                  </button>
                )}
            </div>
          </div>
        ) : (
          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {displayedMeals.map((meal) => (
              <motion.article
                key={meal.id}
                variants={staggerItemVariants}
                className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5 transition hover:border-white/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#34D399]">
                        {meal.meal_type}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-[#A1A1AA]">
                        <Clock className="h-3 w-3" />
                        {new Date(meal.logged_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-white">
                      {meal.meal_name}
                    </h3>
                    {meal.notes && (
                      <p className="text-xs text-[#A1A1AA]">{meal.notes}</p>
                    )}
                  </div>

                  {/* Meal Macro Summary */}
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
                    <span className="rounded-xl border border-[#A3FF12]/20 bg-[#0A0A0A] px-3 py-1.5 font-semibold text-[#A3FF12]">
                      {Math.round(meal.total_calories)} kcal
                    </span>
                    <span className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] px-2.5 py-1.5 text-[#34D399]">
                      P {meal.total_protein.toFixed(1)}g
                    </span>
                    <span className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] px-2.5 py-1.5 text-emerald-300">
                      C {meal.total_carbs.toFixed(1)}g
                    </span>
                    <span className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] px-2.5 py-1.5 text-lime-200">
                      F {meal.total_fats.toFixed(1)}g
                    </span>
                  </div>
                </div>

                {/* Food Items Breakdown */}
                {meal.items.length > 0 && (
                  <div className="mt-4 grid gap-2.5 border-t border-white/[0.07] pt-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {meal.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#0A0A0A] px-3.5 py-2.5 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-semibold text-white">
                            {item.name}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-zinc-500 tabular-nums">
                            {Math.round(item.portion_grams)}g • P{" "}
                            {item.protein.toFixed(1)}g • C{" "}
                            {item.carbs.toFixed(1)}g • F {item.fats.toFixed(1)}g
                          </p>
                        </div>
                        <span className="shrink-0 font-mono font-semibold text-[#A3FF12] tabular-nums">
                          {Math.round(item.calories)} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.article>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
