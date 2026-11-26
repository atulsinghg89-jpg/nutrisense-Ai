import {
  ArrowRight,
  Camera,
  HeartPulse,
  LayoutDashboard,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Hero } from "../components/home/Hero";
import { RevealSection } from "../components/MotionPrimitives";
import type {
  AppView,
  DailyMacroTargets,
  DashboardSummary,
  ScanSession,
} from "../types/nutrition";

interface HomeViewProps {
  onNavigate: (view: AppView) => void;
  hasActiveScan: boolean;
  scanSession: ScanSession | null;
  dailyTargets: DailyMacroTargets;
  todaySummary: DashboardSummary;
  todaySummaryLoading: boolean;
  apiOnline: boolean | null;
}

const QUICK_ROUTES: {
  view: AppView;
  step: string;
  title: string;
  description: string;
  cta: string;
  icon: typeof Camera;
}[] = [
  {
    view: "scanner",
    step: "01",
    title: "Scan & Adjust Portions",
    description:
      "Upload or capture a food photo, inspect detected ingredients, and fine-tune gram portions interactively.",
    cta: "Open AI Scanner",
    icon: SlidersHorizontal,
  },
  {
    view: "alternatives",
    step: "02",
    title: "Explore Healthier Swaps",
    description:
      "Compare practical lower-calorie or higher-protein food alternatives alongside nutritional reasoning.",
    cta: "View Alternatives",
    icon: Sparkles,
  },
  {
    view: "categories",
    step: "03",
    title: "Life-Stage Nutrition Guides",
    description:
      "Browse educational guidance tailored for Men's Health, Women's Health, Baby Nutrition, and Recovery.",
    cta: "Browse Guides",
    icon: HeartPulse,
  },
];

export function HomeView({
  onNavigate,
  hasActiveScan,
  scanSession,
  dailyTargets,
  todaySummary,
  todaySummaryLoading,
  apiOnline,
}: HomeViewProps) {
  const scannedItemsCount = scanSession?.items.length ?? 0;

  return (
    <div className="space-y-16 pb-8">
      {/* Scanner-First Dark Hero */}
      <Hero
        onNavigate={onNavigate}
        apiOnline={apiOnline}
        hasActiveScan={hasActiveScan}
        scannedItemsCount={scannedItemsCount}
      />

      {/* Minimal Live Daily Intake Strip (Real Application State Only) */}
      <RevealSection>
        <section
          aria-label="Daily nutrition summary"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#121212] px-6 py-5"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#34D399]">
              Today&apos;s Tracked Intake
            </p>
            <p className="text-sm text-[#A1A1AA]">
              {todaySummaryLoading
                ? "Checking logged meals..."
                : todaySummary.total_meals === 0
                  ? `0 meals logged today against your ${dailyTargets.calories.toLocaleString()} kcal goal.`
                  : `${todaySummary.total_meals} ${
                      todaySummary.total_meals === 1 ? "meal" : "meals"
                    } logged today (${Math.round(todaySummary.total_calories).toLocaleString()} / ${dailyTargets.calories.toLocaleString()} kcal).`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasActiveScan && (
              <button
                type="button"
                onClick={() => onNavigate("alternatives")}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-4 py-2 text-xs font-semibold text-[#34D399] transition hover:bg-[#34D399]/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>View Latest Swaps</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#171717] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/25"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-[#A3FF12]" />
              <span>Open Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </RevealSection>

      {/* Focused Three-Column Platform Links */}
      <RevealSection>
        <section aria-label="Core NutriSense features" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#34D399]">
                Platform Flow
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Built Around Everyday Meals
              </h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {QUICK_ROUTES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => onNavigate(item.view)}
                  className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121212] p-6 text-left transition hover:border-[#34D399]/35 hover:bg-[#161616]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0A0A0A] text-[#A3FF12]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-mono text-xs text-zinc-500">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-base font-bold text-white transition-colors group-hover:text-[#A3FF12]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#A1A1AA]">
                      {item.description}
                    </p>
                  </div>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 group-hover:text-[#34D399]">
                    <span>{item.cta}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </RevealSection>

      {/* Clean Minimal Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-8 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-white">
            NutriSense{" "}
            <span className="bg-gradient-to-r from-[#A3FF12] to-[#34D399] bg-clip-text text-transparent">
              AI
            </span>
          </span>
          <span>•</span>
          <span>Educational nutrition insights only</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {(
            [
              { id: "scanner", label: "Scanner" },
              { id: "alternatives", label: "Alternatives" },
              { id: "categories", label: "Categories" },
              { id: "dashboard", label: "Dashboard" },
            ] as const
          ).map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => onNavigate(link.id)}
              className="transition hover:text-white"
            >
              {link.label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
