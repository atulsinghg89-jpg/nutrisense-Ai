import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Baby,
  BookOpen,
  Flower2,
  HeartPulse,
  LayoutDashboard,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { NutritionCategoryGuide } from "../../data/categories";
import {
  FOUR_AUDIENCE_CHAPTERS,
  type AudienceChapterCard,
} from "../../data/fourChapters";
import type { AppView, AudienceChapterId } from "../../types/nutrition";
import { EASE_PREMIUM, RevealSection } from "../MotionPrimitives";

interface FourAudienceChaptersSectionProps {
  onNavigate: (view: AppView) => void;
  onSelectCategory?: (categoryId: NutritionCategoryGuide["id"]) => void;
  onLaunchProfileDashboard: (chapterId: AudienceChapterId) => void;
}

interface ChapterVisualTheme {
  icon: typeof User;
  cardSurface: string;
  hoverBorderShadow: string;
  bottomFadeClass: string;
  badgeStyle: string;
  titleHover: string;
  highlightIconColor: string;
  primaryButtonStyle: string;
  focusRing: string;
}

const CHAPTER_CARD_THEMES: Record<AudienceChapterId, ChapterVisualTheme> = {
  men: {
    icon: User,
    cardSurface: "border-white/[0.1] bg-[#101411]",
    hoverBorderShadow:
      "hover:border-[#A3FF12]/50 hover:shadow-[0_16px_38px_rgba(163,255,18,0.10)]",
    bottomFadeClass: "from-[#101411] via-[#101411]/35 to-transparent",
    badgeStyle: "border-[#A3FF12]/40 bg-[#070B08]/85 text-[#A3FF12]",
    titleHover: "group-hover:text-[#A3FF12]",
    highlightIconColor: "text-[#34D399]",
    primaryButtonStyle:
      "bg-[#A3FF12] text-[#050706] shadow-[0_0_20px_rgba(163,255,18,0.2)] hover:bg-[#b8ff42]",
    focusRing: "focus-visible:ring-[#A3FF12]",
  },
  women: {
    icon: Flower2,
    cardSurface: "border-rose-300/20 bg-[#161015]",
    hoverBorderShadow:
      "hover:border-rose-300/55 hover:shadow-[0_16px_38px_rgba(253,164,175,0.14)]",
    bottomFadeClass: "from-[#161015] via-[#161015]/35 to-transparent",
    badgeStyle: "border-rose-300/45 bg-[#1B0F17]/85 text-rose-200",
    titleHover: "group-hover:text-rose-200",
    highlightIconColor: "text-rose-300",
    primaryButtonStyle:
      "border border-rose-300/35 bg-rose-300/15 text-rose-100 hover:bg-rose-300/25",
    focusRing: "focus-visible:ring-rose-300",
  },
  babies: {
    icon: Baby,
    cardSurface: "border-amber-200/20 bg-[#14130E]",
    hoverBorderShadow:
      "hover:border-amber-200/55 hover:shadow-[0_16px_38px_rgba(252,211,77,0.12)]",
    bottomFadeClass: "from-[#14130E] via-[#14130E]/35 to-transparent",
    badgeStyle: "border-amber-200/45 bg-[#19160E]/85 text-amber-200",
    titleHover: "group-hover:text-amber-200",
    highlightIconColor: "text-amber-300",
    primaryButtonStyle:
      "bg-amber-300 text-[#14110A] shadow-[0_0_18px_rgba(252,211,77,0.18)] hover:bg-amber-200",
    focusRing: "focus-visible:ring-amber-300",
  },
  patients: {
    icon: HeartPulse,
    cardSurface: "border-sky-300/20 bg-[#0F1619]",
    hoverBorderShadow:
      "hover:border-sky-300/55 hover:shadow-[0_16px_38px_rgba(56,189,248,0.12)]",
    bottomFadeClass: "from-[#0F1619] via-[#0F1619]/35 to-transparent",
    badgeStyle: "border-sky-300/45 bg-[#0C1519]/85 text-sky-200",
    titleHover: "group-hover:text-sky-200",
    highlightIconColor: "text-teal-300",
    primaryButtonStyle:
      "bg-sky-300 text-[#071318] shadow-[0_0_18px_rgba(56,189,248,0.18)] hover:bg-sky-200",
    focusRing: "focus-visible:ring-sky-300",
  },
};

export function FourAudienceChaptersSection({
  onNavigate,
  onSelectCategory,
  onLaunchProfileDashboard,
}: FourAudienceChaptersSectionProps) {
  const prefersReduced = useReducedMotion();
  const { user, profiles, openAuthModal } = useAuth();

  function handleChapterPrimaryAction(chapter: AudienceChapterCard) {
    if (!user) {
      openAuthModal("register", chapter.id);
      return;
    }
    onLaunchProfileDashboard(chapter.id);
  }

  function handleReadGuide(chapter: AudienceChapterCard) {
    if (onSelectCategory) {
      onSelectCategory(chapter.linkedCategoryId);
    } else {
      onNavigate("categories");
    }
  }

  return (
    <RevealSection>
      <section
        id="four-audience-chapters"
        aria-label="Four Audience Nutrition Chapters"
        className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0B0F0C] px-5 py-10 sm:px-8 sm:py-14 lg:px-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[540px] -translate-x-1/2 rounded-full bg-[#A3FF12]/[0.06] blur-[120px]"
        />

        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-7">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <Sparkles className="h-3.5 w-3.5" />
              Tailored Life Chapters
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Nutrition Designed for Every Stage of Life
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA] sm:text-base">
              Dedicated workflows for Men&apos;s Health, Women&apos;s Wellness, Babies
              &amp; Children&apos;s Nutrition, and Patient Nutrition — read open guides
              anytime or sign in for private, multi-profile tracking.
            </p>
          </div>

          {user ? (
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-4 py-2.5 text-xs font-semibold text-[#34D399] transition hover:bg-[#34D399]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34D399]"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>
                Signed in as {user.full_name} ({profiles.length}{" "}
                {profiles.length === 1 ? "profile" : "profiles"})
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("login", null)}
              className="inline-flex items-center gap-2 rounded-full border border-[#A3FF12]/40 bg-[#A3FF12]/10 px-4 py-2.5 text-xs font-semibold text-[#A3FF12] transition hover:bg-[#A3FF12]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12]"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Sign In to Track Personal Profiles</span>
            </button>
          )}
        </div>

        <div className="relative z-10 mt-8 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FOUR_AUDIENCE_CHAPTERS.map((chapter, idx) => {
            const theme = CHAPTER_CARD_THEMES[chapter.id];
            const ChapterIcon = theme.icon;
            const hasMatchingProfile = Boolean(
              user &&
                profiles.some(
                  (p) =>
                    p.audience_chapter === chapter.id ||
                    (chapter.id === "babies" && p.profile_type === "baby") ||
                    (chapter.id === "patients" && p.profile_type === "patient"),
                ),
            );

            return (
              <motion.article
                key={chapter.id}
                initial={prefersReduced ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.4,
                  delay: prefersReduced ? 0 : idx * 0.05,
                  ease: EASE_PREMIUM,
                }}
                className={`group flex h-full flex-col overflow-hidden rounded-3xl border shadow-[0_14px_38px_rgba(0,0,0,0.45)] transition-all duration-300 ease-out hover:-translate-y-1 focus-within:ring-2 focus-within:ring-white/25 ${theme.cardSurface} ${theme.hoverBorderShadow}`}
              >
                {/* Clean, Full-Brightness Cover Media Window (No hover blur/dark veil) */}
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden">
                  <img
                    src={chapter.imagePath}
                    alt={chapter.imageAlt}
                    loading="lazy"
                    className={`h-full w-full ${chapter.imageFocusClass} transition-transform duration-300 ease-out group-hover:scale-[1.03]`}
                  />

                  {/* Minimal Bottom Seam Fade into Card Body Only */}
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t ${theme.bottomFadeClass}`}
                  />

                  {/* Top Corner Meta Pills */}
                  <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                    <span className="rounded-full border border-white/15 bg-[#050706]/80 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-100 backdrop-blur-md">
                      {chapter.chapterNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md ${theme.badgeStyle}`}
                    >
                      <ChapterIcon className="h-3 w-3 shrink-0" />
                      <span>{chapter.badgeText}</span>
                    </span>
                  </div>
                </div>

                {/* Always-Visible Structured Content Body */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div className="space-y-3">
                    <div>
                      <h3
                        className={`font-display text-xl font-extrabold leading-snug tracking-tight text-white transition-colors duration-300 ${theme.titleHover}`}
                      >
                        {chapter.title}
                      </h3>
                      <p className="mt-1 text-xs font-medium leading-snug text-zinc-300">
                        {chapter.tagline}
                      </p>
                    </div>

                    <p className="text-xs leading-relaxed text-[#A1A1AA]">
                      {chapter.intro}
                    </p>

                    <ul className="space-y-1.5 text-[11px] leading-snug text-zinc-300">
                      {chapter.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <ShieldCheck
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${theme.highlightIconColor}`}
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 space-y-2.5 border-t border-white/[0.08] pt-3.5">
                    <p className="rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                      {chapter.safetyNote}
                    </p>

                    <div className="flex flex-col gap-2">
                      {chapter.id === "women" && (
                        <button
                          type="button"
                          onClick={() => onNavigate("womens-wellness")}
                          className={`group/btn inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-300 px-3.5 py-2.5 text-xs font-bold text-[#140B10] shadow-[0_0_20px_rgba(253,164,175,0.22)] transition-all duration-300 ease-out hover:bg-rose-200 focus-visible:outline-none focus-visible:ring-2 ${theme.focusRing}`}
                        >
                          <Flower2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Open Women Wellness &amp; Period Garden</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleChapterPrimaryAction(chapter)}
                        className={`group/btn inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 ${theme.primaryButtonStyle} ${theme.focusRing}`}
                      >
                        {!user ? (
                          <>
                            <UserPlus className="h-3.5 w-3.5 shrink-0" />
                            <span>Login / Get Started</span>
                          </>
                        ) : hasMatchingProfile ? (
                          <>
                            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                            <span>Open {chapter.title} Dashboard</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5 shrink-0" />
                            <span>Create {chapter.title} Profile</span>
                          </>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReadGuide(chapter)}
                        className={`group/btn inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition-all duration-300 ease-out hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 ${theme.focusRing}`}
                      >
                        <BookOpen className={`h-3.5 w-3.5 shrink-0 ${theme.highlightIconColor}`} />
                        <span>Read Open Nutrition Guide</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>
    </RevealSection>
  );
}
