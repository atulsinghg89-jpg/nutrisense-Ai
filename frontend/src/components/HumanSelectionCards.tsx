import { motion, useReducedMotion } from "framer-motion";
import { Baby, Check, Flower2, HeartPulse, User } from "lucide-react";
import type { ProfileCategory } from "../types/nutrition";
import type { NutritionCategoryGuide } from "../data/categories";

export type CategoryCardThemeId = "men" | "women" | "baby" | "patient";

export interface ImageCardOption {
  id: string;
  label: string;
  subtitle: string;
  badge?: string;
  imageSrc: string;
  imageAlt: string;
  objectPosition?: string;
  theme?: CategoryCardThemeId;
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
    theme: "men",
  },
  {
    id: "female",
    label: "Female",
    subtitle: "Natural lifestyle balance, iron & daily vitality",
    badge: "Adult Profile",
    imageSrc: "/images/persona-female.jpg",
    imageAlt: "Smiling adult woman natural healthy lifestyle outdoor portrait",
    objectPosition: "object-[center_48%]",
    theme: "women",
  },
  {
    id: "child",
    label: "Child",
    subtitle: "Growing energy, calcium & friendly whole foods",
    badge: "4–12 Years",
    imageSrc: "/images/persona-child.jpg",
    imageAlt: "Happy school-age child practicing healthy tree pose indoors",
    objectPosition: "object-[center_20%]",
    theme: "baby",
  },
];

export const USER_CATEGORY_CARD_OPTIONS: (ImageCardOption & {
  id: NutritionCategoryGuide["id"];
})[] = [
  {
    id: "mens-health",
    label: "Men's Health",
    subtitle: "Lean protein, stamina & heart wellness",
    badge: "Men",
    imageSrc: "/images/persona-male.jpg",
    imageAlt: "Men's health nutrition profile fitness portrait",
    objectPosition: "object-[center_18%]",
    theme: "men",
  },
  {
    id: "womens-health",
    label: "Women's Wellness",
    subtitle: "Holistic balance, iron, folate & gentle rhythm",
    badge: "Women",
    imageSrc: "/images/persona-female.jpg",
    imageAlt: "Women's wellness natural lifestyle nutrition portrait",
    objectPosition: "object-[center_48%]",
    theme: "women",
  },
  {
    id: "baby-nutrition",
    label: "Babies & Children's Nutrition",
    subtitle: "Growth milestones, safe textures & whole foods",
    badge: "Child & Baby",
    imageSrc: "/images/persona-child.jpg",
    imageAlt: "Babies and children's healthy growth nutrition portrait",
    objectPosition: "object-[center_20%]",
    theme: "baby",
  },
  {
    id: "patient-nutrition",
    label: "Patient Nutrition",
    subtitle: "Calm recovery & condition-aware meal literacy",
    badge: "Care Literacy",
    imageSrc: "/images/persona-patient.jpg",
    imageAlt: "Healthy senior adult smiling outdoors in nature wellness portrait",
    objectPosition: "object-[center_22%]",
    theme: "patient",
  },
];

const CARD_THEME_STYLES: Record<
  CategoryCardThemeId,
  {
    icon: typeof User;
    surface: string;
    selectedStyle: string;
    hoverStyle: string;
    badgePill: string;
    selectedBadgePill: string;
    checkPill: string;
    titleSelected: string;
    titleHover: string;
    iconAccent: string;
    focusRing: string;
  }
> = {
  men: {
    icon: User,
    surface: "bg-[#111512]",
    selectedStyle:
      "border-[#A3FF12] shadow-[0_0_24px_rgba(163,255,18,0.22)] ring-1 ring-[#A3FF12]/60",
    hoverStyle:
      "border-white/10 hover:border-[#A3FF12]/50 hover:shadow-[0_12px_30px_rgba(163,255,18,0.10)]",
    badgePill: "border-white/20 bg-[#050706]/80 text-zinc-100",
    selectedBadgePill: "border-[#A3FF12]/60 bg-[#050706]/85 text-[#A3FF12]",
    checkPill: "border-[#A3FF12] bg-[#A3FF12] text-[#050706]",
    titleSelected: "text-[#A3FF12]",
    titleHover: "group-hover:text-[#A3FF12]",
    iconAccent: "text-[#A3FF12]",
    focusRing: "focus-visible:ring-[#A3FF12]",
  },
  women: {
    icon: Flower2,
    surface: "bg-[#171015]",
    selectedStyle:
      "border-rose-300 shadow-[0_0_24px_rgba(253,164,175,0.24)] ring-1 ring-rose-300/60",
    hoverStyle:
      "border-rose-300/20 hover:border-rose-300/55 hover:shadow-[0_12px_30px_rgba(253,164,175,0.12)]",
    badgePill: "border-rose-200/25 bg-[#1B0F17]/80 text-rose-100",
    selectedBadgePill: "border-rose-300/60 bg-[#1B0F17]/90 text-rose-200",
    checkPill: "border-rose-300 bg-rose-300 text-[#140B10]",
    titleSelected: "text-rose-200",
    titleHover: "group-hover:text-rose-200",
    iconAccent: "text-rose-300",
    focusRing: "focus-visible:ring-rose-300",
  },
  baby: {
    icon: Baby,
    surface: "bg-[#15140E]",
    selectedStyle:
      "border-amber-200 shadow-[0_0_24px_rgba(252,211,77,0.22)] ring-1 ring-amber-200/60",
    hoverStyle:
      "border-amber-200/20 hover:border-amber-200/55 hover:shadow-[0_12px_30px_rgba(252,211,77,0.12)]",
    badgePill: "border-amber-200/25 bg-[#19160E]/80 text-amber-100",
    selectedBadgePill: "border-amber-200/60 bg-[#19160E]/90 text-amber-200",
    checkPill: "border-amber-300 bg-amber-300 text-[#14110A]",
    titleSelected: "text-amber-200",
    titleHover: "group-hover:text-amber-200",
    iconAccent: "text-amber-300",
    focusRing: "focus-visible:ring-amber-300",
  },
  patient: {
    icon: HeartPulse,
    surface: "bg-[#0F1619]",
    selectedStyle:
      "border-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.22)] ring-1 ring-sky-300/60",
    hoverStyle:
      "border-sky-300/20 hover:border-sky-300/55 hover:shadow-[0_12px_30px_rgba(56,189,248,0.12)]",
    badgePill: "border-sky-200/25 bg-[#0C1519]/80 text-sky-100",
    selectedBadgePill: "border-sky-300/60 bg-[#0C1519]/90 text-sky-200",
    checkPill: "border-sky-300 bg-sky-300 text-[#071318]",
    titleSelected: "text-sky-200",
    titleHover: "group-hover:text-sky-200",
    iconAccent: "text-sky-300",
    focusRing: "focus-visible:ring-sky-300",
  },
};

interface PortraitCardItemProps {
  option: ImageCardOption;
  selected: boolean;
  onSelect: () => void;
  aspectClass?: string;
}

/**
 * Clean, overlay-free category cover card with uniform framing, per-theme accents,
 * and always-visible title/subtitle text below the bright cover photograph.
 */
export function PortraitSelectionCard({
  option,
  selected,
  onSelect,
  aspectClass = "aspect-[4/3]",
}: PortraitCardItemProps) {
  const prefersReduced = useReducedMotion();
  const themeKey: CategoryCardThemeId = option.theme ?? "men";
  const theme = CARD_THEME_STYLES[themeKey];
  const CardIcon = theme.icon;

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      whileTap={prefersReduced ? undefined : { scale: 0.99 }}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border text-left transition-all duration-300 ease-out hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] ${
        theme.surface
      } ${theme.focusRing} ${selected ? theme.selectedStyle : theme.hoverStyle}`}
    >
      {/* Clean Top Photo Frame (Zero dark or color hover overlays) */}
      <div className={`relative w-full shrink-0 overflow-hidden ${aspectClass}`}>
        <img
          src={option.imageSrc}
          alt={option.imageAlt}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] ${
            option.objectPosition ?? "object-center"
          }`}
        />

        {/* Top-Left Category Pill */}
        {option.badge && (
          <span
            className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase backdrop-blur-md transition-colors duration-300 ${
              selected ? theme.selectedBadgePill : theme.badgePill
            }`}
          >
            <CardIcon className="h-3 w-3 shrink-0" />
            <span>{option.badge}</span>
          </span>
        )}

        {/* Top-Right Selection Indicator */}
        <span
          aria-hidden="true"
          className={`absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-300 ease-out ${
            selected
              ? theme.checkPill
              : "border-white/30 bg-[#050706]/65 text-transparent backdrop-blur-md"
          }`}
        >
          <Check className="h-4 w-4 stroke-[3]" />
        </span>
      </div>

      {/* Always-Visible Solid Card Footer (High contrast, wraps long titles cleanly) */}
      <div className="flex flex-1 flex-col justify-between border-t border-white/[0.07] p-3.5 sm:p-4">
        <div>
          <p
            className={`font-display text-sm font-extrabold leading-snug tracking-tight transition-colors duration-300 sm:text-base ${
              selected ? theme.titleSelected : `text-white ${theme.titleHover}`
            }`}
          >
            {option.label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">
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
      ? "aspect-[16/10]"
      : variant === "full"
        ? "aspect-[4/3]"
        : "aspect-[4/3]";

  return (
    <div
      role="radiogroup"
      aria-label="Select Profile Category (Male, Female, Child)"
      className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-3"
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

/** Category cover cards for Men's Health, Women's Wellness, Babies & Children's Nutrition, and Patient Nutrition. */
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
        className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {USER_CATEGORY_CARD_OPTIONS.map((option) => (
          <PortraitSelectionCard
            key={option.id}
            option={option}
            selected={selectedId === option.id}
            onSelect={() => onSelect(option.id)}
            aspectClass="aspect-[4/3]"
          />
        ))}
      </div>

      {showAllMode && onShowAll && selectedId !== "all" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onShowAll}
            className="rounded-full border border-white/15 bg-[#0A0A0A] px-3.5 py-1 text-xs font-semibold text-[#34D399] transition hover:border-[#A3FF12]/60 hover:text-[#A3FF12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12]"
          >
            Show All 4 Nutrition Profiles
          </button>
        </div>
      )}
    </div>
  );
}
