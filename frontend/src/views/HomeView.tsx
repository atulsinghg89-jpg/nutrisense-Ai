import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Baby,
  Camera,
  CheckCircle2,
  Flame,
  HeartHandshake,
  HeartPulse,
  LayoutDashboard,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  User,
  Utensils,
} from "lucide-react";
import { MacroProgressBars } from "../components/MacroProgressBars";
import {
  AnimatedNumber,
  EASE_PREMIUM,
  RevealSection,
  staggerContainerVariants,
  staggerItemVariants,
} from "../components/MotionPrimitives";
import type {
  AppView,
  DailyMacroTargets,
  DashboardSummary,
  ScanSession,
} from "../types/nutrition";

interface HomeViewProps {
  onNavigate: (view: AppView) => void;
  hasActiveScan: boolean;
  scanSession: ScanSession | null;
  dailyTargets: DailyMacroTargets;
  todaySummary: DashboardSummary;
  todaySummaryLoading: boolean;
  apiOnline: boolean | null;
}

const WORKFLOW_STEPS = [
  {
    step: "01",
    tag: "SCAN",
    title: "Upload or capture your food image.",
    description:
      "Drag and drop any plate photo, snap from mobile camera, or use live webcam capture right inside your browser.",
    icon: Camera,
    accent: "lime" as const,
    view: "scanner" as AppView,
  },
  {
    step: "02",
    tag: "ANALYZE",
    title: "AI identifies food items and estimates nutrition.",
    description:
      "Gemini Vision separates multi-item dishes into individual foods with baseline gram portions, calories, protein, carbs, and fats.",
    icon: Sparkles,
    accent: "mint" as const,
    view: "scanner" as AppView,
  },
  {
    step: "03",
    tag: "IMPROVE",
    title: "Adjust portions, discover healthier alternatives and log meals.",
    description:
      "Fine-tune gram sliders with live recalculation, review 3 practical food swaps, and persist meals to your dashboard.",
    icon: SlidersHorizontal,
    accent: "lime" as const,
    view: "alternatives" as AppView,
  },
];

const BENEFITS = [
  {
    icon: Scale,
    title: "Gram-Accurate Portion Control",
    detail:
      "Adjust every detected food item in grams and see Calorie, Protein, Carbs, and Fat totals recalculate cleanly against your daily targets.",
  },
  {
    icon: TrendingDown,
    title: "Practical Food Swaps",
    detail:
      "Each scan returns 3 actionable healthier alternatives with calorie comparisons and plain-language nutritional reasoning.",
  },
  {
    icon: ShieldCheck,
    title: "Real PostgreSQL Tracking",
    detail:
      "Every logged meal persists in PostgreSQL with full meal-type and date filtering plus custom browser-saved daily macro goals.",
  },
  {
    icon: HeartPulse,
    title: "Life-Stage Nutrition Guides",
    detail:
      "Explore structured educational profiles across Men's Health, Women's Health, Baby Nutrition, and Patient Nutrition.",
  },
];

export function HomeView({
  onNavigate,
  hasActiveScan,
  scanSession,
  dailyTargets,
  todaySummary,
  todaySummaryLoading,
  apiOnline,
}: HomeViewProps) {
  const prefersReduced = useReducedMotion();

  const caloriePct = Math.min(
    100,
    Math.round(
      (todaySummary.total_calories / Math.max(dailyTargets.calories, 1)) * 100,
    ),
  );

  // Use real latest scan items when present, otherwise show daily target breakdown
  const hasScannedItems = Boolean(scanSession && scanSession.items.length > 0);

  return (
    <div className="space-y-20 pb-8">
      {/* 1. FITTR-Inspired High-Impact Editorial Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#121212] bg-grid-subtle px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        {/* Subtle floating ambient lighting */}
        <motion.div
          aria-hidden="true"
          animate={
            prefersReduced
              ? undefined
              : { y: [0, -14, 0], opacity: [0.14, 0.22, 0.14] }
          }
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -top-28 -right-20 h-96 w-96 rounded-full bg-[#A3FF12] blur-[130px]"
        />
        <motion.div
          aria-hidden="true"
          animate={
            prefersReduced
              ? undefined
              : { y: [0, 14, 0], opacity: [0.12, 0.2, 0.12] }
          }
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#34D399] blur-[120px]"
        />

        <div className="relative grid items-center gap-12 lg:grid-cols-12">
          {/* Left Typography & CTAs */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE_PREMIUM }}
            className="space-y-7 lg:col-span-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#34D399]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI-Powered Precision Nutrition Platform</span>
            </div>

            <h1 className="font-display text-4xl leading-[1.07] font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.35rem]">
              Understand Your Food.{" "}
              <span className="bg-gradient-to-r from-[#A3FF12] via-[#86efac] to-[#34D399] bg-clip-text text-transparent">
                Improve Your Everyday Health.
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[#A1A1AA] sm:text-lg">
              Turn any meal photo into a complete macro breakdown in seconds.
              Scan multi-item plates with Gemini AI, fine-tune gram portions
              with live sliders, discover 3 healthier swaps, and track your
              daily nutrition goals.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <motion.button
                type="button"
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate("scanner")}
                className="inline-flex items-center gap-2.5 rounded-full bg-[#A3FF12] px-6 py-3.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_30px_rgba(163,255,18,0.28)] transition hover:bg-[#b5ff3b] focus:ring-2 focus:ring-[#A3FF12] focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:outline-none"
              >
                <Camera className="h-4 w-4" />
                <span>Launch AI Food Scanner</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate("dashboard")}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08]"
              >
                <LayoutDashboard className="h-4 w-4 text-[#34D399]" />
                <span>Explore Your Nutrition</span>
              </motion.button>

              {hasActiveScan && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate("alternatives")}
                  className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-4 py-3 text-sm font-medium text-[#34D399] transition hover:bg-[#34D399]/20"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Latest 3 Swaps</span>
                </motion.button>
              )}
            </div>

            {/* Real Capabilities Strip */}
            <div className="grid grid-cols-3 gap-3 border-t border-white/[0.08] pt-6">
              <div>
                <p className="font-mono text-lg font-bold text-white sm:text-xl">
                  4 Macros
                </p>
                <p className="mt-0.5 text-xs text-[#A1A1AA]">
                  Kcal, Protein, Carbs &amp; Fat
                </p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-[#A3FF12] sm:text-xl">
                  3 Swaps
                </p>
                <p className="mt-0.5 text-xs text-[#A1A1AA]">
                  Tailored per AI meal scan
                </p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-[#34D399] sm:text-xl">
                  Live Grams
                </p>
                <p className="mt-0.5 text-xs text-[#A1A1AA]">
                  Instant portion sliders
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Visual Storytelling Frame with Real Food Photo & Floating Cards */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE_PREMIUM }}
            className="relative lg:col-span-6"
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0A0A0A] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
              {/* Hero Food Photography */}
              <div className="group relative overflow-hidden rounded-2xl">
                <img
                  src="/images/hero-bowl.jpg"
                  alt="Balanced grilled salmon, quinoa, avocado, broccolini, and sweet potato nutrition bowl"
                  className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/20 to-transparent"
                />

                {/* Subtle AI Vision Reticle Corners */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-4"
                >
                  <span className="absolute top-0 left-0 h-5 w-5 rounded-tl-lg border-t-2 border-l-2 border-[#A3FF12]/80" />
                  <span className="absolute top-0 right-0 h-5 w-5 rounded-tr-lg border-t-2 border-r-2 border-[#A3FF12]/80" />
                  <span className="absolute bottom-0 left-0 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 border-[#34D399]/80" />
                  <span className="absolute right-0 bottom-0 h-5 w-5 rounded-br-lg border-r-2 border-b-2 border-[#34D399]/80" />
                </div>

                {/* Floating Top-Left Live Status Pill */}
                <motion.div
                  animate={prefersReduced ? undefined : { y: [0, -4, 0] }}
                  transition={{
                    duration: 4.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="glass-surface absolute top-5 left-5 flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      apiOnline === true
                        ? "bg-[#34D399]"
                        : apiOnline === false
                          ? "bg-amber-400"
                          : "bg-zinc-400"
                    }`}
                  />
                  <span>
                    {hasScannedItems
                      ? `Latest Scan: ${scanSession!.items.length} items`
                      : "Gemini Vision Scanner Ready"}
                  </span>
                </motion.div>

                {/* Floating Top-Right Target Card */}
                <motion.div
                  animate={prefersReduced ? undefined : { y: [0, 5, 0] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="glass-surface absolute top-5 right-5 rounded-2xl border border-[#A3FF12]/30 px-3.5 py-2 text-right shadow-lg"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                    {hasScannedItems ? "Scanned Meal" : "Today Logged"}
                  </p>
                  <p className="font-mono text-base font-bold text-[#A3FF12] tabular-nums">
                    <AnimatedNumber
                      value={
                        hasScannedItems
                          ? scanSession!.totals.calories
                          : todaySummary.total_calories
                      }
                    />{" "}
                    <span className="text-xs font-normal text-zinc-300">
                      kcal
                    </span>
                  </p>
                </motion.div>

                {/* Bottom Overlay Macro Strip (real state!) */}
                <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/10 bg-[#0A0A0A]/85 p-3.5 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-2 pb-2.5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#34D399]">
                        {hasScannedItems
                          ? "Your Latest Scanned Plate"
                          : "Your Daily Nutrition Status"}
                      </p>
                      <p className="text-xs text-[#A1A1AA]">
                        {hasScannedItems
                          ? scanSession!.items
                              .slice(0, 3)
                              .map((i) => i.name)
                              .join(" • ")
                          : todaySummaryLoading
                            ? "Syncing today's logged meals..."
                            : `${todaySummary.total_meals} ${
                                todaySummary.total_meals === 1 ? "meal" : "meals"
                              } logged today against ${dailyTargets.calories.toLocaleString()} kcal goal`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(hasScannedItems ? "scanner" : "dashboard")
                      }
                      className="shrink-0 rounded-full border border-[#A3FF12]/40 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12] transition hover:bg-[#A3FF12]/20"
                    >
                      {hasScannedItems ? "Adjust →" : "Open →"}
                    </button>
                  </div>

                  {/* Animated Macro Bars reflecting actual state */}
                  <div className="grid grid-cols-3 gap-2.5 border-t border-white/[0.08] pt-2.5">
                    {[
                      {
                        label: "Protein",
                        value: hasScannedItems
                          ? scanSession!.totals.protein
                          : todaySummary.total_protein,
                        target: dailyTargets.protein,
                        color: "bg-[#34D399]",
                      },
                      {
                        label: "Carbs",
                        value: hasScannedItems
                          ? scanSession!.totals.carbs
                          : todaySummary.total_carbs,
                        target: dailyTargets.carbs,
                        color: "bg-emerald-300",
                      },
                      {
                        label: "Fats",
                        value: hasScannedItems
                          ? scanSession!.totals.fats
                          : todaySummary.total_fats,
                        target: dailyTargets.fats,
                        color: "bg-[#A3FF12]",
                      },
                    ].map((macro) => {
                      const pct = Math.min(
                        100,
                        Math.round(
                          (macro.value / Math.max(macro.target, 1)) * 100,
                        ),
                      );
                      return (
                        <div key={macro.label} className="space-y-1">
                          <div className="flex items-baseline justify-between text-[11px]">
                            <span className="text-[#A1A1AA]">{macro.label}</span>
                            <span className="font-mono font-semibold text-white tabular-nums">
                              {macro.value.toFixed(0)}g
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                            <motion.div
                              initial={prefersReduced ? false : { width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{
                                duration: 0.7,
                                ease: EASE_PREMIUM,
                              }}
                              className={`h-full rounded-full ${macro.color}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Live Nutrition Preview (Actual Application State & PostgreSQL Data) */}
      <RevealSection>
        <section className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#34D399]">
                <Activity className="h-3.5 w-3.5" />
                Live Nutrition Preview
              </span>
              <h2 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
                Today&apos;s Intake &amp; Macro Progress
              </h2>
              <p className="mt-1 text-sm text-[#A1A1AA]">
                Synced directly from your PostgreSQL meal logs and saved daily
                targets.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate("dashboard")}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#171717] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/30"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-[#34D399]" />
                <span>Manage Goals &amp; Logs</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("scanner")}
                className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#0A0A0A] transition hover:bg-[#b5ff3b]"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Log a Meal</span>
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-12">
            {/* 4 Real KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:col-span-7">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-4 sm:p-5">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Calories</span>
                  <Flame className="h-4 w-4 text-[#A3FF12]" />
                </div>
                <p className="mt-3 font-mono text-2xl font-bold text-[#A3FF12] tabular-nums">
                  <AnimatedNumber value={todaySummary.total_calories} />
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  Goal: {dailyTargets.calories.toLocaleString()} kcal
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-4 sm:p-5">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Protein</span>
                  <span className="font-mono text-[11px] font-semibold text-[#34D399]">
                    PRO
                  </span>
                </div>
                <p className="mt-3 font-mono text-2xl font-bold text-[#34D399] tabular-nums">
                  <AnimatedNumber
                    value={todaySummary.total_protein}
                    decimals={1}
                    suffix="g"
                  />
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  Goal: {dailyTargets.protein}g
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-4 sm:p-5">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Carbs</span>
                  <span className="font-mono text-[11px] font-semibold text-emerald-300">
                    CARB
                  </span>
                </div>
                <p className="mt-3 font-mono text-2xl font-bold text-emerald-300 tabular-nums">
                  <AnimatedNumber
                    value={todaySummary.total_carbs}
                    decimals={1}
                    suffix="g"
                  />
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  Goal: {dailyTargets.carbs}g
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-4 sm:p-5">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Fats</span>
                  <span className="font-mono text-[11px] font-semibold text-lime-200">
                    FAT
                  </span>
                </div>
                <p className="mt-3 font-mono text-2xl font-bold text-lime-200 tabular-nums">
                  <AnimatedNumber
                    value={todaySummary.total_fats}
                    decimals={1}
                    suffix="g"
                  />
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  Goal: {dailyTargets.fats}g
                </p>
              </div>

              {/* Meals Logged Summary Strip */}
              <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#171717] px-5 py-4 sm:col-span-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]">
                    <Utensils className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-[#A1A1AA]">Today&apos;s Activity</p>
                    <p className="font-display text-sm font-bold text-white">
                      {todaySummaryLoading
                        ? "Checking logged meals..."
                        : todaySummary.total_meals === 0
                          ? "No meals logged yet today"
                          : `${todaySummary.total_meals} ${
                              todaySummary.total_meals === 1 ? "meal" : "meals"
                            } logged (${Math.round(todaySummary.total_portion_grams)}g total)`}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-[#0A0A0A] px-3 py-1 font-mono text-xs font-semibold text-[#A3FF12]">
                  {caloriePct}% of daily goal
                </span>
              </div>
            </div>

            {/* Real Progress Bars */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-5 sm:p-6 lg:col-span-5">
              <MacroProgressBars
                calories={todaySummary.total_calories}
                protein={todaySummary.total_protein}
                carbs={todaySummary.total_carbs}
                fats={todaySummary.total_fats}
                targets={dailyTargets}
                subtitle={
                  todaySummary.total_meals === 0
                    ? "Scan and save a meal to watch your live daily macro bars fill up."
                    : `Measured from ${todaySummary.total_items} logged food items today.`
                }
              />
            </div>
          </div>
        </section>
      </RevealSection>

      {/* 3. How It Works (01 — SCAN, 02 — ANALYZE, 03 — IMPROVE) */}
      <RevealSection>
        <section className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#34D399]">
                Three-Step Workflow
              </p>
              <h2 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-white">
                How NutriSense AI Works
              </h2>
            </div>
            <p className="max-w-md text-sm text-[#A1A1AA]">
              Built for fast everyday nutrition decisions without tedious manual
              spreadsheet entry.
            </p>
          </div>

          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="relative grid gap-6 md:grid-cols-3"
          >
            {/* Subtle Connecting Line across steps on desktop */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-14 right-16 left-16 hidden h-px bg-gradient-to-r from-[#A3FF12]/40 via-[#34D399]/50 to-[#A3FF12]/40 md:block"
            />

            {WORKFLOW_STEPS.map((item) => {
              const Icon = item.icon;
              const isLime = item.accent === "lime";
              return (
                <motion.button
                  key={item.step}
                  type="button"
                  variants={staggerItemVariants}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onNavigate(item.view)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121212] p-6 text-left transition-colors hover:border-white/20 hover:bg-[#171717]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div
                        className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-105 ${
                          isLime
                            ? "border-[#A3FF12]/35 bg-[#A3FF12]/10 text-[#A3FF12]"
                            : "border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${
                          isLime
                            ? "border-[#A3FF12]/30 bg-[#A3FF12]/10 text-[#A3FF12]"
                            : "border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]"
                        }`}
                      >
                        {item.step} — {item.tag}
                      </span>
                    </div>

                    <h3 className="mt-6 font-display text-lg font-bold text-white group-hover:text-[#A3FF12] transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[#A1A1AA]">
                      {item.description}
                    </p>
                  </div>

                  <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 group-hover:text-[#A3FF12]">
                    <span>Open {item.tag === "IMPROVE" ? "Swaps" : "Scanner"}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </section>
      </RevealSection>

      {/* 4. AI Food Analysis & Healthier Alternatives Visual Showcase */}
      <RevealSection>
        <section className="grid items-center gap-8 rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A0A0A]">
              <img
                src="/images/healthy-swaps.jpg"
                alt="Oven-baked root vegetable chips and herb air-popped popcorn healthier alternatives"
                className="aspect-[16/11] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/90 via-transparent to-transparent"
              />
              <div className="absolute right-4 bottom-4 left-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0A0A0A]/85 px-4 py-3 backdrop-blur-md">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#34D399]">
                    Smart Swaps Engine
                  </p>
                  <p className="text-xs text-white">
                    3 Practical Alternatives Generated Automatically Per Scan
                  </p>
                </div>
                <span className="rounded-full bg-[#34D399]/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#34D399]">
                  3 Options
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <Sparkles className="h-3.5 w-3.5" />
              AI Vision + Smarter Swaps
            </span>

            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Discover Healthier Choices Without Giving Up Flavor
            </h2>

            <p className="text-sm leading-relaxed text-[#A1A1AA] sm:text-base">
              Every time Gemini Vision analyzes your meal, NutriSense AI also
              crafts 3 practical, nutrient-dense food alternatives tailored to
              what is on your plate—complete with equivalent serving macros and
              clear nutritional reasoning.
            </p>

            <ul className="space-y-3 text-sm text-zinc-300">
              {[
                "Multi-item ingredient detection with per-100g macro normalization",
                "Real-time portion sliders synced with FastAPI macro recalculation",
                "Side-by-side original vs. healthier swap calorie comparisons",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate("alternatives")}
                className="inline-flex items-center gap-2 rounded-full bg-[#34D399] px-5 py-2.5 text-sm font-bold text-[#0A0A0A] transition hover:bg-[#4adeb0]"
              >
                <span>Explore Food Alternatives</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("scanner")}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#171717] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/30"
              >
                <span>Scan Your Plate</span>
              </button>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* 5. Nutrition Benefits + Life-Stage Categories Preview */}
      <RevealSection>
        <section className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#34D399]">
                Built for Real-World Habits
              </p>
              <h2 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-white">
                Why NutriSense AI
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("categories")}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#A3FF12] hover:underline"
            >
              <span>Browse Nutrition Guides</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5 transition hover:border-white/20"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#34D399]/25 bg-[#34D399]/10 text-[#34D399]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-white">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#A1A1AA]">
                    {benefit.detail}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 4 Educational Category Quick Pills */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Men's Health",
                desc: "Lean protein & metabolic balance",
                icon: User,
              },
              {
                title: "Women's Health",
                desc: "Iron, folate & steady daily energy",
                icon: Sparkles,
              },
              {
                title: "Baby Nutrition",
                desc: "6–24 month safe feeding guides",
                icon: Baby,
              },
              {
                title: "Patient Nutrition",
                desc: "Gentle recovery & glycemic care",
                icon: HeartHandshake,
              },
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.title}
                  type="button"
                  onClick={() => onNavigate("categories")}
                  className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-[#171717]/70 px-4 py-3.5 text-left transition hover:border-[#34D399]/40 hover:bg-[#171717]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#A3FF12] transition group-hover:scale-105">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-white group-hover:text-[#34D399]">
                      {cat.title}
                    </p>
                    <p className="truncate text-xs text-[#A1A1AA]">{cat.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </RevealSection>

      {/* 6. Strong Final CTA Banner */}
      <RevealSection>
        <section className="relative overflow-hidden rounded-3xl border border-[#A3FF12]/25 bg-gradient-to-br from-[#171717] via-[#121212] to-[#0A0A0A] px-6 py-10 text-center sm:px-12 sm:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-1/2 h-44 w-96 -translate-x-1/2 rounded-full bg-[#A3FF12]/10 blur-[90px]"
          />
          <div className="relative mx-auto max-w-2xl space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <Sparkles className="h-3.5 w-3.5" />
              Ready in Seconds
            </span>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Make Every Meal Measurable and Intentional.
            </h2>
            <p className="text-sm leading-relaxed text-[#A1A1AA] sm:text-base">
              Start with a quick photo scan in the AI Food Scanner or inspect
              your logged macro history inside the Nutrition Dashboard.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate("scanner")}
                className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-6 py-3.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_28px_rgba(163,255,18,0.28)] transition hover:bg-[#b5ff3b]"
              >
                <Camera className="h-4 w-4" />
                <span>Launch AI Food Scanner</span>
              </motion.button>
              <button
                type="button"
                onClick={() => onNavigate("dashboard")}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08]"
              >
                <LayoutDashboard className="h-4 w-4 text-[#34D399]" />
                <span>Explore Your Nutrition</span>
              </button>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* 7. Professional Footer */}
      <footer className="border-t border-white/[0.08] pt-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="font-display text-lg font-extrabold text-white">
                NutriSense{" "}
                <span className="bg-gradient-to-r from-[#A3FF12] to-[#34D399] bg-clip-text text-transparent">
                  AI
                </span>
              </span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-[#A1A1AA]">
              AI-powered meal vision analysis, interactive gram portion control,
              tailored food swaps, and PostgreSQL daily macro tracking.
              Educational nutrition guidance is not medical advice.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white">
              Platform
            </p>
            <ul className="mt-3 space-y-2 text-xs text-[#A1A1AA]">
              {(
                [
                  { id: "home", label: "Home" },
                  { id: "scanner", label: "AI Food Scanner" },
                  { id: "alternatives", label: "Food Alternatives" },
                  { id: "categories", label: "Nutrition & Categories" },
                  { id: "dashboard", label: "Dashboard" },
                ] as const
              ).map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(link.id)}
                    className="transition hover:text-[#A3FF12]"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white">
              Architecture
            </p>
            <ul className="mt-3 space-y-2 text-xs text-[#A1A1AA]">
              <li>Gemini Vision Analysis</li>
              <li>FastAPI Macro Recalculation</li>
              <li>PostgreSQL Meal Persistence</li>
              <li className="pt-1 font-mono text-[11px] text-[#34D399]">
                Status:{" "}
                {apiOnline === true
                  ? "API Connected"
                  : apiOnline === false
                    ? "API Offline"
                    : "Checking..."}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-[11px] text-zinc-500">
          <p>© {new Date().getFullYear()} NutriSense AI. Built for intelligent everyday nutrition.</p>
          <p>Educational nutrition insights • Powered by Gemini Vision &amp; PostgreSQL</p>
        </div>
      </footer>
    </div>
  );
}
