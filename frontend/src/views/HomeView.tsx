import {
  ArrowRight,
  Camera,
  CheckCircle2,
  HeartPulse,
  LayoutDashboard,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { AppView } from "../types/nutrition";

interface HomeViewProps {
  onNavigate: (view: AppView) => void;
  hasActiveScan: boolean;
}

export function HomeView({ onNavigate, hasActiveScan }: HomeViewProps) {
  return (
    <div className="space-y-14 pb-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121212] px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        {/* Ambient radial accents */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-24 h-80 w-80 rounded-full bg-[#A3FF12]/12 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#34D399]/10 blur-[100px]"
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Copy */}
          <div className="space-y-7 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-[#34D399]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Vision Nutrition Intelligence</span>
            </div>

            <h1 className="font-display text-3xl leading-[1.12] font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-r from-[#A3FF12] to-[#34D399] bg-clip-text text-transparent">
                NutriSense AI
              </span>{" "}
              — Understand Your Food. Improve Your Everyday Health.
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Snap a meal photo or upload any dish to identify ingredients in seconds. Fine-tune
              portion sizes with live gram sliders, inspect real-time Calorie, Protein, Carbs, and
              Fat progress bars, and discover 3 practical healthier swaps tailored to your plate.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                type="button"
                onClick={() => onNavigate("scanner")}
                className="inline-flex items-center gap-2.5 rounded-full bg-[#A3FF12] px-6 py-3.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_28px_rgba(163,255,18,0.28)] transition hover:bg-[#b5ff3b] focus:ring-2 focus:ring-[#A3FF12] focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:outline-none"
              >
                <Camera className="h-4 w-4" />
                <span>Launch AI Food Scanner</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("dashboard")}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                <LayoutDashboard className="h-4 w-4 text-[#34D399]" />
                <span>View Meal Dashboard</span>
              </button>

              {hasActiveScan && (
                <button
                  type="button"
                  onClick={() => onNavigate("alternatives")}
                  className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-4 py-3 text-sm font-medium text-[#34D399] transition hover:bg-[#34D399]/20"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>View Latest 3 Swaps</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#A3FF12]" />
                Camera &amp; photo upload
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#34D399]" />
                Editable gram sliders
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#A3FF12]" />
                3 AI healthier swaps
              </span>
            </div>
          </div>

          {/* Right Live Preview Mockup Card */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/[0.1] bg-[#0A0A0A]/90 p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Instant Scan Snapshot
                  </p>
                  <p className="mt-0.5 font-display text-base font-semibold text-white">
                    Grilled Salmon &amp; Quinoa Bowl
                  </p>
                </div>
                <span className="rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-2.5 py-1 font-mono text-xs font-semibold text-[#A3FF12]">
                  540 kcal
                </span>
              </div>

              {/* Sample Detected Portion Bars */}
              <div className="mt-4 space-y-3">
                {[
                  { name: "Wild Grilled Salmon", grams: "160 g", kcal: "332 kcal" },
                  { name: "Herbed Quinoa", grams: "140 g", kcal: "168 kcal" },
                  { name: "Steamed Broccoli", grams: "110 g", kcal: "40 kcal" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#141414] px-3.5 py-2.5 text-xs"
                  >
                    <span className="font-medium text-white">{item.name}</span>
                    <div className="flex items-center gap-2.5 font-mono tabular-nums">
                      <span className="text-zinc-400">{item.grams}</span>
                      <span className="text-[#34D399]">{item.kcal}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sample Macro Progress */}
              <div className="mt-5 space-y-2.5 border-t border-white/[0.08] pt-4">
                {[
                  { label: "Protein", val: "42g", pct: "72%", color: "bg-[#34D399]" },
                  { label: "Carbs", val: "38g", pct: "48%", color: "bg-emerald-300" },
                  { label: "Fat", val: "22g", pct: "54%", color: "bg-[#A3FF12]" },
                ].map((macro) => (
                  <div key={macro.label} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-400">{macro.label}</span>
                      <span className="font-mono text-white">{macro.val}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className={`h-full rounded-full ${macro.color}`}
                        style={{ width: macro.pct }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-[#34D399]/25 bg-[#34D399]/10 px-3.5 py-2.5 text-xs">
                <span className="font-medium text-[#34D399]">
                  3 Healthier Swaps Ready
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate("scanner")}
                  className="font-semibold text-[#A3FF12] hover:underline"
                >
                  Try Scanner →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Workflow Cards */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#34D399]">
              How NutriSense Works
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">
              From Plate Photo to Actionable Nutrition
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("categories")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-[#A3FF12]"
          >
            <HeartPulse className="h-4 w-4 text-[#34D399]" />
            <span>Explore Educational Guides</span>
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <button
            type="button"
            onClick={() => onNavigate("scanner")}
            className="group rounded-2xl border border-white/[0.08] bg-[#121212] p-6 text-left transition hover:border-[#A3FF12]/40 hover:bg-[#151515]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#A3FF12]/25 bg-[#A3FF12]/10 text-[#A3FF12]">
              <Camera className="h-5 w-5" />
            </div>
            <p className="mt-5 font-mono text-xs text-zinc-500">01 / SCAN</p>
            <h3 className="mt-1 font-display text-lg font-semibold text-white group-hover:text-[#A3FF12]">
              AI Food Scanner
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Upload an image or capture directly from your camera to detect every item and estimate
              gram portions.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("scanner")}
            className="group rounded-2xl border border-white/[0.08] bg-[#121212] p-6 text-left transition hover:border-[#34D399]/40 hover:bg-[#151515]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#34D399]/25 bg-[#34D399]/10 text-[#34D399]">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <p className="mt-5 font-mono text-xs text-zinc-500">02 / ADJUST</p>
            <h3 className="mt-1 font-display text-lg font-semibold text-white group-hover:text-[#34D399]">
              Live Portion Sliders
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Fine-tune any item in grams and watch Calorie, Protein, Carbs, and Fat progress bars
              recalculate live.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("alternatives")}
            className="group rounded-2xl border border-white/[0.08] bg-[#121212] p-6 text-left transition hover:border-[#A3FF12]/40 hover:bg-[#151515]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#A3FF12]/25 bg-[#A3FF12]/10 text-[#A3FF12]">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="mt-5 font-mono text-xs text-zinc-500">03 / SWAP &amp; LOG</p>
            <h3 className="mt-1 font-display text-lg font-semibold text-white group-hover:text-[#A3FF12]">
              3 Swaps &amp; Daily Dashboard
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Get 3 healthier food alternatives per scan and persist meals into your daily macro
              dashboard.
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}
