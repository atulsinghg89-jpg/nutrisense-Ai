import { useState } from "react";
import {
  Activity,
  Award,
  Box,
  Database,
  Globe2,
  RotateCw,
  Scale,
  Sun,
  Utensils,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  createActivityEntry,
  createHydrationEntry,
  createTrackedFoodEntry,
} from "../../lib/api";
import type { AppView, TrackedFoodEntryCreate } from "../../types/nutrition";
import { BentoMealPlanner } from "./BentoMealPlanner";
import { FoodEducationCenter } from "./FoodEducationCenter";
import { GlobalNutritionDashboard } from "./GlobalNutritionDashboard";
import { IndiaJapanComparison } from "./IndiaJapanComparison";
import { JapaneseFoodBalanceGuide } from "./JapaneseFoodBalanceGuide";
import { JapaneseFoodIntelligence } from "./JapaneseFoodIntelligence";
import { JapaneseMealDiscovery } from "./JapaneseMealDiscovery";
import { SeasonalFoodExplorer } from "./SeasonalFoodExplorer";

interface GlobalNutritionViewProps {
  onNavigate: (view: AppView) => void;
  onDataLogged?: (message: string) => void;
}

type GlobalTab =
  | "foods"
  | "balance"
  | "compare"
  | "bento"
  | "seasonal"
  | "meals"
  | "education"
  | "dashboard";

const TABS: {
  id: GlobalTab;
  label: string;
  sub: string;
  icon: typeof Globe2;
}[] = [
  { id: "foods", label: "Japanese Foods", sub: "MEXT Per-100g & Swaps", icon: Database },
  { id: "balance", label: "Balance Top Guide", sub: "Interactive SV Hierarchy", icon: RotateCw },
  { id: "compare", label: "India vs Japan", sub: "Side-by-Side Metrics", icon: Scale },
  { id: "bento", label: "Bento Planner", sub: "Custom Compartments", icon: Box },
  { id: "seasonal", label: "Seasonal Foods", sub: "Spring to Winter", icon: Sun },
  { id: "meals", label: "Traditional Meals", sub: "Complete Combinations", icon: Utensils },
  { id: "education", label: "Education Center", sub: "10 Habits & Quizzes", icon: Award },
  { id: "dashboard", label: "Global Analytics", sub: "Real PostgreSQL Trends", icon: Activity },
];

export function GlobalNutritionView({
  onNavigate,
  onDataLogged,
}: GlobalNutritionViewProps) {
  const { user, activeProfile, activeProfileId, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<GlobalTab>("foods");
  const [compareSlug, setCompareSlug] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<string | null>(null);

  function notify(msg: string) {
    setToast(msg);
    onDataLogged?.(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  }

  async function handleLogFood(payload: Omit<TrackedFoodEntryCreate, "profile_id">) {
    if (!activeProfileId) return;
    await createTrackedFoodEntry({
      profile_id: activeProfileId,
      ...payload,
    });
  }

  async function handleQuickWater(amountMl: number) {
    if (!user || !activeProfileId) {
      openAuthModal("login", null);
      return;
    }
    await createHydrationEntry({
      profile_id: activeProfileId,
      amount_ml: amountMl,
      measurement_source: "manual",
      notes: "Unsweetened Tea / Water logged from Balance Guide",
    });
    notify(`Logged ${amountMl} mL hydration.`);
  }

  async function handleQuickActivity(minutes: number, label: string) {
    if (!user || !activeProfileId) {
      openAuthModal("login", null);
      return;
    }
    await createActivityEntry({
      profile_id: activeProfileId,
      activity_type: label,
      duration_minutes: minutes,
      intensity: "Moderate",
      notes: "Logged from Food Balance Top",
    });
    notify(`Logged ${minutes} min of ${label}.`);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Dark Health-Tech Header Preserving NutriSense Design System */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] bg-gradient-to-br from-[#121914] via-[#0B0F0C] to-[#050706] p-6 sm:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-[#A3FF12]/10 blur-[110px]"
        />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <Globe2 className="h-3.5 w-3.5" />
              Global Nutrition Intelligence
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-3 py-1 text-xs font-semibold text-[#34D399]">
              MEXT 8th Rev. • ICMR–NIN IFCT 2017 • USDA
            </span>
          </div>

          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            International Nutrition Balance &amp;{" "}
            <span className="bg-gradient-to-r from-[#A3FF12] to-[#34D399] bg-clip-text text-transparent">
              Japan-Inspired Intelligence
            </span>
          </h1>

          <p className="text-sm leading-relaxed text-[#A1A1AA] sm:text-base">
            All-English global food composition, interactive dish-based Balance Top guidance,
            side-by-side India vs Japan nutrition comparison, customizable Bento planning, seasonal
            culinary wisdom, and Smart Food Education synced directly to your NutriSense profile.
          </p>
        </div>

        {/* 8-Module Navigation Strip */}
        <nav
          aria-label="Global Nutrition sections"
          className="relative z-10 mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex flex-col items-start justify-between rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-[#A3FF12] bg-[#A3FF12] text-[#050706]"
                    : "border-white/10 bg-[#0A0A0A]/90 text-white hover:border-[#34D399]/40"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-[#050706]" : "text-[#34D399]"}`} />
                <div className="mt-2">
                  <p className="text-xs font-bold leading-tight">{t.label}</p>
                  <p
                    className={`mt-0.5 text-[10px] leading-snug ${
                      active ? "text-[#050706]/80" : "text-zinc-400"
                    }`}
                  >
                    {t.sub}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </section>

      {toast && (
        <div className="rounded-2xl border border-[#34D399]/40 bg-[#121914] px-4 py-3 text-xs font-semibold text-[#34D399]">
          {toast}
        </div>
      )}

      {activeTab === "foods" && (
        <JapaneseFoodIntelligence
          profileId={activeProfileId}
          isAuthenticated={Boolean(user)}
          onOpenAuth={() => openAuthModal("login", null)}
          onLogFood={handleLogFood}
          onCompareFood={(slug) => {
            setCompareSlug(slug);
            setActiveTab("compare");
          }}
          onNotify={notify}
        />
      )}

      {activeTab === "balance" && (
        <JapaneseFoodBalanceGuide
          profileId={activeProfileId}
          onLogQuickWater={handleQuickWater}
          onLogQuickActivity={handleQuickActivity}
        />
      )}

      {activeTab === "compare" && (
        <IndiaJapanComparison
          profileId={activeProfileId}
          allergies={activeProfile?.allergies ?? []}
          initialLeftSlug={compareSlug}
        />
      )}

      {activeTab === "bento" && (
        <BentoMealPlanner
          profileId={activeProfileId}
          profileAllergies={activeProfile?.allergies ?? []}
          isAuthenticated={Boolean(user)}
          onOpenAuth={() => openAuthModal("login", null)}
          onLogFood={handleLogFood}
          onNotify={notify}
        />
      )}

      {activeTab === "seasonal" && <SeasonalFoodExplorer />}

      {activeTab === "meals" && (
        <JapaneseMealDiscovery
          profileId={activeProfileId}
          isAuthenticated={Boolean(user)}
          onOpenAuth={() => openAuthModal("login", null)}
          onLogFood={handleLogFood}
          onOpenAlternatives={() => onNavigate("alternatives")}
          onNotify={notify}
        />
      )}

      {activeTab === "education" && (
        <FoodEducationCenter
          profileId={activeProfileId}
          isAuthenticated={Boolean(user)}
          onOpenAuth={() => openAuthModal("login", null)}
          onNotify={notify}
        />
      )}

      {activeTab === "dashboard" && (
        <GlobalNutritionDashboard
          profileId={activeProfileId}
          isAuthenticated={Boolean(user)}
          onOpenAuth={() => openAuthModal("login", null)}
        />
      )}
    </div>
  );
}
