import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Camera, LayoutDashboard, Sparkles } from "lucide-react";
import type { AppView } from "../../types/nutrition";
import { EASE_PREMIUM } from "../MotionPrimitives";
import { ScannerPreviewCard } from "./ScannerPreviewCard";

interface HeroProps {
  onNavigate: (view: AppView) => void;
  apiOnline: boolean | null;
  hasActiveScan: boolean;
  scannedItemsCount?: number;
}

export function Hero({
  onNavigate,
  apiOnline,
  hasActiveScan,
  scannedItemsCount = 0,
}: HeroProps) {
  const prefersReduced = useReducedMotion();

  return (
    <section
      aria-label="NutriSense AI Scanner Hero"
      className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0B0C0B] px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20"
    >
      {/* Tasteful Minimal Atmospheric Lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 right-10 h-80 w-80 rounded-full bg-[#34D399]/[0.09] blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[#A3FF12]/[0.07] blur-[120px]"
      />

      <div className="relative grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        {/* Left: Minimal Glowing Tagline + Supporting Copy + Highlighted Scan CTA */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_PREMIUM }}
          className="space-y-6 lg:col-span-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-[#34D399]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Meal Recognition &amp; Everyday Nutrition</span>
          </div>

          <h1 className="text-glow-white font-display text-4xl leading-[1.08] font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
            Understand Your Food.{" "}
            <span className="bg-gradient-to-r from-[#A3FF12] to-[#34D399] bg-clip-text text-transparent">
              Scan in Seconds.
            </span>
          </h1>

          <p className="max-w-lg text-base leading-relaxed text-[#A1A1AA] sm:text-lg">
            Point your camera or upload any meal photo to break down portions,
            explore estimated macronutrients, and log mindful daily choices.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <motion.button
              type="button"
              whileHover={prefersReduced ? undefined : { scale: 1.02 }}
              whileTap={prefersReduced ? undefined : { scale: 0.98 }}
              onClick={() => onNavigate("scanner")}
              className="inline-flex items-center gap-2.5 rounded-full bg-[#A3FF12] px-6 py-3.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_28px_rgba(163,255,18,0.28)] transition hover:bg-[#b5ff3b] focus:ring-2 focus:ring-[#A3FF12] focus:ring-offset-2 focus:ring-offset-[#0B0C0B] focus:outline-none"
            >
              <Camera className="h-4 w-4" />
              <span>Scan Your Food</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>

            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-5 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.07]"
            >
              <LayoutDashboard className="h-4 w-4 text-[#34D399]" />
              <span>My Dashboard</span>
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            Supports file upload, mobile camera, and live webcam capture.
          </p>
        </motion.div>

        {/* Right: Scanner-First Food Preview Card */}
        <div className="lg:col-span-6">
          <ScannerPreviewCard
            onNavigate={onNavigate}
            apiOnline={apiOnline}
            hasActiveScan={hasActiveScan}
            scannedItemsCount={scannedItemsCount}
          />
        </div>
      </div>
    </section>
  );
}
