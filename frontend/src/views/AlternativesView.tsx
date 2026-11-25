import { ArrowRight, Camera, Leaf, Sparkles, TrendingDown } from "lucide-react";
import { SAMPLE_ALTERNATIVES } from "../data/categories";
import type {
  AppView,
  HealthierAlternative,
  ScanSession,
} from "../types/nutrition";

interface AlternativesViewProps {
  scanSession: ScanSession | null;
  onNavigate: (view: AppView) => void;
}

function findCalorieComparison(
  alt: HealthierAlternative,
  scanSession: ScanSession | null,
): number | null {
  if (!scanSession || scanSession.items.length === 0) return null;
  const target = alt.replaces.toLowerCase();
  const matched = scanSession.items.find(
    (item) =>
      target.includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(target),
  );
  if (!matched) return null;
  const diff = Math.round(matched.calories - alt.estimated_calories);
  return diff > 0 ? diff : null;
}

export function AlternativesView({
  scanSession,
  onNavigate,
}: AlternativesViewProps) {
  const hasLiveAlternatives = Boolean(
    scanSession && scanSession.alternatives.length > 0,
  );
  const displayedAlternatives = hasLiveAlternatives
    ? scanSession!.alternatives.slice(0, 3)
    : SAMPLE_ALTERNATIVES;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-1 text-xs font-medium text-[#34D399]">
            <Sparkles className="h-3.5 w-3.5" />
            AI Healthy Swaps
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white">
            Food Alternatives
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Three practical, nutrient-dense swaps generated from your scanned plate (for example:
            Chips → Baked Chips, Veggie Chips, Popcorn).
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("scanner")}
          className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-5 py-2.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_20px_rgba(163,255,18,0.2)] transition hover:bg-[#b5ff3b]"
        >
          <Camera className="h-4 w-4" />
          <span>{hasLiveAlternatives ? "Scan Another Meal" : "Launch Scanner"}</span>
        </button>
      </div>

      {/* Status Banner */}
      {hasLiveAlternatives ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#34D399]/30 bg-[#34D399]/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#34D399]/20 text-[#34D399]">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Showing {displayedAlternatives.length} AI swaps from your latest meal scan
              </p>
              <p className="text-xs text-zinc-300">
                Detected items:{" "}
                {scanSession!.items.map((item) => item.name).join(", ")}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-[#0A0A0A]/60 px-3 py-1 font-mono text-xs text-[#A3FF12]">
            {new Date(scanSession!.scannedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#121212] px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">
              Sample AI Swaps Preview
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              Scan any food photo in the AI Food Scanner to replace this example with 3 personalized
              alternatives returned by Gemini Vision.
            </p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300">
            Preview Mode
          </span>
        </div>
      )}

      {/* 3 Swap Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {displayedAlternatives.map((alt, index) => {
          const kcalSaved = hasLiveAlternatives
            ? findCalorieComparison(alt, scanSession)
            : null;

          return (
            <article
              key={`${alt.name}-${index}`}
              className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121212] p-6 transition hover:border-[#34D399]/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex h-7 items-center rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-2.5 font-mono text-xs font-semibold text-[#A3FF12]">
                    Swap #{index + 1}
                  </span>

                  {kcalSaved !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#34D399]/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#34D399]">
                      <TrendingDown className="h-3 w-3" />
                      -{kcalSaved} kcal
                    </span>
                  )}
                </div>

                {/* Replaces -> Alternative Flow */}
                <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#0A0A0A] p-3.5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Replaces
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-zinc-400 line-through decoration-zinc-600">
                    {alt.replaces}
                  </p>

                  <div className="my-2 flex items-center gap-1.5 text-[#34D399]">
                    <ArrowRight className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">
                      Healthier Swap
                    </span>
                  </div>

                  <h2 className="font-display text-lg font-bold text-white">
                    {alt.name}
                  </h2>
                </div>

                {/* Why Better */}
                <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                  {alt.reason}
                </p>
              </div>

              {/* Equivalent Serving Macros */}
              <div className="mt-6 border-t border-white/[0.08] pt-4">
                <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Estimated Equivalent Serving
                </p>
                <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs tabular-nums">
                  <div className="rounded-lg bg-[#0A0A0A] px-2 py-2">
                    <span className="block text-[10px] text-zinc-500">KCAL</span>
                    <span className="font-semibold text-[#A3FF12]">
                      {Math.round(alt.estimated_calories)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#0A0A0A] px-2 py-2">
                    <span className="block text-[10px] text-zinc-500">PROT</span>
                    <span className="font-semibold text-[#34D399]">
                      {alt.protein}g
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#0A0A0A] px-2 py-2">
                    <span className="block text-[10px] text-zinc-500">CARBS</span>
                    <span className="font-semibold text-emerald-300">
                      {alt.carbs}g
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#0A0A0A] px-2 py-2">
                    <span className="block text-[10px] text-zinc-500">FAT</span>
                    <span className="font-semibold text-lime-200">
                      {alt.fats}g
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
