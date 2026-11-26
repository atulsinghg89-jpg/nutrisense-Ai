import { useRef, type MouseEvent } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { Check } from "lucide-react";
import type { ProfileCategory } from "../types/nutrition";
import type { NutritionCategoryGuide } from "../data/categories";
import { EASE_PREMIUM } from "./MotionPrimitives";

export interface ImageCardOption {
  id: string;
  label: string;
  subtitle: string;
  badge?: string;
  imageSrc: string;
  imageAlt: string;
  objectPosition?: string;
}

export const HUMAN_PROFILE_OPTIONS: (ImageCardOption & {
  id: ProfileCategory;
})[] = [
  {
    id: "male",
    label: "Male",
    subtitle: "Strength, muscle & balanced adult metabolism",
    badge: "Adult Profile",
    imageSrc: "/images/persona-male.jpg",
    imageAlt: "Adult male fitness portrait in dark athletic apparel",
    objectPosition: "object-[center_18%]",
  },
  {
    id: "female",
    label: "Female",
    subtitle: "Natural lifestyle balance, iron & daily vitality",
    badge: "Adult Profile",
    imageSrc: "/images/persona-female.jpg",
    imageAlt: "Smiling adult woman natural healthy lifestyle outdoor portrait",
    objectPosition: "object-[center_58%]",
  },
  {
    id: "child",
    label: "Child",
    subtitle: "Growing energy, calcium & friendly whole foods",
    badge: "4–12 Years",
    imageSrc: "/images/persona-child.jpg",
    imageAlt: "Happy school-age child practicing healthy tree pose indoors",
    objectPosition: "object-[center_20%]",
  },
];

export const USER_CATEGORY_CARD_OPTIONS: (ImageCardOption & {
  id: NutritionCategoryGuide["id"];
})[] = [
  {
    id: "mens-health",
    label: "Men's Health",
    subtitle: "Lean protein, stamina & heart care",
    badge: "Male",
    imageSrc: "/images/persona-male.jpg",
    imageAlt: "Men's health nutrition profile fitness portrait",
    objectPosition: "object-[center_18%]",
  },
  {
    id: "womens-health",
    label: "Women's Health",
    subtitle: "Iron, folate & daily balanced energy",
    badge: "Female",
    imageSrc: "/images/persona-female.jpg",
    imageAlt: "Women's health healthy lifestyle portrait",
    objectPosition: "object-[center_58%]",
  },
  {
    id: "baby-nutrition",
    label: "Child & Baby Nutrition",
    subtitle: "Growth milestones & safe whole foods",
    badge: "Child",
    imageSrc: "/images/persona-child.jpg",
    imageAlt: "Child & baby healthy growth nutrition portrait",
    objectPosition: "object-[center_20%]",
  },
  {
    id: "patient-nutrition",
    label: "Patient Nutrition",
    subtitle: "Gentle recovery & glycemic care",
    badge: "Wellness Care",
    imageSrc: "/images/persona-patient.jpg",
    imageAlt: "Healthy senior adult smiling outdoors in nature wellness portrait",
    objectPosition: "object-[center_22%]",
  },
];

interface PortraitCardItemProps {
  option: ImageCardOption;
  selected: boolean;
  onSelect: () => void;
  aspectClass?: string;
}

/**
 * Reusable HealthifyMe-inspired human portrait selection card featuring:
 * - Responsive upper-body photography
 * - Smooth pointer-driven 2D/subtle depth parallax & hover zoom
 * - Animated #A3FF12 outline glow + checkmark badge on selection
 */
export function PortraitSelectionCard({
  option,
  selected,
  onSelect,
  aspectClass = "h-48 sm:h-56",
}: PortraitCardItemProps) {
  const prefersReduced = useReducedMotion();
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const springX = useSpring(offsetX, { stiffness: 180, damping: 20 });
  const springY = useSpring(offsetY, { stiffness: 180, damping: 20 });

  function handleMouseMove(e: MouseEvent<HTMLButtonElement>) {
    if (prefersReduced) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const normX = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
    const normY = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
    offsetX.set(normX * -10);
    offsetY.set(normY * -10);
  }

  function handleMouseLeave() {
    offsetX.set(0);
    offsetY.set(0);
  }

  return (
    <motion.button
      ref={cardRef}
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={prefersReduced ? undefined : { y: -4 }}
      whileTap={prefersReduced ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.25, ease: EASE_PREMIUM }}
      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border text-left transition-all duration-300 focus:ring-2 focus:ring-[#A3FF12] focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:outline-none ${
        selected
          ? "border-[#A3FF12] bg-[#121212] shadow-[0_0_28px_rgba(163,255,18,0.28)] ring-1 ring-[#A3FF12]/60"
          : "border-white/10 bg-[#0A0A0A] hover:border-[#34D399]/50 hover:shadow-[0_14px_34px_rgba(0,0,0,0.65)]"
      }`}
    >
      {/* Image Window with Parallax + Hover Zoom */}
      <div className={`relative w-full overflow-hidden ${aspectClass}`}>
        <motion.div
          style={prefersReduced ? undefined : { x: springX, y: springY }}
          className="h-full w-full scale-[1.06]"
        >
          <img
            src={option.imageSrc}
            alt={option.imageAlt}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 ${
              option.objectPosition ?? "object-center"
            }`}
          />
        </motion.div>

        {/* Cinematic Dark Gradient Overlay */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-300 ${
            selected
              ? "bg-gradient-to-t from-[#050706] via-[#050706]/35 to-[#A3FF12]/10"
              : "bg-gradient-to-t from-[#050706] via-[#050706]/30 to-transparent"
          }`}
        />

        {/* Top-Left Category Pill */}
        {option.badge && (
          <span
            className={`absolute top-3 left-3 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase backdrop-blur-md transition-colors ${
              selected
                ? "border-[#A3FF12]/50 bg-[#050706]/80 text-[#A3FF12]"
                : "border-white/15 bg-[#050706]/70 text-zinc-200"
            }`}
          >
            {option.badge}
          </span>
        )}

        {/* Animated Top-Right Lime Checkmark */}
        <motion.span
          initial={false}
          animate={
            selected
              ? { scale: 1, opacity: 1 }
              : { scale: 0.65, opacity: 0.55 }
          }
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className={`absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
            selected
              ? "border-[#A3FF12] bg-[#A3FF12] text-[#050706] shadow-[0_0_16px_rgba(163,255,18,0.6)]"
              : "border-white/25 bg-[#050706]/60 text-transparent"
          }`}
        >
          <Check className="h-4 w-4 stroke-[3]" />
        </motion.span>

        {/* Label Anchored Over Bottom Vignette */}
        <div className="absolute inset-x-3.5 bottom-3">
          <p
            className={`font-display text-lg font-extrabold tracking-tight transition-colors ${
              selected
                ? "text-[#A3FF12]"
                : "text-white group-hover:text-[#A3FF12]"
            }`}
          >
            {option.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-300">
            {option.subtitle}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

interface HumanProfileSelectorProps {
  value: ProfileCategory;
  onChange: (category: ProfileCategory) => void;
  variant?: "modal" | "compact" | "full";
}

/** Male / Female / Child human image selector for Onboarding & Meal Planner profile screens. */
export function HumanProfileSelector({
  value,
  onChange,
  variant = "compact",
}: HumanProfileSelectorProps) {
  const aspectClass =
    variant === "modal"
      ? "h-36 sm:h-44"
      : variant === "full"
        ? "h-56 sm:h-64"
        : "h-40 sm:h-48";

  return (
    <div
      role="radiogroup"
      aria-label="Select Profile Category (Male, Female, Child)"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {HUMAN_PROFILE_OPTIONS.map((option) => (
        <PortraitSelectionCard
          key={option.id}
          option={option}
          selected={value === option.id}
          onSelect={() => onChange(option.id)}
          aspectClass={aspectClass}
        />
      ))}
    </div>
  );
}

interface HumanCategorySelectorProps {
  selectedId: "all" | NutritionCategoryGuide["id"];
  onSelect: (id: NutritionCategoryGuide["id"]) => void;
  onShowAll?: () => void;
  showAllMode?: boolean;
}

/** Human portrait cards for Men's Health, Women's Health, Child & Baby Nutrition, and Patient Nutrition. */
export function HumanCategorySelector({
  selectedId,
  onSelect,
  onShowAll,
  showAllMode = true,
}: HumanCategorySelectorProps) {
  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Select User Nutrition Category"
        className="grid grid-cols-2 gap-3.5 lg:grid-cols-4"
      >
        {USER_CATEGORY_CARD_OPTIONS.map((option) => (
          <PortraitSelectionCard
            key={option.id}
            option={option}
            selected={selectedId === option.id}
            onSelect={() => onSelect(option.id)}
            aspectClass="h-44 sm:h-56"
          />
        ))}
      </div>

      {showAllMode && onShowAll && selectedId !== "all" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onShowAll}
            className="rounded-full border border-white/15 bg-[#0A0A0A] px-3.5 py-1 text-xs font-semibold text-[#34D399] transition hover:border-[#A3FF12]/60 hover:text-[#A3FF12]"
          >
            Show All 4 Nutrition Profiles
          </button>
        </div>
      )}
    </div>
  );
}
