import type { GlobalDashboardSummary } from "../../types/nutrition";

interface GlobalNutritionChartsProps {
  summary: GlobalDashboardSummary;
}

export function GlobalNutritionCharts({ summary }: GlobalNutritionChartsProps) {
  const maxCal = Math.max(
    ...summary.weekly_trends.map((d) => d.calories),
    400,
  );
  const maxPro = Math.max(
    ...summary.weekly_trends.map((d) => d.protein),
    40,
  );

  const totalCuisine =
    summary.cuisine_breakdown.indian_meals +
    summary.cuisine_breakdown.japanese_meals +
    summary.cuisine_breakdown.other_balanced_meals;

  const indianPct = totalCuisine
    ? Math.round((summary.cuisine_breakdown.indian_meals / totalCuisine) * 100)
    : 0;
  const japanPct = totalCuisine
    ? Math.round((summary.cuisine_breakdown.japanese_meals / totalCuisine) * 100)
    : 0;
  const otherPct = totalCuisine ? Math.max(0, 100 - indianPct - japanPct) : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* 7-Day Calorie & Protein Bar Trend */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-5 lg:col-span-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#34D399]">
              7-Day Logged Intake Trend
            </p>
            <h4 className="font-display text-base font-bold text-white">
              Daily Calories &amp; Protein Distribution
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-[#A3FF12]">
              <span className="h-2 w-2 rounded-full bg-[#A3FF12]" /> Calories
            </span>
            <span className="flex items-center gap-1 text-[#34D399]">
              <span className="h-2 w-2 rounded-full bg-[#34D399]" /> Protein
            </span>
          </div>
        </div>

        <div className="grid h-44 grid-cols-7 items-end gap-2 border-b border-white/[0.08] pb-2">
          {summary.weekly_trends.map((day) => {
            const calH = Math.round((day.calories / maxCal) * 100);
            const proH = Math.round((day.protein / maxPro) * 100);
            const label = day.date.slice(5);
            return (
              <div key={day.date} className="flex h-full flex-col items-center justify-end gap-1.5">
                <div className="flex h-32 w-full items-end justify-center gap-1">
                  <div
                    title={`${day.calories} kcal`}
                    className="w-3 rounded-t-md bg-[#A3FF12]/85 transition-all"
                    style={{ height: `${Math.max(4, calH)}%` }}
                  />
                  <div
                    title={`${day.protein} g protein`}
                    className="w-2.5 rounded-t-md bg-[#34D399]/85 transition-all"
                    style={{ height: `${Math.max(4, proH)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-zinc-400">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Country Cuisine Consumption Split */}
      <div className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#121212] p-5 lg:col-span-5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#A3FF12]">
            Cuisine Consumption Breakdown
          </p>
          <h4 className="font-display text-base font-bold text-white">
            Indian vs Japanese vs Balanced Meals
          </h4>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Computed from {totalCuisine} logged meal entries in your PostgreSQL history.
          </p>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div>
            <div className="mb-1 flex justify-between font-mono">
              <span className="text-[#A3FF12]">Indian Home &amp; Regional Meals</span>
              <span className="font-bold text-white">
                {summary.cuisine_breakdown.indian_meals} ({indianPct}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-[#A3FF12]" style={{ width: `${indianPct}%` }} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between font-mono">
              <span className="text-[#34D399]">Japanese MEXT / Bento Meals</span>
              <span className="font-bold text-white">
                {summary.cuisine_breakdown.japanese_meals} ({japanPct}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-[#34D399]" style={{ width: `${japanPct}%` }} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between font-mono">
              <span className="text-sky-300">Other Whole &amp; Global Foods</span>
              <span className="font-bold text-white">
                {summary.cuisine_breakdown.other_balanced_meals} ({otherPct}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-sky-400" style={{ width: `${otherPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
