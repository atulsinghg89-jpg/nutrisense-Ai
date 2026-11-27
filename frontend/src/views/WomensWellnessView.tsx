import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Crown,
  Dumbbell,
  Flower2,
  HeartHandshake,
  Loader2,
  Lock,
  Microscope,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Utensils,
} from "lucide-react";
import { BotanicalCornerBloom } from "../components/women/BotanicalDecor";
import { PeriodCareGarden } from "../components/women/PeriodCareGarden";
import { WomenFitnessPanel } from "../components/women/WomenFitnessPanel";
import { WomenHealthcareDirectories } from "../components/women/WomenHealthcareDirectories";
import { WomenNutritionPanel } from "../components/women/WomenNutritionPanel";
import { WomenOnboardingProfile } from "../components/women/WomenOnboardingProfile";
import { useAuth } from "../context/AuthContext";
import {
  createActivityEntry,
  createHydrationEntry,
  createTrackedFoodEntry,
  deleteAllWomensWellnessData,
  exportWomensWellnessData,
  fetchDiagnosticLabs,
  fetchPremiumServices,
  fetchProfileDashboard,
  fetchSubscriptionPreviews,
  fetchVerifiedProviders,
  fetchWomensSummary,
  updateWomensPreferences,
} from "../lib/api";
import type {
  ActivityEntryCreate,
  AppView,
  DiagnosticLabEntry,
  HealthcareProviderEntry,
  ProfileDashboardData,
  ServicePreviewEntry,
  SubscriptionPlanPreview,
  TrackedFoodEntryCreate,
  WomensSummaryData,
} from "../types/nutrition";

interface WomensWellnessViewProps {
  onNavigate: (view: AppView) => void;
  onDataLogged?: (message: string) => void;
  embeddedInWomenSection?: boolean;
}

type WomenSectionId =
  | "profile"
  | "nutrition"
  | "fitness"
  | "period"
  | "trainers"
  | "doctors"
  | "labs"
  | "premium";

const NAV_SECTIONS: {
  id: WomenSectionId;
  num: string;
  label: string;
  sub: string;
  icon: typeof Flower2;
}[] = [
  {
    id: "period",
    num: "01",
    label: "Period Care Garden",
    sub: "Calendar, foods, essentials & yoga",
    icon: Flower2,
  },
  {
    id: "profile",
    num: "02",
    label: "My Wellness Profile",
    sub: "Gentle setup, consents & BMI log",
    icon: UserCheck,
  },
  {
    id: "nutrition",
    num: "03",
    label: "Personalized Nutrition",
    sub: "Veg, non-veg, allergy & tracker sync",
    icon: Utensils,
  },
  {
    id: "fitness",
    num: "04",
    label: "Fitness & Movement",
    sub: "Strength, walking, yoga & rest",
    icon: Dumbbell,
  },
  {
    id: "trainers",
    num: "05",
    label: "Find a Trainer & Gym",
    sub: "Free verified studio discovery",
    icon: HeartHandshake,
  },
  {
    id: "doctors",
    num: "06",
    label: "Find a Doctor",
    sub: "Official NMC & eSanjeevani portals",
    icon: Stethoscope,
  },
  {
    id: "labs",
    num: "07",
    label: "Diagnostic Labs",
    sub: "Official labs & doctor-led tests",
    icon: Microscope,
  },
  {
    id: "premium",
    num: "08",
    label: "Premium Wellness",
    sub: "Coming soon (core stays free)",
    icon: Crown,
  },
];

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function WomensWellnessView({
  onNavigate,
  onDataLogged,
  embeddedInWomenSection = false,
}: WomensWellnessViewProps) {
  const { user, activeProfile, activeProfileId, openAuthModal } = useAuth();
  const [activeSection, setActiveSection] = useState<WomenSectionId>("period");

  const [womensSummary, setWomensSummary] = useState<WomensSummaryData | null>(null);
  const [profileDashboard, setProfileDashboard] = useState<ProfileDashboardData | null>(null);
  const [loadingWomen, setLoadingWomen] = useState(false);
  const [womenError, setWomenError] = useState<string | null>(null);

  const [providers, setProviders] = useState<HealthcareProviderEntry[]>([]);
  const [labs, setLabs] = useState<DiagnosticLabEntry[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanPreview[]>([]);
  const [services, setServices] = useState<ServicePreviewEntry[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadProtectedData = useCallback(async () => {
    if (!user || !activeProfileId) {
      setWomensSummary(null);
      setProfileDashboard(null);
      return;
    }
    setLoadingWomen(true);
    setWomenError(null);
    try {
      const [ws, pd] = await Promise.all([
        fetchWomensSummary(activeProfileId),
        fetchProfileDashboard({ profileId: activeProfileId, date: todayYmd(), days: 7 }),
      ]);
      setWomensSummary(ws);
      setProfileDashboard(pd);
    } catch (err) {
      setWomenError(
        err instanceof Error ? err.message : "Could not load Women's Wellness sanctuary data.",
      );
    } finally {
      setLoadingWomen(false);
    }
  }, [user, activeProfileId]);

  useEffect(() => {
    void loadProtectedData();
  }, [loadProtectedData]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchVerifiedProviders(),
      fetchDiagnosticLabs(),
      fetchSubscriptionPreviews(),
      fetchPremiumServices(),
    ])
      .then(([p, l, pl, sv]) => {
        if (!active) return;
        setProviders(p);
        setLabs(l);
        setPlans(pl);
        setServices(sv);
      })
      .catch(() => {
        // Handled cleanly via empty states in child sections
      });
    return () => {
      active = false;
    };
  }, []);

  function notify(msg: string) {
    setToastMsg(msg);
    onDataLogged?.(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4500);
  }

  async function handleSavePreferences(payload: Record<string, unknown>) {
    if (!activeProfileId) return;
    await updateWomensPreferences({
      profile_id: activeProfileId,
      ...payload,
    });
    await loadProtectedData();
  }

  async function handleLogFood(payload: Omit<TrackedFoodEntryCreate, "profile_id">) {
    if (!activeProfileId) return;
    await createTrackedFoodEntry({
      profile_id: activeProfileId,
      ...payload,
    });
    await loadProtectedData();
  }

  async function handleLogHydration(amountMl: number, note?: string) {
    if (!activeProfileId) return;
    await createHydrationEntry({
      profile_id: activeProfileId,
      amount_ml: amountMl,
      measurement_source: "manual",
      notes: note ?? null,
    });
    await loadProtectedData();
    notify(`Logged ${amountMl} mL hydration.`);
  }

  async function handleLogActivity(payload: Omit<ActivityEntryCreate, "profile_id">) {
    if (!activeProfileId) return;
    await createActivityEntry({
      profile_id: activeProfileId,
      ...payload,
    });
    await loadProtectedData();
  }

  async function handleExportData() {
    if (!activeProfileId) return;
    const data = await exportWomensWellnessData(activeProfileId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nutrisense-women-wellness-${todayYmd()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Downloaded your Women's Wellness JSON export.");
  }

  async function handleDeleteAllData() {
    if (!activeProfileId) return;
    if (
      !window.confirm(
        "Delete all Women's Wellness records (cycle logs, symptoms, consents, BMI log) for this profile?",
      )
    ) {
      return;
    }
    await deleteAllWomensWellnessData(activeProfileId);
    await loadProtectedData();
    notify("Removed all Women's Wellness records from this profile.");
  }

  const fitnessProviders = providers.filter((p) => p.provider_type === "fitness_platform");

  return (
    /* Isolated Floral Warm Ivory & Rose Sanctuary Container (preserves global dark site outside) */
    <div className={embeddedInWomenSection ? "py-2" : "mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8"}>
      <div className="space-y-6 rounded-[2.25rem] border border-[#ebd0d9] bg-gradient-to-b from-[#fffaf8] via-[#fff6f8] to-[#f8faf7] p-4 text-[#2d1a24] shadow-[0_24px_64px_-24px_rgba(155,61,87,0.28)] sm:p-7 lg:p-9">
        {/* Top Sanctuary Welcome Header & Live Women Wellness Dashboard Strip */}
        <header className="relative overflow-hidden rounded-[1.85rem] border border-[#f0dce2] bg-white p-6 sm:p-8">
          <BotanicalCornerBloom className="absolute -top-4 -right-4 h-44 w-44 text-[#c96a7e]" />

          <div className="relative z-10 grid items-center gap-6 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6c5ce] bg-[#fff5f7] px-3 py-1 text-xs font-semibold text-[#9b3d57]">
                  <Flower2 className="h-3.5 w-3.5 text-[#c96a7e]" />
                  Women Section • Wellness Dashboard &amp; Sanctuary
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#cde2d4] bg-[#eef6f1] px-3 py-1 text-xs font-semibold text-[#2b5239]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Consent-First • Privacy Isolated
                </span>
              </div>

              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#2d1a24] sm:text-4xl lg:text-5xl">
                Your Health. Your Rhythm.{" "}
                <span className="bg-gradient-to-r from-[#b54865] via-[#9b3d57] to-[#3f6f52] bg-clip-text text-transparent">
                  Your Way.
                </span>
              </h1>

              <p className="max-w-2xl text-sm leading-relaxed text-[#644a57]">
                Warm botanical comfort uniting gentle cycle tracking, balanced nutrition, recovery
                movement, verified educational sources, and transparent healthcare navigation — built
                directly inside NutriSense AI&apos;s Women chapter.
              </p>

              {/* Women Wellness Dashboard Quick Overview Cards */}
              <div className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-4">
                <div className="rounded-2xl border border-[#f0dce2] bg-[#fff8fa] px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b3d57]">
                    Nutrition Today
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-extrabold text-[#2d1a24]">
                    {profileDashboard ? Math.round(profileDashboard.nutrition_summary.calories) : 0} kcal
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e3d8ee] bg-[#faf7fd] px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#5e4078]">
                    Hydration
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-extrabold text-[#2d1a24]">
                    {profileDashboard ? Math.round(profileDashboard.hydration_summary.total_ml) : 0} mL
                  </p>
                </div>
                <div className="rounded-2xl border border-[#d8e6dc] bg-[#f4f8f4] px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#2b5239]">
                    Movement
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-extrabold text-[#2d1a24]">
                    {profileDashboard ? profileDashboard.activity_summary.total_minutes : 0} min
                  </p>
                </div>
                <div className="rounded-2xl border border-[#f0dce2] bg-[#fff5f7] px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b3d57]">
                    Cycle Estimate
                  </p>
                  <p className="mt-0.5 font-mono text-xs font-bold text-[#2d1a24]">
                    {womensSummary?.estimate.has_estimate &&
                    womensSummary.estimate.next_period_estimated_start
                      ? womensSummary.estimate.next_period_estimated_start
                      : "Optional"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {!user ? (
                  <button
                    type="button"
                    onClick={() => openAuthModal("register", "women")}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#9b3d57] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#842f48]"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Sign In / Create Account to Sync Privately
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-2xl border border-[#cde2d4] bg-[#eef6f1] px-4 py-2 text-xs font-semibold text-[#2b5239]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Synced to profile: {activeProfile?.display_name ?? user.full_name}
                  </span>
                )}
              </div>
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-[#f0dce2] lg:col-span-4 lg:block">
              <img
                src="/images/women-wellness-hero.jpg"
                alt="Warm botanical wellness bowl and herbal tea"
                className="h-56 w-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* 8-Experience Pill Navigation Grid */}
        <nav
          aria-label="Women's Wellness sections"
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8"
        >
          {NAV_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`flex flex-col items-start justify-between rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-[#9b3d57] bg-[#9b3d57] text-white shadow-sm"
                    : "border-[#ebd4dc] bg-white text-[#2d1a24] hover:border-[#d68c9e] hover:bg-[#fff5f7]"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1">
                  <Icon
                    className={`h-4 w-4 ${active ? "text-rose-100" : "text-[#9b3d57]"}`}
                  />
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      active ? "text-rose-200" : "text-[#8c6e7b]"
                    }`}
                  >
                    {sec.num}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold leading-tight">{sec.label}</p>
                  <p
                    className={`mt-0.5 text-[10px] leading-snug ${
                      active ? "text-rose-100" : "text-[#6f5762]"
                    }`}
                  >
                    {sec.sub}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Feedback / Error Status Banners */}
        {toastMsg && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#cde2d4] bg-[#eef6f1] px-4 py-3 text-xs font-semibold text-[#2b5239]">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {womenError && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
            {womenError}
          </div>
        )}

        {loadingWomen && (
          <div className="flex items-center gap-2 text-xs text-[#644a57]">
            <Loader2 className="h-4 w-4 animate-spin text-[#9b3d57]" />
            <span>Refreshing your sanctuary state from PostgreSQL...</span>
          </div>
        )}

        {/* Active Experience Body */}
        {activeSection === "profile" && (
          <WomenOnboardingProfile
            profile={activeProfile}
            profileId={activeProfileId}
            summary={womensSummary}
            isAuthenticated={Boolean(user)}
            onOpenAuth={() => openAuthModal("login", "women")}
            onSavePreferences={handleSavePreferences}
            onRefreshSummary={loadProtectedData}
            onExportData={handleExportData}
            onDeleteAllData={handleDeleteAllData}
            onNotify={notify}
          />
        )}

        {activeSection === "nutrition" && (
          <WomenNutritionPanel
            profile={activeProfile}
            profileId={activeProfileId}
            dashboard={profileDashboard}
            isAuthenticated={Boolean(user)}
            onOpenAuth={() => openAuthModal("login", "women")}
            onNavigate={onNavigate}
            onLogFood={handleLogFood}
            onLogHydration={handleLogHydration}
            onNotify={notify}
          />
        )}

        {activeSection === "fitness" && (
          <WomenFitnessPanel
            profileId={activeProfileId}
            dashboard={profileDashboard}
            fitnessProviders={fitnessProviders}
            isAuthenticated={Boolean(user)}
            onOpenAuth={() => openAuthModal("login", "women")}
            onLogActivity={handleLogActivity}
            onNotify={notify}
            focusSection="movement"
          />
        )}

        {activeSection === "period" && (
          <PeriodCareGarden
            profileId={activeProfileId}
            summary={womensSummary}
            isAuthenticated={Boolean(user)}
            onOpenAuth={() => openAuthModal("login", "women")}
            onRefreshSummary={loadProtectedData}
            onSavePreferences={handleSavePreferences}
            onLogFood={handleLogFood}
            onLogActivity={handleLogActivity}
            onNotify={notify}
          />
        )}

        {activeSection === "trainers" && (
          <WomenFitnessPanel
            profileId={activeProfileId}
            dashboard={profileDashboard}
            fitnessProviders={fitnessProviders}
            isAuthenticated={Boolean(user)}
            onOpenAuth={() => openAuthModal("login", "women")}
            onLogActivity={handleLogActivity}
            onNotify={notify}
            focusSection="trainer_gym"
          />
        )}

        {(activeSection === "doctors" ||
          activeSection === "labs" ||
          activeSection === "premium") && (
          <WomenHealthcareDirectories
            mode={activeSection}
            profile={activeProfile}
            profileId={activeProfileId}
            providers={providers}
            labs={labs}
            plans={plans}
            services={services}
            isAuthenticated={Boolean(user)}
            onOpenAuth={() => openAuthModal("login", "women")}
            onNotify={notify}
          />
        )}
      </div>
    </div>
  );
}
