import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Droplets,
  HelpCircle,
  Info,
  Loader2,
  RotateCw,
  ShieldAlert,
} from "lucide-react";
import { fetchFoodBalanceGuide } from "../../lib/api";
import type { FoodBalanceGroup, FoodBalanceGuideResponse } from "../../types/nutrition";

interface JapaneseFoodBalanceGuideProps {
  profileId: number | null;
  onLogQuickActivity?: (minutes: number, label: string) => Promise<void>;
  onLogQuickWater?: (ml: number) => Promise<void>;
}

const STATUS_STYLE: Record<
  FoodBalanceGroup["balance_status"],
  { label: string; className: string }
> = {
  balanced: {
    label: "Balanced Range",
    className: "border-[#34D399]/40 bg-[#34D399]/15 text-[#34D399]",
  },
  underrepresented: {
    label: "Underrepresented Today",
    className: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  },
  overrepresented: {
    label: "Overrepresented Today",
    className: "border-rose-400/40 bg-rose-400/15 text-rose-200",
  },
  no_data_yet: {
    label: "Ready to Track",
    className: "border-white/15 bg-white/[0.04] text-zinc-400",
  },
};

export function JapaneseFoodBalanceGuide({
  profileId,
  onLogQuickActivity,
  onLogQuickWater,
}: JapaneseFoodBalanceGuideProps) {
  const [guide, setGuide] = useState<FoodBalanceGuideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>("grains");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchFoodBalanceGuide(profileId)
      .then((res) => {
        if (active) setGuide(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profileId]);

  if (loading || !guide) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-xs text-[#A1A1AA]">
        <Loader2 className="h-4 w-4 animate-spin text-[#A3FF12]" />
        <span>Loading Food Balance Guide...</span>
      </div>
    );
  }

  const activeGroup =
    guide.groups.find((g) => g.key === selectedKey) ?? guide.groups[0];

  const topTiers = guide.groups.filter((g) => g.layer_order <= 5);
  const momentumLayers = guide.groups.filter((g) => g.layer_order > 5);

  return (
    <div className="space-y-6">
      {/* Banner Explaining Food Balance Concept & Serving Unit ("SV") */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
          <RotateCw className="h-3.5 w-3.5" />
          Interactive Spinning-Top Nutrition Balance Model
        </span>
        <h2 className="mt-3 font-display text-2xl font-extrabold text-white sm:text-3xl">
          {guide.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#A1A1AA]">
          {guide.concept_overview}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#34D399]/25 bg-[#0A0A0A] p-4 text-xs">
            <p className="flex items-center gap-1.5 font-bold text-[#34D399]">
              <HelpCircle className="h-4 w-4" />
              What is 1 Serving Unit (&ldquo;SV&rdquo;)?
            </p>
            <p className="mt-1.5 leading-relaxed text-zinc-300">
              {guide.serving_unit_explainer}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/25 bg-[#0A0A0A] p-4 text-xs">
            <p className="flex items-center gap-1.5 font-bold text-amber-300">
              <ShieldAlert className="h-4 w-4" />
              Educational Guide Disclaimer
            </p>
            <p className="mt-1.5 leading-relaxed text-zinc-300">{guide.disclaimer}</p>
          </div>
        </div>
      </div>

      {/* Main Interactive Spinning Top Diagram + Selected Layer Details */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Visual Interactive Spinning Top Layers */}
        <div className="space-y-4 rounded-3xl border border-white/[0.08] bg-[#121212] p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold text-white">
              Interactive Spinning Top Hierarchy (Tap Any Layer)
            </h3>
            <span className="font-mono text-[11px] text-[#34D399]">
              Tracked Meals Today: {guide.tracked_entries_count}
            </span>
          </div>

          {/* Top Axis: Water/Tea & Physical Activity */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {momentumLayers.map((ml) => {
              const st = STATUS_STYLE[ml.balance_status];
              const active = selectedKey === ml.key;
              return (
                <button
                  key={ml.key}
                  type="button"
                  onClick={() => setSelectedKey(ml.key)}
                  className={`flex items-center justify-between gap-2 rounded-2xl border p-3.5 text-left transition ${
                    active
                      ? "border-[#A3FF12] bg-[#A3FF12]/10"
                      : "border-white/10 bg-[#0A0A0A] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {ml.key === "hydration" ? (
                      <Droplets className="h-5 w-5 text-sky-400" />
                    ) : (
                      <Activity className="h-5 w-5 text-rose-400" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-white">{ml.name}</p>
                      <p className="font-mono text-[11px] text-[#A1A1AA]">
                        {ml.current_value} / {ml.recommended_sv_min}+ {ml.unit_label}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.className}`}>
                    {st.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Narrowing Spinning Top Food Group Tiers */}
          <div className="flex flex-col items-center space-y-2.5 pt-2">
            {topTiers.map((tier, idx) => {
              const widthClass =
                idx === 0
                  ? "w-full"
                  : idx === 1
                    ? "w-[92%]"
                    : idx === 2
                      ? "w-[82%]"
                      : idx === 3
                        ? "w-[70%]"
                        : "w-[58%]";
              const st = STATUS_STYLE[tier.balance_status];
              const active = selectedKey === tier.key;
              const pct = Math.min(
                100,
                Math.round((tier.current_value / Math.max(tier.recommended_sv_min, 1)) * 100),
              );

              return (
                <button
                  key={tier.key}
                  type="button"
                  onClick={() => setSelectedKey(tier.key)}
                  className={`${widthClass} rounded-2xl border p-3.5 text-left transition ${
                    active
                      ? "border-[#A3FF12] bg-[#171D18] shadow-[0_0_24px_rgba(163,255,18,0.14)]"
                      : "border-white/10 bg-[#0A0A0A] hover:border-white/25"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">
                      {tier.layer_order}. {tier.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-white">
                        {tier.current_value} / {tier.recommended_sv_min}
                        {tier.recommended_sv_max !== tier.recommended_sv_min
                          ? `–${tier.recommended_sv_max}`
                          : ""}{" "}
                        SV
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${st.className}`}
                      >
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: tier.color_token,
                      }}
                    />
                  </div>
                </button>
              );
            })}
            <div className="h-4 w-2 rounded-b-full bg-gradient-to-b from-[#A3FF12]/60 to-transparent" />
          </div>
        </div>

        {/* Right: Active Layer Details + Daily Food Balance Insights */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#A3FF12]">
              Layer Detail • {activeGroup.unit_label}
            </span>
            <h3 className="mt-1 font-display text-xl font-extrabold text-white">
              {activeGroup.name}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#A1A1AA]">
              {activeGroup.unit_definition}
            </p>

            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#34D399]">
                Standard Food Serving Examples
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-200">
                {activeGroup.examples.map((ex) => (
                  <li key={ex} className="flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>

            {activeGroup.key === "hydration" && onLogQuickWater && (
              <button
                type="button"
                onClick={() => void onLogQuickWater(250)}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-400 px-4 py-2.5 text-xs font-bold text-[#050706] hover:bg-sky-300"
              >
                <Droplets className="h-4 w-4" />
                Log 250 mL Water / Green Tea
              </button>
            )}

            {activeGroup.key === "activity" && onLogQuickActivity && (
              <button
                type="button"
                onClick={() => void onLogQuickActivity(20, "Daily Brisk Walk")}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#A3FF12] px-4 py-2.5 text-xs font-bold text-[#050706] hover:bg-[#b8ff42]"
              >
                <Activity className="h-4 w-4" />
                Log 20-Min Activity Boost
              </button>
            )}
          </div>

          <div className="rounded-3xl border border-[#34D399]/25 bg-[#121212] p-6">
            <h4 className="flex items-center gap-2 font-display text-base font-bold text-white">
              <Info className="h-4 w-4 text-[#34D399]" />
              Personalized Daily Balance Insights
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-zinc-300">
              {guide.insights.map((msg) => (
                <li
                  key={msg}
                  className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-3 leading-relaxed"
                >
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
