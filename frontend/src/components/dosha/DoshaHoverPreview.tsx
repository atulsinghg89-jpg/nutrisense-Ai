import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import type { DoshaProfileData } from "../../data/doshas";
import { EASE_PREMIUM } from "../MotionPrimitives";

interface DoshaHoverPreviewProps {
  dosha: DoshaProfileData;
  visible: boolean;
  onExplore: () => void;
}

/**
 * Interactive translucent hover / tap reveal overlay for Vata, Pitta, and Kapha cards:
 * displays elemental concepts, qualities, compact mini food chart, examples, and Explore CTA.
 */
export function DoshaHoverPreview({
  dosha,
  visible,
  onExplore,
}: DoshaHoverPreviewProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      aria-hidden={!visible}
      initial={false}
      animate={
        visible
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 12 }
      }
      transition={{
        duration: prefersReduced ? 0.1 : 0.3,
        ease: EASE_PREMIUM,
      }}
      className={`absolute inset-0 z-20 flex flex-col justify-between rounded-[1.75rem] bg-[#050706]/88 p-5 sm:p-6 backdrop-blur-md transition-all ${
        visible ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Top Elements + Qualities */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${dosha.theme.badgeClasses}`}
          >
            <Sparkles className="h-3 w-3" />
            {dosha.elementsLabel}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#A1A1AA]">
            Interactive Chapter
          </span>
        </div>

        <div>
          <h3 className="font-display text-2xl font-extrabold text-white">
            {dosha.name}
          </h3>
          <p className="text-xs font-medium text-zinc-300">
            {dosha.rhythmTitle}
          </p>
        </div>

        <p className="line-clamp-3 text-xs leading-relaxed text-[#A3ADA6]">
          {dosha.shortIntro}
        </p>

        {/* Qualities */}
        <div className="flex flex-wrap gap-1.5">
          {dosha.qualities.map((q) => (
            <span
              key={q}
              className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${dosha.theme.chipClasses}`}
            >
              {q}
            </span>
          ))}
        </div>
      </div>

      {/* Middle Mini Visual Food Preview Chart */}
      <div className="my-3 space-y-2 rounded-2xl border border-white/10 bg-[#101411]/90 p-3.5">
        <div className="grid grid-cols-1 gap-2 border-b border-white/[0.07] pb-2">
          {dosha.miniChart.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="shrink-0 font-semibold text-[#A1A1AA]">
                {row.label}:
              </span>
              <span className="truncate text-right font-medium text-white">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 pt-0.5">
          {dosha.examplePreviewChips.slice(0, 4).map((food) => (
            <span
              key={food}
              className="rounded-full border border-white/10 bg-[#050706]/80 px-2 py-0.5 text-[10px] text-zinc-200"
            >
              {food}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Interactive Explore CTA */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] font-medium text-[#A1A1AA]">
          Tastes: {dosha.tastes.join(" • ")}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExplore();
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-lg transition ${dosha.theme.buttonClasses}`}
        >
          <span>{dosha.ctaLabel}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
