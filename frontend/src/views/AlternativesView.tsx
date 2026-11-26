import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  Camera,
  CheckCircle2,
  Leaf,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import {
  EASE_PREMIUM,
  staggerContainerVariants,
  staggerItemVariants,
} from "../components/MotionPrimitives";
import { SAMPLE_ALTERNATIVES } from "../data/categories";
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
  const hasLiveAlternatives = Boolean(
    scanSession && scanSession.alternatives.length > 0,
  );
  const displayedAlternatives = hasLiveAlternatives
    ? scanSession!.alternatives.slice(0, 3)
    : SAMPLE_ALTERNATIVES;

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
              Food Alternatives
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[#A1A1AA]">
              Three practical, nutrient-dense swaps tailored from your scanned
              plate—with calorie comparisons, macro breakdowns, and clear
              nutritional reasoning.
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
                Showing {displayedAlternatives.length} AI swaps from your latest
                meal scan
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

      {/* 3 Original-to-Alternative Comparison Cards */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 md:grid-cols-3"
      >
        {displayedAlternatives.map((alt, index) => {
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
                {/* Top Badge + Calorie Savings */}
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

                {/* Original -> Alternative Split Comparison Box */}
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

                {/* Nutritional Reasoning */}
                <div className="mt-4 rounded-xl border border-white/[0.05] bg-[#171717]/40 p-3.5">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#34D399]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Why It&apos;s Better
                  </p>
                  <p className="text-xs leading-relaxed text-zinc-300">
                    {alt.reason}
                  </p>
                </div>
              </div>

              {/* Equivalent Serving Macro Breakdown + Animated Indicators */}
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
    </div>
  );
}
