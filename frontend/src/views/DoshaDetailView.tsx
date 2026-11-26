import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Compass,
  Droplet,
  Flame,
  HeartPulse,
  Mountain,
  Sparkles,
  Sun,
  Wind,
} from "lucide-react";
import { DoshaDisclaimer } from "../components/dosha/DoshaDisclaimer";
import { DoshaFoodGuide } from "../components/dosha/DoshaFoodGuide";
import { EASE_PREMIUM } from "../components/MotionPrimitives";
import { DOSHA_PROFILES, type DoshaId } from "../data/doshas";
import type { AppView } from "../types/nutrition";

interface DoshaDetailViewProps {
  doshaId: DoshaId;
  onSelectDosha: (id: DoshaId) => void;
  onBackToRhythm: () => void;
  onNavigate: (view: AppView) => void;
}

function getElementVisualIcon(elementName: string) {
  const lower = elementName.toLowerCase();
  if (lower.includes("air")) return Wind;
  if (lower.includes("space")) return Sparkles;
  if (lower.includes("fire")) return Flame;
  if (lower.includes("water")) return Droplet;
  return Mountain;
}

/**
 * Full Detailed Chapter View for Vata, Pitta, or Kapha containing:
 * A. Introduction | B. Associated Elements | C. Qualities |
 * D & E. Interactive 7-Category Visual Food Guide | F. Lifestyle |
 * Disclaimer & Return Navigation ("← Back to Discover Your Rhythm")
 */
export function DoshaDetailView({
  doshaId,
  onSelectDosha,
  onBackToRhythm,
  onNavigate,
}: DoshaDetailViewProps) {
  const prefersReduced = useReducedMotion();
  const dosha =
    DOSHA_PROFILES.find((d) => d.id === doshaId) ?? DOSHA_PROFILES[0];

  const El1Icon = getElementVisualIcon(dosha.elements[0]);
  const El2Icon = getElementVisualIcon(dosha.elements[1]);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Sticky Return & Chapter Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onBackToRhythm}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#050706] px-4 py-2 text-xs font-bold text-white transition hover:border-[#A3FF12]/60 hover:text-[#A3FF12]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>← Back to Discover Your Rhythm</span>
        </button>

        {/* Quick Switch Between Chapters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {DOSHA_PROFILES.map((item) => {
            const active = item.id === dosha.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectDosha(item.id)}
                className={`rounded-full border px-3.5 py-1.5 font-mono text-xs font-bold transition ${
                  active
                    ? item.theme.buttonClasses
                    : "border-white/10 bg-[#050706] text-[#A1A1AA] hover:border-white/25 hover:text-white"
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION A & B & C: Editorial Hero Banner (User Cover + Intro + Elements + Qualities) */}
      <motion.section
        key={dosha.id}
        initial={prefersReduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_PREMIUM }}
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050706] p-6 shadow-2xl sm:p-10"
      >
        <div
          aria-hidden="true"
          style={{ backgroundColor: dosha.theme.accentHex }}
          className="pointer-events-none absolute -top-28 right-0 h-80 w-80 rounded-full opacity-[0.09] blur-[125px]"
        />

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-12">
          {/* Left Cover Artwork */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0A0A0A] p-2">
              <img
                src={dosha.coverImage}
                alt={dosha.coverAlt}
                className={`aspect-[3/4] max-h-[470px] w-full rounded-2xl object-cover ${dosha.coverObjectPosition}`}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 rounded-2xl bg-gradient-to-t from-[#050706]/80 via-transparent to-transparent"
              />
              <div className="absolute right-5 bottom-5 left-5 flex items-center justify-between">
                <span
                  className={`rounded-full border px-3 py-1 font-mono text-[11px] font-bold uppercase backdrop-blur-md ${dosha.theme.badgeClasses}`}
                >
                  Chapter {dosha.chapterNumber}
                </span>
                <span className="font-mono text-xs font-semibold text-white">
                  {dosha.elementsLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Right Narrative: A. Introduction + B. Elements Visual + C. Qualities */}
          <div className="space-y-6 lg:col-span-7">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#34D399]">
                Traditional Ayurvedic Perspective
              </p>
              <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                {dosha.name} —{" "}
                <span style={{ color: dosha.theme.accentHex }}>
                  {dosha.rhythmTitle}
                </span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-[#B4BEB7] sm:text-base">
                {dosha.detailedIntro}
              </p>
            </div>

            {/* B. Visual Associated Elements Representation */}
            <div className="rounded-2xl border border-white/10 bg-[#121212] p-5">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                Associated Classical Elements
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#050706] px-4 py-2.5">
                  <El1Icon
                    className="h-5 w-5"
                    style={{ color: dosha.theme.accentHex }}
                  />
                  <span className="font-display text-base font-extrabold text-white">
                    {dosha.elements[0]}
                  </span>
                </div>

                <span className="font-mono text-lg font-bold text-[#A1A1AA]">
                  +
                </span>

                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#050706] px-4 py-2.5">
                  <El2Icon
                    className="h-5 w-5"
                    style={{ color: dosha.theme.secondaryHex }}
                  />
                  <span className="font-display text-base font-extrabold text-white">
                    {dosha.elements[1]}
                  </span>
                </div>

                <span className="ml-auto font-mono text-xs uppercase tracking-wider text-[#A1A1AA]">
                  {dosha.name.toUpperCase()} →{" "}
                  {dosha.elements.join(" + ").toUpperCase()}
                </span>
              </div>
            </div>

            {/* C. Traditionally Associated Qualities */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Traditionally Associated Qualities (Gunas)
                </p>
                <span className="text-[11px] text-zinc-500">
                  Descriptive framework within traditional philosophy, not biometric measurements
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {dosha.qualities.map((quality) => (
                  <span
                    key={quality}
                    className={`rounded-xl border px-3.5 py-2 font-mono text-xs font-bold ${dosha.theme.chipClasses}`}
                  >
                    {quality}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* SECTION D & E: Interactive Visual Food Guide across 7 Categories */}
      <DoshaFoodGuide dosha={dosha} onNavigate={onNavigate} />

      {/* SECTION F: Everyday Lifestyle Perspective */}
      <section className="space-y-5 rounded-3xl border border-white/10 bg-[#0A0A0A] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${dosha.theme.chipClasses}`}
            >
              <Compass className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold text-white">
                Everyday Lifestyle Perspective
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                General, non-prescriptive everyday habits paired culturally with{" "}
                {dosha.name}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("scanner")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-3.5 py-1.5 text-xs font-semibold text-[#34D399] transition hover:bg-[#34D399]/20"
          >
            <HeartPulse className="h-3.5 w-3.5" />
            <span>Analyze a Meal with AI Scanner</span>
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dosha.lifestylePillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl border border-white/10 bg-[#121212] p-5"
            >
              <Sun
                className="h-4 w-4"
                style={{ color: dosha.theme.accentHex }}
              />
              <h3 className="mt-3 font-display text-sm font-bold text-white">
                {pillar.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                {pillar.perspective}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Required Educational Disclaimer + Bottom Return Navigation */}
      <div className="space-y-4">
        <DoshaDisclaimer />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#121212] px-5 py-4">
          <button
            type="button"
            onClick={onBackToRhythm}
            className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-5 py-2.5 text-xs font-bold text-[#050706] transition hover:bg-[#b8ff42]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>← Back to Discover Your Rhythm</span>
          </button>

          <div className="flex flex-wrap gap-2">
            {DOSHA_PROFILES.filter((item) => item.id !== dosha.id).map((other) => (
              <button
                key={other.id}
                type="button"
                onClick={() => onSelectDosha(other.id)}
                className="rounded-full border border-white/15 bg-[#050706] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/35"
              >
                Explore {other.name} →
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
