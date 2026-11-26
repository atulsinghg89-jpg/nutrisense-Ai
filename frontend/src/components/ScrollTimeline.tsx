import { useCallback, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Camera,
  Flame,
  History,
  LayoutDashboard,
  Scale,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
} from "lucide-react";
import type {
  AppView,
  DailyMacroTargets,
  DashboardSummary,
} from "../types/nutrition";
import { CircuitLines } from "./CircuitLines";
import { FloatingFoodIngredients } from "./FloatingFoodIngredients";
import { EASE_PREMIUM, SplitText } from "./MotionPrimitives";

interface FloatingFeatureLabel {
  id: string;
  label: string;
  sublabel: string;
  targetView: AppView;
  actionHint?: string;
  icon: typeof Camera;
  desktopPos: string;
  connectorSide: "left" | "right" | "bottom" | "top";
}

interface StoryStep {
  number: string;
  eyebrow: string;
  heading: string;
  description: string;
  greenInfo: string;
  ctaLabel: string;
  ctaView: AppView;
  imageSrc: string;
  imageAlt: string;
  auraGradient: string;
  labels: FloatingFeatureLabel[];
}

interface ScrollTimelineProps {
  onNavigate: (view: AppView) => void;
  onOpenDashboardGoals: () => void;
  onOpenAssistant: () => void;
  todaySummary: DashboardSummary;
  dailyTargets: DailyMacroTargets;
}

const STORY_STEPS: StoryStep[] = [
  {
    number: "01",
    eyebrow: "AI FOOD INTELLIGENCE",
    heading: "First, See Every Ingredient on Your Plate.",
    description:
      "Snap or upload any plate photo and watch NutriSense AI isolate individual items with realistic baseline gram servings.",
    greenInfo: "Chapter 01 • Gemini Vision Multi-Item Recognition",
    ctaLabel: "Launch AI Scanner",
    ctaView: "scanner",
    imageSrc: "/images/indian-hero-bowl.jpg",
    imageAlt: "Balanced nourish bowl with paneer, grains, greens, avocado, and herb dressing",
    auraGradient: "radial-gradient(circle at 62% 45%, rgba(163,255,18,0.14), transparent 65%)",
    labels: [
      {
        id: "ai-scanner",
        label: "AI Food Scanner",
        sublabel: "Upload or live webcam",
        targetView: "scanner",
        icon: Camera,
        desktopPos: "top-5 left-2 xl:-left-5",
        connectorSide: "right",
      },
      {
        id: "food-recognition",
        label: "Plate Detection",
        sublabel: "Indian & everyday dishes",
        targetView: "indian-foods",
        icon: ScanLine,
        desktopPos: "top-7 right-2 xl:-right-4",
        connectorSide: "left",
      },
      {
        id: "calorie-analysis",
        label: "Calorie Estimation",
        sublabel: "Instant kcal breakdown",
        targetView: "dashboard",
        icon: Flame,
        desktopPos: "bottom-20 left-2 xl:-left-5",
        connectorSide: "right",
      },
      {
        id: "micronutrients",
        label: "Macros & Vitamins",
        sublabel: "Balanced nutrient profile",
        targetView: "scanner",
        icon: Sparkles,
        desktopPos: "bottom-6 right-2 xl:-right-4",
        connectorSide: "left",
      },
    ],
  },
  {
    number: "02",
    eyebrow: "SMART NUTRITION ANALYSIS",
    heading: "Decode Calories, Protein, Carbs & Vitamins.",
    description:
      "Adjust every ingredient dynamically with gram sliders backed by per-100g normalization and live target progress bars.",
    greenInfo: "Chapter 02 • Real-Time Gram Recalculation",
    ctaLabel: "Explore Nutrition Analysis",
    ctaView: "scanner",
    imageSrc: "/images/nutrition-analytics.jpg",
    imageAlt: "Dark health-tech nutrition analytics graphic with glowing macro rings",
    auraGradient: "radial-gradient(circle at 55% 40%, rgba(52,211,153,0.16), transparent 65%)",
    labels: [
      {
        id: "macro-calories",
        label: "Daily Calories",
        sublabel: "Consumed vs. remaining",
        targetView: "dashboard",
        icon: Flame,
        desktopPos: "top-5 left-2 xl:-left-5",
        connectorSide: "right",
      },
      {
        id: "macro-protein",
        label: "Protein",
        sublabel: "Live goal tracking",
        targetView: "dashboard",
        icon: Activity,
        desktopPos: "top-7 right-2 xl:-right-4",
        connectorSide: "left",
      },
      {
        id: "macro-carbs",
        label: "Indian Food Index",
        sublabel: "Roti, dal, idli macros",
        targetView: "indian-foods",
        icon: BarChart3,
        desktopPos: "top-1/2 left-2 -translate-y-1/2 xl:-left-6",
        connectorSide: "right",
      },
      {
        id: "macro-fats",
        label: "Fats & Vitamins",
        sublabel: "Balanced energy split",
        targetView: "scanner",
        icon: Scale,
        desktopPos: "bottom-20 right-2 xl:-right-4",
        connectorSide: "left",
      },
      {
        id: "portion-control",
        label: "Portion Control",
        sublabel: "Interactive gram sliders",
        targetView: "scanner",
        icon: SlidersHorizontal,
        desktopPos: "bottom-5 left-2 xl:-left-4",
        connectorSide: "right",
      },
    ],
  },
  {
    number: "03",
    eyebrow: "HEALTHIER FOOD ALTERNATIVES",
    heading: "Small Swaps. Measurable Daily Gains.",
    description:
      "Compare indulgent staples against protein-rich, lighter whole-food upgrades side by side without sacrificing flavor.",
    greenInfo: "Chapter 03 • 3 Practical Swaps Per Scan & Comparator",
    ctaLabel: "Compare Healthy Swaps",
    ctaView: "alternatives",
    imageSrc: "/images/healthy-swaps.jpg",
    imageAlt: "Oven-baked root vegetable crisps and herb popcorn healthier swaps",
    auraGradient: "radial-gradient(circle at 60% 55%, rgba(163,255,18,0.13), transparent 65%)",
    labels: [
      {
        id: "original-meal",
        label: "Original Meal",
        sublabel: "Baseline scan items",
        targetView: "alternatives",
        icon: Scale,
        desktopPos: "top-6 left-2 xl:-left-5",
        connectorSide: "right",
      },
      {
        id: "healthier-alt",
        label: "Healthier Alternative",
        sublabel: "Whole-food upgrade",
        targetView: "alternatives",
        icon: Sparkles,
        desktopPos: "top-7 right-2 xl:-right-4",
        connectorSide: "left",
      },
      {
        id: "calorie-savings",
        label: "Calorie & Protein Delta",
        sublabel: "Side-by-side compare",
        targetView: "alternatives",
        icon: TrendingDown,
        desktopPos: "bottom-20 left-2 xl:-left-5",
        connectorSide: "right",
      },
      {
        id: "budget-swaps",
        label: "Budget Protein Plans",
        sublabel: "₹50–₹200/day nutrition",
        targetView: "budget",
        icon: BarChart3,
        desktopPos: "bottom-6 right-2 xl:-right-4",
        connectorSide: "left",
      },
    ],
  },
  {
    number: "04",
    eyebrow: "YOUR PERSONAL NUTRITION JOURNEY",
    heading: "Track Habits. Plan Weeks. Transform Health.",
    description:
      "Persist every meal in PostgreSQL, monitor 7-day and 30-day calorie & protein curves, and build customizable Indian weekly menus.",
    greenInfo: "Chapter 04 • PostgreSQL Persistence & Weekly Planner",
    ctaLabel: "Open My Dashboard",
    ctaView: "dashboard",
    imageSrc: "/images/dashboard-preview.jpg",
    imageAlt: "NutriSense AI personal dashboard tablet displaying glowing macro rings alongside healthy whole foods",
    auraGradient: "radial-gradient(circle at 50% 50%, rgba(52,211,153,0.15), transparent 65%)",
    labels: [
      {
        id: "daily-calories",
        label: "Daily Macro Rings",
        sublabel: "Real PostgreSQL intake",
        targetView: "dashboard",
        icon: Flame,
        desktopPos: "top-5 left-2 xl:-left-5",
        connectorSide: "right",
      },
      {
        id: "protein-progress",
        label: "Weekly Trends",
        sublabel: "Interactive 7d & 30d logs",
        targetView: "dashboard",
        icon: LayoutDashboard,
        desktopPos: "top-7 right-2 xl:-right-4",
        connectorSide: "left",
      },
      {
        id: "meal-history",
        label: "Interactive Meal Planner",
        sublabel: "Swap meals per slot",
        targetView: "planner",
        icon: History,
        desktopPos: "bottom-20 left-2 xl:-left-5",
        connectorSide: "right",
      },
      {
        id: "daily-goals",
        label: "Personal Targets",
        sublabel: "Calorie & macro goals",
        targetView: "dashboard",
        actionHint: "goals",
        icon: Target,
        desktopPos: "bottom-6 right-2 xl:-right-4",
        connectorSide: "left",
      },
    ],
  },
];

export function ScrollTimeline({
  onNavigate,
  onOpenDashboardGoals,
  onOpenAssistant,
  todaySummary,
  dailyTargets,
}: ScrollTimelineProps) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 26,
    restDelta: 0.001,
  });

  const lineScaleY = useTransform(smoothProgress, [0, 1], [0.06, 1]);
  const visualScale = useTransform(smoothProgress, [0, 0.35, 0.7, 1], [0.98, 1.03, 0.99, 1.02]);
  const visualTilt = useTransform(smoothProgress, [0, 0.33, 0.66, 1], [-0.9, 0.8, -0.7, 0.4]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const idx =
      latest < 0.24 ? 0 : latest < 0.51 ? 1 : latest < 0.77 ? 2 : 3;
    setActiveIndex((prev) => (prev === idx ? prev : idx));
  });

  const jumpToStep = useCallback((index: number) => {
    setActiveIndex(index);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const containerTop = window.scrollY + rect.top;
    const scrollableDistance = Math.max(container.offsetHeight - window.innerHeight, 1);
    const targetProgress = index === 0 ? 0.03 : index === 1 ? 0.34 : index === 2 ? 0.63 : 0.92;
    window.scrollTo({
      top: containerTop + scrollableDistance * targetProgress,
      behavior: "smooth",
    });
  }, []);

  const handleLabelClick = (label: FloatingFeatureLabel) => {
    if (label.actionHint === "goals") {
      onOpenDashboardGoals();
      return;
    }
    onNavigate(label.targetView);
  };

  const activeStep = STORY_STEPS[activeIndex] ?? STORY_STEPS[0];

  return (
    <section
      id="storytelling"
      aria-label="Interactive Nutrition Journey"
      className="relative overflow-x-clip rounded-[2.25rem] border border-white/10 bg-[#0A0A0A] transition-colors duration-700"
      style={{ backgroundImage: activeStep.auraGradient }}
    >
      {/* Subtle animated circuit lines & floating botanical particles */}
      <CircuitLines variant="section" className="rounded-[2.25rem] opacity-65" />
      <FloatingFoodIngredients variant="story" scrollProgress={smoothProgress} />

      {/* Section Intro Banner */}
      <div className="relative z-10 border-b border-white/[0.08] px-6 py-8 sm:px-10 lg:px-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#B6FF38]/30 bg-[#B6FF38]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#B6FF38]">
              <Sparkles className="h-3.5 w-3.5" />
              Interactive Platform Walkthrough
            </span>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Four Chapters of NutriSense Intelligence
            </h2>
          </div>

          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            {STORY_STEPS.map((step, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => jumpToStep(idx)}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "border-[#B6FF38]/60 bg-[#B6FF38]/15 text-[#B6FF38] shadow-[0_0_20px_rgba(182,255,56,0.2)]"
                      : "border-white/10 bg-[#141B16] text-[#A3ADA6] hover:border-white/25 hover:text-white"
                  }`}
                >
                  <span className="font-mono text-[11px]">{step.number}</span>
                  <span>{step.eyebrow.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DESKTOP STICKY SPLIT-SCREEN STORYTELLING */}
      <div ref={containerRef} className="relative hidden lg:block lg:h-[260vh]">
        <div className="sticky top-20 flex min-h-[calc(100vh-6rem)] items-center px-10 py-10 xl:px-14">
          <div className="grid w-full grid-cols-12 items-center gap-6">
            {/* LEFT SIDE */}
            <div className="col-span-5 pr-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep.number}
                  initial={prefersReduced ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReduced ? undefined : { opacity: 0, y: -16 }}
                  transition={{ duration: 0.36, ease: EASE_PREMIUM }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-4xl font-extrabold text-[#B6FF38]">
                      {activeStep.number}
                    </span>
                    <div className="h-px w-10 bg-[#B6FF38]/40" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#34D399]">
                      {activeStep.eyebrow}
                    </span>
                  </div>

                  <h3 className="font-display text-4xl leading-[1.08] font-extrabold tracking-tight text-white xl:text-[2.75rem]">
                    <SplitText
                      key={activeStep.number}
                      text={activeStep.heading}
                      delay={0.04}
                    />
                  </h3>

                  <p className="max-w-lg text-base leading-relaxed text-[#A3ADA6]">
                    {activeStep.description}
                  </p>

                  <div className="inline-flex items-center gap-2 rounded-xl border border-[#34D399]/30 bg-[#34D399]/10 px-4 py-2 text-xs font-semibold text-[#34D399]">
                    <span className="h-2 w-2 rounded-full bg-[#B6FF38] shadow-[0_0_8px_#B6FF38]" />
                    <span>{activeStep.greenInfo}</span>
                  </div>

                  {activeStep.number === "04" && (
                    <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-white/10 bg-[#141B16]/90 p-3.5">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#A3ADA6]">
                          Today kcal
                        </p>
                        <p className="font-mono text-base font-bold text-[#B6FF38]">
                          {Math.round(todaySummary.total_calories)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#A3ADA6]">
                          Protein
                        </p>
                        <p className="font-mono text-base font-bold text-[#34D399]">
                          {todaySummary.total_protein.toFixed(0)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#A3ADA6]">
                          Goal kcal
                        </p>
                        <p className="font-mono text-base font-bold text-white">
                          {dailyTargets.calories}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onNavigate(activeStep.ctaView)}
                      className="inline-flex items-center gap-2.5 rounded-full bg-[#B6FF38] px-6 py-3.5 text-sm font-bold text-[#080B09] shadow-[0_0_28px_rgba(182,255,56,0.28)] transition hover:bg-[#c8ff66]"
                    >
                      <span>{activeStep.ctaLabel}</span>
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>

                    <button
                      type="button"
                      onClick={onOpenAssistant}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#141B16] px-4 py-3 text-xs font-semibold text-zinc-200 transition hover:border-[#34D399]/50 hover:text-white"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#34D399]" />
                      <span>Ask Nutri AI</span>
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* CENTER: Animated Timeline with Diamond Number Indicators */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="relative flex h-[390px] w-12 flex-col items-center justify-between py-2">
                <div
                  aria-hidden="true"
                  className="absolute top-6 bottom-6 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-white/[0.12]"
                />
                <motion.div
                  aria-hidden="true"
                  style={{ scaleY: prefersReduced ? (activeIndex + 1) / 4 : lineScaleY, originY: 0 }}
                  className="absolute top-6 bottom-6 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#B6FF38] via-[#34D399] to-[#B6FF38] shadow-[0_0_12px_rgba(182,255,56,0.65)]"
                />

                {STORY_STEPS.map((step, idx) => {
                  const isActive = idx === activeIndex;
                  const isPassed = idx < activeIndex;
                  return (
                    <button
                      key={step.number}
                      type="button"
                      onClick={() => jumpToStep(idx)}
                      aria-label={`Jump to chapter ${step.number}: ${step.eyebrow}`}
                      className="group relative z-10 flex items-center justify-center focus:outline-none"
                    >
                      <motion.span
                        animate={{ scale: isActive ? 1.18 : 1 }}
                        transition={{ type: "spring", stiffness: 360, damping: 24 }}
                        className={`flex h-10 w-10 rotate-45 items-center justify-center rounded-lg border transition-all duration-300 ${
                          isActive
                            ? "border-[#B6FF38] bg-[#B6FF38] text-[#080B09] shadow-[0_0_24px_rgba(182,255,56,0.55)]"
                            : isPassed
                              ? "border-[#34D399] bg-[#141B16] text-[#34D399] shadow-[0_0_14px_rgba(52,211,153,0.28)]"
                              : "border-white/20 bg-[#080B09] text-[#A3ADA6] group-hover:border-[#B6FF38]/60 group-hover:text-white"
                        }`}
                      >
                        <span className="-rotate-45 font-mono text-xs font-extrabold">
                          {step.number}
                        </span>
                      </motion.span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT SIDE: Sticky Interactive Image with Scroll Scale/Tilt + Floating Labels */}
            <div className="col-span-6 pl-4">
              <div className="relative mx-auto max-w-[540px] py-4">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-[#A3FF12]/15 via-transparent to-[#34D399]/15 blur-2xl"
                />

                <motion.div
                  style={
                    prefersReduced
                      ? undefined
                      : { scale: visualScale, rotate: visualTilt }
                  }
                  className="relative overflow-hidden rounded-[1.75rem] border border-[#34D399]/35 bg-[#121212] p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06]"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep.imageSrc}
                      initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={prefersReduced ? undefined : { opacity: 0, scale: 1.03 }}
                      transition={{ duration: 0.42, ease: EASE_PREMIUM }}
                      className="group relative overflow-hidden rounded-2xl"
                    >
                      <img
                        src={activeStep.imageSrc}
                        alt={activeStep.imageAlt}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-[#050706]/85 via-[#050706]/10 to-transparent"
                      />
                      <div className="absolute right-4 bottom-3 left-4 flex items-center justify-between text-xs text-zinc-300">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[#A3FF12]">
                          {activeStep.eyebrow}
                        </span>
                        <span className="text-[11px] text-[#A1A1AA]">
                          Click any floating label to open
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                {/* Floating Clickable Feature Labels Around the Image */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`labels-${activeStep.number}`}
                    initial={prefersReduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={prefersReduced ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="pointer-events-none absolute inset-0"
                  >
                    {activeStep.labels.map((label, idx) => {
                      const Icon = label.icon;
                      return (
                        <motion.button
                          key={label.id}
                          type="button"
                          onClick={() => handleLabelClick(label)}
                          initial={prefersReduced ? false : { opacity: 0, y: 10, scale: 0.94 }}
                          animate={
                            prefersReduced
                              ? { opacity: 1 }
                              : {
                                  opacity: 1,
                                  y: [0, idx % 2 === 0 ? -4 : 4, 0],
                                  scale: 1,
                                }
                          }
                          transition={{
                            opacity: { duration: 0.3, delay: idx * 0.06 },
                            scale: { duration: 0.3, delay: idx * 0.06 },
                            y: {
                              duration: 4.2 + idx * 0.4,
                              repeat: Infinity,
                              ease: "easeInOut",
                            },
                          }}
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.97 }}
                          className={`pointer-events-auto group/tag absolute ${label.desktopPos} z-20 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-[#080B09]/88 px-3.5 py-2.5 text-left backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.75)] transition-colors hover:border-[#B6FF38] hover:bg-[#141B16] hover:shadow-[0_0_24px_rgba(182,255,56,0.28)]`}
                        >
                          <span
                            aria-hidden="true"
                            className={`hidden h-px w-3 bg-[#34D399]/60 xl:block ${
                              label.connectorSide === "right" ? "order-last -mr-1.5" : "-ml-1.5"
                            }`}
                          />
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399] transition-colors group-hover/tag:border-[#B6FF38]/60 group-hover/tag:bg-[#B6FF38]/15 group-hover/tag:text-[#B6FF38]">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 text-xs font-bold whitespace-nowrap text-white group-hover/tag:text-[#B6FF38]">
                              <span>{label.label}</span>
                              <ArrowUpRight className="h-3 w-3 opacity-60 transition-transform group-hover/tag:translate-x-0.5 group-hover/tag:-translate-y-0.5 group-hover/tag:opacity-100" />
                            </p>
                            <p className="text-[10px] whitespace-nowrap text-[#A3ADA6]">
                              {label.sublabel}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE & TABLET STACKED STORYTELLING */}
      <div className="relative z-10 space-y-10 px-4 py-8 sm:px-8 lg:hidden">
        {STORY_STEPS.map((step, idx) => (
          <div
            key={step.number}
            className="relative rounded-3xl border border-white/10 bg-[#141B16]/90 p-5 sm:p-6"
          >
            <div className="flex items-center gap-3.5">
              <span
                className={`flex h-9 w-9 shrink-0 rotate-45 items-center justify-center rounded-lg border font-mono text-xs font-extrabold ${
                  idx === 0
                    ? "border-[#B6FF38] bg-[#B6FF38] text-[#080B09]"
                    : "border-[#34D399]/60 bg-[#080B09] text-[#34D399]"
                }`}
              >
                <span className="-rotate-45">{step.number}</span>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#34D399]">
                  {step.eyebrow}
                </p>
                <h3 className="font-display text-xl font-extrabold text-white sm:text-2xl">
                  {step.heading}
                </h3>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-[#A3ADA6]">
              {step.description}
            </p>

            <div className="mt-4 overflow-hidden rounded-2xl border border-[#34D399]/25 bg-[#080B09]">
              <img
                src={step.imageSrc}
                alt={step.imageAlt}
                loading="lazy"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {step.labels.map((label) => {
                const Icon = label.icon;
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => handleLabelClick(label)}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#080B09] px-3 py-2.5 text-left transition hover:border-[#B6FF38]/60"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                    <span className="truncate text-xs font-semibold text-white">
                      {label.label}
                    </span>
                    <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 text-[#B6FF38]" />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onNavigate(step.ctaView)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#B6FF38] px-5 py-2.5 text-xs font-bold text-[#080B09]"
            >
              <span>{step.ctaLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
