import { motion, useReducedMotion } from "framer-motion";
import type { DailyMacroTargets } from "../types/nutrition";
import { EASE_PREMIUM } from "./MotionPrimitives";

interface MacroProgressBarsProps {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  targets: DailyMacroTargets;
  subtitle?: string;
}

interface MacroRowConfig {
  key: "calories" | "protein" | "carbs" | "fats";
  label: string;
  value: number;
  target: number;
  unit: string;
  barGradient: string;
  trackGlow: string;
  badgeText: string;
  dotColor: string;
}

export function MacroProgressBars({
  calories,
  protein,
  carbs,
  fats,
  targets,
  subtitle,
}: MacroProgressBarsProps) {
  const prefersReduced = useReducedMotion();

  const rows: MacroRowConfig[] = [
    {
      key: "calories",
      label: "Calories",
      value: calories,
      target: Math.max(targets.calories, 1),
      unit: "kcal",
      barGradient: "bg-gradient-to-r from-[#A3FF12] to-[#34D399]",
      trackGlow: "shadow-[0_0_16px_rgba(163,255,18,0.35)]",
      badgeText: "text-[#A3FF12]",
      dotColor: "bg-[#A3FF12]",
    },
    {
      key: "protein",
      label: "Protein",
      value: protein,
      target: Math.max(targets.protein, 1),
      unit: "g",
      barGradient: "bg-[#34D399]",
      trackGlow: "shadow-[0_0_14px_rgba(52,211,153,0.35)]",
      badgeText: "text-[#34D399]",
      dotColor: "bg-[#34D399]",
    },
    {
      key: "carbs",
      label: "Carbohydrates",
      value: carbs,
      target: Math.max(targets.carbs, 1),
      unit: "g",
      barGradient: "bg-emerald-300",
      trackGlow: "shadow-[0_0_12px_rgba(110,231,183,0.28)]",
      badgeText: "text-emerald-300",
      dotColor: "bg-emerald-300",
    },
    {
      key: "fats",
      label: "Fats",
      value: fats,
      target: Math.max(targets.fats, 1),
      unit: "g",
      barGradient: "bg-lime-200",
      trackGlow: "shadow-[0_0_12px_rgba(217,249,157,0.25)]",
      badgeText: "text-lime-200",
      dotColor: "bg-lime-200",
    },
  ];

  return (
    <div className="space-y-4">
      {subtitle && <p className="text-xs text-[#A1A1AA]">{subtitle}</p>}

      {rows.map((row, idx) => {
        const rawPercent = Math.round((row.value / row.target) * 100);
        const clampedWidth = Math.min(Math.max(rawPercent, 0), 100);
        const formattedValue =
          row.key === "calories"
            ? Math.round(row.value).toLocaleString()
            : row.value.toFixed(1).replace(/\.0$/, "");

        return (
          <div key={row.key} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="inline-flex items-center gap-2 font-medium text-white">
                <span className={`h-2 w-2 rounded-full ${row.dotColor}`} />
                {row.label}
              </span>
              <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                <span className="font-semibold text-white">
                  {formattedValue} {row.unit}
                </span>
                <span className="text-zinc-500">
                  / {row.target.toLocaleString()} {row.unit}
                </span>
                <span
                  className={`rounded-md border border-white/[0.06] bg-[#171717] px-1.5 py-0.5 text-[11px] font-semibold ${
                    rawPercent > 100 ? "text-amber-300" : row.badgeText
                  }`}
                >
                  {rawPercent}%
                </span>
              </div>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06] p-0.5">
              <motion.div
                initial={prefersReduced ? false : { width: 0 }}
                animate={{ width: `${clampedWidth}%` }}
                transition={{
                  duration: prefersReduced ? 0 : 0.6,
                  delay: prefersReduced ? 0 : idx * 0.05,
                  ease: EASE_PREMIUM,
                }}
                className={`h-full rounded-full ${row.barGradient} ${
                  clampedWidth > 0 ? row.trackGlow : ""
                }`}
                role="progressbar"
                aria-label={row.label}
                aria-valuenow={Math.round(row.value)}
                aria-valuemin={0}
                aria-valuemax={row.target}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
