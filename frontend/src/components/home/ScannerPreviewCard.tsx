import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Camera, ScanLine, Upload } from "lucide-react";
import type { AppView } from "../../types/nutrition";
import { EASE_PREMIUM } from "../MotionPrimitives";

interface ScannerPreviewCardProps {
  onNavigate: (view: AppView) => void;
  apiOnline: boolean | null;
  hasActiveScan: boolean;
  scannedItemsCount?: number;
}

const SAMPLE_INGREDIENT_TAGS = [
  { label: "Grilled Salmon", pos: "top-12 left-4 sm:left-5" },
  { label: "Quinoa & Herbs", pos: "top-14 right-4 sm:right-5" },
  { label: "Avocado", pos: "bottom-20 left-4 sm:left-5" },
  { label: "Roasted Sweet Potato", pos: "bottom-20 right-4 sm:right-5" },
];

export function ScannerPreviewCard({
  onNavigate,
  apiOnline,
  hasActiveScan,
  scannedItemsCount = 0,
}: ScannerPreviewCardProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay: 0.08, ease: EASE_PREMIUM }}
      className="relative"
    >
      {/* Subtle behind-frame ambient mint aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(circle_at_60%_40%,rgba(52,211,153,0.14),transparent_68%)] blur-2xl"
      />

      <div className="scanner-card-glow relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#121212] p-3.5 sm:p-4">
        {/* Card Header Bar */}
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
            <ScanLine className="h-3.5 w-3.5 text-[#34D399]" />
            <span>AI Meal Scanner Preview</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#0A0A0A] px-2.5 py-1 text-[11px] font-medium text-[#A1A1AA]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                apiOnline === true
                  ? "bg-[#34D399]"
                  : apiOnline === false
                    ? "bg-amber-400"
                    : "bg-zinc-500"
              }`}
            />
            {hasActiveScan && scannedItemsCount > 0
              ? `${scannedItemsCount} items in session`
              : "Example Dish"}
          </span>
        </div>

        {/* Realistic Food Photograph Inside Scanner Frame */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A0A0A]">
          <img
            src="/images/hero-bowl.jpg"
            alt="Sample balanced meal bowl with grilled salmon, quinoa, avocado, sweet potato, and greens inside NutriSense AI scanner preview"
            className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.02]"
          />

          {/* Cinematic vignette */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/90 via-[#0A0A0A]/15 to-[#0A0A0A]/25"
          />

          {/* Scanner Corner Reticles */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-4"
          >
            <span className="absolute top-0 left-0 h-5 w-5 rounded-tl-md border-t-2 border-l-2 border-[#A3FF12]/85" />
            <span className="absolute top-0 right-0 h-5 w-5 rounded-tr-md border-t-2 border-r-2 border-[#A3FF12]/85" />
            <span className="absolute bottom-14 left-0 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-[#34D399]/80" />
            <span className="absolute right-0 bottom-14 h-5 w-5 rounded-br-md border-r-2 border-b-2 border-[#34D399]/80" />
          </div>

          {/* Subtle Horizontal Scanning Line */}
          {!prefersReduced && (
            <div
              aria-hidden="true"
              className="animate-scan-beam pointer-events-none absolute inset-x-4 h-[1.5px] bg-gradient-to-r from-transparent via-[#A3FF12]/80 to-transparent shadow-[0_0_14px_rgba(163,255,18,0.55)]"
            />
          )}

          {/* Small Ingredient Indicators (Sample Visual Context) */}
          {SAMPLE_INGREDIENT_TAGS.map((tag) => (
            <span
              key={tag.label}
              className={`glass-surface pointer-events-none absolute ${tag.pos} hidden items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white shadow-md sm:inline-flex`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
              <span>{tag.label}</span>
            </span>
          ))}

          {/* Bottom Scanner Action Strip */}
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0A0A0A]/85 px-3 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate("scanner")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#171717] px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/30 hover:text-white"
              >
                <Upload className="h-3.5 w-3.5 text-[#34D399]" />
                <span>Upload</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("scanner")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#171717] px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/30 hover:text-white"
              >
                <Camera className="h-3.5 w-3.5 text-[#A3FF12]" />
                <span>Camera</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("scanner")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#A3FF12] px-3 py-1.5 text-xs font-bold text-[#0A0A0A] transition hover:bg-[#b5ff3b]"
            >
              <span>Scan Your Food</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
