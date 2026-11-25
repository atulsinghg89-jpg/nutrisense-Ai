import type { DailyMacroTargets } from "../types/nutrition";

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
  barColor: string;
  trackGlow: string;
  badgeText: string;
}

export function MacroProgressBars({
  calories,
  protein,
  carbs,
  fats,
  targets,
  subtitle,
}: MacroProgressBarsProps) {
  const rows: MacroRowConfig[] = [
    {
      key: "calories",
      label: "Calories",
      value: calories,
      target: Math.max(targets.calories, 1),
      unit: "kcal",
      barColor: "bg-[#A3FF12]",
      trackGlow: "shadow-[0_0_14px_rgba(163,255,18,0.35)]",
      badgeText: "text-[#A3FF12]",
    },
    {
      key: "protein",
      label: "Protein",
      value: protein,
      target: Math.max(targets.protein, 1),
      unit: "g",
      barColor: "bg-[#34D399]",
      trackGlow: "shadow-[0_0_14px_rgba(52,211,153,0.35)]",
      badgeText: "text-[#34D399]",
    },
    {
      key: "carbs",
      label: "Carbs",
      value: carbs,
      target: Math.max(targets.carbs, 1),
      unit: "g",
      barColor: "bg-emerald-300",
      trackGlow: "shadow-[0_0_12px_rgba(110,231,183,0.28)]",
      badgeText: "text-emerald-300",
    },
    {
      key: "fats",
      label: "Fat",
      value: fats,
      target: Math.max(targets.fats, 1),
      unit: "g",
      barColor: "bg-lime-200",
      trackGlow: "shadow-[0_0_12px_rgba(217,249,157,0.25)]",
      badgeText: "text-lime-200",
    },
  ];

  return (
    <div className="space-y-4">
      {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}

      {rows.map((row) => {
        const rawPercent = Math.round((row.value / row.target) * 100);
        const clampedWidth = Math.min(Math.max(rawPercent, 0), 100);
        const formattedValue =
          row.key === "calories"
            ? Math.round(row.value).toLocaleString()
            : row.value.toFixed(1).replace(/\.0$/, "");

        return (
          <div key={row.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-white">{row.label}</span>
              <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                <span className="text-white">
                  {formattedValue} {row.unit}
                </span>
                <span className="text-zinc-500">
                  / {row.target.toLocaleString()} {row.unit}
                </span>
                <span
                  className={`rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[11px] font-semibold ${
                    rawPercent > 100 ? "text-amber-300" : row.badgeText
                  }`}
                >
                  {rawPercent}%
                </span>
              </div>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07] p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${row.barColor} ${
                  clampedWidth > 0 ? row.trackGlow : ""
                }`}
                style={{ width: `${clampedWidth}%` }}
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
