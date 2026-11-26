import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { ArrowUpRight, Droplet, Flame, Mountain, Sparkles, Wind } from "lucide-react";
import type { DoshaId, DoshaProfileData } from "../../data/doshas";
import { EASE_PREMIUM } from "../MotionPrimitives";
import { DoshaHoverPreview } from "./DoshaHoverPreview";

interface DoshaCardProps {
  dosha: DoshaProfileData;
  isPreviewActive: boolean;
  onSetPreviewActive: (active: boolean) => void;
  onExplore: (doshaId: DoshaId) => void;
  index: number;
}

function getDoshaElementIcons(id: DoshaId) {
  if (id === "vata") return [Wind, Sparkles];
  if (id === "pitta") return [Flame, Droplet];
  return [Mountain, Droplet];
}

/**
 * Interactive Visual Chapter Card for Vata, Pitta, or Kapha:
 * - Preserves the exact user-provided cover artwork
 * - Desktop: hover reveals rich blurred preview with mini food chart + zoom/parallax
 * - Mobile / Touch: first tap opens preview cleanly; second tap or Explore opens full DoshaDetailView
 */
export function DoshaCard({
  dosha,
  isPreviewActive,
  onSetPreviewActive,
  onExplore,
  index,
}: DoshaCardProps) {
  const prefersReduced = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const springX = useSpring(offsetX, { stiffness: 160, damping: 22 });
  const springY = useSpring(offsetY, { stiffness: 160, damping: 22 });

  const [El1, El2] = getDoshaElementIcons(dosha.id);
  const showOverlay = isHovered || isPreviewActive;

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (prefersReduced) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
    const ny = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
    offsetX.set(nx * -10);
    offsetY.set(ny * -10);
  }

  function handleMouseEnter() {
    setIsHovered(true);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    offsetX.set(0);
    offsetY.set(0);
  }

  function handleCardInteraction() {
    // Touch/click device behaviour: first tap toggles rich preview if not hovered yet;
    // clicking while preview is already revealed opens the detailed chapter!
    const isCoarsePointer =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;

    if (isCoarsePointer && !isPreviewActive) {
      onSetPreviewActive(true);
      return;
    }
    onExplore(dosha.id);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onExplore(dosha.id);
    }
  }

  return (
    <motion.div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={`${dosha.name} — ${dosha.rhythmTitle}. Explore ${dosha.elementsLabel} perspective`}
      onClick={handleCardInteraction}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onFocus={() => onSetPreviewActive(true)}
      onBlur={() => onSetPreviewActive(false)}
      initial={prefersReduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: 0.5,
        delay: prefersReduced ? 0 : index * 0.1,
        ease: EASE_PREMIUM,
      }}
      style={{
        boxShadow: showOverlay ? dosha.theme.glowStyle : undefined,
      }}
      className={`group relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0A0A0A] transition-all duration-300 focus:ring-2 focus:ring-[#A3FF12] focus:ring-offset-2 focus:ring-offset-[#050706] focus:outline-none sm:min-h-[460px] ${dosha.theme.borderHoverClasses}`}
    >
      {/* Background Cover Image with Smooth Parallax + Hover Scale */}
      <motion.div
        style={prefersReduced ? undefined : { x: springX, y: springY }}
        className="h-full w-full scale-[1.06]"
      >
        <img
          src={dosha.coverImage}
          alt={dosha.coverAlt}
          loading="lazy"
          className={`h-full w-full object-cover transition-all duration-700 ease-out ${
            showOverlay ? "scale-110 blur-[2px]" : "scale-100"
          } ${dosha.coverObjectPosition}`}
        />
      </motion.div>

      {/* Dark Atmospheric Scrim for High Readability */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#050706] via-[#050706]/35 to-[#050706]/40"
      />

      {/* Top Resting Bar (fades gracefully when interactive preview takes focus) */}
      <div
        className={`absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-2 transition-opacity duration-200 ${
          showOverlay ? "opacity-0" : "opacity-100"
        }`}
      >
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-bold uppercase backdrop-blur-md ${dosha.theme.badgeClasses}`}
        >
          <El1 className="h-3 w-3" />
          <El2 className="h-3 w-3" />
          <span>{dosha.elementsLabel}</span>
        </span>

        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#050706]/70 text-white backdrop-blur-md transition group-hover:border-white/40">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      {/* Bottom Resting Title & Qualities Showcase */}
      <div
        className={`absolute inset-x-5 bottom-5 z-10 space-y-2 transition-all duration-300 ${
          showOverlay ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">
          Chapter {dosha.chapterNumber}
        </p>
        <h3 className="font-display text-3xl font-extrabold tracking-tight text-white">
          {dosha.name}
        </h3>
        <p className="text-sm font-medium text-zinc-200">
          {dosha.rhythmTitle}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-zinc-300">
          <span>{dosha.qualities.join(" • ")}</span>
        </div>
        <p className="pt-1 text-[11px] text-[#34D399]">
          Hover or tap to preview →
        </p>
      </div>

      {/* Smooth Interactive Hover / Tap Overlay Preview */}
      <DoshaHoverPreview
        dosha={dosha}
        visible={showOverlay}
        onExplore={() => onExplore(dosha.id)}
      />
    </motion.div>
  );
}
