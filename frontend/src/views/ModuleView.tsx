import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  HeartPulse,
  ShieldAlert,
  Sparkles,
  User,
} from "lucide-react";
import {
  EASE_PREMIUM,
  staggerContainerVariants,
  staggerItemVariants,
} from "../components/MotionPrimitives";
import type { ModuleContent, ModuleId } from "../types/modules";
import type { AppView } from "../types/nutrition";

const MODULE_CHECKLIST_STORAGE_KEY = "nutrisense_module_checklists_v1";

interface ModuleViewProps {
  content: ModuleContent;
  onNavigate: (view: AppView) => void;
}

const MODULE_VISUALS: Record<
  ModuleId,
  {
    icon: typeof User;
    accentGlow: string;
    badgeClasses: string;
  }
> = {
  men: {
    icon: User,
    accentGlow: "from-[#A3FF12]/15 via-[#34D399]/5 to-transparent",
    badgeClasses: "border-[#A3FF12]/35 bg-[#A3FF12]/10 text-[#A3FF12]",
  },
  baby: {
    icon: Baby,
    accentGlow: "from-[#34D399]/15 via-[#A3FF12]/5 to-transparent",
    badgeClasses: "border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]",
  },
  patient: {
    icon: HeartPulse,
    accentGlow: "from-[#A3FF12]/12 via-[#34D399]/10 to-transparent",
    badgeClasses: "border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]",
  },
};

function loadChecklistState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(MODULE_CHECKLIST_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function ModuleView({ content, onNavigate }: ModuleViewProps) {
  const prefersReduced = useReducedMotion();
  const [activeSectionId, setActiveSectionId] = useState<string>(
    content.sections[0]?.id ?? "",
  );
  const [checkedQuestions, setCheckedQuestions] = useState<
    Record<string, boolean>
  >(() => loadChecklistState());

  useEffect(() => {
    setActiveSectionId(content.sections[0]?.id ?? "");
  }, [content.id, content.sections]);

  useEffect(() => {
    try {
      localStorage.setItem(
        MODULE_CHECKLIST_STORAGE_KEY,
        JSON.stringify(checkedQuestions),
      );
    } catch {
      // Ignore storage quota / private-browsing errors gracefully
    }
  }, [checkedQuestions]);

  const visuals = MODULE_VISUALS[content.id];
  const HeaderIcon = visuals.icon;

  const toggleChecklistQuestion = (key: string) => {
    setCheckedQuestions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const el = document.getElementById(`module-${content.id}-${sectionId}`);
    if (el) {
      el.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "start",
      });
    }
  };

  const checkedCount = (content.checklistGroups ?? []).reduce(
    (sum, group) =>
      sum +
      group.questions.filter(
        (_, idx) => checkedQuestions[`${content.id}:${group.id}:${idx}`],
      ).length,
    0,
  );

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="#categories"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("categories");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#121212] px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-[#A3FF12]/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12]"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#A3FF12]" />
            <span>Back to Categories</span>
          </a>
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("home");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2 text-xs font-medium text-[#A1A1AA] transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12]"
          >
            <span>Home</span>
          </a>
        </div>

        <a
          href="#scanner"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("scanner");
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#050706] shadow-[0_0_20px_rgba(163,255,18,0.2)] transition hover:bg-[#b8ff42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050706]"
        >
          <Camera className="h-3.5 w-3.5" />
          <span>Scan a Meal</span>
        </a>
      </div>

      {/* Hero Header Card */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-8">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${visuals.accentGlow}`}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-[#A3FF12]/10 blur-[100px]"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${visuals.badgeClasses}`}
            >
              <HeaderIcon className="h-3.5 w-3.5" />
              <span>{content.badge}</span>
            </span>

            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {content.title}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[#A1A1AA] sm:text-base">
              {content.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
            <a
              href="#scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("scanner");
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#A3FF12] px-5 py-3 text-sm font-bold text-[#050706] transition hover:bg-[#b8ff42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
            >
              <Camera className="h-4 w-4" />
              <span>Scan a Meal</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Prominent Educational / Clinical Safety Disclaimer */}
      <aside
        aria-label={content.disclaimerTitle}
        className="rounded-2xl border border-amber-400/30 bg-[#17140E] p-5 text-sm text-zinc-200"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-400/10 text-amber-300">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-amber-200">
              {content.disclaimerTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-300 sm:text-sm">
              {content.disclaimer}
            </p>
          </div>
        </div>
      </aside>

      {/* Section Quick-Jump Navigation */}
      <nav
        aria-label="Guide sections"
        className="rounded-2xl border border-white/[0.08] bg-[#121212] p-3"
      >
        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          <BookOpen className="h-3.5 w-3.5 text-[#A3FF12]" />
          <span>Jump to Topic</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {content.sections.map((section) => {
            const isActive = activeSectionId === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`rounded-xl px-3 py-1.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12] ${
                  isActive
                    ? "bg-[#A3FF12] text-[#050706]"
                    : "border border-white/10 bg-[#171717] text-zinc-300 hover:border-[#34D399]/40 hover:text-white"
                }`}
              >
                {section.title}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Optional Broad Age-Stage Cards (e.g. Babies & Children's Nutrition) */}
      {content.ageStages && content.ageStages.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#34D399]">
                <Sparkles className="h-3.5 w-3.5" />
                Developmental Stages
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">
                Broad Nutrition Guidance by Age Stage
              </h2>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              General educational stage overview—always confirm individual feeding plans with your pediatrician.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {content.ageStages.map((stage) => (
              <article
                key={stage.id}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121212] p-5 transition hover:border-[#34D399]/35"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 font-mono text-xs font-bold text-[#A3FF12]">
                      {stage.ageRange}
                    </span>
                    <span className="text-[11px] font-medium text-zinc-400">
                      {stage.focusLabel}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-lg font-bold text-white">
                    {stage.title}
                  </h3>

                  <ul className="mt-3 space-y-2">
                    {stage.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-xs leading-relaxed text-zinc-300"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-4 rounded-xl border border-amber-400/20 bg-[#17140E]/80 px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
                  {stage.safetyCue}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Main Structured Educational Section Cards */}
      <motion.div
        variants={staggerContainerVariants}
        initial={prefersReduced ? false : "hidden"}
        animate="visible"
        className="grid gap-5 lg:grid-cols-2"
      >
        {content.sections.map((section) => (
          <motion.section
            id={`module-${content.id}-${section.id}`}
            key={section.id}
            variants={prefersReduced ? undefined : staggerItemVariants}
            transition={{ duration: 0.35, ease: EASE_PREMIUM }}
            className="scroll-mt-24 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121212] p-6 transition hover:border-white/15"
          >
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
                {section.summary}
              </p>

              <ul className="mt-4 space-y-2.5">
                {section.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 rounded-xl border border-white/[0.05] bg-[#171717] px-3.5 py-2.5 text-xs leading-relaxed text-zinc-200 sm:text-sm"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 space-y-3">
              {section.tags && section.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {section.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-[#171717] px-3 py-1 text-xs font-medium text-zinc-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {section.caution && (
                <div className="rounded-xl border border-amber-400/25 bg-[#17140E] px-3.5 py-2.5 text-xs leading-relaxed text-amber-200">
                  {section.caution}
                </div>
              )}
            </div>
          </motion.section>
        ))}
      </motion.div>

      {/* Optional Doctor & Dietitian Visit Question Checklist Cards */}
      {content.checklistGroups && content.checklistGroups.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-[#34D399]/25 bg-[#101612] p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#34D399]">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Appointment Companion
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">
                {content.checklistTitle ?? "Questions to Ask Your Doctor or Dietitian"}
              </h2>
              {content.checklistSubtitle && (
                <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA] sm:text-sm">
                  {content.checklistSubtitle}
                </p>
              )}
            </div>
            <span className="rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-1 font-mono text-xs font-semibold text-[#34D399]">
              {checkedCount} Selected
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {content.checklistGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5"
              >
                <h3 className="font-display text-base font-bold text-white">
                  {group.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">
                  {group.description}
                </p>

                <ul className="mt-4 space-y-2">
                  {group.questions.map((question, idx) => {
                    const key = `${content.id}:${group.id}:${idx}`;
                    const checked = Boolean(checkedQuestions[key]);
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => toggleChecklistQuestion(key)}
                          aria-pressed={checked}
                          className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs leading-relaxed transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12] ${
                            checked
                              ? "border-[#34D399]/40 bg-[#34D399]/10 text-white"
                              : "border-white/[0.06] bg-[#171717] text-zinc-300 hover:border-white/20"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              checked
                                ? "border-[#34D399] bg-[#34D399] text-[#050706]"
                                : "border-white/25 bg-transparent"
                            }`}
                          >
                            {checked && <Check className="h-3 w-3 stroke-[3]" />}
                          </span>
                          <span>{question}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Scanner CTA + Verified Sources */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-3xl border border-[#A3FF12]/25 bg-gradient-to-br from-[#131914] to-[#121212] p-6 lg:col-span-7">
          <div>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#A3FF12]">
              <Camera className="h-3.5 w-3.5" />
              Practical Food Awareness
            </span>
            <h2 className="mt-1.5 font-display text-xl font-bold text-white">
              {content.scannerCtaTitle}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA] sm:text-sm">
              {content.scannerCtaDescription}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="#scanner"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("scanner");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#A3FF12] px-4 py-2.5 text-xs font-bold text-[#050706] transition hover:bg-[#b8ff42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12]"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Scan a Meal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <a
              href="#categories"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("categories");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#0A0A0A] px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12]"
            >
              <span>All Nutrition Guides</span>
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6 lg:col-span-5">
          <h2 className="font-display text-base font-bold text-white">
            Public Health References
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">
            Explore general guidance from established national and global health organizations:
          </p>

          {content.sources.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {content.sources.map((src) => (
                <li key={src.url}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#171717] px-3.5 py-2.5 text-xs font-medium text-zinc-200 transition hover:border-[#34D399]/40 hover:text-[#34D399] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3FF12]"
                  >
                    <span className="truncate">{src.label}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-white/[0.06] bg-[#171717] px-3.5 py-2.5 text-xs text-zinc-400">
              Official reference links will be listed after clinical editorial review.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
