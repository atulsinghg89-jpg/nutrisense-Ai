import { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  Droplets,
  Flame,
  Info,
  Leaf,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Scale,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Wheat,
} from "lucide-react";
import { lookupIngredientNutrition } from "../lib/api";
import type {
  AnalyzedIngredient,
  AppView,
  DailyMacroTargets,
  MealType,
  ScanSession,
} from "../types/nutrition";
import { MacroProgressBars } from "./MacroProgressBars";
import { AnimatedNumber, EASE_PREMIUM } from "./MotionPrimitives";

interface ScanExperienceStoryProps {
  session: ScanSession;
  previewUrl: string | null;
  dailyTargets: DailyMacroTargets;
  recalcStatus: "idle" | "syncing" | "synced";
  onChangeIngredientGrams: (ingredientId: string, grams: number) => void;
  onConfirmIngredient: (ingredientId: string) => void;
  onRemoveIngredient: (ingredientId: string) => void;
  onReplaceIngredient: (
    ingredientId: string,
    replacement: AnalyzedIngredient,
  ) => void;
  onApplyServingMultiplier: (multiplier: number) => void;
  onResetPortions: () => void;
  onRescan: () => void;
  onUploadNew: () => void;
  onNavigate: (view: AppView) => void;
  scanning: boolean;
  hasSelectedFile: boolean;
  // Meal logging props
  mealName: string;
  onMealNameChange: (v: string) => void;
  mealType: MealType;
  onMealTypeChange: (v: MealType) => void;
  mealNotes: string;
  onMealNotesChange: (v: string) => void;
  logging: boolean;
  logError: string | null;
  logSuccess: boolean;
  onLogMeal: () => void;
}

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function getIngredientVisualCategory(ing: AnalyzedIngredient) {
  const n = ing.name.toLowerCase();
  if (
    n.includes("oil") ||
    n.includes("ghee") ||
    n.includes("butter") ||
    n.includes("sauce") ||
    n.includes("chutney")
  ) {
    return { Icon: Droplets, accent: "text-amber-300", bg: "bg-amber-400/10 border-amber-400/30" };
  }
  if (
    n.includes("roti") ||
    n.includes("rice") ||
    n.includes("wheat") ||
    n.includes("bulgur") ||
    n.includes("noodle") ||
    n.includes("pasta") ||
    n.includes("poha") ||
    n.includes("idli") ||
    n.includes("dosa") ||
    n.includes("bread") ||
    n.includes("oat")
  ) {
    return { Icon: Wheat, accent: "text-[#A3FF12]", bg: "bg-[#A3FF12]/10 border-[#A3FF12]/30" };
  }
  return { Icon: Leaf, accent: "text-[#34D399]", bg: "bg-[#34D399]/10 border-[#34D399]/30" };
}

export function ScanExperienceStory({
  session,
  previewUrl,
  dailyTargets,
  recalcStatus,
  onChangeIngredientGrams,
  onConfirmIngredient,
  onRemoveIngredient,
  onReplaceIngredient,
  onApplyServingMultiplier,
  onResetPortions,
  onRescan,
  onUploadNew,
  onNavigate,
  scanning,
  hasSelectedFile,
  mealName,
  onMealNameChange,
  mealType,
  onMealTypeChange,
  mealNotes,
  onMealNotesChange,
  logging,
  logError,
  logSuccess,
  onLogMeal,
}: ScanExperienceStoryProps) {
  const prefersReduced = useReducedMotion();
  const heroStageRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress: stage1Scroll } = useScroll({
    target: heroStageRef,
    offset: ["start end", "end start"],
  });
  const heroParallaxY = useTransform(stage1Scroll, [0, 1], [16, -24]);
  const heroScale = useTransform(stage1Scroll, [0, 0.5, 1], [0.97, 1.02, 0.99]);

  // Inline DB ingredient lookup state for uncertain/unmatched cards
  const [lookupDrafts, setLookupDrafts] = useState<Record<string, string>>({});
  const [lookupBusyId, setLookupBusyId] = useState<string | null>(null);
  const [lookupFeedback, setLookupFeedback] = useState<Record<string, string>>({});
  const [activeMultiplier, setActiveMultiplier] = useState<number>(1);

  const displayImage = previewUrl || session.imagePreviewUrl;
  const ingredients = session.ingredients;
  const totals = session.totals;

  const initialTotalGrams = Object.values(session.initialIngredientGrams).reduce(
    (sum, g) => sum + g,
    0,
  ) || totals.portion_grams;

  const uncertainCount = ingredients.filter(
    (ing) => ing.needs_confirmation && !ing.confirmed_by_user && ing.estimated_grams > 0,
  ).length;
  const unmatchedCount = ingredients.filter(
    (ing) => ing.source_type === "unmatched" && !ing.confirmed_by_user && ing.estimated_grams > 0,
  ).length;

  const totalMacroKcal =
    totals.protein * 4 + totals.carbs * 4 + totals.fats * 9;
  const proPct =
    totalMacroKcal > 0
      ? Math.round(((totals.protein * 4) / totalMacroKcal) * 100)
      : 0;
  const carbPct =
    totalMacroKcal > 0
      ? Math.round(((totals.carbs * 4) / totalMacroKcal) * 100)
      : 0;
  const fatPct =
    totalMacroKcal > 0 ? Math.max(0, 100 - proPct - carbPct) : 0;

  const calGoalPct = Math.min(
    100,
    Math.round((totals.calories / Math.max(dailyTargets.calories, 1)) * 100),
  );
  const calRingCirc = 2 * Math.PI * 52;
  const calRingOffset = calRingCirc - (calGoalPct / 100) * calRingCirc;

  async function handleDbLookup(ing: AnalyzedIngredient) {
    const query = (lookupDrafts[ing.id] ?? ing.name).trim();
    if (query.length < 2) return;
    setLookupBusyId(ing.id);
    setLookupFeedback((prev) => ({ ...prev, [ing.id]: "" }));
    try {
      const res = await lookupIngredientNutrition(query, Math.max(ing.estimated_grams, 10));
      if (res.found && res.ingredient) {
        onReplaceIngredient(ing.id, {
          ...res.ingredient,
          id: ing.id,
        });
        setLookupFeedback((prev) => ({
          ...prev,
          [ing.id]: res.message,
        }));
      } else {
        setLookupFeedback((prev) => ({
          ...prev,
          [ing.id]: res.message,
        }));
      }
    } catch (err) {
      setLookupFeedback((prev) => ({
        ...prev,
        [ing.id]: err instanceof Error ? err.message : "Database lookup failed.",
      }));
    } finally {
      setLookupBusyId(null);
    }
  }

  return (
    <div className="space-y-12">
      {/* ===================================================================
          STAGE 1: FOOD IDENTIFICATION / HERO REVEAL
         =================================================================== */}
      <section
        id="scan-stage-1"
        ref={heroStageRef}
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050706] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.75)] sm:p-10"
      >
        {/* Subtle radial NutriSense ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-[#A3FF12]/10 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#34D399]/10 blur-[110px]"
        />

        {/* Top Action & Navigation Strip */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#A3FF12]">
              <Sparkles className="h-3 w-3" />
              Stage 01 • Plate Identification
            </span>
            <span
              className={`rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase ${
                session.confidence === "high"
                  ? "border-[#34D399]/40 bg-[#34D399]/10 text-[#34D399]"
                  : session.confidence === "medium"
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                    : "border-rose-400/40 bg-rose-400/10 text-rose-300"
              }`}
            >
              {session.confidence} confidence
            </span>
            {session.modelUsed && (
              <span className="hidden rounded-full border border-white/10 bg-[#121212] px-3 py-1 font-mono text-[11px] text-[#A1A1AA] sm:inline-flex">
                Vision: {session.modelUsed}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasSelectedFile && (
              <button
                type="button"
                disabled={scanning}
                onClick={onRescan}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#121212] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:border-[#34D399]/50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#34D399] ${scanning ? "animate-spin" : ""}`} />
                <span>Rescan</span>
              </button>
            )}
            <button
              type="button"
              onClick={onUploadNew}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/40 bg-[#A3FF12]/10 px-3.5 py-1.5 text-xs font-semibold text-[#A3FF12] transition hover:bg-[#A3FF12]/20"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Another Photo</span>
            </button>
          </div>
        </div>

        {/* Hero Visual + Monumental Dish Identification */}
        <div className="relative z-10 mt-8 grid items-center gap-8 lg:grid-cols-12">
          {/* Left Copy & Quick Stage Links */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_PREMIUM }}
            className="space-y-5 lg:col-span-6"
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#34D399]">
              Identified Meal
            </p>
            <h2 className="font-display text-3xl leading-[1.06] font-extrabold tracking-tight text-white sm:text-4xl lg:text-[2.85rem]">
              {session.foodName}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-[#B4BEB7] sm:text-base">
              {session.foodDescription}
            </p>

            {/* Quick Summary Metrics Row */}
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-[#121212] p-4">
              <div>
                <p className="text-[11px] text-[#A1A1AA]">Est. Serving</p>
                <p className="mt-1 font-mono text-lg font-extrabold text-white tabular-nums">
                  ~<AnimatedNumber value={totals.portion_grams} /> g
                </p>
                <p className="font-mono text-[10px] text-[#34D399]">
                  {session.portionConfidence} est. certainty
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#A1A1AA]">DB Calories</p>
                <p className="mt-1 font-mono text-lg font-extrabold text-[#A3FF12] tabular-nums">
                  ~<AnimatedNumber value={totals.calories} />
                </p>
                <p className="font-mono text-[10px] text-[#A1A1AA]">
                  kcal (ICMR/USDA)
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#A1A1AA]">Ingredients</p>
                <p className="mt-1 font-mono text-lg font-extrabold text-[#34D399] tabular-nums">
                  {ingredients.filter((i) => i.estimated_grams > 0).length}
                </p>
                <p className="font-mono text-[10px] text-amber-300">
                  {uncertainCount > 0 ? `${uncertainCount} to confirm` : "All confirmed"}
                </p>
              </div>
            </div>

            {/* Scroll Stage Anchors */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("scan-stage-2")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-5 py-2.5 text-xs font-bold text-[#050706] shadow-[0_0_24px_rgba(163,255,18,0.28)] transition hover:bg-[#b8ff42]"
              >
                <span>Inspect {ingredients.length} Ingredients</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("scan-stage-3")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#121212] px-4 py-2.5 text-xs font-semibold text-white transition hover:border-[#34D399]/60"
              >
                <span>Jump to Full Nutrition</span>
              </button>
            </div>
          </motion.div>

          {/* Right Prominent Food Image Centerpiece with Scroll Depth Parallax */}
          <motion.div
            style={
              prefersReduced
                ? undefined
                : { y: heroParallaxY, scale: heroScale }
            }
            className="relative lg:col-span-6"
          >
            <div className="relative overflow-hidden rounded-3xl border border-[#A3FF12]/25 bg-[#0A0A0A] p-2.5 shadow-[0_24px_70px_rgba(0,0,0,0.8)]">
              <div className="relative overflow-hidden rounded-2xl">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={session.foodName}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] w-full flex-col items-center justify-center bg-[#121212] p-6 text-center">
                    <Sparkles className="h-10 w-10 text-[#34D399]" />
                    <p className="mt-3 font-display text-lg font-bold text-white">
                      {session.foodName}
                    </p>
                    <p className="mt-1 text-xs text-[#A1A1AA]">
                      Saved analysis restored from session
                    </p>
                  </div>
                )}

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#050706]/85 via-transparent to-transparent"
                />

                {/* Reticle Framing Brackets */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-4">
                  <span className="absolute top-0 left-0 h-5 w-5 rounded-tl-lg border-t-2 border-l-2 border-[#A3FF12]" />
                  <span className="absolute top-0 right-0 h-5 w-5 rounded-tr-lg border-t-2 border-r-2 border-[#A3FF12]" />
                  <span className="absolute bottom-0 left-0 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 border-[#34D399]" />
                  <span className="absolute right-0 bottom-0 h-5 w-5 rounded-br-lg border-r-2 border-b-2 border-[#34D399]" />
                </div>

                {/* Floating HUD Pill inside Meal Photo */}
                <div className="glass-surface absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/15 px-4 py-2.5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#34D399]">
                      Estimated Serving Size
                    </p>
                    <p className="font-mono text-sm font-bold text-white">
                      {session.estimatedPortion.label}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#A1A1AA]">
                      Total Protein
                    </p>
                    <p className="font-mono text-sm font-bold text-[#A3FF12]">
                      <AnimatedNumber value={totals.protein} decimals={1} suffix=" g" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================================================================
          STAGE 2: INGREDIENT BREAKDOWN & UNCERTAINTY CONFIRMATION
         =================================================================== */}
      <motion.section
        id="scan-stage-2"
        initial={prefersReduced ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: EASE_PREMIUM }}
        className="space-y-6 rounded-[2rem] border border-white/10 bg-[#0A0A0A] p-6 sm:p-10"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#34D399]">
              <Database className="h-3 w-3" />
              Stage 02 • Ingredient Breakdown
            </span>
            <h2 className="mt-2.5 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Detected Ingredients &amp; Verified Sources
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[#A1A1AA]">
              Gemini Vision identifies ingredients and estimates weights; nutrients come strictly from ICMR–NIN IFCT 2017 and USDA FoodData Central.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {recalcStatus === "syncing" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#121212] px-3 py-1 text-xs text-[#A1A1AA]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A3FF12]" />
                Recalculating...
              </span>
            )}
            {recalcStatus === "synced" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-1 text-xs font-semibold text-[#34D399]">
                <Check className="h-3.5 w-3.5" />
                DB Synced
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setActiveMultiplier(1);
                onResetPortions();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#121212] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:border-[#A3FF12]/60"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#A3FF12]" />
              <span>Reset Quantities</span>
            </button>
          </div>
        </div>

        {/* Highlight Banner when uncertain or unmatched ingredients exist */}
        {(uncertainCount > 0 || unmatchedCount > 0) && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-400/35 bg-amber-400/[0.08] p-4 text-xs text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div>
              <p className="font-semibold text-white">
                {uncertainCount} ingredient(s) need visual confirmation
              </p>
              <p className="mt-0.5 leading-relaxed text-amber-100/80">
                Hidden cooking oil, ghee, sauces, or unmatched items cannot be measured accurately from a photo alone. Confirm quantities below, exclude unused items, or search a verified match in ICMR–NIN / USDA.
              </p>
            </div>
          </div>
        )}

        {/* Ingredient Visual Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ingredients.map((ing, idx) => {
            const { Icon, accent, bg } = getIngredientVisualCategory(ing);
            const isExcluded = ing.estimated_grams <= 0;
            const isUncertain =
              (ing.needs_confirmation || ing.source_type === "unmatched") &&
              !ing.confirmed_by_user &&
              !isExcluded;
            const initialG =
              session.initialIngredientGrams[ing.id] ?? ing.estimated_grams;
            const sliderMax = Math.max(250, Math.ceil((Math.max(initialG, 20) * 2.5) / 10) * 10);
            const fillPct = Math.min(100, Math.round((ing.estimated_grams / sliderMax) * 100));

            return (
              <motion.article
                key={ing.id}
                initial={prefersReduced ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{
                  duration: 0.35,
                  delay: prefersReduced ? 0 : Math.min(idx * 0.04, 0.25),
                  ease: EASE_PREMIUM,
                }}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-colors ${
                  isExcluded
                    ? "border-white/[0.05] bg-[#121212]/40 opacity-55"
                    : isUncertain
                      ? "border-amber-400/45 bg-[#121212]"
                      : "border-white/[0.08] bg-[#121212] hover:border-[#34D399]/40"
                }`}
              >
                <div>
                  {/* Card Top: Icon + Name + Status */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${bg} ${accent}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-bold text-white">
                          {ing.name}
                        </h3>
                        <p className="mt-0.5 truncate text-[11px] text-[#A1A1AA]">
                          {ing.canonical_match
                            ? `DB: ${ing.canonical_match}`
                            : "Unmatched in nutrition tables"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${
                        ing.source_type === "icmr_nin"
                          ? "border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]"
                          : ing.source_type === "usda_fdc"
                            ? "border-[#A3FF12]/35 bg-[#A3FF12]/10 text-[#A3FF12]"
                            : "border-amber-400/40 bg-amber-400/10 text-amber-300"
                      }`}
                    >
                      {ing.source_type === "icmr_nin"
                        ? "ICMR–NIN"
                        : ing.source_type === "usda_fdc"
                          ? "USDA"
                          : "Unverified"}
                    </span>
                  </div>

                  {/* Certainty Badge or Reason */}
                  {isUncertain && (
                    <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-3 py-2 text-[11px] leading-snug text-amber-200">
                      {ing.uncertainty_reason ||
                        "Uncertain quantity from 2D image — please confirm."}
                    </div>
                  )}

                  {ing.confirmed_by_user && !isExcluded && (
                    <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#34D399]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirmed by you
                    </p>
                  )}

                  {/* Interactive Portion Control Slider */}
                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A1A1AA]">Est. Quantity</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={2000}
                          step={5}
                          aria-label={`${ing.name} grams`}
                          value={Math.round(ing.estimated_grams)}
                          onChange={(e) =>
                            onChangeIngredientGrams(
                              ing.id,
                              Number.parseFloat(e.target.value || "0"),
                            )
                          }
                          className="w-16 rounded-lg border border-white/10 bg-[#050706] px-2 py-1 text-right font-mono text-xs font-bold text-[#A3FF12] focus:border-[#A3FF12]/60 focus:outline-none"
                        />
                        <span className="font-mono text-[11px] text-[#A1A1AA]">
                          {ing.unit}
                        </span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={sliderMax}
                      step={5}
                      aria-label={`${ing.name} quantity slider`}
                      value={Math.min(ing.estimated_grams, sliderMax)}
                      onChange={(e) =>
                        onChangeIngredientGrams(ing.id, Number(e.target.value))
                      }
                      className="nutri-slider w-full"
                      style={{
                        background: `linear-gradient(to right, #A3FF12 0%, #34D399 ${fillPct}%, rgba(255,255,255,0.12) ${fillPct}%, rgba(255,255,255,0.12) 100%)`,
                      }}
                    />
                  </div>
                </div>

                {/* Card Bottom: DB Calories/Macros + Confirm/Lookup Actions */}
                <div className="mt-4 space-y-2.5 border-t border-white/[0.06] pt-3">
                  <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                    <span className="font-bold text-white">
                      {Math.round(ing.calories)} kcal
                    </span>
                    <span className="text-[#34D399]">P {ing.protein.toFixed(1)}g</span>
                    <span className="text-emerald-300">C {ing.carbohydrates.toFixed(1)}g</span>
                    <span className="text-lime-200">F {ing.fats.toFixed(1)}g</span>
                  </div>

                  {/* Confirmation / Re-lookup Controls */}
                  {(isUncertain || ing.source_type === "unmatched") && (
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => onConfirmIngredient(ing.id)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#34D399]/15 px-2.5 py-1.5 text-[11px] font-semibold text-[#34D399] transition hover:bg-[#34D399]/25"
                        >
                          <Check className="h-3 w-3" />
                          <span>Confirm Qty</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveIngredient(ing.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#050706] px-2.5 py-1.5 text-[11px] text-zinc-400 transition hover:border-rose-400/50 hover:text-rose-300"
                          title="Exclude ingredient (set 0g)"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Exclude</span>
                        </button>
                      </div>

                      {/* Manual Database Lookup Input */}
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={lookupDrafts[ing.id] ?? ing.name}
                          onChange={(e) =>
                            setLookupDrafts((prev) => ({
                              ...prev,
                              [ing.id]: e.target.value,
                            }))
                          }
                          placeholder="Search ICMR/USDA food..."
                          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#050706] px-2.5 py-1 text-[11px] text-white placeholder-zinc-500 focus:border-[#A3FF12]/60 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={lookupBusyId === ing.id}
                          onClick={() => void handleDbLookup(ing)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-2.5 py-1 text-[11px] font-semibold text-[#A3FF12] transition hover:bg-[#A3FF12]/20 disabled:opacity-50"
                        >
                          {lookupBusyId === ing.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Search className="h-3 w-3" />
                          )}
                          <span>Match DB</span>
                        </button>
                      </div>
                      {lookupFeedback[ing.id] && (
                        <p className="text-[10px] text-[#34D399]">
                          {lookupFeedback[ing.id]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </motion.section>

      {/* ===================================================================
          STAGE 3: DATABASE-DERIVED NUTRITION ANALYSIS & SAVE MEAL
         =================================================================== */}
      <motion.section
        id="scan-stage-3"
        initial={prefersReduced ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: EASE_PREMIUM }}
        className="space-y-8 rounded-[2rem] border border-white/10 bg-[#121212] p-6 sm:p-10"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#A3FF12]">
              <Flame className="h-3 w-3" />
              Stage 03 • Nutrition &amp; Portion Control
            </span>
            <h2 className="mt-2.5 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Complete Nutrient Profile
            </h2>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              Calculated by multiplying each verified ingredient weight against ICMR–NIN &amp; USDA per-100g composition tables.
            </p>
          </div>

          {/* Serving Size Multiplier Bar */}
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#A1A1AA]">
              Adjust Overall Serving Size ({Math.round(initialTotalGrams)}g base)
            </p>
            <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-[#050706] p-1.5">
              {[0.5, 0.75, 1, 1.5, 2].map((mult) => {
                const isSelected = Math.abs(activeMultiplier - mult) < 0.01;
                return (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => {
                      setActiveMultiplier(mult);
                      onApplyServingMultiplier(mult);
                    }}
                    className={`rounded-xl px-3 py-1 font-mono text-xs font-bold transition ${
                      isSelected
                        ? "bg-[#A3FF12] text-[#050706]"
                        : "text-[#A1A1AA] hover:text-white"
                    }`}
                  >
                    {mult}×
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visual Nutrition Ring + Primary KPI Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Ring + Energy Split + User Daily Target Progress */}
          <div className="space-y-5 lg:col-span-5">
            <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-[#050706] p-5">
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="9"
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="url(#scanCalRing)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={calRingCirc}
                    initial={prefersReduced ? false : { strokeDashoffset: calRingCirc }}
                    animate={{ strokeDashoffset: calRingOffset }}
                    transition={{ duration: 0.75, ease: EASE_PREMIUM }}
                  />
                  <defs>
                    <linearGradient id="scanCalRing" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#34D399" />
                      <stop offset="1" stopColor="#A3FF12" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute text-center">
                  <span className="block font-mono text-xl font-extrabold text-[#A3FF12] tabular-nums">
                    <AnimatedNumber value={totals.calories} />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                    kcal
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2.5">
                <div>
                  <p className="font-mono text-xs font-semibold text-[#34D399]">
                    {calGoalPct}% of Daily Goal
                  </p>
                  <p className="mt-0.5 text-xs text-[#A1A1AA]">
                    Serving:{" "}
                    <strong className="font-mono text-white">
                      ~<AnimatedNumber value={totals.portion_grams} /> g
                    </strong>
                  </p>
                </div>

                {/* Macro Energy Split Bar */}
                <div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div style={{ width: `${proPct}%` }} className="bg-[#34D399]" />
                    <div style={{ width: `${carbPct}%` }} className="bg-emerald-300" />
                    <div style={{ width: `${fatPct}%` }} className="bg-[#A3FF12]" />
                  </div>
                  <div className="mt-1.5 flex justify-between font-mono text-[10px]">
                    <span className="text-[#34D399]">P {proPct}%</span>
                    <span className="text-emerald-300">C {carbPct}%</span>
                    <span className="text-[#A3FF12]">F {fatPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#050706] p-5">
              <p className="mb-3 font-display text-sm font-bold text-white">
                Impact on Daily Targets
              </p>
              <MacroProgressBars
                calories={totals.calories}
                protein={totals.protein}
                carbs={totals.carbs}
                fats={totals.fats}
                targets={dailyTargets}
              />
            </div>
          </div>

          {/* Right Detailed Macronutrients + Fibre + Sugar + Sodium + Vitamins/Minerals */}
          <div className="space-y-5 lg:col-span-7">
            {/* Primary 4 Macros + Dietary Fibre */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-[#34D399]/30 bg-[#050706] p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Protein
                </span>
                <p className="mt-2 font-mono text-2xl font-extrabold text-[#34D399] tabular-nums">
                  <AnimatedNumber value={totals.protein} decimals={1} suffix="g" />
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#050706] p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Carbs
                </span>
                <p className="mt-2 font-mono text-2xl font-extrabold text-emerald-300 tabular-nums">
                  <AnimatedNumber value={totals.carbs} decimals={1} suffix="g" />
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#050706] p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Total Fat
                </span>
                <p className="mt-2 font-mono text-2xl font-extrabold text-[#A3FF12] tabular-nums">
                  <AnimatedNumber value={totals.fats} decimals={1} suffix="g" />
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#050706] p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Dietary Fibre
                </span>
                <p className="mt-2 font-mono text-2xl font-extrabold text-white tabular-nums">
                  <AnimatedNumber value={session.fibre} decimals={1} suffix="g" />
                </p>
              </div>
            </div>

            {/* Sugar, Sodium, Available Micronutrients */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#050706] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Total Sugar</span>
                  <span className="font-mono text-sm font-bold text-amber-200 tabular-nums">
                    <AnimatedNumber value={session.sugar} decimals={1} suffix=" g" />
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    style={{ width: `${Math.min(100, Math.round((session.sugar / 50) * 100))}%` }}
                    className="h-full rounded-full bg-amber-300"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-[#A1A1AA]">
                  Natural + added sugars relative to 50g daily guideline
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#050706] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Sodium</span>
                  <span className="font-mono text-sm font-bold text-[#34D399] tabular-nums">
                    <AnimatedNumber value={session.sodiumMg} decimals={0} suffix=" mg" />
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    style={{ width: `${Math.min(100, Math.round((session.sodiumMg / 2300) * 100))}%` }}
                    className="h-full rounded-full bg-[#34D399]"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-[#A1A1AA]">
                  ~{Math.round((session.sodiumMg / 2300) * 100)}% of 2,300mg daily adult reference
                </p>
              </div>
            </div>

            {/* Vitamins & Minerals Grid (when available in DB) */}
            {session.otherNutrients.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#050706] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#34D399]">
                    Vitamins &amp; Minerals (Database Verified)
                  </span>
                  <Scale className="h-3.5 w-3.5 text-[#34D399]" />
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {session.otherNutrients.map((nut) => (
                    <div
                      key={nut.name}
                      className="rounded-xl border border-white/[0.06] bg-[#121212] p-3"
                    >
                      <p className="text-[11px] text-[#A1A1AA]">{nut.name}</p>
                      <p className="mt-1 font-mono text-sm font-bold text-white tabular-nums">
                        <AnimatedNumber
                          value={nut.amount}
                          decimals={nut.amount < 15 ? 1 : 0}
                          suffix={` ${nut.unit}`}
                        />
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Database Sources & Limitations Disclosure */}
            <div className="rounded-2xl border border-[#34D399]/20 bg-[#050706] p-4 text-xs">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" />
                <div className="space-y-1.5">
                  <p className="font-semibold text-white">
                    Data Sources &amp; Estimation Limitations
                  </p>
                  <p className="text-[11px] text-[#34D399]">
                    Sources: {session.dataSources.join(" • ")}
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-[#A1A1AA]">
                    {session.analysisLimitations.map((lim) => (
                      <li key={lim}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Meal to PostgreSQL Dashboard */}
        <div className="rounded-2xl border border-white/10 bg-[#050706] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Log Verified Meal to Your Dashboard
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Saves adjusted ingredient weights and macros directly to PostgreSQL.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("alternatives")}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-3.5 py-1.5 text-xs font-semibold text-[#34D399] transition hover:bg-[#34D399]/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>View {session.alternatives.length} Healthier Swaps</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor="story-meal-name" className="mb-1 block text-xs text-[#A1A1AA]">
                Meal Name
              </label>
              <input
                id="story-meal-name"
                type="text"
                value={mealName}
                onChange={(e) => onMealNameChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#121212] px-3.5 py-2.5 text-sm text-white focus:border-[#A3FF12]/60 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="story-meal-type" className="mb-1 block text-xs text-[#A1A1AA]">
                Meal Type
              </label>
              <select
                id="story-meal-type"
                value={mealType}
                onChange={(e) => onMealTypeChange(e.target.value as MealType)}
                className="w-full rounded-xl border border-white/10 bg-[#121212] px-3.5 py-2.5 text-sm text-white focus:border-[#A3FF12]/60 focus:outline-none"
              >
                {MEAL_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                disabled={logging || totals.portion_grams <= 0}
                onClick={onLogMeal}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#34D399] px-4 py-2.5 text-sm font-bold text-[#050706] transition hover:bg-[#4adeb0] disabled:opacity-50"
              >
                {logging ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Meal</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-3">
            <input
              type="text"
              value={mealNotes}
              onChange={(e) => onMealNotesChange(e.target.value)}
              placeholder="Optional meal notes (e.g. confirmed oil amount, home cooked)..."
              className="w-full rounded-xl border border-white/10 bg-[#121212] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-[#A3FF12]/60 focus:outline-none"
            />
          </div>

          {logError && (
            <p className="mt-3 text-xs text-rose-300">{logError}</p>
          )}
          {logSuccess && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 p-3 text-xs text-[#34D399]">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Check className="h-4 w-4" />
                Saved to PostgreSQL Dashboard!
              </span>
              <button
                type="button"
                onClick={() => onNavigate("dashboard")}
                className="font-bold text-[#A3FF12] hover:underline"
              >
                Open Dashboard →
              </button>
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
