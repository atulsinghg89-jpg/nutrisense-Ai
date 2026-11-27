import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Info,
  Loader2,
  Scale,
  ShieldCheck,
} from "lucide-react";
import {
  compareGlobalFoods,
  fetchGlobalCountries,
  fetchGlobalFoods,
} from "../../lib/api";
import type {
  GlobalComparePreset,
  GlobalComparisonResponse,
  GlobalFoodItem,
} from "../../types/nutrition";

interface IndiaJapanComparisonProps {
  profileId: number | null;
  allergies?: string[];
  initialLeftSlug?: string;
}

export function IndiaJapanComparison({
  profileId,
  allergies = [],
  initialLeftSlug,
}: IndiaJapanComparisonProps) {
  const [foods, setFoods] = useState<GlobalFoodItem[]>([]);
  const [presets, setPresets] = useState<GlobalComparePreset[]>([]);
  const [leftSlug, setLeftSlug] = useState<string>(initialLeftSlug || "in-dal-tadka");
  const [rightSlug, setRightSlug] = useState<string>("jp-miso-soup");
  const [leftGrams, setLeftGrams] = useState<number>(180);
  const [rightGrams, setRightGrams] = useState<number>(160);
  const [dietPref, setDietPref] = useState<"all" | "vegetarian">("all");

  const [result, setResult] = useState<GlobalComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    if (initialLeftSlug) setLeftSlug(initialLeftSlug);
  }, [initialLeftSlug]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([fetchGlobalFoods(), fetchGlobalCountries()])
      .then(([allFoods, meta]) => {
        if (!active) return;
        setFoods(allFoods);
        setPresets(meta.compare_presets);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!leftSlug || !rightSlug) return;
    let active = true;
    setComparing(true);
    compareGlobalFoods({
      left_food_slug: leftSlug,
      right_food_slug: rightSlug,
      left_grams: leftGrams,
      right_grams: rightGrams,
      diet_preference: dietPref,
      allergies,
      profile_id: profileId,
      save_comparison: false,
    })
      .then((res) => {
        if (active) setResult(res);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setComparing(false);
      });
    return () => {
      active = false;
    };
  }, [leftSlug, rightSlug, leftGrams, rightGrams, dietPref, profileId, allergies]);

  function applyPreset(preset: GlobalComparePreset) {
    setLeftSlug(preset.left_slug);
    setRightSlug(preset.right_slug);
    setLeftGrams(preset.left_grams);
    setRightGrams(preset.right_grams);
  }

  const indianFoods = foods.filter((f) =>
    dietPref === "vegetarian" ? f.is_vegetarian : true,
  );
  const japaneseFoods = foods.filter((f) =>
    dietPref === "vegetarian" ? f.is_vegetarian : true,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#A1A1AA]">
        <Loader2 className="h-4 w-4 animate-spin text-[#A3FF12]" />
        <span>Loading India vs Japan Comparison Engine...</span>
      </div>
    );
  }

  const metrics: {
    label: string;
    key:
      | "calories"
      | "protein"
      | "carbs"
      | "fats"
      | "fibre"
      | "iron_mg"
      | "calcium_mg"
      | "sodium_mg";
    unit: string;
  }[] = [
    { label: "Calories", key: "calories", unit: "kcal" },
    { label: "Protein", key: "protein", unit: "g" },
    { label: "Carbohydrates", key: "carbs", unit: "g" },
    { label: "Total Fat", key: "fats", unit: "g" },
    { label: "Dietary Fibre", key: "fibre", unit: "g" },
    { label: "Iron", key: "iron_mg", unit: "mg" },
    { label: "Calcium", key: "calcium_mg", unit: "mg" },
    { label: "Sodium", key: "sodium_mg", unit: "mg" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <Scale className="h-3.5 w-3.5" />
              India (ICMR–NIN IFCT 2017) vs Japan (MEXT STFCJ 8th Rev.)
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-white sm:text-3xl">
              Side-by-Side Global Food Comparison Engine
            </h2>
            <p className="mt-1.5 text-sm text-[#A1A1AA]">
              Compare actual standardized serving quantities and preparation methods side by side —
              never assuming two traditional dishes are nutritionally identical by name.
            </p>
          </div>

          <div className="flex rounded-xl border border-white/10 bg-[#0A0A0A] p-1">
            {(["all", "vegetarian"] as const).map((pref) => (
              <button
                key={pref}
                type="button"
                onClick={() => setDietPref(pref)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  dietPref === pref
                    ? "bg-[#34D399] text-[#050706]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {pref === "all" ? "All Foods" : "Vegetarian Fit"}
              </button>
            ))}
          </div>
        </div>

        {/* One-Click India vs Japan Presets */}
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Featured Cross-Cuisine Comparisons
          </p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  leftSlug === p.left_slug && rightSlug === p.right_slug
                    ? "border-[#A3FF12] bg-[#A3FF12]/15 text-[#A3FF12]"
                    : "border-white/10 bg-[#0A0A0A] text-zinc-300 hover:border-white/25"
                }`}
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>{p.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selector Row */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-3xl border border-white/[0.08] bg-[#121212] p-5">
          <span className="font-mono text-[11px] font-bold uppercase text-[#A3FF12]">
            Food A Selection
          </span>
          <div className="flex flex-wrap gap-2">
            <select
              value={leftSlug}
              onChange={(e) => {
                const slug = e.target.value;
                setLeftSlug(slug);
                const f = foods.find((x) => x.slug === slug);
                if (f) setLeftGrams(f.serving_grams);
              }}
              aria-label="Select Food A"
              className="flex-1 rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs font-semibold text-white"
            >
              {indianFoods.map((f) => (
                <option key={f.slug} value={f.slug}>
                  [{f.country_code}] {f.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-300">
              <span>Grams:</span>
              <input
                type="number"
                min={20}
                max={1500}
                step={10}
                value={leftGrams}
                onChange={(e) => setLeftGrams(Math.max(10, Number(e.target.value) || 100))}
                className="w-16 bg-transparent font-mono font-bold text-[#A3FF12] focus:outline-none"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-3xl border border-white/[0.08] bg-[#121212] p-5">
          <span className="font-mono text-[11px] font-bold uppercase text-[#34D399]">
            Food B Selection
          </span>
          <div className="flex flex-wrap gap-2">
            <select
              value={rightSlug}
              onChange={(e) => {
                const slug = e.target.value;
                setRightSlug(slug);
                const f = foods.find((x) => x.slug === slug);
                if (f) setRightGrams(f.serving_grams);
              }}
              aria-label="Select Food B"
              className="flex-1 rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs font-semibold text-white"
            >
              {japaneseFoods.map((f) => (
                <option key={f.slug} value={f.slug}>
                  [{f.country_code}] {f.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-300">
              <span>Grams:</span>
              <input
                type="number"
                min={20}
                max={1500}
                step={10}
                value={rightGrams}
                onChange={(e) => setRightGrams(Math.max(10, Number(e.target.value) || 100))}
                className="w-16 bg-transparent font-mono font-bold text-[#34D399] focus:outline-none"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Results Area */}
      {comparing && !result ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#A1A1AA]">
          <Loader2 className="h-4 w-4 animate-spin text-[#A3FF12]" />
          <span>Calculating side-by-side parameters...</span>
        </div>
      ) : (
        result && (
          <div className="space-y-6">
            {/* Dual Comparison Chart */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-white">
                  Nutrient &amp; Serving Breakdown
                </h3>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-[#A3FF12]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#A3FF12]" />
                    {result.left.name} ({result.left.grams}g)
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-[#34D399]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
                    {result.right.name} ({result.right.grams}g)
                  </span>
                </div>
              </div>

              <div className="space-y-3.5">
                {metrics.map((m) => {
                  const lVal = result.left[m.key];
                  const rVal = result.right[m.key];
                  const maxVal = Math.max(lVal, rVal, 1);
                  return (
                    <div
                      key={m.key}
                      className="rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-3.5 text-xs"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold text-zinc-200">{m.label}</span>
                        <span className="font-mono text-[11px] text-zinc-400">
                          <strong className="text-[#A3FF12]">{lVal} {m.unit}</strong> vs{" "}
                          <strong className="text-[#34D399]">{rVal} {m.unit}</strong>
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-[#A3FF12]"
                            style={{ width: `${Math.min(100, (lVal / maxVal) * 100)}%` }}
                          />
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-[#34D399]"
                            style={{ width: `${Math.min(100, (rVal / maxVal) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Method, Allergens, Fit & Source Citations */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-3 rounded-3xl border border-white/[0.08] bg-[#121212] p-6 text-xs">
                <h4 className="flex items-center gap-2 font-display text-base font-bold text-white">
                  <ShieldCheck className="h-4 w-4 text-[#A3FF12]" />
                  Preparation, Fit &amp; Insights
                </h4>
                <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-3.5">
                  <p className="font-bold text-[#A3FF12]">{result.left.name}</p>
                  <p className="mt-0.5 text-zinc-300">
                    Serving: {result.left.serving_label} • Method: {result.left.preparation_method}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    Source: {result.left.data_source} ({result.left.source_version}, {result.left.publication_year})
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-3.5">
                  <p className="font-bold text-[#34D399]">{result.right.name}</p>
                  <p className="mt-0.5 text-zinc-300">
                    Serving: {result.right.serving_label} • Method: {result.right.preparation_method}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    Source: {result.right.data_source} ({result.right.source_version}, {result.right.publication_year})
                  </p>
                </div>

                {result.better_fit_notes.map((bf) => (
                  <p key={bf} className="flex items-start gap-1.5 text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                    <span>{bf}</span>
                  </p>
                ))}
              </div>

              <div className="space-y-3 rounded-3xl border border-white/[0.08] bg-[#121212] p-6 text-xs">
                <h4 className="flex items-center gap-2 font-display text-base font-bold text-white">
                  <Info className="h-4 w-4 text-[#34D399]" />
                  Key Nutritional Differences &amp; Safety
                </h4>
                <ul className="space-y-2 text-zinc-300">
                  {result.key_differences.map((d) => (
                    <li key={d} className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-3">
                      {d}
                    </li>
                  ))}
                </ul>

                {result.allergen_warnings.length > 0 && (
                  <div className="space-y-1.5 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-3.5 text-amber-200">
                    <p className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> Allergen &amp; Safety Flags
                    </p>
                    {result.allergen_warnings.map((w) => (
                      <p key={w} className="text-[11px]">{w}</p>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-zinc-400">{result.budget_note}</p>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
