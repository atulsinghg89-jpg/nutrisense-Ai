import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Baby,
  Bot,
  CalendarDays,
  Camera,
  Flame,
  HeartHandshake,
  HeartPulse,
  IndianRupee,
  LayoutDashboard,
  Scale,
  ShieldCheck,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  User,
  Utensils,
  X,
} from "lucide-react";
import { CircuitLines } from "../components/CircuitLines";
import { MacroProgressBars } from "../components/MacroProgressBars";
import {
  AnimatedNumber,
  EASE_PREMIUM,
  MagneticButton,
  RevealSection,
  SplitText,
  staggerContainerVariants,
  staggerItemVariants,
} from "../components/MotionPrimitives";
import { ScrollTimeline } from "../components/ScrollTimeline";
import type {
  AppView,
  DailyMacroTargets,
  DashboardSummary,
  ScanSession,
} from "../types/nutrition";

interface HomeViewProps {
  onNavigate: (view: AppView) => void;
  onOpenDashboardGoals: () => void;
  onOpenAssistant: () => void;
  onOpenOnboarding: () => void;
  profileName?: string;
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
  onOpenDashboardGoals,
  onOpenAssistant,
  onOpenOnboarding,
  profileName,
  hasActiveScan,
  scanSession,
  dailyTargets,
  todaySummary,
  todaySummaryLoading,
  apiOnline,
}: HomeViewProps) {
  const prefersReduced = useReducedMotion();
  const [legalDialog, setLegalDialog] = useState<"privacy" | "terms" | null>(
    null,
  );

  const caloriePct = Math.min(
    100,
    Math.round(
      (todaySummary.total_calories / Math.max(dailyTargets.calories, 1)) * 100,
    ),
  );

  const hasScannedItems = Boolean(scanSession && scanSession.items.length > 0);

  return (
    <div className="space-y-20 pb-8">
      {/* 1. Ultra-Premium Full-Screen Hero with Split-Text, Magnetic CTAs & Layered Indian Food Composition */}
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#080B09] px-6 py-12 sm:px-10 sm:py-16 lg:min-h-[84vh] lg:flex lg:flex-col lg:justify-center lg:px-14 lg:py-20">
        {/* Animated Circuit Lines + Drifting Particles */}
        <CircuitLines variant="hero" />

        {/* Subtle organic gradient aura lighting */}
        <motion.div
          aria-hidden="true"
          animate={
            prefersReduced
              ? undefined
              : { scale: [1, 1.08, 1], y: [0, -16, 0], opacity: [0.15, 0.25, 0.15] }
          }
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -top-28 -right-20 h-[440px] w-[440px] rounded-full bg-[#B6FF38] blur-[150px]"
        />
        <motion.div
          aria-hidden="true"
          animate={
            prefersReduced
              ? undefined
              : { scale: [1, 1.06, 1], y: [0, 14, 0], opacity: [0.12, 0.22, 0.12] }
          }
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[#34D399] blur-[135px]"
        />

        <div className="relative z-10 grid w-full items-center gap-12 lg:grid-cols-12">
          {/* Left Typography & Magnetic CTAs */}
          <motion.div
            initial={prefersReduced ? false : "hidden"}
            animate="visible"
            variants={staggerContainerVariants}
            className="space-y-7 lg:col-span-6"
          >
            <motion.div
              variants={staggerItemVariants}
              className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#34D399]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI-Powered Indian Nutrition Intelligence</span>
            </motion.div>

            <h1 className="font-display text-4xl leading-[1.03] font-extrabold tracking-tight text-white sm:text-5xl lg:text-[4rem]">
              <SplitText text="Your Food." delay={0.04} className="block" />
              <SplitText text="Your Health." delay={0.14} className="block" />
              <span className="mt-1 inline-block text-glow-lime bg-gradient-to-r from-[#B6FF38] via-[#86efac] to-[#34D399] bg-clip-text text-transparent">
                <SplitText text="Your Intelligence." delay={0.24} mode="chars" />
              </span>
            </h1>

            <motion.p
              variants={staggerItemVariants}
              className="max-w-xl text-base leading-relaxed text-[#A3ADA6] sm:text-lg"
            >
              Discover what&apos;s on your plate, understand your nutrition and
              make smarter food choices with AI.
            </motion.p>

            {/* Primary Magnetic & Secondary CTAs */}
            <motion.div
              variants={staggerItemVariants}
              className="flex flex-wrap items-center gap-3.5 pt-1"
            >
              <MagneticButton
                onClick={() => {
                  document
                    .getElementById("storytelling")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2.5 rounded-full bg-[#B6FF38] px-6 py-3.5 text-sm font-bold text-[#080B09] shadow-[0_0_32px_rgba(182,255,56,0.32)] transition hover:bg-[#c8ff66] focus:ring-2 focus:ring-[#B6FF38] focus:ring-offset-2 focus:ring-offset-[#080B09] focus:outline-none"
              >
                <Sparkles className="h-4 w-4" />
                <span>Explore NutriSense</span>
                <ArrowRight className="h-4 w-4" />
              </MagneticButton>

              <MagneticButton
                onClick={() => onNavigate("scanner")}
                className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/40 bg-[#34D399]/12 px-5 py-3.5 text-sm font-bold text-[#34D399] transition hover:bg-[#34D399]/22"
              >
                <Camera className="h-4 w-4" />
                <span>Scan Your Food</span>
              </MagneticButton>

              <button
                type="button"
                onClick={onOpenOnboarding}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white transition hover:border-[#B6FF38]/50 hover:bg-white/[0.08]"
              >
                <span>
                  {profileName ? `Profile: ${profileName}` : "Start Journey"}
                </span>
              </button>

              {hasActiveScan && (
                <button
                  type="button"
                  onClick={() => onNavigate("alternatives")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#141B16] px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-[#34D399]/50"
                >
                  <span>Latest 3 Swaps</span>
                </button>
              )}
            </motion.div>

            {/* Real Capabilities Strip */}
            <motion.div
              variants={staggerItemVariants}
              className="grid grid-cols-3 gap-3 border-t border-white/[0.08] pt-6"
            >
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
            </motion.div>
          </motion.div>

          {/* Right Visual Storytelling Frame with Real Food Photo & Floating Cards */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE_PREMIUM }}
            className="relative lg:col-span-6"
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0A0A0A] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
              <div className="group relative overflow-hidden rounded-2xl">
                <img
                  src="/images/indian-hero-bowl.jpg"
                  alt="Balanced Indian nourish bowl with grilled paneer, millet khichdi, sprouted moong salad, avocado, and mint chutney"
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
                <motion.button
                  type="button"
                  onClick={() => onNavigate("scanner")}
                  animate={prefersReduced ? undefined : { y: [0, -4, 0] }}
                  transition={{
                    duration: 4.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="glass-surface absolute top-5 left-5 flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white shadow-lg transition hover:border-[#A3FF12]/60"
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
                </motion.button>

                {/* Floating Top-Right Target Card */}
                <motion.button
                  type="button"
                  onClick={() =>
                    onNavigate(hasScannedItems ? "scanner" : "dashboard")
                  }
                  animate={prefersReduced ? undefined : { y: [0, 5, 0] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="glass-surface absolute top-5 right-5 rounded-2xl border border-[#A3FF12]/30 px-3.5 py-2 text-right shadow-lg transition hover:border-[#A3FF12]"
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
                </motion.button>

                {/* Bottom Overlay Macro Strip (real state!) */}
                <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/10 bg-[#0A0A0A]/88 p-3.5 backdrop-blur-md">
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

        {/* Subtle Hero Scroll Indicator */}
        <motion.button
          type="button"
          onClick={() => {
            document
              .getElementById("storytelling")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          animate={prefersReduced ? undefined : { y: [0, 5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 mx-auto mt-10 hidden items-center gap-2 rounded-full border border-white/10 bg-[#0A0A0A]/80 px-4 py-1.5 text-[11px] font-medium text-[#A1A1AA] transition hover:border-[#A3FF12]/40 hover:text-white lg:inline-flex"
        >
          <span>Scroll to explore story</span>
          <span className="text-[#A3FF12]">↓</span>
        </motion.button>
      </section>

      {/* 2. FITTR-Inspired Main Interactive Storytelling Section (Left Text + Center Diamond Timeline + Right Interactive Image + Floating Links) */}
      <ScrollTimeline
        onNavigate={onNavigate}
        onOpenDashboardGoals={onOpenDashboardGoals}
        onOpenAssistant={onOpenAssistant}
        todaySummary={todaySummary}
        dailyTargets={dailyTargets}
      />

      {/* 3. Live Nutrition Preview (Actual Application State & PostgreSQL Data) */}
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

      {/* 4. Smart Nutrition Toolkit (Part 12 Hackathon Features Gateway) */}
      <RevealSection>
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A3FF12]">
                Complete Smart Ecosystem
              </p>
              <h2 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-white">
                AI Assistant, Meal Planner &amp; Indian Food Intelligence
              </h2>
            </div>
            <p className="max-w-md text-sm text-[#A1A1AA]">
              Real interactive tools synced with Gemini AI and local Indian
              home-style nutrition estimates.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <button
              type="button"
              onClick={onOpenAssistant}
              className="group rounded-2xl border border-white/[0.08] bg-[#121212] p-5 text-left transition hover:border-[#A3FF12]/45 hover:bg-[#171717]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#A3FF12]/35 bg-[#A3FF12]/10 text-[#A3FF12]">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-white group-hover:text-[#A3FF12]">
                Nutri AI Assistant
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                Chat with Gemini nutrition companion using your real daily
                calorie and protein intake context.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#A3FF12]">
                Open Chat <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("planner")}
              className="group rounded-2xl border border-white/[0.08] bg-[#121212] p-5 text-left transition hover:border-[#34D399]/45 hover:bg-[#171717]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-white group-hover:text-[#34D399]">
                AI Weekly Meal Planner
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                7-day Breakfast, Lunch, Dinner &amp; Snack planner with Indian
                and budget-friendly options.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#34D399]">
                Open Planner <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("indian-foods")}
              className="group rounded-2xl border border-white/[0.08] bg-[#121212] p-5 text-left transition hover:border-[#A3FF12]/45 hover:bg-[#171717]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#A3FF12]/35 bg-[#A3FF12]/10 text-[#A3FF12]">
                <Utensils className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-white group-hover:text-[#A3FF12]">
                Indian Food Intelligence
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                Roti, Dal, Rice, Paneer, Poha, Idli, Dosa, Rajma, Chole &amp;
                Khichdi macro profiles.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#A3FF12]">
                Explore Foods <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("budget")}
              className="group rounded-2xl border border-white/10 bg-[#141B16] p-5 text-left transition hover:border-[#B6FF38]/45 hover:bg-[#19221C]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#B6FF38]/35 bg-[#B6FF38]/10 text-[#B6FF38]">
                <IndianRupee className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-white group-hover:text-[#B6FF38]">
                Budget Nutrition (₹50–₹200)
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A3ADA6]">
                Protein-per-rupee Indian meal plans and weekly grocery cost
                breakdowns across ₹50–₹200/day.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#B6FF38]">
                Explore Budget Plans <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("grocery")}
              className="group rounded-2xl border border-white/10 bg-[#141B16] p-5 text-left transition hover:border-[#34D399]/45 hover:bg-[#19221C]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]">
                <ShoppingBasket className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-white group-hover:text-[#34D399]">
                Smart Grocery List
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A3ADA6]">
                Categorized checklist synced directly from your Weekly Meal
                Planner with check-off persistence.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#34D399]">
                Open Checklist <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </section>
      </RevealSection>

      {/* 5. How It Works (01 — SCAN, 02 — ANALYZE, 03 — IMPROVE) */}
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

                    <h3 className="mt-6 font-display text-lg font-bold text-white transition-colors group-hover:text-[#A3FF12]">
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

      {/* 6. Nutrition Benefits + Life-Stage Categories Preview */}
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

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
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

      {/* 7. About NutriSense AI & Responsible AI Trust (Phases 18 & 19) */}
      <RevealSection>
        <section className="grid gap-6 rounded-3xl border border-white/10 bg-[#121212] p-6 sm:p-10 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-1 text-xs font-semibold text-[#34D399]">
              <ShieldCheck className="h-3.5 w-3.5" />
              About &amp; Responsible AI
            </span>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Built for Transparent, Science-Grounded Food Awareness.
            </h2>
            <p className="text-sm leading-relaxed text-[#A1A1AA]">
              NutriSense AI combines Google Gemini Vision with live gram portion
              control and PostgreSQL meal persistence so everyday food decisions
              stay clear, fast, and measurable.
            </p>
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4 text-xs leading-relaxed text-amber-100">
              <strong className="font-semibold text-white">Medical Disclaimer:</strong>{" "}
              NutriSense AI provides informational nutrition estimates and general
              wellness guidance. It is not a substitute for professional medical
              advice.
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {[
              {
                title: "How Image Analysis Works",
                detail:
                  "Uploaded meal images are securely analyzed server-side via Gemini Vision to detect visible items, default gram servings, and 3 healthier swaps.",
              },
              {
                title: "Estimates & Recipe Variance",
                detail:
                  "Cooking oils, sauces, and hidden ingredients change true energy content. Use portion sliders to tune weights anytime.",
              },
              {
                title: "Data & Privacy Clarity",
                detail:
                  "Your API keys remain strictly on the FastAPI backend. Meal logs persist cleanly in PostgreSQL while targets and preferences stay in local browser storage.",
              },
              {
                title: "Actionable Swaps, Not Extremes",
                detail:
                  "Healthier recommendations highlight protein density, fiber, and preparation method instead of pushing restrictive calorie cutting alone.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/[0.07] bg-[#0A0A0A] p-5"
              >
                <h3 className="font-display text-sm font-bold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#A1A1AA]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* 8. Strong Final CTA Banner (Part 14 Exact Copy) */}
      <RevealSection>
        <section className="relative overflow-hidden rounded-3xl border border-[#A3FF12]/25 bg-gradient-to-br from-[#171717] via-[#121212] to-[#0A0A0A] px-6 py-10 text-center sm:px-12 sm:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-1/2 h-44 w-96 -translate-x-1/2 rounded-full bg-[#A3FF12]/10 blur-[90px]"
          />
          <div className="relative mx-auto max-w-2xl space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <Sparkles className="h-3.5 w-3.5" />
              Start Now
            </span>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Your Healthier Journey Starts With One Scan.
            </h2>
            <p className="text-sm leading-relaxed text-[#A1A1AA] sm:text-base">
              Upload any plate photo in the AI Food Scanner or track your daily
              and weekly macro insights in the Nutrition Dashboard.
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
                <span>Scan Your First Meal →</span>
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

      {/* 8. Professional Footer */}
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
              tailored food swaps, Indian food nutrition guides, and PostgreSQL
              daily macro tracking. Educational nutrition guidance is not
              medical advice.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white">
              Core Platform
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
              Smart Nutrition Tools
            </p>
            <ul className="mt-3 space-y-2 text-xs text-[#A1A1AA]">
              <li>
                <button
                  type="button"
                  onClick={onOpenAssistant}
                  className="transition hover:text-[#A3FF12]"
                >
                  Nutri AI Assistant
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("planner")}
                  className="transition hover:text-[#A3FF12]"
                >
                  AI Weekly Meal Planner
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("indian-foods")}
                  className="transition hover:text-[#A3FF12]"
                >
                  Indian Food Intelligence
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("grocery")}
                  className="transition hover:text-[#A3FF12]"
                >
                  Smart Grocery List
                </button>
              </li>
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
          <p>© {new Date().getFullYear()} NutriSense AI. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setLegalDialog("privacy")}
              className="transition hover:text-[#34D399]"
            >
              Privacy &amp; Data Policy
            </button>
            <button
              type="button"
              onClick={() => setLegalDialog("terms")}
              className="transition hover:text-[#A3FF12]"
            >
              Terms &amp; Responsible AI
            </button>
            <span>Powered by Gemini Vision &amp; PostgreSQL</span>
          </div>
        </div>
      </footer>

      {/* Interactive Privacy / Terms Modal */}
      <AnimatePresence>
        {legalDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLegalDialog(null)}
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#121212] p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <h2 className="font-display text-lg font-bold text-white">
                    {legalDialog === "privacy"
                      ? "Privacy & Data Transparency"
                      : "Terms & Responsible AI Guidance"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setLegalDialog(null)}
                    aria-label="Close modal"
                    className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {legalDialog === "privacy" ? (
                  <div className="mt-4 space-y-3 text-xs leading-relaxed text-[#A1A1AA]">
                    <p>
                      Uploaded food images are transmitted only when you click
                      Analyze Meal to the FastAPI backend for Gemini Vision
                      macro estimation. Image files are not permanently stored
                      in PostgreSQL.
                    </p>
                    <p>
                      Confirmed meal logs (food item names, gram weights, and
                      macro summaries) persist in PostgreSQL so your Dashboard
                      and Weekly/Monthly trends stay accurate.
                    </p>
                    <p>
                      Daily targets, profile metrics, meal planner cache, and
                      grocery checklists reside in your browser&apos;s{" "}
                      <code>localStorage</code> and can be reset anytime.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3 text-xs leading-relaxed text-[#A1A1AA]">
                    <p>
                      NutriSense AI provides informational nutrition estimates
                      and general wellness guidance. It is not a substitute for
                      professional medical advice, diagnosis, or clinical
                      nutrition therapy.
                    </p>
                    <p>
                      Visual macro analysis and Indian whole-food estimates can
                      vary with hidden fats, oils, seasonings, and culinary prep
                      methods. Adjust portions using the interactive sliders.
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
