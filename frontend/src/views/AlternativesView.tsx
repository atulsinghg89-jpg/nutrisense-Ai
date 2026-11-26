import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  Camera,
  CheckCircle2,
  Leaf,
  Scale,
  Search,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import {
  EASE_PREMIUM,
  staggerContainerVariants,
  staggerItemVariants,
} from "../components/MotionPrimitives";
import { SAMPLE_ALTERNATIVES } from "../data/categories";
import { INDIAN_FOODS_DATA } from "../data/indianFoods";
import type {
  AppView,
  EditableFoodItem,
  HealthierAlternative,
  ScanSession,
} from "../types/nutrition";

interface AlternativesViewProps {
  scanSession: ScanSession | null;
  onNavigate: (view: AppView) => void;
}

function findMatchedItem(
  alt: HealthierAlternative,
  scanSession: ScanSession | null,
): EditableFoodItem | null {
  if (!scanSession || scanSession.items.length === 0) return null;
  const target = alt.replaces.toLowerCase();
  return (
    scanSession.items.find(
      (item) =>
        target.includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(target),
    ) ?? null
  );
}

export function AlternativesView({
  scanSession,
  onNavigate,
}: AlternativesViewProps) {
  const prefersReduced = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState("");
  const [macroFocusFilter, setMacroFocusFilter] = useState<
    "all" | "lower_calorie" | "higher_protein"
  >("all");
  const [comparatorDiet, setComparatorDiet] = useState<"all" | "vegetarian">("all");
  const [compareLeftId, setCompareLeftId] = useState<string>(
    INDIAN_FOODS_DATA[3]?.id ?? "paneer",
  );
  const [compareRightId, setCompareRightId] = useState<string>(
    INDIAN_FOODS_DATA[11]?.id ?? "moong-chilla",
  );

  const comparatorFoods = useMemo(() => {
    if (comparatorDiet === "vegetarian") {
      return INDIAN_FOODS_DATA.filter((f) => f.discoveryTags.includes("Vegetarian"));
    }
    return INDIAN_FOODS_DATA;
  }, [comparatorDiet]);

  const hasLiveAlternatives = Boolean(
    scanSession && scanSession.alternatives.length > 0,
  );
  const rawAlternatives = hasLiveAlternatives
    ? scanSession!.alternatives.slice(0, 3)
    : SAMPLE_ALTERNATIVES;

  const filteredAlternatives = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rawAlternatives.filter((alt) => {
      const matchesQ =
        !q ||
        alt.name.toLowerCase().includes(q) ||
        alt.replaces.toLowerCase().includes(q) ||
        alt.reason.toLowerCase().includes(q);
      if (!matchesQ) return false;
      if (macroFocusFilter === "lower_calorie") {
        return alt.estimated_calories <= 250;
      }
      if (macroFocusFilter === "higher_protein") {
        return alt.protein >= 10;
      }
      return true;
    });
  }, [rawAlternatives, searchQuery, macroFocusFilter]);

  const compareLeft =
    INDIAN_FOODS_DATA.find((f) => f.id === compareLeftId) ?? INDIAN_FOODS_DATA[0];
  const compareRight =
    INDIAN_FOODS_DATA.find((f) => f.id === compareRightId) ?? INDIAN_FOODS_DATA[1];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121212] px-6 py-6 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-60 w-60 rounded-full bg-[#34D399]/10 blur-[100px]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-1 text-xs font-semibold text-[#34D399]">
              <Sparkles className="h-3.5 w-3.5" />
              AI Healthy Swaps Engine
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">
              Food Alternatives &amp; Comparison
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[#A1A1AA]">
              Review the 3 practical alternatives returned by Gemini Vision for
              your scanned plate, or compare everyday foods side by side by
              calories, protein, fiber, and fats.
            </p>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate("scanner")}
            className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-5 py-2.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_22px_rgba(163,255,18,0.22)] transition hover:bg-[#b5ff3b]"
          >
            <Camera className="h-4 w-4" />
            <span>
              {hasLiveAlternatives ? "Scan Another Meal" : "Launch Scanner"}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Status Banner */}
      {hasLiveAlternatives ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#34D399]/30 bg-[#34D399]/10 px-5 py-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#34D399]/30 bg-[#0A0A0A]/50 text-[#34D399]">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Showing {rawAlternatives.length} AI swaps from your latest meal
                scan
              </p>
              <p className="text-xs text-zinc-300">
                Detected items:{" "}
                {scanSession!.items.map((item) => item.name).join(", ")}
              </p>
            </div>
          </div>

          <span className="rounded-full border border-white/10 bg-[#0A0A0A]/70 px-3 py-1 font-mono text-xs font-semibold text-[#A3FF12]">
            {new Date(scanSession!.scannedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ) : (
        <div className="grid items-center gap-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121212] p-5 md:grid-cols-12">
          <div className="md:col-span-4">
            <img
              src="/images/healthy-swaps.jpg"
              alt="Healthy baked root vegetable crisps and air-popped popcorn swaps"
              className="aspect-[16/10] w-full rounded-xl object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 md:col-span-8">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#171717] px-3 py-1 text-[11px] font-semibold text-zinc-300">
                Preview Mode
              </span>
              <h2 className="font-display text-lg font-bold text-white">
                Sample AI Swaps Preview
              </h2>
              <p className="max-w-xl text-xs leading-relaxed text-[#A1A1AA]">
                Scan any food photo in the AI Food Scanner to replace this
                example with 3 personalized alternatives returned directly by
                Gemini Vision.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("scanner")}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/40 bg-[#A3FF12]/10 px-4 py-2 text-xs font-semibold text-[#A3FF12] transition hover:bg-[#A3FF12]/20"
            >
              <span>Scan Your Meal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Search & Macro Focus Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#121212] p-3.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter swaps by food or reason..."
            className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] py-2 pr-3 pl-10 text-xs text-white placeholder-zinc-500 focus:border-[#A3FF12]/60 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "all", label: "All Swaps" },
              { id: "lower_calorie", label: "≤ 250 kcal" },
              { id: "higher_protein", label: "10g+ Protein" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setMacroFocusFilter(f.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                macroFocusFilter === f.id
                  ? "bg-[#A3FF12] text-[#0A0A0A]"
                  : "text-[#A1A1AA] hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Original-to-Alternative Comparison Cards */}
      {filteredAlternatives.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-8 text-center text-xs text-[#A1A1AA]">
          No swaps matched your current filter. Click &ldquo;All Swaps&rdquo; to
          restore all suggestions.
        </div>
      ) : (
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 md:grid-cols-3"
        >
          {filteredAlternatives.map((alt, index) => {
            const matchedItem = hasLiveAlternatives
              ? findMatchedItem(alt, scanSession)
              : null;
            const kcalDiff = matchedItem
              ? Math.round(matchedItem.calories - alt.estimated_calories)
              : null;
            const totalMacroGrams = Math.max(
              1,
              alt.protein + alt.carbs + alt.fats,
            );

            return (
              <motion.article
                key={`${alt.name}-${index}`}
                variants={staggerItemVariants}
                whileHover={prefersReduced ? undefined : { y: -4 }}
                transition={{ duration: 0.25, ease: EASE_PREMIUM }}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121212] p-6 shadow-xl transition-colors hover:border-[#34D399]/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-3 font-mono text-xs font-semibold text-[#A3FF12]">
                      <Sparkles className="h-3 w-3" />
                      Swap #{index + 1}
                    </span>

                    {kcalDiff !== null && kcalDiff > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#34D399]/30 bg-[#34D399]/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#34D399]">
                        <TrendingDown className="h-3 w-3" />-{kcalDiff} kcal
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-[#171717] px-2.5 py-1 font-mono text-[11px] text-[#A1A1AA]">
                        {Math.round(alt.estimated_calories)} kcal
                      </span>
                    )}
                  </div>

                  {/* Original -> Alternative Split Box */}
                  <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0A0A0A]">
                    <div className="border-b border-white/[0.06] bg-[#171717]/50 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          Original Food
                        </span>
                        {matchedItem && (
                          <span className="font-mono text-[11px] text-zinc-400">
                            {Math.round(matchedItem.calories)} kcal
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-zinc-400 line-through decoration-zinc-600">
                        {alt.replaces}
                      </p>
                    </div>

                    <div className="relative px-4 py-3.5">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#34D399]">
                          <ArrowDownRight className="h-3.5 w-3.5" />
                          Healthier Alternative
                        </span>
                        <span className="font-mono text-xs font-bold text-[#A3FF12]">
                          {Math.round(alt.estimated_calories)} kcal
                        </span>
                      </div>
                      <h2 className="font-display text-lg font-bold text-white transition-colors group-hover:text-[#A3FF12]">
                        {alt.name}
                      </h2>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/[0.05] bg-[#171717]/40 p-3.5">
                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#34D399]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Nutritional Reasoning
                    </p>
                    <p className="text-xs leading-relaxed text-zinc-300">
                      {alt.reason}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/[0.08] pt-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Equivalent Serving Breakdown
                  </p>

                  <div className="space-y-2.5">
                    {[
                      {
                        label: "Protein",
                        value: alt.protein,
                        color: "bg-[#34D399]",
                        text: "text-[#34D399]",
                      },
                      {
                        label: "Carbs",
                        value: alt.carbs,
                        color: "bg-emerald-300",
                        text: "text-emerald-300",
                      },
                      {
                        label: "Fats",
                        value: alt.fats,
                        color: "bg-[#A3FF12]",
                        text: "text-lime-200",
                      },
                    ].map((macro) => {
                      const widthPct = Math.min(
                        100,
                        Math.round((macro.value / totalMacroGrams) * 100),
                      );
                      return (
                        <div key={macro.label} className="space-y-1">
                          <div className="flex items-center justify-between font-mono text-xs">
                            <span className="text-[#A1A1AA]">{macro.label}</span>
                            <span className={`font-semibold ${macro.text}`}>
                              {macro.value}g
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                            <motion.div
                              initial={prefersReduced ? false : { width: 0 }}
                              animate={{ width: `${widthPct}%` }}
                              transition={{
                                duration: 0.65,
                                delay: 0.1 + index * 0.06,
                                ease: EASE_PREMIUM,
                              }}
                              className={`h-full rounded-full ${macro.color}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}

      {/* Interactive Side-by-Side Two-Food Nutrition Comparator (Phase 11) */}
      <section className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#34D399]">
              <Scale className="h-3.5 w-3.5" />
              Interactive Food Comparison
            </span>
            <h2 className="mt-1.5 font-display text-2xl font-bold text-white">
              Compare Any Two Whole &amp; Indian Foods Side by Side
            </h2>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Evaluate calories, protein, carbs, fats, and fiber together rather
              than judging food quality by calories alone.
            </p>
          </div>

          <div className="flex rounded-full border border-white/10 bg-[#0A0A0A] p-1">
            {(
              [
                { id: "all", label: "All Foods" },
                { id: "vegetarian", label: "Vegetarian" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setComparatorDiet(opt.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  comparatorDiet === opt.id
                    ? "bg-[#34D399] text-[#0A0A0A]"
                    : "text-[#A1A1AA] hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {[
            {
              label: "Option A",
              value: compareLeftId,
              onChange: setCompareLeftId,
              food: compareLeft,
              other: compareRight,
            },
            {
              label: "Option B",
              value: compareRightId,
              onChange: setCompareRightId,
              food: compareRight,
              other: compareLeft,
            },
          ].map((col) => (
            <div
              key={col.label}
              className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#34D399]">
                  {col.label}
                </span>
                <select
                  aria-label={`Select ${col.label} food`}
                  value={col.value}
                  onChange={(e) => col.onChange(e.target.value)}
                  className="max-w-[230px] rounded-xl border border-white/10 bg-[#171717] px-3 py-1.5 text-xs font-semibold text-white focus:border-[#A3FF12]/60 focus:outline-none"
                >
                  {comparatorFoods.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <h3 className="mt-3 font-display text-lg font-bold text-white">
                {col.food.name}
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                {col.food.servingLabel} ({col.food.servingGrams}g)
              </p>

              <div className="mt-4 grid grid-cols-5 gap-2 font-mono text-xs tabular-nums">
                <div className="rounded-xl bg-[#121212] p-2.5 text-center">
                  <p className="text-[10px] text-zinc-500">KCAL</p>
                  <p className="mt-1 font-bold text-[#A3FF12]">
                    {col.food.calories}
                  </p>
                </div>
                <div className="rounded-xl bg-[#121212] p-2.5 text-center">
                  <p className="text-[10px] text-zinc-500">PRO</p>
                  <p className="mt-1 font-bold text-[#34D399]">
                    {col.food.protein}g
                  </p>
                </div>
                <div className="rounded-xl bg-[#121212] p-2.5 text-center">
                  <p className="text-[10px] text-zinc-500">CARB</p>
                  <p className="mt-1 font-bold text-emerald-300">
                    {col.food.carbs}g
                  </p>
                </div>
                <div className="rounded-xl bg-[#121212] p-2.5 text-center">
                  <p className="text-[10px] text-zinc-500">FAT</p>
                  <p className="mt-1 font-bold text-lime-200">
                    {col.food.fats}g
                  </p>
                </div>
                <div className="rounded-xl bg-[#121212] p-2.5 text-center">
                  <p className="text-[10px] text-zinc-500">FIBER</p>
                  <p className="mt-1 font-bold text-white">
                    {col.food.fiber}g
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                {col.food.protein > col.other.protein && (
                  <span className="rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-2.5 py-0.5 font-semibold text-[#34D399]">
                    +{(col.food.protein - col.other.protein).toFixed(1)}g more protein
                  </span>
                )}
                {col.food.fiber > col.other.fiber && (
                  <span className="rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-2.5 py-0.5 font-semibold text-[#A3FF12]">
                    +{(col.food.fiber - col.other.fiber).toFixed(1)}g more fiber
                  </span>
                )}
                {col.food.calories < col.other.calories && (
                  <span className="rounded-full border border-white/15 bg-[#171717] px-2.5 py-0.5 font-medium text-zinc-300">
                    -{Math.round(col.other.calories - col.food.calories)} kcal lighter
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
