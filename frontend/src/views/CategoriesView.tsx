import { useState } from "react";
import {
  Baby,
  CheckCircle2,
  HeartHandshake,
  Info,
  ShieldAlert,
  Sparkles,
  User,
} from "lucide-react";
import {
  NUTRITION_CATEGORIES,
  type NutritionCategoryGuide,
} from "../data/categories";

const CATEGORY_ICONS: Record<NutritionCategoryGuide["id"], typeof User> = {
  "mens-health": User,
  "womens-health": Sparkles,
  "baby-nutrition": Baby,
  "patient-nutrition": HeartHandshake,
};

export function CategoriesView() {
  const [selectedId, setSelectedId] = useState<
    "all" | NutritionCategoryGuide["id"]
  >("all");

  const visibleCategories =
    selectedId === "all"
      ? NUTRITION_CATEGORIES
      : NUTRITION_CATEGORIES.filter((cat) => cat.id === selectedId);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-1 text-xs font-medium text-[#34D399]">
            <Info className="h-3.5 w-3.5" />
            Educational Guidance Only
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white">
            Nutrition &amp; Categories
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-zinc-400">
            Structured educational nutrition profiles across everyday wellness, infant feeding
            milestones, and gentle recovery support.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/[0.08] bg-[#121212] p-1.5">
          <button
            type="button"
            onClick={() => setSelectedId("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              selectedId === "all"
                ? "bg-[#A3FF12] text-[#0A0A0A]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            All Categories
          </button>
          {NUTRITION_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedId(category.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                selectedId === category.id
                  ? "bg-[#A3FF12] text-[#0A0A0A]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {category.title}
            </button>
          ))}
        </div>
      </div>

      {/* Global Educational Disclaimer */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#34D399]/25 bg-[#121212] px-5 py-4 text-sm">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#34D399]" />
        <p className="text-zinc-300">
          <span className="font-semibold text-white">Educational Guidance Notice:</span>{" "}
          Content below is provided solely for general nutritional education and does not replace
          personalized medical advice, pediatric counseling, or clinical nutrition therapy.
        </p>
      </div>

      {/* Category Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {visibleCategories.map((category) => {
          const Icon = CATEGORY_ICONS[category.id];
          const isLime = category.accent === "lime";

          return (
            <section
              key={category.id}
              className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121212] p-6 transition hover:border-white/20"
            >
              <div>
                {/* Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                        isLime
                          ? "border-[#A3FF12]/30 bg-[#A3FF12]/10 text-[#A3FF12]"
                          : "border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold text-white">
                        {category.title}
                      </h2>
                      <p className="text-xs text-zinc-400">{category.subtitle}</p>
                    </div>
                  </div>

                  <span className="rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-2.5 py-1 text-[11px] font-semibold text-[#34D399]">
                    {category.badge}
                  </span>
                </div>

                {/* Summary */}
                <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                  {category.summary}
                </p>

                {/* Macro / Nutrient Focus */}
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
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                        {pillar.detail}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Actionable Priorities */}
                <div className="mt-5 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Everyday Habits
                  </p>
                  <ul className="space-y-1.5">
                    {category.priorities.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-xs leading-relaxed text-zinc-300"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Whole-Food Examples */}
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Nutrient-Dense Examples
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {category.smartFoods.map((food) => (
                      <span
                        key={food}
                        className="rounded-full border border-white/10 bg-[#0A0A0A] px-2.5 py-1 text-xs text-zinc-300"
                      >
                        {food}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Educational Footer Note */}
              <div className="mt-6 border-t border-white/[0.08] pt-3.5 text-[11px] leading-relaxed text-zinc-400">
                {category.cautionNote}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
