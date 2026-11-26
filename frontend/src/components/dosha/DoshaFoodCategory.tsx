import { motion, useReducedMotion } from "framer-motion";
import {
  Apple,
  ArrowUpRight,
  Droplets,
  Flame,
  Leaf,
  Sprout,
  Utensils,
  Wheat,
} from "lucide-react";
import type {
  DoshaFoodCategoryGroup,
  DoshaThemeTokens,
} from "../../data/doshas";
import { INDIAN_FOODS_DATA } from "../../data/indianFoods";
import type { AppView } from "../../types/nutrition";
import { EASE_PREMIUM } from "../MotionPrimitives";

interface DoshaFoodCategoryProps {
  category: DoshaFoodCategoryGroup;
  theme: DoshaThemeTokens;
  onNavigate?: (view: AppView) => void;
}

function getCategoryIcon(key: DoshaFoodCategoryGroup["key"]) {
  switch (key) {
    case "grains":
      return Wheat;
    case "fruits":
      return Apple;
    case "vegetables":
      return Leaf;
    case "pulses":
      return Sprout;
    case "dairy":
      return Droplets;
    case "spices":
      return Flame;
    case "meals":
      return Utensils;
  }
}

/**
 * Displays familiar Indian culinary illustrations inside an Ayurvedic food category.
 * Separates traditional cultural food examples cleanly from verified database macros.
 */
export function DoshaFoodCategory({
  category,
  theme,
  onNavigate,
}: DoshaFoodCategoryProps) {
  const prefersReduced = useReducedMotion();
  const Icon = getCategoryIcon(category.key);

  return (
    <motion.div
      key={category.key}
      initial={prefersReduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_PREMIUM }}
      className="space-y-4"
    >
      {/* Category Summary Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#050706] px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${theme.chipClasses}`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
              {category.label}
            </p>
            <p className="font-display text-base font-bold text-white">
              {category.favouredTrait}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-[#121212] px-3 py-1 text-[11px] text-[#A1A1AA]">
          Illustrative Traditional Examples
        </span>
      </div>

      {/* Ingredient / Dish Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {category.examples.map((ex, idx) => {
          const matchedFood = ex.indianFoodsMatchId
            ? INDIAN_FOODS_DATA.find((f) => f.id === ex.indianFoodsMatchId)
            : undefined;

          return (
            <motion.article
              key={ex.name}
              initial={prefersReduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.32,
                delay: prefersReduced ? 0 : idx * 0.06,
                ease: EASE_PREMIUM,
              }}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 transition hover:border-white/25"
            >
              <div>
                {matchedFood && (
                  <div className="mb-3 overflow-hidden rounded-xl border border-white/[0.08] bg-[#050706]">
                    <img
                      src={matchedFood.imagePath}
                      alt={matchedFood.name}
                      loading="lazy"
                      className="aspect-[16/9] w-full object-cover transition duration-500 hover:scale-105"
                    />
                  </div>
                )}

                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${theme.chipClasses}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="font-display text-sm font-bold text-white">
                      {ex.name}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">
                      {ex.preparationNote}
                    </p>
                  </div>
                </div>
              </div>

              {matchedFood && (
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-[11px]">
                  <span className="font-mono text-[#34D399]">
                    NutriSense Data: ~{matchedFood.calories} kcal /{" "}
                    {matchedFood.protein}g P
                  </span>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate("indian-foods")}
                      className="inline-flex items-center gap-0.5 font-semibold text-[#A3FF12] hover:underline"
                    >
                      <span>View</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </motion.article>
          );
        })}
      </div>
    </motion.div>
  );
}
