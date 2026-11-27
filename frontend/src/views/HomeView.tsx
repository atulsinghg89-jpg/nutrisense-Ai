import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Activity,
  ArrowRight,
  Baby,
  Bot,
  CalendarDays,
  Camera,
  Flame,
  Globe2,
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
import { FourAudienceChaptersSection } from "../components/chapters/FourAudienceChaptersSection";
import { DoshaSection } from "../components/dosha/DoshaSection";
import { FloatingFoodIngredients } from "../components/FloatingFoodIngredients";
import { HumanCategorySelector } from "../components/HumanSelectionCards";
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
import type { NutritionCategoryGuide } from "../data/categories";
import type { DoshaId } from "../data/doshas";
import type {
  AppView,
  AudienceChapterId,
  DailyMacroTargets,
  DashboardSummary,
  ScanSession,
} from "../types/nutrition";

interface HomeViewProps {
  onNavigate: (view: AppView) => void;
  onSelectCategory?: (categoryId: NutritionCategoryGuide["id"]) => void;
  onOpenDosha?: (doshaId: DoshaId) => void;
  onLaunchProfileDashboard?: (chapterId: AudienceChapterId) => void;
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
  onSelectCategory,
  onOpenDosha,
  onLaunchProfileDashboard,
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
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroImageY = useTransform(heroScrollProgress, [0, 1], [0, 56]);
  const heroImageScale = useTransform(heroScrollProgress, [0, 1], [1, 1.07]);
  const heroImageRotate = useTransform(heroScrollProgress, [0, 1], [0, -1.5]);

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
  const liveProtein = hasScannedItems
    ? scanSession!.totals.protein
    : todaySummary.total_protein;
  const liveCarbs = hasScannedItems
    ? scanSession!.totals.carbs
    : todaySummary.total_carbs;
  const liveFats = hasScannedItems
    ? scanSession!.totals.fats
    : todaySummary.total_fats;
  const liveCalories = hasScannedItems
    ? scanSession!.totals.calories
    : todaySummary.total_calories;

  return (
    <div className="space-y-20 pb-8">
      {/* 1. Cinematic 7-Stage Hero Opening + Scroll-Linked Depth Parallax */}
      <section
        ref={heroRef}
        className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#050706] px-6 py-12 sm:px-10 sm:py-16 lg:flex lg:min-h-[88vh] lg:flex-col lg:justify-center lg:px-14 lg:py-20"
      >
        {/* Animated Circuit Lines + 3D Floating Food Ingredients */}
        <CircuitLines variant="hero" />
        <FloatingFoodIngredients variant="hero" scrollProgress={heroScrollProgress} />

        {/* Subtle organic gradient aura lighting */}
        <motion.div
          aria-hidden="true"
          animate={
            prefersReduced
              ? undefined
              : { scale: [1, 1.08, 1], y: [0, -16, 0], opacity: [0.15, 0.25, 0.15] }
          }
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -top-28 -right-20 h-[440px] w-[440px] rounded-full bg-[#A3FF12] blur-[150px]"
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
          {/* Left Opening Sequence: Stage 1 (Logo) -> Stage 2 (Headline) -> Stage 5 (CTAs) */}
          <div className="space-y-7 lg:col-span-6">
            {/* Stage 1: Premium Logo Reveal Badge */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.42, delay: 0.02, ease: EASE_PREMIUM }}
              className="inline-flex items-center gap-2.5 rounded-full border border-[#A3FF12]/35 bg-[#121212]/90 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white shadow-[0_0_24px_rgba(163,255,18,0.12)]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#A3FF12]/15">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                  <path
                    d="M19 4C11.5 4 6.5 8.5 5 15.5C8.8 14.8 12.2 12.7 14.5 9.8C13.2 13.5 9.8 16.5 5.2 17.8C6.6 19.3 8.8 20 11.4 20C16.8 20 20 15.4 20 9.6C20 7.6 19.6 5.7 19 4Z"
                    fill="#A3FF12"
                  />
                </svg>
              </span>
              <span className="text-[#A3FF12]">NutriSense AI</span>
              <span className="text-zinc-500">•</span>
              <span className="text-[#34D399]">AI Nutrition Intelligence</span>
            </motion.div>

            {/* Stage 2: Line-by-Line Hero Headline Reveal */}
            <h1 className="font-display text-4xl leading-[1.02] font-extrabold tracking-tight text-white uppercase sm:text-5xl lg:text-[3.65rem]">
              <SplitText
                text="UNDERSTAND YOUR FOOD."
                delay={0.12}
                className="block"
              />
              <span className="mt-1.5 inline-block text-glow-lime bg-gradient-to-r from-[#A3FF12] via-[#86efac] to-[#34D399] bg-clip-text text-transparent">
                <SplitText
                  text="TRANSFORM YOUR HEALTH."
                  delay={0.26}
                  mode="words"
                />
              </span>
            </h1>

            <motion.p
              initial={prefersReduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.38, ease: EASE_PREMIUM }}
              className="max-w-xl text-base leading-relaxed text-[#A1A1AA] sm:text-lg"
            >
              Discover what&apos;s on your plate. Understand your nutrition.
              Build a healthier lifestyle with AI.
            </motion.p>

            {/* Stage 5: Primary Magnetic & Secondary CTAs */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.54, ease: EASE_PREMIUM }}
              className="flex flex-wrap items-center gap-3.5 pt-1"
            >
              <MagneticButton
                onClick={() => {
                  document
                    .getElementById("storytelling")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2.5 rounded-full bg-[#A3FF12] px-6 py-3.5 text-sm font-bold text-[#050706] shadow-[0_0_32px_rgba(163,255,18,0.32)] transition hover:bg-[#b8ff42] focus:ring-2 focus:ring-[#A3FF12] focus:ring-offset-2 focus:ring-offset-[#050706] focus:outline-none"
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
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white transition hover:border-[#A3FF12]/50 hover:bg-white/[0.08]"
              >
                <span>
                  {profileName ? `Profile: ${profileName}` : "Start Journey"}
                </span>
              </button>

              {hasActiveScan && (
                <button
                  type="button"
                  onClick={() => onNavigate("alternatives")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#121212] px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-[#34D399]/50"
                >
                  <span>Latest 3 Swaps</span>
                </button>
              )}
            </motion.div>

            {/* Real Capabilities Strip */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.64, ease: EASE_PREMIUM }}
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
          </div>

          {/* Right Stage 3 & 4: Cinematic Layered Food Composition + Floating Nutrition Indicators */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, scale: 0.91, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24, ease: EASE_PREMIUM }}
            style={
              prefersReduced
                ? undefined
                : {
                    y: heroImageY,
                    scale: heroImageScale,
                    rotate: heroImageRotate,
                  }
            }
            className="relative lg:col-span-6"
          >
            {/* Secondary Real Food Plate Vignettes for 3D Culinary Depth */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, scale: 0.8, x: -12 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.45, ease: EASE_PREMIUM }}
              className="animate-float-3d-slow absolute -top-5 -left-4 z-20 hidden h-20 w-20 overflow-hidden rounded-2xl border-2 border-[#34D399]/50 bg-[#0A0A0A] shadow-[0_14px_30px_rgba(0,0,0,0.8)] sm:block"
            >
              <img
                src="/images/south-indian-breakfast.jpg"
                alt="Idli and sambar dish depth vignette"
                className="h-full w-full object-cover"
              />
            </motion.div>

            <motion.div
              initial={prefersReduced ? false : { opacity: 0, scale: 0.8, x: 12 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.5, ease: EASE_PREMIUM }}
              className="animate-float-3d-reverse absolute -right-3 -bottom-5 z-20 hidden h-20 w-20 overflow-hidden rounded-2xl border-2 border-[#A3FF12]/50 bg-[#0A0A0A] shadow-[0_14px_30px_rgba(0,0,0,0.8)] sm:block"
            >
              <img
                src="/images/north-indian-thali.jpg"
                alt="High-protein dal and roti meal depth vignette"
                className="h-full w-full object-cover"
              />
            </motion.div>

            <div className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-[#0A0A0A] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.85)]">
              <div className="group relative overflow-hidden rounded-2xl">
                <img
                  src="/images/indian-hero-bowl.jpg"
                  alt="Balanced nourish bowl with grilled paneer, grains, sprouted moong salad, avocado, and mint dressing"
                  className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#050706] via-[#050706]/25 to-transparent"
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

                {/* Floating Indicator 1 (Top-Left): Scanner Status */}
                <motion.button
                  type="button"
                  onClick={() => onNavigate("scanner")}
                  initial={prefersReduced ? false : { opacity: 0, y: -8 }}
                  animate={
                    prefersReduced
                      ? { opacity: 1 }
                      : { opacity: 1, y: [0, -4, 0] }
                  }
                  transition={{
                    opacity: { duration: 0.4, delay: 0.42 },
                    y: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
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
                      ? `Scanned: ${scanSession!.items.length} items`
                      : "Gemini Vision Active"}
                  </span>
                </motion.button>

                {/* Floating Indicator 2 (Top-Right): Live Calories Pill */}
                <motion.button
                  type="button"
                  onClick={() =>
                    onNavigate(hasScannedItems ? "scanner" : "dashboard")
                  }
                  initial={prefersReduced ? false : { opacity: 0, y: -10 }}
                  animate={
                    prefersReduced
                      ? { opacity: 1 }
                      : { opacity: 1, y: [0, 5, 0] }
                  }
                  transition={{
                    opacity: { duration: 0.4, delay: 0.48 },
                    y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                  }}
                  className="glass-surface absolute top-5 right-5 rounded-2xl border border-[#A3FF12]/35 px-3.5 py-2 text-right shadow-lg transition hover:border-[#A3FF12]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                    {hasScannedItems ? "Calories Est." : "Today Calories"}
                  </p>
                  <p className="font-mono text-base font-bold text-[#A3FF12] tabular-nums">
                    <AnimatedNumber value={liveCalories} />{" "}
                    <span className="text-xs font-normal text-zinc-300">
                      kcal
                    </span>
                  </p>
                </motion.button>

                {/* Floating Indicator 3 (Mid-Right): Vitamins & Antioxidants Badge */}
                <motion.button
                  type="button"
                  onClick={() => onNavigate("categories")}
                  initial={prefersReduced ? false : { opacity: 0, x: 10 }}
                  animate={
                    prefersReduced
                      ? { opacity: 1 }
                      : { opacity: 1, x: [0, -4, 0] }
                  }
                  transition={{
                    opacity: { duration: 0.4, delay: 0.56 },
                    x: { duration: 5.4, repeat: Infinity, ease: "easeInOut" },
                  }}
                  className="glass-surface absolute top-[46%] right-4 hidden items-center gap-2 rounded-full border border-[#34D399]/35 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg transition hover:border-[#34D399] sm:flex"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>Vitamins &amp; Fiber Balance</span>
                </motion.button>

                {/* Bottom Overlay Macro Indicators Strip (Protein, Carbs, Fats - real state) */}
                <motion.div
                  initial={prefersReduced ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.52, ease: EASE_PREMIUM }}
                  className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/10 bg-[#050706]/90 p-3.5 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#34D399]">
                        {hasScannedItems
                          ? "Active Plate Breakdown"
                          : "Live Daily Nutrition"}
                      </p>
                      <p className="text-xs text-[#A1A1AA]">
                        {hasScannedItems
                          ? scanSession!.items
                              .slice(0, 3)
                              .map((i) => i.name)
                              .join(" • ")
                          : todaySummaryLoading
                            ? "Syncing PostgreSQL meal logs..."
                            : `${todaySummary.total_meals} ${
                                todaySummary.total_meals === 1 ? "meal" : "meals"
                              } logged today against ${dailyTargets.calories.toLocaleString()} kcal target`}
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

                  {/* Animated Protein, Carbs & Fats Indicator Bars */}
                  <div className="grid grid-cols-3 gap-2.5 border-t border-white/[0.08] pt-2.5">
                    {[
                      {
                        label: "Protein",
                        value: liveProtein,
                        target: dailyTargets.protein,
                        color: "bg-[#34D399]",
                      },
                      {
                        label: "Carbs",
                        value: liveCarbs,
                        target: dailyTargets.carbs,
                        color: "bg-emerald-300",
                      },
                      {
                        label: "Fats & Vit",
                        value: liveFats,
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
                                delay: 0.58,
                                ease: EASE_PREMIUM,
                              }}
                              className={`h-full rounded-full ${macro.color}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stage 6: Cinematic Scroll Indicator */}
        <motion.button
          type="button"
          onClick={() => {
            document
              .getElementById("storytelling")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          initial={prefersReduced ? false : { opacity: 0, y: 10 }}
          animate={
            prefersReduced
              ? { opacity: 1 }
              : { opacity: 1, y: [0, 5, 0] }
          }
          transition={{
            opacity: { duration: 0.45, delay: 0.72 },
            y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
          }}
          className="relative z-10 mx-auto mt-10 flex items-center gap-2.5 rounded-full border border-white/15 bg-[#0A0A0A]/90 px-4 py-1.5 text-[11px] font-medium text-[#A1A1AA] transition hover:border-[#A3FF12]/50 hover:text-white"
        >
          <span className="flex h-4 w-2.5 items-start justify-center rounded-full border border-[#A3FF12]/60 p-0.5">
            <span className="h-1.5 w-1 rounded-full bg-[#A3FF12]" />
          </span>
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

      {/* 2.5 Ayurvedic Dosha Experience ("Discover Your Rhythm" immediately after Four Chapters) */}
      <DoshaSection
        onOpenDosha={(doshaId) => {
          if (onOpenDosha) {
            onOpenDosha(doshaId);
          }
        }}
      />

      {/* 2.6 Four Audience Chapters (Men, Women, Babies, Patients — immediately after Discover Your Rhythm) */}
      <FourAudienceChaptersSection
        onNavigate={onNavigate}
        onSelectCategory={onSelectCategory}
        onLaunchProfileDashboard={(chapterId) => {
          if (onLaunchProfileDashboard) {
            onLaunchProfileDashboard(chapterId);
          } else {
            onNavigate("dashboard");
          }
        }}
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

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => onNavigate("global-nutrition")}
              className="group rounded-2xl border border-[#A3FF12]/35 bg-gradient-to-br from-[#141D16] to-[#121212] p-5 text-left transition hover:border-[#A3FF12] hover:bg-[#171717]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#A3FF12]/45 bg-[#A3FF12]/15 text-[#A3FF12]">
                <Globe2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-white group-hover:text-[#A3FF12]">
                Global &amp; Japanese Nutrition
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                Food Balance Spinning Guide, Japan MEXT composition tables, India vs Japan
                comparisons, Bento planner &amp; seasonal foods.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#A3FF12]">
                Explore Global Module <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>

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

      {/* Compact Explore Nutrition Guides Strip (Men's Health, Babies & Children, Patient Education) */}
      <RevealSection>
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#34D399]">
                Educational Modules
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
                Explore Nutrition Guides
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("categories")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#A1A1AA] transition hover:text-[#A3FF12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12]"
            >
              <span>View All Guides</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="#men"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("men");
              }}
              className="group flex items-start gap-3.5 rounded-2xl border border-white/10 bg-[#101411] p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#A3FF12]/45 hover:shadow-[0_10px_28px_rgba(163,255,18,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#A3FF12]/30 bg-[#A3FF12]/10 text-[#A3FF12]">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold text-white transition-colors group-hover:text-[#A3FF12]">
                  Men&apos;s Health
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">
                  Everyday protein balance, heart habits &amp; smart home swaps.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#A3FF12]">
                  <span>Open Guide</span>
                  <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </a>

            <a
              href="#baby"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("baby");
              }}
              className="group flex items-start gap-3.5 rounded-2xl border border-amber-200/15 bg-[#15140E] p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-amber-200/45 hover:shadow-[0_10px_28px_rgba(252,211,77,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/30 bg-amber-200/10 text-amber-200">
                <Baby className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold text-white transition-colors group-hover:text-amber-200">
                  Babies &amp; Children&apos;s Nutrition
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">
                  Broad age-stage cues from infancy through growing childhood.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200">
                  <span>Open Guide</span>
                  <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </a>

            <a
              href="#patient"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("patient");
              }}
              className="group flex items-start gap-3.5 rounded-2xl border border-sky-300/15 bg-[#0F1619] p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-sky-300/45 hover:shadow-[0_10px_28px_rgba(56,189,248,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-300/30 bg-sky-300/10 text-sky-300">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold text-white transition-colors group-hover:text-sky-200">
                  Patient Nutrition Education
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">
                  Condition food literacy &amp; doctor/dietitian visit questions.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-300">
                  <span>Open Guide</span>
                  <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </a>
          </div>
        </section>
      </RevealSection>

      {/* 5. Editorial Light Contrast Section — How NutriSense AI Works (01 — SCAN, 02 — ANALYZE, 03 — IMPROVE) */}
      <RevealSection>
        <section className="relative overflow-hidden rounded-[2.25rem] border border-black/10 bg-[#F4F7F2] px-6 py-10 text-[#0A0A0A] shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:px-10 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#A3FF12]">
                Three-Step Workflow
              </span>
              <h2 className="mt-2.5 font-display text-3xl font-extrabold tracking-tight text-[#050706] sm:text-4xl">
                How NutriSense AI Works
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-zinc-700">
              Built for fast everyday nutrition decisions without tedious manual
              spreadsheet entry.
            </p>
          </div>

          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="relative mt-8 grid gap-6 md:grid-cols-3"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-14 right-16 left-16 hidden h-px bg-gradient-to-r from-[#0A0A0A]/25 via-[#059669]/45 to-[#0A0A0A]/25 md:block"
            />

            {WORKFLOW_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.step}
                  type="button"
                  variants={staggerItemVariants}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onNavigate(item.view)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-6 text-left shadow-[0_8px_28px_rgba(10,10,10,0.06)] transition-all hover:border-[#0A0A0A] hover:shadow-[0_18px_40px_rgba(10,10,10,0.12)]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#A3FF12] transition-transform duration-300 group-hover:scale-105">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full border border-black/15 bg-[#F4F7F2] px-3 py-1 font-mono text-xs font-bold text-[#0A0A0A]">
                        {item.step} — {item.tag}
                      </span>
                    </div>

                    <h3 className="mt-6 font-display text-lg font-extrabold text-[#050706] transition-colors group-hover:text-emerald-700">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">
                      {item.description}
                    </p>
                  </div>

                  <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-[#050706] group-hover:text-emerald-700">
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

          {/* Human Portrait Category Cards Preview */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#34D399]">
              Personalized Life-Stage Guides
            </p>
            <HumanCategorySelector
              selectedId="all"
              showAllMode={false}
              onSelect={(categoryId) => {
                if (onSelectCategory) {
                  onSelectCategory(categoryId);
                } else {
                  onNavigate("categories");
                }
              }}
            />
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

      {/* 8. Distinct Elevated NutriSense AI Footer */}
      <div className="pt-8 sm:pt-12">
        <footer
          aria-label="Site Footer"
          className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] shadow-[0_0_55px_rgba(52,211,153,0.06),0_20px_60px_rgba(0,0,0,0.65)]"
          style={{
            background:
              "linear-gradient(180deg, rgba(22, 30, 24, 0.92) 0%, rgba(14, 19, 16, 0.96) 56%, rgba(9, 12, 10, 0.98) 100%)",
          }}
        >
          {/* Low-intensity green ambient radial sheen matching NutriSense dark palette */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-28 left-1/2 h-64 w-3/4 -translate-x-1/2 rounded-full bg-[#34D399]/[0.07] blur-[95px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A3FF12]/25 to-transparent"
          />

          <div className="relative px-6 pt-10 pb-8 sm:px-10 sm:pt-12 sm:pb-9 lg:px-14 lg:pt-14">
            {/* Main Footer Grid: Brand (Left) + Core Platform (Middle) + Smart Tools (Right) */}
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
              {/* LEFT SECTION: Existing Logo + Description + Disclaimer */}
              <div className="space-y-4 sm:col-span-2 lg:col-span-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#A3FF12]/30 bg-gradient-to-br from-[#A3FF12]/20 via-[#34D399]/15 to-[#121212] shadow-[0_0_20px_rgba(163,255,18,0.14)]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M19 4C11.5 4 6.5 8.5 5 15.5C8.8 14.8 12.2 12.7 14.5 9.8C13.2 13.5 9.8 16.5 5.2 17.8C6.6 19.3 8.8 20 11.4 20C16.8 20 20 15.4 20 9.6C20 7.6 19.6 5.7 19 4Z"
                        fill="url(#footerNutrisenseLogo)"
                      />
                      <defs>
                        <linearGradient
                          id="footerNutrisenseLogo"
                          x1="5"
                          y1="4"
                          x2="20"
                          y2="20"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#A3FF12" />
                          <stop offset="1" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                  <span className="font-display text-xl font-extrabold tracking-tight text-white">
                    NutriSense{" "}
                    <span className="bg-gradient-to-r from-[#A3FF12] to-[#34D399] bg-clip-text text-transparent">
                      AI
                    </span>
                  </span>
                </div>

                <p className="max-w-md text-sm leading-relaxed text-[#B4BEB7]">
                  AI-powered meal vision analysis, interactive gram portion
                  control, tailored food swaps, Indian food nutrition guides,
                  and PostgreSQL daily macro tracking.
                </p>

                <p className="max-w-md text-xs leading-relaxed text-[#7E8981]">
                  Educational nutrition guidance is not medical advice.
                </p>
              </div>

              {/* MIDDLE SECTION: Core Platform */}
              <div className="lg:col-span-3 lg:col-start-7">
                <p className="font-display text-sm font-bold tracking-wide text-white">
                  Core Platform
                </p>
                <ul className="mt-4 space-y-3 text-sm text-[#A1A1AA]">
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
                        className="text-left transition-colors duration-200 hover:text-[#A3FF12]"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* RIGHT SECTION: Smart Nutrition Tools + API Status */}
              <div className="lg:col-span-3">
                <p className="font-display text-sm font-bold tracking-wide text-white">
                  Smart Nutrition Tools
                </p>
                <ul className="mt-4 space-y-3 text-sm text-[#A1A1AA]">
                  <li>
                    <button
                      type="button"
                      onClick={onOpenAssistant}
                      className="text-left transition-colors duration-200 hover:text-[#A3FF12]"
                    >
                      Nutri AI Assistant
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate("planner")}
                      className="text-left transition-colors duration-200 hover:text-[#A3FF12]"
                    >
                      AI Weekly Meal Planner
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate("indian-foods")}
                      className="text-left transition-colors duration-200 hover:text-[#A3FF12]"
                    >
                      Indian Food Intelligence
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate("global-nutrition")}
                      className="text-left transition-colors duration-200 hover:text-[#A3FF12]"
                    >
                      Global Nutrition Intelligence
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate("grocery")}
                      className="text-left transition-colors duration-200 hover:text-[#A3FF12]"
                    >
                      Smart Grocery List
                    </button>
                  </li>
                  <li className="pt-1">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0B0F0C]/80 px-3 py-1 font-mono text-xs text-[#34D399]">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${
                          apiOnline === true
                            ? "bg-[#34D399]"
                            : apiOnline === false
                              ? "bg-amber-400"
                              : "bg-zinc-400"
                        }`}
                      />
                      <span>
                        Status:{" "}
                        {apiOnline === true
                          ? "API Connected"
                          : apiOnline === false
                            ? "API Offline"
                            : "Checking..."}
                      </span>
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* BOTTOM SECTION: Copyright + Legal Links + Tech Attribution */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-6 text-xs text-[#8D9790]">
              <p>© {new Date().getFullYear()} NutriSense AI. All rights reserved.</p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <button
                  type="button"
                  onClick={() => setLegalDialog("privacy")}
                  className="transition-colors duration-200 hover:text-[#34D399]"
                >
                  Privacy &amp; Data Policy
                </button>
                <button
                  type="button"
                  onClick={() => setLegalDialog("terms")}
                  className="transition-colors duration-200 hover:text-[#A3FF12]"
                >
                  Terms &amp; Responsible AI
                </button>
                <span className="text-[#7E8981]">
                  Powered by Gemini Vision &amp; PostgreSQL
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>

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
