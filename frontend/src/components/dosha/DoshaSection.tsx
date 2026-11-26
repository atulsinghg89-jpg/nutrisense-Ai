import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { DOSHA_PROFILES, type DoshaId } from "../../data/doshas";
import { EASE_PREMIUM } from "../MotionPrimitives";
import { DoshaCard } from "./DoshaCard";
import { DoshaDisclaimer } from "./DoshaDisclaimer";

interface DoshaSectionProps {
  onOpenDosha: (doshaId: DoshaId) => void;
}

/**
 * Homepage section placed immediately after "Four Chapters of NutriSense Intelligence".
 * Introduces Vata, Pitta, and Kapha with interactive hover/tap previews and detailed chapter launches.
 */
export function DoshaSection({ onOpenDosha }: DoshaSectionProps) {
  const prefersReduced = useReducedMotion();
  const [activePreviewId, setActivePreviewId] = useState<DoshaId | null>(null);

  return (
    <section
      id="discover-your-rhythm"
      aria-labelledby="discover-rhythm-heading"
      className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#070908] px-6 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:px-10 sm:py-14 lg:px-14"
    >
      {/* Subtle Earthy / Mineral Atmospheric Glows matching NutriSense Dark Palette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-12 h-72 w-72 rounded-full bg-[#34D399]/[0.06] blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-[#A3FF12]/[0.05] blur-[120px]"
      />

      <div className="relative z-10 space-y-10">
        {/* Editorial Section Heading */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.48, ease: EASE_PREMIUM }}
          className="flex flex-wrap items-end justify-between gap-6 border-b border-white/[0.08] pb-8"
        >
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#34D399]">
              <Sparkles className="h-3.5 w-3.5" />
              Cultural &amp; Ayurvedic Perspectives
            </span>
            <h2
              id="discover-rhythm-heading"
              className="font-display text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl lg:text-[2.75rem]"
            >
              Discover Your Rhythm
            </h2>
            <p className="text-sm leading-relaxed text-[#A3ADA6] sm:text-base">
              Three ancient perspectives. A deeper understanding of food,
              balance and everyday habits.
            </p>
          </div>

          {/* Interactive Trio Element Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {DOSHA_PROFILES.map((d) => {
              const isFocused = activePreviewId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onOpenDosha(d.id)}
                  onMouseEnter={() => setActivePreviewId(d.id)}
                  onMouseLeave={() => setActivePreviewId(null)}
                  className={`rounded-full border px-3.5 py-1.5 font-mono text-xs font-semibold transition ${
                    isFocused
                      ? d.theme.buttonClasses
                      : "border-white/10 bg-[#121212] text-zinc-300 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {d.name} — {d.elementsLabel}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Three Large Interactive Chapter Cards (Vata | Pitta | Kapha) */}
        <div className="grid gap-6 md:grid-cols-3">
          {DOSHA_PROFILES.map((dosha, idx) => (
            <DoshaCard
              key={dosha.id}
              dosha={dosha}
              index={idx}
              isPreviewActive={activePreviewId === dosha.id}
              onSetPreviewActive={(active) =>
                setActivePreviewId(active ? dosha.id : null)
              }
              onExplore={onOpenDosha}
            />
          ))}
        </div>

        {/* Educational Cultural Disclaimer Strip */}
        <DoshaDisclaimer compact />
      </div>
    </section>
  );
}
