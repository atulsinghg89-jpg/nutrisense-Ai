import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Crown,
  Download,
  Droplets,
  Dumbbell,
  ExternalLink,
  Flower2,
  Heart,
  Info,
  Loader2,
  Lock,
  Microscope,
  Package,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Utensils,
} from "lucide-react";
import { EASE_PREMIUM } from "../components/MotionPrimitives";
import { RecommendedProductsHub } from "../components/products/RecommendedProductsHub";
import { useAuth } from "../context/AuthContext";
import {
  createActivityEntry,
  createHydrationEntry,
  createPeriodRecord,
  createSymptomMoodRecord,
  createTrackedFoodEntry,
  deleteAllWomensWellnessData,
  deletePeriodRecord,
  deleteSymptomRecord,
  exportWomensWellnessData,
  fetchDiagnosticLabs,
  fetchProfileDashboard,
  fetchSubscriptionPreviews,
  fetchVerifiedProviders,
  fetchWomensSummary,
  saveAppointmentPreviewNote,
  updateWomensPreferences,
} from "../lib/api";
import { calculateSupportiveBmi } from "../lib/bmiMath";
import {
  FITNESS_GUIDES,
  PERIOD_ACTIVITIES,
  PERIOD_EDUCATION_CARDS,
  PERIOD_FOOD_SUGGESTIONS,
  WOMEN_FOOD_ALTERNATIVES,
  WOMEN_MEAL_TEMPLATES,
} from "../data/womensWellnessData";
import type {
  AppView,
  DiagnosticLabEntry,
  FlowLevel,
  HealthcareProviderEntry,
  ProfileDashboardData,
  SubscriptionPlanPreview,
  WomensSummaryData,
} from "../types/nutrition";

interface WomensWellnessViewProps {
  onNavigate: (view: AppView) => void;
  onDataLogged?: (message: string) => void;
}

type WellnessTab =
  | "overview"
  | "period"
  | "nutrition"
  | "fitness"
  | "directory"
  | "products";

type PeriodSubTab = "foods" | "alternatives" | "essentials" | "yoga" | "facts" | "tracker";

const SYMPTOM_OPTIONS = [
  { id: "cramps", label: "Cramps" },
  { id: "bloating", label: "Bloating" },
  { id: "headache", label: "Headache" },
  { id: "fatigue", label: "Fatigue" },
  { id: "back_pain", label: "Back Pain" },
  { id: "mood_changes", label: "Mood Changes" },
  { id: "nausea", label: "Nausea" },
  { id: "no_symptoms", label: "No Symptoms" },
  { id: "other", label: "Other" },
] as const;

const MOOD_OPTIONS = [
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "calm", label: "Calm", emoji: "🌿" },
  { id: "tired", label: "Tired", emoji: "😴" },
  { id: "low", label: "Low", emoji: "🌧️" },
  { id: "irritated", label: "Irritated", emoji: "⚡" },
  { id: "anxious", label: "Anxious", emoji: "🌊" },
  { id: "other", label: "Other", emoji: "✨" },
] as const;

const OPTIONAL_GOALS_CHIPS = [
  "Balanced energy",
  "Iron-rich meals",
  "Steady hydration",
  "Gentle movement",
  "Better sleep rest",
  "Cycle awareness",
];

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function deriveAgeYears(dob: string | null, explicitYears: number | null): number | null {
  if (explicitYears !== null) return explicitYears;
  if (!dob) return null;
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return null;
  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
}

export function WomensWellnessView({
  onNavigate,
  onDataLogged,
}: WomensWellnessViewProps) {
  const { user, activeProfile, activeProfileId, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<WellnessTab>("overview");
  const [periodSubTab, setPeriodSubTab] = useState<PeriodSubTab>("foods");

  // Protected backend state
  const [womensSummary, setWomensSummary] = useState<WomensSummaryData | null>(null);
  const [profileDashboard, setProfileDashboard] = useState<ProfileDashboardData | null>(null);
  const [loadingWomen, setLoadingWomen] = useState(false);
  const [womenError, setWomenError] = useState<string | null>(null);

  // Public verified directories & previews
  const [providers, setProviders] = useState<HealthcareProviderEntry[]>([]);
  const [labs, setLabs] = useState<DiagnosticLabEntry[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanPreview[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);

  // Onboarding / BMI form state (reuses existing profile fields)
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [cycleLenInput, setCycleLenInput] = useState("28");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [savingPref, setSavingPref] = useState(false);

  // Period tracker form state (minimum manual input!)
  const [periodStart, setPeriodStart] = useState(todayYmd);
  const [periodEnd, setPeriodEnd] = useState("");
  const [flowLevel, setFlowLevel] = useState<FlowLevel>("moderate");
  const [savingPeriod, setSavingPeriod] = useState(false);

  // Symptom & mood minimum-input check-in
  const [checkInDate, setCheckInDate] = useState(todayYmd);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomOtherText, setSymptomOtherText] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodOtherText, setMoodOtherText] = useState("");
  const [savingSymptoms, setSavingSymptoms] = useState(false);

  // Quick activity & hydration loggers reusing unified tracker endpoints
  const [activityChoice, setActivityChoice] = useState("Gentle Period Yoga");
  const [activityMins, setActivityMins] = useState<number>(20);
  const [customWaterMl, setCustomWaterMl] = useState("300");
  const [mealFilter, setMealFilter] = useState<string>("All");
  const [loggingAction, setLoggingAction] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Calendar visualization month
  const [calCursor, setCalCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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
      setHeightInput(
        ws.preferences.height_cm !== null ? String(ws.preferences.height_cm) : "",
      );
      setWeightInput(
        ws.preferences.weight_kg !== null ? String(ws.preferences.weight_kg) : "",
      );
      setCycleLenInput(String(ws.preferences.typical_cycle_length));
      setSelectedGoals(ws.preferences.optional_goals);
    } catch (err) {
      setWomenError(
        err instanceof Error ? err.message : "Could not load Women's Wellness records.",
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
    setDirectoryLoading(true);
    Promise.all([
      fetchVerifiedProviders(),
      fetchDiagnosticLabs(),
      fetchSubscriptionPreviews(),
    ])
      .then(([p, l, s]) => {
        if (!active) return;
        setProviders(p);
        setLabs(l);
        setPlans(s);
      })
      .catch(() => {
        // Non-blocking for initial load; empty states handled clearly in directory tab.
      })
      .finally(() => {
        if (active) setDirectoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function notify(msg: string) {
    setStatusFeedback(msg);
    onDataLogged?.(msg);
    window.setTimeout(() => {
      setStatusFeedback((prev) => (prev === msg ? null : prev));
    }, 4000);
  }

  const derivedAge = useMemo(
    () =>
      deriveAgeYears(
        activeProfile?.date_of_birth ?? null,
        activeProfile?.age_years ?? null,
      ),
    [activeProfile],
  );

  const bmiAssessment = useMemo(() => {
    const pref = womensSummary?.preferences;
    if (!pref?.bmi_consent_given || !pref.height_cm || !pref.weight_kg) {
      return null;
    }
    return calculateSupportiveBmi({
      heightCm: pref.height_cm,
      weightKg: pref.weight_kg,
      ageYears: derivedAge,
      sexContext: "female",
    });
  }, [womensSummary, derivedAge]);

  async function handleSaveOnboardingAndBmi(params: {
    consentGiven?: boolean;
    bmiConsentGiven?: boolean;
    clearBmi?: boolean;
    trackingEnabled?: boolean;
    remindersEnabled?: boolean;
  }) {
    if (!activeProfileId) return;
    setSavingPref(true);
    setWomenError(null);
    try {
      const h = heightInput.trim() ? Number(heightInput.trim()) : undefined;
      const w = weightInput.trim() ? Number(weightInput.trim()) : undefined;
      await updateWomensPreferences({
        profile_id: activeProfileId,
        consent_given: params.consentGiven,
        bmi_consent_given: params.bmiConsentGiven,
        clear_bmi_metrics: params.clearBmi,
        tracking_enabled: params.trackingEnabled,
        reminders_enabled: params.remindersEnabled,
        typical_cycle_length: Math.max(20, Math.min(45, Number(cycleLenInput) || 28)),
        height_cm: params.clearBmi ? null : h,
        weight_kg: params.clearBmi ? null : w,
        optional_goals: selectedGoals,
      });
      await loadProtectedData();
      notify("Women's wellness preferences saved securely.");
    } catch (err) {
      setWomenError(
        err instanceof Error ? err.message : "Could not save preferences.",
      );
    } finally {
      setSavingPref(false);
    }
  }

  async function handleLogPeriod(e: FormEvent) {
    e.preventDefault();
    if (!activeProfileId) return;
    setSavingPeriod(true);
    setWomenError(null);
    try {
      await createPeriodRecord({
        profile_id: activeProfileId,
        start_date: periodStart,
        end_date: periodEnd.trim() || null,
        flow_level: flowLevel,
      });
      await loadProtectedData();
      notify("Cycle dates saved to your private profile.");
    } catch (err) {
      setWomenError(err instanceof Error ? err.message : "Could not save period dates.");
    } finally {
      setSavingPeriod(false);
    }
  }

  function toggleSymptomChip(id: string) {
    setSelectedSymptoms((prev) => {
      if (id === "no_symptoms") {
        return prev.includes("no_symptoms") ? [] : ["no_symptoms"];
      }
      const withoutNone = prev.filter((x) => x !== "no_symptoms");
      return withoutNone.includes(id)
        ? withoutNone.filter((x) => x !== id)
        : [...withoutNone, id];
    });
  }

  async function handleLogSymptomsMood() {
    if (!activeProfileId) return;
    if (selectedSymptoms.length === 0 && !selectedMood) {
      setWomenError("Tap at least one symptom chip or mood emoji to save.");
      return;
    }
    setSavingSymptoms(true);
    setWomenError(null);
    try {
      await createSymptomMoodRecord({
        profile_id: activeProfileId,
        record_date: checkInDate,
        symptoms: selectedSymptoms,
        symptom_other_text: selectedSymptoms.includes("other")
          ? symptomOtherText.trim() || null
          : null,
        mood: selectedMood,
        mood_other_text:
          selectedMood === "other" ? moodOtherText.trim() || null : null,
      });
      setSelectedSymptoms([]);
      setSymptomOtherText("");
      setSelectedMood(null);
      setMoodOtherText("");
      await loadProtectedData();
      notify("Daily symptom & mood check-in saved.");
    } catch (err) {
      setWomenError(
        err instanceof Error ? err.message : "Could not save symptom/mood check-in.",
      );
    } finally {
      setSavingSymptoms(false);
    }
  }

  async function handleQuickLogFood(item: {
    name: string;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fibre: number;
    ironMg?: number;
    sourceLabel: string;
  }) {
    if (!user || !activeProfileId) {
      openAuthModal("login", "women");
      return;
    }
    setLoggingAction(true);
    try {
      await createTrackedFoodEntry({
        profile_id: activeProfileId,
        meal_name: item.name,
        meal_type: "meal",
        measurement_source: "manual",
        total_portion_grams: item.grams,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        fibre: item.fibre,
        iron_mg: item.ironMg ?? null,
        ingredients: [
          {
            name: item.name,
            portion_grams: item.grams,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            fibre: item.fibre,
            source_label: item.sourceLabel,
          },
        ],
      });
      await loadProtectedData();
      notify(`Logged ${item.name} (${item.grams}g) to ${activeProfile?.display_name}`);
    } catch (err) {
      setWomenError(err instanceof Error ? err.message : "Could not log food entry.");
    } finally {
      setLoggingAction(false);
    }
  }

  async function handleQuickWater(amountMl: number) {
    if (!user || !activeProfileId) {
      openAuthModal("login", "women");
      return;
    }
    if (amountMl <= 0) return;
    setLoggingAction(true);
    try {
      await createHydrationEntry({
        profile_id: activeProfileId,
        amount_ml: amountMl,
        measurement_source: "manual",
        notes: "Women's Wellness quick log",
      });
      await loadProtectedData();
      notify(`Logged +${amountMl} mL hydration.`);
    } catch (err) {
      setWomenError(err instanceof Error ? err.message : "Could not log hydration.");
    } finally {
      setLoggingAction(false);
    }
  }

  async function handleQuickActivity(minutes: number) {
    if (!user || !activeProfileId) {
      openAuthModal("login", "women");
      return;
    }
    if (minutes <= 0) return;
    setLoggingAction(true);
    try {
      await createActivityEntry({
        profile_id: activeProfileId,
        activity_type: activityChoice,
        duration_minutes: minutes,
        intensity: "moderate",
      });
      await loadProtectedData();
      notify(`Logged ${minutes} min of ${activityChoice}.`);
    } catch (err) {
      setWomenError(err instanceof Error ? err.message : "Could not log activity.");
    } finally {
      setLoggingAction(false);
    }
  }

  async function handleExportPrivacyJson() {
    if (!activeProfileId) return;
    const data = await exportWomensWellnessData(activeProfileId);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nutrisense-womens-wellness-${todayYmd()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Downloaded your personal Women's Wellness export JSON.");
  }

  async function handleDeleteAllWomensRecords() {
    if (!activeProfileId) return;
    if (
      !window.confirm(
        "Permanently delete all cycle dates, symptom logs, mood logs, and Women's Wellness preferences for this profile?",
      )
    ) {
      return;
    }
    await deleteAllWomensWellnessData(activeProfileId);
    await loadProtectedData();
    notify("All Women's Wellness records removed from this profile.");
  }

  // Calendar grid helper
  const calendarDays = useMemo(() => {
    const y = calCursor.getFullYear();
    const m = calCursor.getMonth();
    const firstWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const loggedDates = new Set<string>();
    for (const p of womensSummary?.period_records ?? []) {
      const start = new Date(`${p.start_date}T00:00:00`);
      const end = p.end_date
        ? new Date(`${p.end_date}T00:00:00`)
        : new Date(
            start.getTime() +
              Math.max(1, (womensSummary?.preferences.typical_period_days ?? 5) - 1) *
                86400000,
          );
      for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
        const dt = new Date(t);
        loggedDates.add(
          `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
            dt.getDate(),
          ).padStart(2, "0")}`,
        );
      }
    }
    const estNext = womensSummary?.estimate.next_period_estimated_start;
    const cells: ({ ymd: string; day: number; isPeriod: boolean; isEstimated: boolean } | null)[] =
      Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        ymd,
        day: d,
        isPeriod: loggedDates.has(ymd),
        isEstimated: Boolean(estNext && ymd === estNext),
      });
    }
    return cells;
  }, [calCursor, womensSummary]);

  const filteredTemplates = useMemo(() => {
    if (mealFilter === "All") return WOMEN_MEAL_TEMPLATES;
    return WOMEN_MEAL_TEMPLATES.filter((t) => t.slot === mealFilter);
  }, [mealFilter]);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Floral Pink / Blush + Dark Botanical Hero Header */}
      <section className="relative overflow-hidden rounded-[2rem] border border-rose-300/25 bg-gradient-to-br from-[#201219] via-[#131015] to-[#080B09] p-6 sm:p-9 lg:p-11">
        {/* Soft blush radial & botanical glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-rose-400/15 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-12 h-64 w-72 rounded-full bg-[#A3FF12]/10 blur-[110px]"
        />

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/40 bg-rose-400/15 px-3 py-1 text-xs font-semibold text-rose-200">
                <Flower2 className="h-3.5 w-3.5 text-rose-300" />
                Women&apos;s Chapter Sanctuary
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Minimum Input • Privacy First
              </span>
            </div>

            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Your Health. Your Rhythm.{" "}
              <span className="bg-gradient-to-r from-rose-300 via-pink-200 to-[#A3FF12] bg-clip-text text-transparent">
                Your Way.
              </span>
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-zinc-200 sm:text-base">
              A warm, judgment-free companion integrating period wellness, iron-smart
              nutrition, gentle movement, hydration, supportive optional BMI context,
              and transparent product recommendations — reusing your existing
              NutriSense profile with minimal tapping.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {!user ? (
                <button
                  type="button"
                  onClick={() => openAuthModal("register", "women")}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-300 px-5 py-2.5 text-xs font-bold text-[#140B10] shadow-[0_0_24px_rgba(253,164,175,0.28)] transition hover:bg-rose-200"
                >
                  <Heart className="h-4 w-4" />
                  <span>Save Private Cycle &amp; Meal Logs</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/35 bg-rose-400/15 px-4 py-2 text-xs font-semibold text-rose-100">
                  <Sparkles className="h-3.5 w-3.5 text-[#A3FF12]" />
                  Active Profile: {activeProfile?.display_name || user.full_name}
                </span>
              )}

              <button
                type="button"
                onClick={() => onNavigate("scanner")}
                className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-5 py-2.5 text-xs font-bold text-[#050706] transition hover:bg-[#b8ff42]"
              >
                <Camera className="h-4 w-4" />
                <span>Scan Meal for Nutrients</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-sm overflow-hidden rounded-3xl border border-rose-300/30 bg-[#120D11] shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
              <img
                src="/images/women-wellness-hero.jpg"
                alt="Hibiscus herbal infusion, pomegranate, dark cacao, and pumpkin seeds for women's nourishment"
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-200">
                  Evidence-Informed Comfort &amp; Nutrition
                </p>
                <p className="mt-0.5 text-xs text-zinc-200">
                  All educational resources, period facts, and product comparisons stay open — tracking &amp; BMI are strictly optional.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="relative z-10 mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-5">
          {(
            [
              { id: "overview", label: "Onboarding & BMI", Icon: Scale },
              { id: "period", label: "Your Period, Your Care", Icon: Flower2 },
              { id: "nutrition", label: "Personalized Nutrition", Icon: Utensils },
              { id: "fitness", label: "Fitness & Activity", Icon: Dumbbell },
              { id: "products", label: "Curated Essentials", Icon: Package },
              { id: "directory", label: "Care Directory & Premium", Icon: Stethoscope },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-rose-300 text-[#140B10] shadow-[0_0_18px_rgba(253,164,175,0.28)]"
                    : "border border-white/10 bg-[#0C0F0D]/80 text-zinc-300 hover:border-rose-300/35 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {statusFeedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-[#34D399]/40 bg-[#121D16] px-4 py-3 text-xs font-semibold text-[#A7F3D0]"
        >
          <CheckCircle2 className="h-4 w-4 text-[#34D399]" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {womenError && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <span>{womenError}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: FRIENDLY ONBOARDING, PROFILE REUSE, OPTIONAL BMI & PRIVACY   */}
      {/* =================================================================== */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-5 rounded-3xl border border-rose-300/20 bg-[#121014] p-6 lg:col-span-7">
            <div className="space-y-2 border-b border-white/[0.08] pb-4">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-rose-300">
                <Sparkles className="h-3.5 w-3.5" />
                Gentle Personalization
              </span>
              <h2 className="font-display text-2xl font-bold text-white">
                Let&apos;s make your wellness experience more personal.
              </h2>
              <p className="text-xs leading-relaxed text-zinc-300 sm:text-sm">
                Would you like to share a few details about yourself? We automatically
                reuse your existing NutriSense profile ({activeProfile?.display_name ?? "Guest"}
                {derivedAge !== null ? `, age ${derivedAge}` : ""}) so you never
                type things twice. Every optional input can be skipped anytime.
              </p>
            </div>

            {!user ? (
              <div className="rounded-2xl border border-rose-300/25 bg-black/40 p-5">
                <p className="text-sm font-semibold text-white">
                  Sign in only if you want to save personal preferences, period logs, or optional BMI privately.
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  General food guides, period education, yoga recovery ideas, and verified clinics remain open without signing in.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal("login", "women")}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-300 px-4 py-2 text-xs font-bold text-[#140B10]"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Sign In / Register</span>
                </button>
              </div>
            ) : loadingWomen && !womensSummary ? (
              <div className="flex items-center gap-2 py-6 text-xs text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin text-rose-300" />
                <span>Loading your Women&apos;s Wellness preferences...</span>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Explicit Consent Checkboxes */}
                <div className="space-y-2.5 rounded-2xl border border-white/[0.08] bg-[#090B0A] p-4">
                  <label className="flex cursor-pointer items-start justify-between gap-3 text-xs">
                    <span>
                      <strong className="text-white">
                        Save Optional Women&apos;s Wellness Preferences
                      </strong>
                      <span className="mt-0.5 block text-[11px] text-zinc-400">
                        Permission-based storage only; health info is never shared for ads or affiliate targeting.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(womensSummary?.preferences.consent_given)}
                      onChange={(e) =>
                        void handleSaveOnboardingAndBmi({
                          consentGiven: e.target.checked,
                        })
                      }
                      className="mt-1 h-4 w-4 accent-rose-300"
                    />
                  </label>

                  <label className="flex cursor-pointer items-start justify-between gap-3 border-t border-white/[0.06] pt-2.5 text-xs">
                    <span>
                      <strong className="text-white">
                        Opt In to Supportive BMI Information (Optional)
                      </strong>
                      <span className="mt-0.5 block text-[11px] text-zinc-400">
                        Calculated only with your agreement — uses CDC Youth Percentiles under age 18 and contextual limits for adults.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(womensSummary?.preferences.bmi_consent_given)}
                      onChange={(e) =>
                        void handleSaveOnboardingAndBmi({
                          bmiConsentGiven: e.target.checked,
                        })
                      }
                      className="mt-1 h-4 w-4 accent-[#A3FF12]"
                    />
                  </label>
                </div>

                {/* Reused Profile Summary Pills */}
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full border border-white/10 bg-[#080B09] px-3 py-1 text-zinc-300">
                    Reused Profile:{" "}
                    <strong className="text-white">{activeProfile?.display_name}</strong>
                  </span>
                  {derivedAge !== null && (
                    <span className="rounded-full border border-white/10 bg-[#080B09] px-3 py-1 text-zinc-300">
                      Age: <strong className="text-white">{derivedAge} yrs</strong>
                    </span>
                  )}
                  {activeProfile?.dietary_preference && (
                    <span className="rounded-full border border-white/10 bg-[#080B09] px-3 py-1 text-zinc-300">
                      Diet: <strong className="text-white">{activeProfile.dietary_preference}</strong>
                    </span>
                  )}
                </div>

                {/* Multi-select Wellness Goal Chips */}
                <div>
                  <p className="mb-2 text-xs font-semibold text-zinc-200">
                    Optional Focus Areas (Tap chips — zero typing needed)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {OPTIONAL_GOALS_CHIPS.map((goal) => {
                      const picked = selectedGoals.includes(goal);
                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() =>
                            setSelectedGoals((prev) =>
                              prev.includes(goal)
                                ? prev.filter((x) => x !== goal)
                                : [...prev, goal],
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            picked
                              ? "border-rose-300/60 bg-rose-300/20 text-rose-100"
                              : "border-white/10 bg-[#080B09] text-zinc-400 hover:text-white"
                          }`}
                        >
                          {goal}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Missing optional BMI fields shown cleanly only when consented */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-300">
                      Height cm (optional)
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={250}
                      step="0.5"
                      value={heightInput}
                      onChange={(e) => setHeightInput(e.target.value)}
                      placeholder="e.g. 162"
                      className="w-full rounded-xl border border-white/10 bg-[#080B09] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-300">
                      Weight kg (optional)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={350}
                      step="0.5"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      placeholder="e.g. 58"
                      className="w-full rounded-xl border border-white/10 bg-[#080B09] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-300">
                      Typical Cycle Length
                    </label>
                    <select
                      value={cycleLenInput}
                      onChange={(e) => setCycleLenInput(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#080B09] px-3 py-2 text-xs text-white"
                    >
                      {[24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 35].map((d) => (
                        <option key={d} value={d}>
                          ~{d} days
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={savingPref}
                    onClick={() => void handleSaveOnboardingAndBmi({})}
                    className="rounded-xl bg-[#A3FF12] px-5 py-2.5 text-xs font-bold text-[#050706] hover:bg-[#b8ff42] disabled:opacity-50"
                  >
                    {savingPref ? "Saving..." : "Save Preferences"}
                  </button>
                  {womensSummary?.preferences.bmi_consent_given && (
                    <button
                      type="button"
                      onClick={() => void handleSaveOnboardingAndBmi({ clearBmi: true })}
                      className="rounded-xl border border-white/15 px-4 py-2 text-xs text-zinc-300 hover:text-white"
                    >
                      Clear Height / Weight &amp; Hide BMI
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Supportive BMI Display + Privacy Controls */}
          <aside className="space-y-5 lg:col-span-5">
            <div className="rounded-3xl border border-white/[0.08] bg-[#101411] p-6">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-rose-300" />
                <h3 className="font-display text-base font-bold text-white">
                  Supportive BMI Perspective
                </h3>
              </div>

              {bmiAssessment ? (
                <div className="mt-4 space-y-3">
                  <p className="font-mono text-xl font-bold text-[#A3FF12]">
                    {bmiAssessment.headline}
                  </p>
                  <p className="text-xs leading-relaxed text-zinc-200">
                    {bmiAssessment.referenceNote}
                  </p>
                  <ul className="space-y-1.5 rounded-2xl border border-white/10 bg-[#080B09] p-3 text-[11px] text-zinc-400">
                    {bmiAssessment.limitations.map((lim) => (
                      <li key={lim} className="flex items-start gap-1.5">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
                        <span>{lim}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  BMI is completely optional. It is calculated only when you opt in
                  and provide height and weight — we never prescribe diets or body
                  goals based on BMI alone.
                </p>
              )}
            </div>

            {user && (
              <div className="rounded-3xl border border-white/[0.08] bg-[#101411] p-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#34D399]" />
                  <h3 className="font-display text-base font-bold text-white">
                    Privacy &amp; Data Controls
                  </h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Your cycle records and symptoms stay private inside your signed-in profile. You can pause tracking, export JSON, or erase records anytime.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleExportPrivacyJson()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#070A08] px-3 py-2 text-xs font-semibold text-white hover:border-white/30"
                  >
                    <Download className="h-3.5 w-3.5 text-[#34D399]" />
                    <span>Export My Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAllWomensRecords()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete All Cycle Data</span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: YOUR PERIOD, YOUR CARE (Pink Floral Subsection)              */}
      {/* =================================================================== */}
      {activeTab === "period" && (
        <div className="space-y-6 rounded-[2rem] border border-rose-300/25 bg-gradient-to-b from-[#1A1016] via-[#110D11] to-[#080B09] p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rose-200/15 pb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/40 bg-rose-400/15 px-3 py-1 text-xs font-semibold text-rose-200">
                <Flower2 className="h-3.5 w-3.5 text-rose-300" />
                Your Period, Your Care
              </span>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-white sm:text-3xl">
                Supportive Food, Comfort &amp; Optional Tracking
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-zinc-300 sm:text-sm">
                Ordinary foods like curd, fruit, or cool drinks are not universally harmful during menstruation — listen to what feels genuinely soothing to your body.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "foods", label: "Period Food Guide" },
                  { id: "alternatives", label: "Food Alternatives" },
                  { id: "essentials", label: "Period Essentials" },
                  { id: "yoga", label: "Yoga & Rest" },
                  { id: "facts", label: "Hacks & Facts" },
                  { id: "tracker", label: "Optional Tracker" },
                ] as { id: PeriodSubTab; label: string }[]
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setPeriodSubTab(sub.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    periodSubTab === sub.id
                      ? "bg-rose-300 text-[#140B10]"
                      : "border border-white/15 bg-black/40 text-zinc-300 hover:border-rose-300/40 hover:text-white"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>

          {/* A. Period Food Guide */}
          {periodSubTab === "foods" && (
            <div className="grid gap-5 lg:grid-cols-3">
              {PERIOD_FOOD_SUGGESTIONS.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col justify-between overflow-hidden rounded-3xl border border-rose-200/15 bg-[#090B0A]"
                >
                  <div>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={item.imagePath}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute top-3 left-3 rounded-full border border-rose-200/40 bg-black/75 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-200 backdrop-blur-md">
                        {item.category.replace("_", " ")}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-base font-bold text-white">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs font-medium text-rose-200">
                        Serving: {item.servingLabel}
                      </p>
                      <p className="mt-2 font-mono text-[11px] text-[#A3FF12]">
                        Est. {item.calories} kcal • P {item.protein}g • C {item.carbs}g • F{" "}
                        {item.fats}g • Fib {item.fibre}g • Iron ~{item.ironMg} mg
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-400">
                        {item.sourceNote}
                      </p>
                      <p className="mt-2.5 text-xs text-zinc-300">{item.benefit}</p>
                      <ol className="mt-3 space-y-1 border-t border-white/[0.06] pt-2.5 text-[11px] text-zinc-400">
                        {item.simpleRecipe.map((step, i) => (
                          <li key={step}>
                            <strong className="text-zinc-200">{i + 1}.</strong> {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                  <div className="border-t border-white/[0.06] p-4">
                    <button
                      type="button"
                      disabled={loggingAction}
                      onClick={() =>
                        void handleQuickLogFood({
                          name: item.name,
                          grams: item.servingGrams,
                          calories: item.calories,
                          protein: item.protein,
                          carbs: item.carbs,
                          fats: item.fats,
                          fibre: item.fibre,
                          ironMg: item.ironMg,
                          sourceLabel: item.sourceNote,
                        })
                      }
                      className="w-full rounded-xl bg-rose-300/90 py-2 text-xs font-bold text-[#140B10] hover:bg-rose-200 disabled:opacity-50"
                    >
                      + Log This Serving to Profile
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* B. Period Food Alternatives (Dual Image Swap Cards) */}
          {periodSubTab === "alternatives" && (
            <div className="space-y-5">
              {WOMEN_FOOD_ALTERNATIVES.map((swap) => (
                <article
                  key={swap.id}
                  className="grid gap-5 rounded-3xl border border-rose-200/15 bg-[#090B0A] p-5 lg:grid-cols-12"
                >
                  <div className="flex items-center gap-4 lg:col-span-5">
                    <img
                      src={swap.originalImagePath}
                      alt={swap.originalName}
                      className="h-24 w-28 shrink-0 rounded-2xl border border-white/10 object-cover"
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Craving / Baseline Option
                      </span>
                      <h3 className="font-display text-sm font-bold text-white">
                        {swap.originalName}
                      </h3>
                      <p className="mt-1 font-mono text-[11px] text-zinc-400">
                        {swap.originalStats}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center lg:col-span-2">
                    <div className="inline-flex items-center justify-center gap-1 rounded-full border border-rose-300/35 bg-rose-300/10 px-3 py-1.5 text-[11px] font-bold text-rose-200">
                      <span>Comfort Swap</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-zinc-300">
                      {swap.benefitsOfSwap}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 lg:col-span-5">
                    <div className="flex items-center gap-4">
                      <img
                        src={swap.alternativeImagePath}
                        alt={swap.alternativeName}
                        className="h-24 w-28 shrink-0 rounded-2xl border border-[#A3FF12]/40 object-cover"
                      />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3FF12]">
                          Nourishing Alternative
                        </span>
                        <h3 className="font-display text-sm font-bold text-white">
                          {swap.alternativeName}
                        </h3>
                        <p className="mt-1 font-mono text-[11px] text-[#34D399]">
                          Est. {swap.alternativeStats.calories} kcal • P{" "}
                          {swap.alternativeStats.protein}g • Fib{" "}
                          {swap.alternativeStats.fibre}g
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">
                          {swap.sourceLabel}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={loggingAction}
                      onClick={() =>
                        void handleQuickLogFood({
                          name: swap.alternativeName,
                          grams: swap.alternativeStats.grams,
                          calories: swap.alternativeStats.calories,
                          protein: swap.alternativeStats.protein,
                          carbs: swap.alternativeStats.carbs,
                          fats: swap.alternativeStats.fats,
                          fibre: swap.alternativeStats.fibre,
                          sourceLabel: swap.sourceLabel,
                        })
                      }
                      className="shrink-0 rounded-xl bg-[#A3FF12] px-3 py-2 text-xs font-bold text-[#050706] hover:bg-[#b8ff42]"
                    >
                      + Log Swap
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* C. Period Essentials (Uses ONE Centralized RecommendedProductsHub) */}
          {periodSubTab === "essentials" && (
            <RecommendedProductsHub
              defaultCategory="women_period_care"
              defaultAudience="women"
              referrerSection="women_period_essentials"
              compact
              title="Period Care, Heating Comfort & Reusable Hydration"
              subtitle="Verified product links organized across Budget Friendly, Value for Money, and Premium Quality tiers."
            />
          )}

          {/* D. Period Yoga, Breathing & Rest */}
          {periodSubTab === "yoga" && (
            <div className="space-y-5">
              <div className="flex items-start gap-2.5 rounded-2xl border border-rose-300/35 bg-rose-400/10 p-4 text-xs text-rose-100">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                <span>
                  Exercise is never compulsory during pain or fatigue. Honor rest days guilt-free, and consult a healthcare professional for severe pelvic pain, fever, or heavy bleeding.
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {PERIOD_ACTIVITIES.map((act) => (
                  <div
                    key={act.id}
                    className="rounded-2xl border border-white/10 bg-[#090B0A] p-5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-rose-300/35 bg-rose-300/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-200">
                        {act.intensity}
                      </span>
                      <span className="font-mono text-xs text-[#A3FF12]">
                        {act.durationSuggestion}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-base font-bold text-white">
                      {act.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-[#34D399]">
                      {act.focus}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      {act.howTo}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* E. Evidence-Based Hacks & Facts */}
          {periodSubTab === "facts" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PERIOD_EDUCATION_CARDS.map((card) => (
                <article
                  key={card.id}
                  className="flex flex-col justify-between rounded-2xl border border-rose-200/15 bg-[#090B0A] p-5"
                >
                  <div>
                    <span className="rounded-full border border-rose-300/35 bg-rose-300/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-200">
                      {card.topic}
                    </span>
                    <h3 className="mt-2.5 font-display text-base font-bold text-white">
                      {card.title}
                    </h3>
                    <p className="mt-1.5 text-xs font-medium text-zinc-200">
                      {card.summary}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      {card.detail}
                    </p>
                  </div>
                  <p className="mt-4 border-t border-white/[0.06] pt-2.5 font-mono text-[10px] text-[#34D399]">
                    Reference: {card.reference}
                  </p>
                </article>
              ))}
            </div>
          )}

          {/* F. Optional Minimum-Input Period & Symptom Calendar Tracker */}
          {periodSubTab === "tracker" && (
            <div className="space-y-6">
              {!user ? (
                <div className="rounded-2xl border border-rose-300/30 bg-[#090B0A] p-6 text-center">
                  <Lock className="mx-auto h-6 w-6 text-rose-300" />
                  <h3 className="mt-2 font-display text-lg font-bold text-white">
                    Sign In for Private Cycle &amp; Symptom Records
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Cycle dates, symptoms, and mood records require authenticated ownership so no unauthorized viewer can see your data.
                  </p>
                  <button
                    type="button"
                    onClick={() => openAuthModal("login", "women")}
                    className="mt-4 rounded-xl bg-rose-300 px-5 py-2.5 text-xs font-bold text-[#140B10]"
                  >
                    Sign In / Create Account
                  </button>
                </div>
              ) : (
                <>
                  {/* Disable / Enable Tracking & Reminders Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#090B0A] px-4 py-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex cursor-pointer items-center gap-2 font-semibold text-white">
                        <input
                          type="checkbox"
                          checked={womensSummary?.preferences.tracking_enabled ?? true}
                          onChange={(e) =>
                            void handleSaveOnboardingAndBmi({
                              trackingEnabled: e.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-rose-300"
                        />
                        <span>Enable Cycle Tracking</span>
                      </label>

                      <label className="flex cursor-pointer items-center gap-2 font-semibold text-zinc-200">
                        <Bell className="h-3.5 w-3.5 text-rose-300" />
                        <input
                          type="checkbox"
                          checked={womensSummary?.preferences.reminders_enabled ?? false}
                          onChange={(e) =>
                            void handleSaveOnboardingAndBmi({
                              remindersEnabled: e.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-[#A3FF12]"
                        />
                        <span>Optional Reminder Cues</span>
                      </label>
                    </div>

                    {womensSummary?.estimate && (
                      <span className="font-mono text-[11px] text-rose-200">
                        {womensSummary.estimate.has_estimate
                          ? `Estimated next window: ${womensSummary.estimate.next_period_estimated_start} (estimate only)`
                          : "No cycle prediction active"}
                      </span>
                    )}
                  </div>

                  {womensSummary?.preferences.tracking_enabled === false ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-[#090B0A] p-6 text-center text-xs text-zinc-400">
                      Cycle tracking is paused for {activeProfile?.display_name}. Re-enable it anytime above whenever helpful.
                    </div>
                  ) : (
                    <div className="grid gap-6 lg:grid-cols-12">
                      {/* Left: Calendar Visualization + Minimum-Input Period Form */}
                      <div className="space-y-5 lg:col-span-5">
                        <div className="rounded-2xl border border-rose-200/20 bg-[#090B0A] p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="font-display text-sm font-bold text-white">
                              {calCursor.toLocaleString("en-US", {
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setCalCursor(
                                    (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                                  )
                                }
                                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-300"
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCalCursor(
                                    (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                                  )
                                }
                                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-300"
                              >
                                →
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-zinc-500">
                            {["S", "M", "T", "W", "T", "F", "S"].map((w, idx) => (
                              <span key={`${w}-${idx}`}>{w}</span>
                            ))}
                            {calendarDays.map((cell, idx) =>
                              !cell ? (
                                <span key={`empty-${idx}`} />
                              ) : (
                                <button
                                  key={cell.ymd}
                                  type="button"
                                  onClick={() => {
                                    setPeriodStart(cell.ymd);
                                    setCheckInDate(cell.ymd);
                                  }}
                                  className={`rounded-lg py-1.5 font-mono text-[11px] transition ${
                                    cell.isPeriod
                                      ? "bg-rose-400 font-bold text-[#140B10]"
                                      : cell.isEstimated
                                        ? "border border-dashed border-rose-300 bg-rose-300/15 text-rose-200"
                                        : "text-zinc-300 hover:bg-white/10"
                                  }`}
                                >
                                  {cell.day}
                                </button>
                              ),
                            )}
                          </div>
                          <p className="mt-3 text-[10px] text-zinc-400">
                            Solid rose = logged dates • Dashed = estimated next start only (cycles naturally vary).
                          </p>
                        </div>

                        <form
                          onSubmit={(e) => void handleLogPeriod(e)}
                          className="space-y-3 rounded-2xl border border-white/10 bg-[#090B0A] p-4"
                        >
                          <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-white">
                            <CalendarDays className="h-4 w-4 text-rose-300" />
                            <span>Log Period Dates</span>
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-zinc-400">Start Date</label>
                              <input
                                type="date"
                                required
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-[#121613] px-2.5 py-2 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-zinc-400">End Date (opt.)</label>
                              <input
                                type="date"
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-[#121613] px-2.5 py-2 text-xs text-white"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {(["light", "moderate", "heavy", "spotting", "skipped"] as const).map(
                              (lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => setFlowLevel(lvl)}
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${
                                    flowLevel === lvl
                                      ? "border-rose-300 bg-rose-300 text-[#140B10]"
                                      : "border-white/10 bg-[#121613] text-zinc-300"
                                  }`}
                                >
                                  {lvl}
                                </button>
                              ),
                            )}
                          </div>

                          <button
                            type="submit"
                            disabled={savingPeriod}
                            className="w-full rounded-xl bg-rose-300 py-2 text-xs font-bold text-[#140B10] hover:bg-rose-200 disabled:opacity-50"
                          >
                            {savingPeriod ? "Saving..." : "+ Save Cycle Entry"}
                          </button>
                        </form>
                      </div>

                      {/* Right: 1-Tap Symptom Chips + Emoji Mood + Histories */}
                      <div className="space-y-5 lg:col-span-7">
                        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#090B0A] p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-display text-sm font-bold text-white">
                              Quick Symptom &amp; Mood Check-In
                            </h3>
                            <input
                              type="date"
                              value={checkInDate}
                              onChange={(e) => setCheckInDate(e.target.value)}
                              className="rounded-xl border border-white/10 bg-[#121613] px-2.5 py-1 text-xs text-white"
                            />
                          </div>

                          <div>
                            <p className="mb-1.5 text-[11px] font-semibold text-zinc-400">
                              Symptoms (multi-select chips)
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {SYMPTOM_OPTIONS.map((sym) => {
                                const picked = selectedSymptoms.includes(sym.id);
                                return (
                                  <button
                                    key={sym.id}
                                    type="button"
                                    onClick={() => toggleSymptomChip(sym.id)}
                                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                      picked
                                        ? "border-rose-300 bg-rose-300/20 text-rose-100"
                                        : "border-white/10 bg-[#121613] text-zinc-400 hover:text-white"
                                    }`}
                                  >
                                    {sym.label}
                                  </button>
                                );
                              })}
                            </div>
                            {selectedSymptoms.includes("other") && (
                              <input
                                type="text"
                                value={symptomOtherText}
                                onChange={(e) => setSymptomOtherText(e.target.value)}
                                placeholder="Optional other symptom note..."
                                className="mt-2 w-full rounded-xl border border-rose-300/30 bg-[#121613] px-3 py-1.5 text-xs text-white"
                              />
                            )}
                          </div>

                          <div>
                            <p className="mb-1.5 text-[11px] font-semibold text-zinc-400">
                              Mood (1-tap emoji selection)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {MOOD_OPTIONS.map((m) => {
                                const picked = selectedMood === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedMood((prev) =>
                                        prev === m.id ? null : m.id,
                                      )
                                    }
                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                                      picked
                                        ? "border-[#A3FF12] bg-[#A3FF12]/15 text-[#A3FF12]"
                                        : "border-white/10 bg-[#121613] text-zinc-300 hover:text-white"
                                    }`}
                                  >
                                    <span>{m.emoji}</span>
                                    <span>{m.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {selectedMood === "other" && (
                              <input
                                type="text"
                                value={moodOtherText}
                                onChange={(e) => setMoodOtherText(e.target.value)}
                                placeholder="Optional mood description..."
                                className="mt-2 w-full rounded-xl border border-[#A3FF12]/30 bg-[#121613] px-3 py-1.5 text-xs text-white"
                              />
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={savingSymptoms}
                            onClick={() => void handleLogSymptomsMood()}
                            className="rounded-xl bg-[#A3FF12] px-5 py-2 text-xs font-bold text-[#050706] hover:bg-[#b8ff42] disabled:opacity-50"
                          >
                            {savingSymptoms ? "Saving..." : "+ Save Check-In"}
                          </button>
                        </div>

                        {/* History Columns */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-[#090B0A] p-4">
                            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-rose-200">
                              Logged Cycle History
                            </h4>
                            <ul className="mt-3 max-h-44 space-y-2 overflow-y-auto">
                              {(womensSummary?.period_records ?? []).length === 0 ? (
                                <li className="text-xs text-zinc-500">
                                  No cycle dates logged yet.
                                </li>
                              ) : (
                                womensSummary?.period_records.map((rec) => (
                                  <li
                                    key={rec.id}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#121613] px-3 py-2 text-xs"
                                  >
                                    <div>
                                      <p className="font-mono font-semibold text-white">
                                        {rec.start_date}
                                        {rec.end_date ? ` → ${rec.end_date}` : ""}
                                      </p>
                                      <p className="text-[10px] capitalize text-zinc-400">
                                        Flow: {rec.flow_level || "moderate"}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void deletePeriodRecord(rec.id).then(
                                          loadProtectedData,
                                        )
                                      }
                                      className="p-1 text-zinc-500 hover:text-rose-300"
                                      aria-label="Delete period entry"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-[#090B0A] p-4">
                            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#34D399]">
                              Symptom &amp; Mood History
                            </h4>
                            <ul className="mt-3 max-h-44 space-y-2 overflow-y-auto">
                              {(womensSummary?.symptom_records ?? []).length === 0 ? (
                                <li className="text-xs text-zinc-500">
                                  No check-ins logged yet.
                                </li>
                              ) : (
                                womensSummary?.symptom_records.map((rec) => (
                                  <li
                                    key={rec.id}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#121613] px-3 py-2 text-xs"
                                  >
                                    <div>
                                      <p className="font-mono text-[11px] font-semibold text-white">
                                        {rec.record_date}{" "}
                                        {rec.mood ? `• Mood: ${rec.mood}` : ""}
                                      </p>
                                      <p className="text-[10px] text-zinc-400">
                                        {rec.symptoms.join(", ")}
                                        {rec.symptom_other_text
                                          ? ` (${rec.symptom_other_text})`
                                          : ""}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void deleteSymptomRecord(rec.id).then(
                                          loadProtectedData,
                                        )
                                      }
                                      className="p-1 text-zinc-500 hover:text-rose-300"
                                      aria-label="Delete symptom record"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: PERSONALIZED NUTRITION & HYDRATION                           */}
      {/* =================================================================== */}
      {activeTab === "nutrition" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Quick Minimum-Input Hydration */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#101411] p-6 lg:col-span-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white">
                  <Droplets className="h-4 w-4 text-cyan-300" />
                  <span>Quick Hydration Log</span>
                </h3>
                {profileDashboard && (
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {Math.round(profileDashboard.hydration_summary.total_ml)} mL today
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Single-tap presets sync directly to your existing NutriSense profile hydration timeline.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[150, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={loggingAction}
                    onClick={() => void handleQuickWater(amt)}
                    className="rounded-xl border border-cyan-400/35 bg-cyan-400/10 py-2.5 font-mono text-xs font-bold text-cyan-200 hover:bg-cyan-400/20"
                  >
                    +{amt} mL
                  </button>
                ))}
              </div>
              <div className="mt-2.5 flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={customWaterMl}
                  onChange={(e) => setCustomWaterMl(e.target.value)}
                  className="w-28 rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={loggingAction}
                  onClick={() => void handleQuickWater(Number(customWaterMl) || 0)}
                  className="flex-1 rounded-xl bg-[#34D399] py-2 text-xs font-bold text-[#050706]"
                >
                  Log Custom mL
                </button>
              </div>
            </div>

            {/* AI Food Scanner Bridge + Today's Food History */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#101411] p-6 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    Existing Food History &amp; AI Vision Bridge
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Scan any meal to adjust portion grams and save directly to this profile.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("scanner")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#050706]"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Open Food Scanner</span>
                </button>
              </div>

              <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto">
                {!user ? (
                  <li className="text-xs text-zinc-400">
                    Sign in to view your saved profile meal history here, or use presets below anytime.
                  </li>
                ) : (profileDashboard?.recent_foods ?? []).length === 0 ? (
                  <li className="text-xs text-zinc-500">
                    No food entries logged yet today for {activeProfile?.display_name}.
                  </li>
                ) : (
                  profileDashboard?.recent_foods.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#070A08] px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-white">{f.meal_name}</span>
                      <span className="font-mono text-[#A3FF12]">
                        {Math.round(f.total_portion_grams)}g • {Math.round(f.calories)} kcal •{" "}
                        {f.protein}g P
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* Meal Slot Recommendations */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#101411] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  Personalized Meal &amp; Workout Fueling Templates
                </h3>
                <p className="text-xs text-zinc-400">
                  Values are database-derived estimates per specified serving size (ICMR–NIN IFCT 2017 &amp; USDA references).
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "All",
                  "Breakfast",
                  "Lunch",
                  "Dinner",
                  "Healthy Snack",
                  "Pre-Workout",
                  "Post-Workout",
                ].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setMealFilter(slot)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      mealFilter === slot
                        ? "bg-[#A3FF12] text-[#050706]"
                        : "border border-white/10 bg-[#070A08] text-zinc-400"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#070A08] p-5"
                >
                  <div>
                    <span className="rounded-full border border-rose-300/35 bg-rose-300/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-200">
                      {tmpl.slot}
                    </span>
                    <h4 className="mt-2 font-display text-sm font-bold text-white">
                      {tmpl.title}
                    </h4>
                    <p className="mt-1 text-xs text-zinc-400">
                      Serving: {tmpl.servingLabel}
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-[#A3FF12]">
                      Est. {tmpl.calories} kcal • P {tmpl.protein}g • Fib {tmpl.fibre}g • Iron ~{tmpl.ironMg} mg
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-500">{tmpl.sourceLabel}</p>
                    <p className="mt-2 text-xs text-zinc-300">{tmpl.note}</p>
                  </div>
                  <button
                    type="button"
                    disabled={loggingAction}
                    onClick={() =>
                      void handleQuickLogFood({
                        name: tmpl.title,
                        grams: tmpl.grams,
                        calories: tmpl.calories,
                        protein: tmpl.protein,
                        carbs: tmpl.carbs,
                        fats: tmpl.fats,
                        fibre: tmpl.fibre,
                        ironMg: tmpl.ironMg,
                        sourceLabel: tmpl.sourceLabel,
                      })
                    }
                    className="mt-4 w-full rounded-xl border border-[#A3FF12]/40 bg-[#A3FF12]/10 py-2 text-xs font-bold text-[#A3FF12] hover:bg-[#A3FF12]/20"
                  >
                    + Log Preset Serving
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: FITNESS, EXERCISE PRESETS, HISTORY & ACCESSORY ESSENTIALS    */}
      {/* =================================================================== */}
      {activeTab === "fitness" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Minimum-Input Duration Presets Logger */}
            <section className="rounded-3xl border border-white/[0.08] bg-[#101411] p-6 lg:col-span-6">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white">
                <Activity className="h-4 w-4 text-[#A3FF12]" />
                <span>Quick Activity Check-In</span>
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                Select an activity and tap duration minutes — syncs with your profile&apos;s unified activity history.
              </p>

              <div className="mt-4 space-y-3">
                <select
                  value={activityChoice}
                  onChange={(e) => setActivityChoice(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-xs text-white"
                >
                  <option value="Gentle Period Yoga">Gentle Period Yoga</option>
                  <option value="Beginner Strength Session">Beginner Strength Session</option>
                  <option value="Brisk Walk">Brisk Walk</option>
                  <option value="Mobility & Flexibility">Mobility &amp; Flexibility</option>
                  <option value="Cycling">Cycling</option>
                </select>

                <div className="flex flex-wrap gap-2">
                  {[10, 15, 20, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setActivityMins(mins)}
                      className={`rounded-xl border px-3 py-2 font-mono text-xs font-bold ${
                        activityMins === mins
                          ? "border-[#A3FF12] bg-[#A3FF12] text-[#050706]"
                          : "border-white/10 bg-[#070A08] text-zinc-300"
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={activityMins}
                    onChange={(e) => setActivityMins(Number(e.target.value) || 15)}
                    className="w-20 rounded-xl border border-white/10 bg-[#070A08] px-2.5 py-2 text-xs text-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={loggingAction}
                  onClick={() => void handleQuickActivity(activityMins)}
                  className="w-full rounded-xl bg-[#A3FF12] py-2.5 text-xs font-bold text-[#050706]"
                >
                  + Save {activityMins} min Activity
                </button>
              </div>
            </section>

            {/* Exercise History */}
            <section className="rounded-3xl border border-white/[0.08] bg-[#101411] p-6 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  Today&apos;s Profile Activity History
                </h3>
                {profileDashboard && (
                  <span className="font-mono text-xs font-bold text-[#34D399]">
                    {profileDashboard.activity_summary.total_minutes} min total
                  </span>
                )}
              </div>
              <ul className="mt-4 max-h-44 space-y-2 overflow-y-auto">
                {!user ? (
                  <li className="text-xs text-zinc-400">
                    Sign in to track daily workout durations across dates.
                  </li>
                ) : (profileDashboard?.activity_entries ?? []).length === 0 ? (
                  <li className="text-xs text-zinc-500">
                    No activity logged today yet.
                  </li>
                ) : (
                  profileDashboard?.activity_entries.map((act) => (
                    <li
                      key={act.id}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#070A08] px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-white">
                        {act.activity_type}
                      </span>
                      <span className="font-mono text-[#A3FF12]">
                        {act.duration_minutes} min
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {FITNESS_GUIDES.map((g) => (
              <div
                key={g.title}
                className="rounded-2xl border border-white/[0.08] bg-[#101411] p-5"
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#34D399]">
                  {g.level}
                </span>
                <h4 className="mt-1.5 font-display text-base font-bold text-white">
                  {g.title}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {g.detail}
                </p>
              </div>
            ))}
          </div>

          <RecommendedProductsHub
            defaultCategory="fitness_accessories"
            defaultAudience="women"
            referrerSection="women_fitness"
            compact
            title="Home Yoga Mats, Resistance Bands & Training Essentials"
            subtitle="Pulled from the centralized NutriSense product catalog."
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: FULL CENTRALIZED CATALOG VIEW                                */}
      {/* =================================================================== */}
      {activeTab === "products" && (
        <RecommendedProductsHub
          defaultCategory="women_period_care"
          defaultAudience="women"
          referrerSection="women_catalog_tab"
        />
      )}

      {/* =================================================================== */}
      {/* TAB 6: CARE DIRECTORY, DIAGNOSTIC LABS & COMING SOON PREMIUM        */}
      {/* =================================================================== */}
      {activeTab === "directory" && (
        <div className="space-y-6">
          {/* Verified Providers & Official Telemedicine / Registries */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#101411] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="flex items-center gap-2 font-display text-xl font-bold text-white">
                  <Stethoscope className="h-5 w-5 text-rose-300" />
                  <span>Verified Healthcare Portals, Registries &amp; Fitness Discovery</span>
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Zero invented doctor profiles or unverified credentials — use official statutory verification portals or follow verified integrations.
                </p>
              </div>
            </div>

            {directoryLoading ? (
              <div className="flex items-center gap-2 py-8 text-xs text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin text-rose-300" />
                <span>Loading directory...</span>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {providers.map((prov) => (
                  <article
                    key={prov.id}
                    className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#070A08] p-5"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full border border-[#34D399]/40 bg-[#34D399]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#34D399]">
                          {prov.booking_status === "coming_soon"
                            ? "Coming Soon — Direct Integration"
                            : "Verified Official Portal"}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {prov.verification_source}
                        </span>
                      </div>
                      <h4 className="mt-2 font-display text-base font-bold text-white">
                        {prov.name}
                      </h4>
                      <p className="mt-1 text-xs text-rose-200">
                        {prov.specialization}
                      </p>
                      <p className="mt-2 text-xs text-zinc-400">
                        <strong className="text-zinc-200">Organization:</strong>{" "}
                        {prov.hospital_or_organization} • {prov.location}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        <strong className="text-zinc-200">Details:</strong>{" "}
                        {prov.registration_details}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        <strong className="text-zinc-200">Fees Note:</strong>{" "}
                        {prov.consultation_fees_note}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                      <a
                        href={prov.official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20"
                      >
                        <span>Visit Official Portal</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {user && activeProfileId && prov.booking_status === "coming_soon" && (
                        <button
                          type="button"
                          onClick={() =>
                            void saveAppointmentPreviewNote({
                              profile_id: activeProfileId,
                              provider_slug: prov.slug,
                              notes: "Notify when verified clinician booking opens",
                            }).then(() =>
                              notify("Saved preference for future verified clinician launch."),
                            )
                          }
                          className="rounded-xl border border-rose-300/35 bg-rose-300/10 px-3.5 py-2 text-xs font-semibold text-rose-200"
                        >
                          Notify Me (Coming Soon)
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Diagnostic Labs */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#101411] p-6">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold text-white">
              <Microscope className="h-5 w-5 text-[#34D399]" />
              <span>Diagnostic Laboratories (Consult a Clinician Before Ordering Tests)</span>
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Medical test suitability is always determined by a qualified doctor — AI never automatically prescribes lab panels.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {labs.map((lab) => (
                <article
                  key={lab.id}
                  className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#070A08] p-5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#A3FF12]" />
                      <h4 className="font-display text-base font-bold text-white">
                        {lab.name}
                      </h4>
                    </div>
                    <p className="mt-2 text-xs text-zinc-300">
                      {lab.available_tests_note}
                    </p>
                    <p className="mt-2 text-[11px] text-zinc-400">
                      {lab.accreditation_note}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-[#34D399]">
                      {lab.pricing_note}
                    </p>
                  </div>

                  <a
                    href={lab.official_booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] py-2 text-xs font-semibold text-white hover:border-[#A3FF12]/50"
                  >
                    <span>Official Lab Portal</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </article>
              ))}
            </div>
          </section>

          {/* Premium Women's Wellness Preview ("Coming Soon" — zero fake payments!) */}
          <section className="rounded-3xl border border-rose-300/25 bg-gradient-to-br from-[#191016] to-[#0A0D0B] p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/40 bg-rose-300/15 px-3 py-1 text-[11px] font-bold text-rose-200">
                  <Crown className="h-3.5 w-3.5" />
                  Coming Soon — Preview Only
                </span>
                <h3 className="mt-2 font-display text-xl font-bold text-white">
                  Premium Women&apos;s Wellness Architecture
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  No payments or fake bookings are active in this release. Medical recommendations will never be ranked by commission.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {plans.map((plan) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                  className="rounded-2xl border border-white/10 bg-[#070A08]/80 p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-display text-base font-bold text-white">
                      {plan.name}
                    </h4>
                    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                      Coming Soon
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{plan.tagline}</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-zinc-300">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
