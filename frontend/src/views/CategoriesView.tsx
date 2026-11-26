import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Baby,
  Check,
  HeartHandshake,
  Info,
  ShieldAlert,
  Sparkles,
  User,
} from "lucide-react";
import {
  EASE_PREMIUM,
  staggerContainerVariants,
  staggerItemVariants,
} from "../components/MotionPrimitives";
import {
  NUTRITION_CATEGORIES,
  type NutritionCategoryGuide,
} from "../data/categories";

const HABITS_STORAGE_KEY = "nutrisense_category_habits_v1";

const CATEGORY_META: Record<
  NutritionCategoryGuide["id"],
  {
    icon: typeof User;
    tagline: string;
    gradient: string;
  }
> = {
  "mens-health": {
    icon: User,
    tagline: "Strength • Fiber • Heart Health",
    gradient: "from-[#A3FF12]/15 via-[#34D399]/5 to-transparent",
  },
  "womens-health": {
    icon: Sparkles,
    tagline: "Iron • Folate • Bone Density",
    gradient: "from-[#34D399]/15 via-emerald-400/5 to-transparent",
  },
  "baby-nutrition": {
    icon: Baby,
    tagline: "6–24 Months • Safe Textures",
    gradient: "from-[#A3FF12]/15 via-lime-300/5 to-transparent",
  },
  "patient-nutrition": {
    icon: HeartHandshake,
    tagline: "Gentle Recovery • Hydration",
    gradient: "from-[#34D399]/15 via-teal-400/5 to-transparent",
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

export function CategoriesView() {
  const prefersReduced = useReducedMotion();
  const [selectedId, setSelectedId] = useState<
    "all" | NutritionCategoryGuide["id"]
  >("all");
  const [checkedHabits, setCheckedHabits] = useState<Record<string, boolean>>(
    () => loadCheckedHabits(),
  );

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
          const isLime = category.accent === "lime";
          const completedCount = category.priorities.filter(
            (_, i) => checkedHabits[`${category.id}-${i}`],
          ).length;

          return (
            <motion.section
              key={category.id}
              variants={staggerItemVariants}
              whileHover={prefersReduced ? undefined : { y: -3 }}
              transition={{ duration: 0.25, ease: EASE_PREMIUM }}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121212] shadow-xl transition-colors hover:border-white/20"
            >
              <div>
                {/* Distinct Accent Card Header */}
                <div
                  className={`border-b border-white/[0.07] bg-gradient-to-br ${meta.gradient} p-6`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-lg ${
                          isLime
                            ? "border-[#A3FF12]/35 bg-[#A3FF12]/15 text-[#A3FF12]"
                            : "border-[#34D399]/35 bg-[#34D399]/15 text-[#34D399]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
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

                    <span className="rounded-full border border-[#34D399]/30 bg-[#0A0A0A]/70 px-3 py-1 text-[11px] font-semibold text-[#34D399]">
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
                        <p
                          className={`text-xs font-semibold ${
                            isLime ? "text-[#A3FF12]" : "text-[#34D399]"
                          }`}
                        >
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

              {/* Category-Specific Caution Note */}
              <div className="border-t border-white/[0.08] bg-[#0A0A0A]/50 px-6 py-3.5 text-[11px] leading-relaxed text-[#A1A1AA]">
                {category.cautionNote}
              </div>
            </motion.section>
          );
        })}
      </motion.div>
    </div>
  );
}
