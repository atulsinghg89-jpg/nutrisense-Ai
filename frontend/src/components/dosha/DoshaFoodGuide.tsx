import { useState } from "react";
import { Sparkles, Utensils } from "lucide-react";
import type {
  DoshaFoodCategoryKey,
  DoshaProfileData,
} from "../../data/doshas";
import type { AppView } from "../../types/nutrition";
import { DoshaFoodCategory } from "./DoshaFoodCategory";

interface DoshaFoodGuideProps {
  dosha: DoshaProfileData;
  onNavigate?: (view: AppView) => void;
}

/**
 * Interactive Visual Food Guide combining traditional taste/preparation charts
 * and 7 navigable Indian food category tabs.
 */
export function DoshaFoodGuide({ dosha, onNavigate }: DoshaFoodGuideProps) {
  const [activeKey, setActiveKey] = useState<DoshaFoodCategoryKey>(
    dosha.foodCategories[0]?.key ?? "grains",
  );

  const activeCategory =
    dosha.foodCategories.find((c) => c.key === activeKey) ??
    dosha.foodCategories[0];

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-[#121212] p-6 sm:p-8">
      {/* Header + Summary */}
      <div className="grid gap-6 border-b border-white/[0.08] pb-6 lg:grid-cols-12">
        <div className="space-y-2.5 lg:col-span-7">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider ${dosha.theme.badgeClasses}`}
          >
            <Utensils className="h-3 w-3" />
            Food Perspective &amp; Visual Guide
          </span>
          <h3 className="font-display text-2xl font-extrabold text-white">
            Traditional Food Inspirations for {dosha.name}
          </h3>
          <p className="text-sm leading-relaxed text-[#A1A1AA]">
            {dosha.foodPerspectiveSummary}
          </p>
        </div>

        {/* Mini Traditional Taste & Quality Panel */}
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#050706] p-4 lg:col-span-5">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
              Traditionally Favoured Qualities
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {dosha.favouredQualities.map((q) => (
                <span
                  key={q}
                  className="rounded-lg border border-white/10 bg-[#121212] px-2.5 py-1 text-xs font-medium text-zinc-200"
                >
                  {q}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[0.07] pt-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
              Traditional Taste Associations (Rasa)
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {dosha.tastes.map((taste) => (
                <span
                  key={taste}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold ${dosha.theme.chipClasses}`}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {taste}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 7-Category Tabs */}
      <div
        role="tablist"
        aria-label={`${dosha.name} Food Categories`}
        className="flex flex-wrap gap-2"
      >
        {dosha.foodCategories.map((cat) => {
          const isSelected = activeCategory.key === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveKey(cat.key)}
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                isSelected
                  ? dosha.theme.buttonClasses
                  : "border-white/10 bg-[#0A0A0A] text-[#A1A1AA] hover:border-white/25 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Active Category Detail Cards */}
      {activeCategory && (
        <DoshaFoodCategory
          category={activeCategory}
          theme={dosha.theme}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
