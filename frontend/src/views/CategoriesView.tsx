import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Baby,
  Check,
  Flower2,
  Globe2,
  HeartPulse,
  Info,
  ShieldAlert,
  User,
} from "lucide-react";
import { HumanCategorySelector } from "../components/HumanSelectionCards";
import {
  EASE_PREMIUM,
  staggerContainerVariants,
  staggerItemVariants,
} from "../components/MotionPrimitives";
import { RecommendedProductsHub } from "../components/products/RecommendedProductsHub";
import {
  NUTRITION_CATEGORIES,
  type NutritionCategoryGuide,
} from "../data/categories";
import type { AppView } from "../types/nutrition";
import { WomensWellnessView } from "./WomensWellnessView";

const HABITS_STORAGE_KEY = "nutrisense_category_habits_v1";

const CATEGORY_META: Record<
  NutritionCategoryGuide["id"],
  {
    icon: typeof User;
    tagline: string;
    gradient: string;
    cardHover: string;
    iconBadge: string;
    badgePill: string;
    pillarTitle: string;
  }
> = {
  "mens-health": {
    icon: User,
    tagline: "Strength • Fiber • Heart Health",
    gradient: "from-[#A3FF12]/12 via-[#34D399]/5 to-transparent",
    cardHover:
      "hover:border-[#A3FF12]/40 hover:shadow-[0_14px_34px_rgba(163,255,18,0.08)]",
    iconBadge: "border-[#A3FF12]/40 bg-[#050706]/90 text-[#A3FF12]",
    badgePill: "border-[#A3FF12]/30 bg-[#0A0A0A]/80 text-[#A3FF12]",
    pillarTitle: "text-[#A3FF12]",
  },
  "womens-health": {
    icon: Flower2,
    tagline: "Iron • Folate • Holistic Rhythm",
    gradient: "from-rose-300/15 via-pink-400/5 to-transparent",
    cardHover:
      "border-rose-300/15 hover:border-rose-300/45 hover:shadow-[0_14px_34px_rgba(253,164,175,0.10)]",
    iconBadge: "border-rose-300/45 bg-[#140B10]/90 text-rose-300",
    badgePill: "border-rose-300/30 bg-[#140B10]/80 text-rose-200",
    pillarTitle: "text-rose-300",
  },
  "baby-nutrition": {
    icon: Baby,
    tagline: "Age Stages • Safe Textures",
    gradient: "from-amber-300/15 via-amber-200/5 to-transparent",
    cardHover:
      "border-amber-200/15 hover:border-amber-200/45 hover:shadow-[0_14px_34px_rgba(252,211,77,0.10)]",
    iconBadge: "border-amber-200/45 bg-[#14110A]/90 text-amber-200",
    badgePill: "border-amber-200/30 bg-[#14110A]/80 text-amber-200",
    pillarTitle: "text-amber-200",
  },
  "patient-nutrition": {
    icon: HeartPulse,
    tagline: "Gentle Recovery • Care Literacy",
    gradient: "from-sky-300/15 via-teal-400/5 to-transparent",
    cardHover:
      "border-sky-300/15 hover:border-sky-300/45 hover:shadow-[0_14px_34px_rgba(56,189,248,0.10)]",
    iconBadge: "border-sky-300/45 bg-[#0A1317]/90 text-sky-300",
    badgePill: "border-sky-300/30 bg-[#0A1317]/80 text-sky-200",
    pillarTitle: "text-sky-300",
  },
};

function loadCheckedHabits(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(HABITS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

interface CategoriesViewProps {
  initialCategory?: "all" | NutritionCategoryGuide["id"];
  onNavigate?: (view: AppView) => void;
  onDataLogged?: (message: string) => void;
}

export function CategoriesView({
  initialCategory = "all",
  onNavigate,
  onDataLogged,
}: CategoriesViewProps) {
  const prefersReduced = useReducedMotion();
  const [selectedId, setSelectedId] = useState<
    "all" | NutritionCategoryGuide["id"]
  >(initialCategory);
  const [checkedHabits, setCheckedHabits] = useState<Record<string, boolean>>(
    () => loadCheckedHabits(),
  );

  useEffect(() => {
    setSelectedId(initialCategory);
  }, [initialCategory]);

  const visibleCategories =
    selectedId === "all"
      ? NUTRITION_CATEGORIES
      : NUTRITION_CATEGORIES.filter((cat) => cat.id === selectedId);

  function toggleHabit(habitKey: string) {
    setCheckedHabits((prev) => {
      const next = { ...prev, [habitKey]: !prev[habitKey] };
      try {
        localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121212] px-6 py-6 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-[#34D399]/10 blur-[100px]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-1 text-xs font-semibold text-[#34D399]">
              <Info className="h-3.5 w-3.5" />
              Educational Guidance Only
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">
              Nutrition &amp; Categories
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[#A1A1AA]">
              Structured educational nutrition profiles, nutrient-dense whole
              foods, and interactive daily habit checklists across life stages.
            </p>
          </div>

          {/* Animated Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-1.5">
            {(
              [
                { id: "all", label: "All Categories" },
                ...NUTRITION_CATEGORIES.map((c) => ({
                  id: c.id,
                  label: c.title,
                })),
              ] as const
            ).map((tab) => {
              const isSelected = selectedId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedId(tab.id)}
                  className={`relative rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isSelected
                      ? "text-[#0A0A0A]"
                      : "text-[#A1A1AA] hover:text-white"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="category-filter-pill"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      className="absolute inset-0 rounded-xl bg-[#A3FF12]"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Human Portrait Category Selector (Male / Female / Child & Baby / Patient Care) */}
      <section aria-label="Select Nutrition Category" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#34D399]">
            Select Life-Stage &amp; User Profile
          </p>
          <span className="text-xs text-[#A1A1AA]">
            Click any portrait card to filter tailored nutrition guidelines
          </span>
        </div>
        <HumanCategorySelector
          selectedId={selectedId}
          onSelect={(catId) =>
            setSelectedId((prev) => (prev === catId ? "all" : catId))
          }
          onShowAll={() => setSelectedId("all")}
        />
      </section>

      {/* Global Educational Disclaimer */}
      <div className="flex items-start gap-3.5 rounded-2xl border border-[#34D399]/25 bg-[#121212] px-5 py-4 text-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#34D399]/10 text-[#34D399]">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <p className="text-xs leading-relaxed text-zinc-300 sm:text-sm">
          <span className="font-semibold text-white">
            Educational Guidance Notice:
          </span>{" "}
          Content below is provided solely for general nutritional education and
          does not replace personalized medical advice, pediatric counseling, or
          clinical nutrition therapy.
        </p>
      </div>

      {/* Category Cards Grid */}
      <motion.div
        key={selectedId}
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 md:grid-cols-2"
      >
        {visibleCategories.map((category) => {
          const meta = CATEGORY_META[category.id];
          const Icon = meta.icon;
          const completedCount = category.priorities.filter(
            (_, i) => checkedHabits[`${category.id}-${i}`],
          ).length;

          return (
            <motion.section
              key={category.id}
              variants={staggerItemVariants}
              whileHover={prefersReduced ? undefined : { y: -3 }}
              transition={{ duration: 0.25, ease: EASE_PREMIUM }}
              className={`flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121212] shadow-xl transition-all duration-300 ease-out ${meta.cardHover}`}
            >
              <div>
                {/* Distinct Accent Card Header with Human Portrait Thumbnail */}
                <div
                  className={`border-b border-white/[0.07] bg-gradient-to-br ${meta.gradient} p-6`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-[#0A0A0A] shadow-lg">
                        <img
                          src={category.imagePath}
                          alt={category.imageAlt}
                          loading="lazy"
                          className="h-full w-full object-cover object-top"
                        />
                        <span
                          className={`absolute right-0.5 bottom-0.5 flex h-5 w-5 items-center justify-center rounded-lg border ${meta.iconBadge}`}
                        >
                          <Icon className="h-3 w-3" />
                        </span>
                      </div>
                      <div>
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                          {meta.tagline}
                        </p>
                        <h2 className="mt-0.5 font-display text-xl font-extrabold text-white">
                          {category.title}
                        </h2>
                      </div>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${meta.badgePill}`}
                    >
                      {category.badge}
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-medium text-zinc-300">
                    {category.subtitle}
                  </p>
                </div>

                <div className="p-6">
                  {/* Summary */}
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {category.summary}
                  </p>

                  {/* Macro / Nutrient Focus Pillars */}
                  <div className="mt-5 space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Key Nutritional Pillars
                    </p>
                    {category.macroFocus.map((pillar) => (
                      <div
                        key={pillar.label}
                        className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] px-3.5 py-2.5"
                      >
                        <p className={`text-xs font-semibold ${meta.pillarTitle}`}>
                          {pillar.label}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#A1A1AA]">
                          {pillar.detail}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Daily Habit Checklist */}
                  <div className="mt-5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Daily Habit Checklist
                      </p>
                      <span className="font-mono text-[11px] font-semibold text-[#34D399]">
                        {completedCount}/{category.priorities.length} checked
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {category.priorities.map((point, idx) => {
                        const habitKey = `${category.id}-${idx}`;
                        const checked = Boolean(checkedHabits[habitKey]);
                        return (
                          <li key={point}>
                            <button
                              type="button"
                              onClick={() => toggleHabit(habitKey)}
                              className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left text-xs leading-relaxed transition ${
                                checked
                                  ? "border-[#34D399]/35 bg-[#34D399]/10 text-white"
                                  : "border-white/[0.06] bg-[#0A0A0A] text-zinc-300 hover:border-white/15"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${
                                  checked
                                    ? "border-[#34D399] bg-[#34D399] text-[#0A0A0A]"
                                    : "border-white/25 bg-[#171717]"
                                }`}
                              >
                                {checked && <Check className="h-3 w-3 stroke-[3]" />}
                              </span>
                              <span
                                className={
                                  checked
                                    ? "text-zinc-200 line-through decoration-[#34D399]/60"
                                    : ""
                                }
                              >
                                {point}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Whole-Food Chips */}
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Healthy Food Chips
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {category.smartFoods.map((food) => (
                        <span
                          key={food}
                          className="rounded-full border border-white/10 bg-[#171717] px-3 py-1 text-xs font-medium text-zinc-200 transition hover:border-[#34D399]/40"
                        >
                          {food}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category-Specific Caution Note & Dedicated Module Gateway */}
              <div className="border-t border-white/[0.08] bg-[#0A0A0A]/50 px-6 py-3.5 text-[11px] leading-relaxed text-[#A1A1AA]">
                <p>{category.cautionNote}</p>
                {category.id === "womens-health" && selectedId === "all" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId("womens-health");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-300 px-3.5 py-2 text-xs font-bold text-[#140B10] transition hover:bg-rose-200"
                  >
                    <Flower2 className="h-3.5 w-3.5" />
                    <span>Open Women Wellness &amp; Period Care Garden</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {category.id === "mens-health" && (
                  <a
                    href="#men"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("men");
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3.5 py-2 text-xs font-bold text-[#A3FF12] transition hover:bg-[#A3FF12] hover:text-[#050706] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12]"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Open Full Men&apos;s Health Guide</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
                {category.id === "baby-nutrition" && (
                  <a
                    href="#baby"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("baby");
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-amber-200/35 bg-amber-200/10 px-3.5 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-200 hover:text-[#14110A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    <Baby className="h-3.5 w-3.5" />
                    <span>Open Babies &amp; Children&apos;s Guide</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
                {category.id === "patient-nutrition" && (
                  <a
                    href="#patient"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("patient");
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-sky-300/35 bg-sky-300/10 px-3.5 py-2 text-xs font-bold text-sky-300 transition hover:bg-sky-300 hover:text-[#071318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  >
                    <HeartPulse className="h-3.5 w-3.5" />
                    <span>Open Patient Nutrition Education</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </motion.section>
          );
        })}
      </motion.div>

      {/* Complete Women Wellness Sanctuary inside Women's Health section */}
      {selectedId === "womens-health" && (
        <WomensWellnessView
          onNavigate={onNavigate ?? (() => {})}
          onDataLogged={onDataLogged}
          embeddedInWomenSection
        />
      )}

      {/* Dedicated In-Depth Educational Guides (Men's Health, Babies & Children, Patient Education) */}
      <section
        aria-label="Dedicated Educational Nutrition Modules"
        className="space-y-4 rounded-3xl border border-white/[0.08] bg-[#121212] p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#A3FF12]">
              In-Depth Learning Paths
            </span>
            <h2 className="mt-1 font-display text-xl font-bold text-white">
              Dedicated Educational Nutrition Modules
            </h2>
          </div>
          <p className="max-w-lg text-xs text-[#A1A1AA]">
            Explore structured food literacy guides with safety context, daily swaps, and public-health references.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <a
            href="#men"
            onClick={(e) => {
              e.preventDefault();
              onNavigate?.("men");
            }}
            className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#141915] p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#A3FF12]/45 hover:shadow-[0_10px_28px_rgba(163,255,18,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12]"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#A3FF12]/30 bg-[#A3FF12]/10 text-[#A3FF12]">
                <User className="h-5 w-5" />
              </div>
              <h3 className="mt-3.5 font-display text-base font-bold text-white transition-colors group-hover:text-[#A3FF12]">
                Men&apos;s Health
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                Protein habits, heart wellness, hydration, and everyday Indian home meal swaps.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#A3FF12]">
              <span>Explore Men&apos;s Guide</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </a>

          <a
            href="#baby"
            onClick={(e) => {
              e.preventDefault();
              onNavigate?.("baby");
            }}
            className="group flex flex-col justify-between rounded-2xl border border-amber-200/15 bg-[#16150F] p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-amber-200/45 hover:shadow-[0_10px_28px_rgba(252,211,77,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200/30 bg-amber-200/10 text-amber-200">
                <Baby className="h-5 w-5" />
              </div>
              <h3 className="mt-3.5 font-display text-base font-bold text-white transition-colors group-hover:text-amber-200">
                Babies &amp; Children&apos;s Nutrition
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                Broad developmental stage education from early infancy through growing school years.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200">
              <span>Explore Child Guide</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </a>

          <a
            href="#patient"
            onClick={(e) => {
              e.preventDefault();
              onNavigate?.("patient");
            }}
            className="group flex flex-col justify-between rounded-2xl border border-sky-300/15 bg-[#101619] p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-sky-300/45 hover:shadow-[0_10px_28px_rgba(56,189,248,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/30 bg-sky-300/10 text-sky-300">
                <HeartPulse className="h-5 w-5" />
              </div>
              <h3 className="mt-3.5 font-display text-base font-bold text-white transition-colors group-hover:text-sky-200">
                Patient Nutrition Education
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                Diabetes, heart, kidney, BP, and thyroid literacy plus visit checklist questions.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300">
              <span>Explore Patient Guide</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </a>
        </div>
      </section>

      {/* Global Nutrition & Japan-Inspired Balance Bridge */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#34D399]/25 bg-gradient-to-r from-[#121914] to-[#121212] p-6">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#34D399]">
            <Globe2 className="h-3.5 w-3.5" />
            World Dietary Balance
          </span>
          <h3 className="mt-1 font-display text-lg font-bold text-white">
            Compare Indian &amp; Japanese Dishes &amp; Explore the Food Balance Spinning Guide
          </h3>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Explore MEXT standard food composition per 100g, customize healthy Bento meal boxes,
            and discover seasonal fruits &amp; vegetables across India and Japan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.("global-nutrition")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#A3FF12] px-4 py-2.5 text-xs font-bold text-[#050706] transition hover:bg-[#b8ff42]"
        >
          <span>Open Global Nutrition</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Centralized Reusable Product Recommendation Hub Scoped to Active Category */}
      <RecommendedProductsHub
        defaultAudience={
          selectedId === "mens-health"
            ? "men"
            : selectedId === "womens-health"
              ? "women"
              : selectedId === "baby-nutrition"
                ? "babies"
                : selectedId === "patient-nutrition"
                  ? "patients"
                  : "all"
        }
        referrerSection={`categories_${selectedId}`}
        title="Curated Category Essentials & Comparison"
        subtitle="Powered by the centralized NutriSense product catalog across Men, Women, Babies, and Patients."
      />
    </div>
  );
}
