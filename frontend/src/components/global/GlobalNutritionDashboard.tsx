import { useEffect, useState } from "react";
import {
  Activity,
  Award,
  Droplets,
  Flame,
  Globe2,
  Info,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  fetchFoodBalanceGuide,
  fetchGlobalDashboardSummary,
} from "../../lib/api";
import type {
  FoodBalanceGuideResponse,
  GlobalDashboardSummary,
} from "../../types/nutrition";
import { GlobalNutritionCharts } from "./GlobalNutritionCharts";

interface GlobalNutritionDashboardProps {
  profileId: number | null;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
}

export function GlobalNutritionDashboard({
  profileId,
  isAuthenticated,
  onOpenAuth,
}: GlobalNutritionDashboardProps) {
  const [summary, setSummary] = useState<GlobalDashboardSummary | null>(null);
  const [balanceGuide, setBalanceGuide] = useState<FoodBalanceGuideResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !profileId) {
      setSummary(null);
      setBalanceGuide(null);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      fetchGlobalDashboardSummary(profileId, 7),
      fetchFoodBalanceGuide(profileId),
    ])
      .then(([sum, bg]) => {
        if (!active) return;
        setSummary(sum);
        setBalanceGuide(bg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, profileId]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#A3FF12]/25 bg-[#121212] p-6 sm:p-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
            <Lock className="h-3.5 w-3.5" />
            Real PostgreSQL Analytics
          </span>
          <h3 className="mt-2 font-display text-xl font-extrabold text-white">
            Sign In to View Your Live Global &amp; Food Balance Analytics
          </h3>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            NutriSense AI never displays fake sample numbers. Sign in to compute daily macros,
            hydration, food-group balance, Indian vs Japanese meal split, and weekly trends from
            your actual database logs.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAuth}
          className="rounded-xl bg-[#A3FF12] px-5 py-2.5 text-xs font-bold text-[#050706] hover:bg-[#b8ff42]"
        >
          Sign In to Sync Dashboard
        </button>
      </div>
    );
  }

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#A1A1AA]">
        <Loader2 className="h-4 w-4 animate-spin text-[#A3FF12]" />
        <span>Computing Global Nutrition Analytics from PostgreSQL...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#34D399]">
              <Globe2 className="h-3.5 w-3.5" />
              Global &amp; Food Balance Analytics (Last 7 Days)
            </span>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-white">
              Global Dietary Balance &amp; Diversity Dashboard
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-1 text-xs font-semibold text-[#34D399]">
            <Award className="h-3.5 w-3.5" />
            Education Mastery: {summary.education_completed_count}/{summary.education_total_topics}
          </span>
        </div>

        {/* Today's Verified Metrics Strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Calories", val: `${Math.round(summary.today_totals.calories)} kcal`, icon: Flame, color: "text-[#A3FF12]" },
            { label: "Protein", val: `${summary.today_totals.protein}g`, icon: Sparkles, color: "text-[#34D399]" },
            { label: "Carbs", val: `${summary.today_totals.carbs}g`, icon: Sparkles, color: "text-white" },
            { label: "Fats", val: `${summary.today_totals.fats}g`, icon: Sparkles, color: "text-lime-200" },
            { label: "Fibre", val: `${summary.today_totals.fibre}g`, icon: Sparkles, color: "text-emerald-300" },
            { label: "Hydration", val: `${Math.round(summary.today_totals.hydration_ml)} mL`, icon: Droplets, color: "text-sky-300" },
            { label: "Meal Diversity", val: `${summary.meal_diversity_count} dishes`, icon: Activity, color: "text-rose-300" },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border border-white/[0.07] bg-[#0A0A0A] p-3.5"
            >
              <p className="text-[10px] font-semibold uppercase text-zinc-400">{k.label}</p>
              <p className={`mt-1.5 font-mono text-base font-extrabold ${k.color}`}>{k.val}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-[#A1A1AA]">
          <Info className="h-3.5 w-3.5 shrink-0 text-[#34D399]" />
          <span>{summary.insights_note}</span>
        </p>
      </div>

      <GlobalNutritionCharts summary={summary} />

      {balanceGuide && (
        <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6">
          <h3 className="font-display text-base font-bold text-white">
            Today&apos;s Food Group Balance Summary (Serving Units)
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {balanceGuide.groups.slice(0, 4).map((grp) => (
              <div
                key={grp.key}
                className="rounded-2xl border border-white/[0.07] bg-[#0A0A0A] p-3.5 text-xs"
              >
                <p className="font-bold text-white">{grp.name}</p>
                <p className="mt-1 font-mono text-sm font-extrabold" style={{ color: grp.color_token }}>
                  {grp.current_value} / {grp.recommended_sv_min}+ SV
                </p>
                <p className="mt-0.5 text-[10px] capitalize text-zinc-400">
                  Status: {grp.balance_status.replace(/_/g, " ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
