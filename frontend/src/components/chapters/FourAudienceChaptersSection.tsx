import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Flower2,
  LayoutDashboard,
  Lock,
  ShieldCheck,
  Sparkles,
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

export function FourAudienceChaptersSection({
  onNavigate,
  onSelectCategory,
  onLaunchProfileDashboard,
}: FourAudienceChaptersSectionProps) {
  const { user, profiles, openAuthModal } = useAuth();
  const [activeCardId, setActiveCardId] = useState<AudienceChapterId | null>(null);

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
              Hover or tap any chapter to preview dedicated workflows for Men, Women,
              Babies, and Patients — read open guides anytime or sign in for private,
              multi-profile tracking.
            </p>
          </div>

          {user ? (
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-4 py-2.5 text-xs font-semibold text-[#34D399] transition hover:bg-[#34D399]/20"
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
              className="inline-flex items-center gap-2 rounded-full border border-[#A3FF12]/40 bg-[#A3FF12]/10 px-4 py-2.5 text-xs font-semibold text-[#A3FF12] transition hover:bg-[#A3FF12]/20"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Sign In to Track Personal Profiles</span>
            </button>
          )}
        </div>

        <div className="relative z-10 mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FOUR_AUDIENCE_CHAPTERS.map((chapter, idx) => {
            const isPreviewOpen = activeCardId === chapter.id;
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
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: idx * 0.06, ease: EASE_PREMIUM }}
                onMouseEnter={() => setActiveCardId(chapter.id)}
                onMouseLeave={() =>
                  setActiveCardId((prev) => (prev === chapter.id ? null : prev))
                }
                onClick={() =>
                  setActiveCardId((prev) => (prev === chapter.id ? null : chapter.id))
                }
                className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-3xl border border-white/[0.1] bg-[#121713] shadow-[0_18px_50px_rgba(0,0,0,0.55)] transition-colors duration-300 hover:border-[#A3FF12]/45 focus-within:border-[#A3FF12]/50"
              >
                {/* Chapter Cover Photograph */}
                <img
                  src={chapter.imagePath}
                  alt={chapter.imageAlt}
                  loading="lazy"
                  className={`h-full w-full ${chapter.imageFocusClass} transition duration-500 ease-out ${
                    isPreviewOpen
                      ? "scale-105 blur-[3px] brightness-75"
                      : "group-hover:scale-105 group-hover:blur-[3px] group-hover:brightness-75"
                  }`}
                />

                {/* Persistent Cinematic Dark Gradient */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
                    isPreviewOpen
                      ? "bg-gradient-to-t from-[#050706] via-[#050706]/85 to-[#050706]/45"
                      : "bg-gradient-to-t from-[#050706]/95 via-[#050706]/35 to-black/25 group-hover:from-[#050706] group-hover:via-[#050706]/85"
                  }`}
                />

                {/* Top Meta Row */}
                <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-white/15 bg-black/55 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-200 backdrop-blur-md">
                    {chapter.chapterNumber}
                  </span>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md"
                    style={{
                      borderColor: `${chapter.accentColor}55`,
                      backgroundColor: "rgba(5, 7, 6, 0.72)",
                      color: chapter.accentColor,
                    }}
                  >
                    {chapter.badgeText}
                  </span>
                </div>

                {/* Bottom Resting Headline + Smooth Hover/Tap Interactive Reveal */}
                <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end p-5">
                  <div className="transition-transform duration-300 ease-out">
                    <h3 className="font-display text-2xl font-extrabold tracking-tight text-white">
                      {chapter.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-zinc-300">
                      {chapter.tagline}
                    </p>
                  </div>

                  {/* Expanded Overlay Content (visible cleanly on hover or mobile tap) */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                      isPreviewOpen
                        ? "mt-3 max-h-[320px] opacity-100"
                        : "max-h-0 opacity-0 group-hover:mt-3 group-hover:max-h-[320px] group-hover:opacity-100"
                    }`}
                  >
                    <p className="text-xs leading-relaxed text-zinc-200">
                      {chapter.intro}
                    </p>

                    <ul className="mt-2.5 space-y-1 text-[11px] text-zinc-300">
                      {chapter.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-1.5">
                          <ShieldCheck
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            style={{ color: chapter.accentColor }}
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-2.5 rounded-xl border border-white/10 bg-black/55 px-2.5 py-1.5 text-[10px] leading-snug text-zinc-400">
                      {chapter.safetyNote}
                    </p>

                    <div
                      className="mt-3 flex flex-col gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {chapter.id === "women" && (
                        <button
                          type="button"
                          onClick={() => onNavigate("womens-wellness")}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-300 px-3.5 py-2.5 text-xs font-bold text-[#140B10] shadow-[0_0_20px_rgba(253,164,175,0.28)] transition hover:bg-rose-200"
                        >
                          <Flower2 className="h-3.5 w-3.5" />
                          <span>Explore Women&apos;s Wellness</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleChapterPrimaryAction(chapter)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#A3FF12] px-3.5 py-2.5 text-xs font-bold text-[#050706] shadow-[0_0_20px_rgba(163,255,18,0.25)] transition hover:bg-[#b8ff42]"
                      >
                        {!user ? (
                          <>
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Login / Get Started</span>
                          </>
                        ) : hasMatchingProfile ? (
                          <>
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            <span>Open {chapter.title} Dashboard</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Create {chapter.title} Profile</span>
                          </>
                        )}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReadGuide(chapter)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-black/65 px-3 py-2 text-[11px] font-semibold text-zinc-200 backdrop-blur-md transition hover:border-white/40 hover:text-white"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-[#34D399]" />
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
