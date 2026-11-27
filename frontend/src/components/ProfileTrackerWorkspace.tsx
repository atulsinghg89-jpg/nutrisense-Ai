import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Baby,
  Calendar,
  Cpu,
  Droplets,
  Edit3,
  HeartPulse,
  Loader2,
  Lock,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  Utensils,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  API_BASE_URL,
  createActivityEntry,
  createHydrationEntry,
  createTrackedFoodEntry,
  deleteActivityEntry,
  deleteHydrationEntry,
  deleteOwnAccount,
  deleteTrackedFoodEntry,
  fetchProfileDashboard,
} from "../lib/api";
import type {
  AccountProfile,
  AccountProfileCreate,
  AccountProfileUpdate,
  AudienceChapterId,
  FoodMeasurementSource,
  HydrationMeasurementSource,
  ProfileDashboardData,
} from "../types/nutrition";
import { AnimatedNumber, EASE_PREMIUM } from "./MotionPrimitives";
import { ProfileFormModal } from "./ProfileFormModal";

interface ProfileTrackerWorkspaceProps {
  requestedChapter?: AudienceChapterId | null;
  onConsumedRequestedChapter?: () => void;
  onNavigateScanner: () => void;
  onProfileDataChanged?: () => void;
}

function todayLocalYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function profileTypeBadge(profile: AccountProfile): {
  label: string;
  className: string;
  Icon: typeof User;
} {
  if (profile.profile_type === "baby") {
    return {
      label:
        profile.age_months !== null
          ? `Baby (${profile.age_months} mo)`
          : "Baby Profile",
      className: "border-[#B6FF38]/40 bg-[#B6FF38]/12 text-[#B6FF38]",
      Icon: Baby,
    };
  }
  if (profile.profile_type === "patient") {
    return {
      label: "Patient Care",
      className: "border-[#6EE7B7]/40 bg-[#6EE7B7]/12 text-[#6EE7B7]",
      Icon: HeartPulse,
    };
  }
  return {
    label:
      profile.audience_chapter === "women"
        ? "Personal • Women"
        : "Personal",
    className: "border-[#34D399]/40 bg-[#34D399]/12 text-[#34D399]",
    Icon: User,
  };
}

export function ProfileTrackerWorkspace({
  requestedChapter = null,
  onConsumedRequestedChapter,
  onNavigateScanner,
  onProfileDataChanged,
}: ProfileTrackerWorkspaceProps) {
  const {
    user,
    profiles,
    activeProfile,
    activeProfileId,
    loading: authLoading,
    logout,
    openAuthModal,
    selectProfile,
    createProfile,
    updateProfile,
    removeProfile,
  } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>(todayLocalYmd);
  const [historyDays, setHistoryDays] = useState<7 | 30>(7);
  const [dashboard, setDashboard] = useState<ProfileDashboardData | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccountProfile | null>(null);
  const [modalDefaultChapter, setModalDefaultChapter] =
    useState<AudienceChapterId | null>(null);

  // Manual food entry state
  const [foodName, setFoodName] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [grams, setGrams] = useState("150");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [fibre, setFibre] = useState("0");
  const [foodSource, setFoodSource] = useState<FoodMeasurementSource>("manual");
  const [deviceId, setDeviceId] = useState("");
  const [foodSaving, setFoodSaving] = useState(false);

  // Hydration state
  const [waterMl, setWaterMl] = useState("250");
  const [waterNotes, setWaterNotes] = useState("");
  const [waterSource, setWaterSource] =
    useState<HydrationMeasurementSource>("manual");
  const [waterSaving, setWaterSaving] = useState(false);

  // Activity state
  const [activityType, setActivityType] = useState("Brisk Walk");
  const [activityMins, setActivityMins] = useState("30");
  const [activityIntensity, setActivityIntensity] = useState("moderate");
  const [activityNotes, setActivityNotes] = useState("");
  const [activitySaving, setActivitySaving] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const loadProfileDashboard = useCallback(async () => {
    if (!user || !activeProfileId) {
      setDashboard(null);
      return;
    }
    setLoadingDash(true);
    setDashError(null);
    try {
      const res = await fetchProfileDashboard({
        profileId: activeProfileId,
        date: selectedDate,
        days: historyDays,
      });
      setDashboard(res);
    } catch (err) {
      setDashError(
        err instanceof Error
          ? err.message
          : "Unable to load profile tracking data.",
      );
    } finally {
      setLoadingDash(false);
    }
  }, [user, activeProfileId, selectedDate, historyDays]);

  useEffect(() => {
    void loadProfileDashboard();
  }, [loadProfileDashboard]);

  // Handle deep launch from Four Audience Chapters while logged in
  useEffect(() => {
    if (!requestedChapter || !user) return;
    const match = profiles.find(
      (p) =>
        p.audience_chapter === requestedChapter ||
        (requestedChapter === "babies" && p.profile_type === "baby") ||
        (requestedChapter === "patients" && p.profile_type === "patient"),
    );
    if (match) {
      selectProfile(match.id);
    } else {
      setEditingProfile(null);
      setModalDefaultChapter(requestedChapter);
      setProfileModalOpen(true);
    }
    onConsumedRequestedChapter?.();
  }, [
    requestedChapter,
    user,
    profiles,
    selectProfile,
    onConsumedRequestedChapter,
  ]);

  async function handleSaveProfile(
    payload: AccountProfileCreate | AccountProfileUpdate,
    editingId?: number,
  ) {
    if (editingId) {
      await updateProfile(editingId, payload);
    } else {
      await createProfile(payload as AccountProfileCreate);
    }
    await loadProfileDashboard();
  }

  async function handleAddFood(e: FormEvent) {
    e.preventDefault();
    if (!activeProfileId || !foodName.trim()) return;
    setActionError(null);
    setFoodSaving(true);
    try {
      await createTrackedFoodEntry({
        profile_id: activeProfileId,
        meal_name: foodName.trim(),
        meal_type: mealType,
        measurement_source: foodSource,
        hardware_device_id: deviceId.trim() || null,
        total_portion_grams: Math.max(1, Number(grams) || 100),
        calories: Math.max(0, Number(calories) || 0),
        protein: Math.max(0, Number(protein) || 0),
        carbs: Math.max(0, Number(carbs) || 0),
        fats: Math.max(0, Number(fats) || 0),
        fibre: Math.max(0, Number(fibre) || 0),
        ingredients: [
          {
            name: foodName.trim(),
            portion_grams: Math.max(1, Number(grams) || 100),
            calories: Math.max(0, Number(calories) || 0),
            protein: Math.max(0, Number(protein) || 0),
            carbs: Math.max(0, Number(carbs) || 0),
            fats: Math.max(0, Number(fats) || 0),
            fibre: Math.max(0, Number(fibre) || 0),
            source_label:
              foodSource === "hardware" ? "Hardware Scale Input" : "Manual Entry",
          },
        ],
      });
      setFoodName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFats("");
      setFibre("0");
      await loadProfileDashboard();
      onProfileDataChanged?.();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to log food entry.",
      );
    } finally {
      setFoodSaving(false);
    }
  }

  async function handleQuickWater(amount: number) {
    if (!activeProfileId || amount <= 0) return;
    setActionError(null);
    setWaterSaving(true);
    try {
      await createHydrationEntry({
        profile_id: activeProfileId,
        amount_ml: amount,
        measurement_source: waterSource,
        hardware_device_id: waterSource === "hardware" ? deviceId.trim() || null : null,
        notes: waterNotes.trim() || null,
      });
      setWaterNotes("");
      await loadProfileDashboard();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to record hydration.",
      );
    } finally {
      setWaterSaving(false);
    }
  }

  async function handleAddActivity(e: FormEvent) {
    e.preventDefault();
    if (!activeProfileId || !activityType.trim()) return;
    setActionError(null);
    setActivitySaving(true);
    try {
      await createActivityEntry({
        profile_id: activeProfileId,
        activity_type: activityType.trim(),
        duration_minutes: Math.max(1, Math.round(Number(activityMins) || 15)),
        intensity: activityIntensity,
        notes: activityNotes.trim() || null,
      });
      setActivityNotes("");
      await loadProfileDashboard();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to record activity.",
      );
    } finally {
      setActivitySaving(false);
    }
  }

  const maxHistoryCalories = useMemo(() => {
    const list = dashboard?.daily_history ?? [];
    return Math.max(400, ...list.map((d) => d.calories));
  }, [dashboard]);

  if (authLoading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-white/[0.08] bg-[#121212] p-6 text-sm text-[#A1A1AA]">
        <Loader2 className="h-4 w-4 animate-spin text-[#A3FF12]" />
        <span>Verifying authenticated session...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-[#A3FF12]/25 bg-gradient-to-br from-[#121914] via-[#0F1310] to-[#0A0A0A] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/35 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <Lock className="h-3.5 w-3.5" />
              Protected Personalised Profiles
            </span>
            <h2 className="mt-2.5 font-display text-2xl font-extrabold text-white">
              Sign In for Multi-Profile Nutrition, Hydration &amp; Activity Logs
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#A1A1AA]">
              Create only the profiles you need — Personal, Baby, or Patient Care —
              with private PostgreSQL food logs, hydration timelines in mL, activity
              duration tracking, and optional custom targets.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => openAuthModal("login", null)}
              className="rounded-xl border border-white/15 bg-[#121212] px-4 py-2.5 text-xs font-semibold text-white transition hover:border-white/30"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => openAuthModal("register", null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-4 py-2.5 text-xs font-bold text-[#050706] shadow-[0_0_20px_rgba(163,255,18,0.22)] transition hover:bg-[#b8ff42]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Profile Switcher & Manager */}
      <section className="rounded-3xl border border-white/[0.08] bg-[#121212] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#34D399]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Authenticated Workspace • {user.full_name}
            </span>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-white">
              Personalised Profile Dashboard
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-xs text-zinc-300">
              <Calendar className="h-3.5 w-3.5 text-[#34D399]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || todayLocalYmd())}
                className="bg-transparent font-mono text-xs text-white focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setEditingProfile(null);
                setModalDefaultChapter(null);
                setProfileModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-3.5 py-2 text-xs font-bold text-[#050706] transition hover:bg-[#b8ff42]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Profile</span>
            </button>
          </div>
        </div>

        {/* Profile Selector Pills */}
        {profiles.length === 0 ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-[#A3FF12]/35 bg-[#090D0A] p-5">
            <div>
              <p className="font-display text-base font-bold text-white">
                No Profiles Created Yet
              </p>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Create your Personal, Baby, or Patient Care profile to start tracking meals, hydration mL, and daily activity.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingProfile(null);
                setModalDefaultChapter(null);
                setProfileModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-4 py-2.5 text-xs font-bold text-[#050706]"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create First Profile</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {profiles.map((p) => {
              const selected = p.id === activeProfile?.id;
              const badge = profileTypeBadge(p);
              const Icon = badge.Icon;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 transition ${
                    selected
                      ? "border-[#A3FF12]/60 bg-[#A3FF12]/10"
                      : "border-white/10 bg-[#080B09] hover:border-white/25"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectProfile(p.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        selected ? "text-[#A3FF12]" : "text-zinc-400"
                      }`}
                    />
                    <div>
                      <p className="text-xs font-bold text-white">{p.display_name}</p>
                      <span
                        className={`inline-block rounded-full border px-1.5 py-0 text-[10px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </button>

                  {selected && (
                    <div className="ml-1 flex items-center gap-1 border-l border-white/10 pl-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProfile(p);
                          setProfileModalOpen(true);
                        }}
                        title="Edit profile details & optional goals"
                        className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete profile "${p.display_name}" and its tracked logs?`,
                            )
                          ) {
                            void removeProfile(p.id);
                          }
                        }}
                        title="Delete profile"
                        className="rounded-lg p-1 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-[11px] text-zinc-400">
          <span>
            Cross-device PostgreSQL sync active for profiles, food scans, hydration, activity, cycle records, meal plans &amp; grocery lists.
          </span>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  `Permanently delete your account (${user.email}) and ALL associated profiles, logs, cycle data, and uploaded photos? This cannot be undone.`,
                )
              ) {
                void deleteOwnAccount().then(() => logout());
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete Account &amp; Data</span>
          </button>
        </div>
      </section>

      {actionError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
          {actionError}
        </div>
      )}

      {dashError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
          {dashError}
        </div>
      )}

      {activeProfile && (
        <>
          {/* Evidence-Based Safety, Allergies & Condition Context */}
          {dashboard?.safety_context && (
            <section className="rounded-3xl border border-white/[0.08] bg-[#0F1310] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#34D399]">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Evidence-Based Profile Safeguards
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-0.5 font-mono text-[10px] text-zinc-400">
                      <Cpu className="h-3 w-3 text-[#A3FF12]" />
                      ESP32 / HX711 Hardware Schema Ready (Manual / AI Scan Active)
                    </span>
                  </div>
                  <p className="text-xs text-[#B4BEB7]">
                    {dashboard.safety_context.non_diagnostic_notice}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {dashboard.safety_context.recorded_allergies.map((allergy) => (
                    <span
                      key={allergy}
                      className="rounded-full border border-rose-400/40 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200"
                    >
                      Allergy Exclusion: {allergy}
                    </span>
                  ))}
                  {dashboard.safety_context.recorded_conditions.map((cond) => (
                    <span
                      key={cond}
                      className="rounded-full border border-amber-400/35 bg-amber-500/12 px-2.5 py-1 text-[11px] font-medium text-amber-200"
                    >
                      Care Awareness: {cond}
                    </span>
                  ))}
                </div>
              </div>

              {dashboard.safety_context.choking_or_infant_alerts.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {dashboard.safety_context.choking_or_infant_alerts.map((alert) => (
                    <div
                      key={alert}
                      className="flex items-start gap-2 rounded-2xl border border-amber-400/25 bg-black/45 p-3 text-[11px] text-amber-100"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Profile Nutrition, Hydration & Activity KPI Summary */}
          {loadingDash && !dashboard ? (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-28 animate-pulse rounded-2xl border border-white/[0.06] bg-[#121212]"
                />
              ))}
            </div>
          ) : (
            dashboard && (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    {
                      label: "Calories",
                      value: dashboard.nutrition_summary.calories,
                      unit: " kcal",
                      goal: dashboard.profile.calorie_goal,
                      accent: "text-[#A3FF12]",
                    },
                    {
                      label: "Protein",
                      value: dashboard.nutrition_summary.protein,
                      unit: "g",
                      goal: dashboard.profile.protein_goal,
                      accent: "text-[#34D399]",
                    },
                    {
                      label: "Carbs",
                      value: dashboard.nutrition_summary.carbs,
                      unit: "g",
                      goal: dashboard.profile.carbs_goal,
                      accent: "text-emerald-300",
                    },
                    {
                      label: "Fats",
                      value: dashboard.nutrition_summary.fats,
                      unit: "g",
                      goal: dashboard.profile.fats_goal,
                      accent: "text-lime-200",
                    },
                    {
                      label: "Fibre",
                      value: dashboard.nutrition_summary.fibre,
                      unit: "g",
                      goal: dashboard.profile.fibre_goal,
                      accent: "text-teal-300",
                    },
                    {
                      label: "Hydration",
                      value: dashboard.hydration_summary.total_ml,
                      unit: " mL",
                      goal: dashboard.profile.water_goal_ml,
                      accent: "text-cyan-300",
                    },
                  ].map((metric) => {
                    const remaining =
                      metric.goal !== null
                        ? Math.max(0, Math.round(metric.goal - metric.value))
                        : null;
                    return (
                      <div
                        key={metric.label}
                        className="rounded-2xl border border-white/[0.08] bg-[#121212] p-4"
                      >
                        <p className="text-xs text-[#A1A1AA]">{metric.label}</p>
                        <p
                          className={`mt-2 font-mono text-2xl font-bold tabular-nums ${metric.accent}`}
                        >
                          <AnimatedNumber
                            value={metric.value}
                            decimals={metric.unit === "g" ? 1 : 0}
                            suffix={metric.unit}
                          />
                        </p>
                        {metric.goal !== null ? (
                          <p className="mt-1 font-mono text-[11px] text-zinc-400">
                            {remaining}
                            {metric.unit} remaining of {Math.round(metric.goal)}
                          </p>
                        ) : (
                          <p className="mt-1 text-[10px] text-zinc-500">
                            Actual intake logged
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Micronutrients Strip + Active Minutes */}
                <div className="grid gap-4 rounded-2xl border border-white/[0.07] bg-[#0B0E0C] p-4 sm:grid-cols-5">
                  <div>
                    <p className="text-[11px] text-zinc-400">Active Movement</p>
                    <p className="mt-1 font-mono text-base font-bold text-[#A3FF12]">
                      {dashboard.activity_summary.total_minutes} min
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400">Calcium / Iron</p>
                    <p className="mt-1 font-mono text-xs font-semibold text-zinc-200">
                      {dashboard.nutrition_summary.calcium_mg} mg /{" "}
                      {dashboard.nutrition_summary.iron_mg} mg
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400">Vitamin C / Potassium</p>
                    <p className="mt-1 font-mono text-xs font-semibold text-zinc-200">
                      {dashboard.nutrition_summary.vitamin_c_mg} mg /{" "}
                      {dashboard.nutrition_summary.potassium_mg} mg
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400">Sugar / Sodium</p>
                    <p className="mt-1 font-mono text-xs font-semibold text-zinc-200">
                      {dashboard.nutrition_summary.sugar} g /{" "}
                      {dashboard.nutrition_summary.sodium_mg} mg
                    </p>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={onNavigateScanner}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#A3FF12]/40 bg-[#A3FF12]/10 px-3 py-2 text-xs font-bold text-[#A3FF12] transition hover:bg-[#A3FF12]/20"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Scan Food for {activeProfile.display_name}</span>
                    </button>
                  </div>
                </div>

                {/* 3 Interactive Loggers: Food (Manual/Hardware-Ready), Hydration (mL), Physical Activity */}
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* 1. Food Entry & History */}
                  <div className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#121212] p-5">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-display text-base font-bold text-white">
                          <Utensils className="h-4 w-4 text-[#A3FF12]" />
                          <span>Log Food Intake</span>
                        </h3>
                        <span className="font-mono text-[11px] text-zinc-500">
                          {dashboard.recent_foods.length} entries
                        </span>
                      </div>

                      <form
                        onSubmit={(e) => void handleAddFood(e)}
                        className="mt-3 space-y-2.5"
                      >
                        <input
                          type="text"
                          required
                          value={foodName}
                          onChange={(e) => setFoodName(e.target.value)}
                          placeholder="Dish / food name (e.g. Oats + Milk)"
                          className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-xs text-white"
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={mealType}
                            onChange={(e) => setMealType(e.target.value)}
                            className="rounded-xl border border-white/10 bg-[#070A08] px-2 py-2 text-xs text-white"
                          >
                            <option value="breakfast">Breakfast</option>
                            <option value="lunch">Lunch</option>
                            <option value="dinner">Dinner</option>
                            <option value="snack">Snack</option>
                          </select>
                          <input
                            type="number"
                            min={1}
                            value={grams}
                            onChange={(e) => setGrams(e.target.value)}
                            placeholder="Grams (g)"
                            className="rounded-xl border border-white/10 bg-[#070A08] px-2.5 py-2 text-xs text-white"
                          />
                          <select
                            value={foodSource}
                            onChange={(e) =>
                              setFoodSource(e.target.value as FoodMeasurementSource)
                            }
                            className="rounded-xl border border-white/10 bg-[#070A08] px-2 py-2 text-xs text-zinc-300"
                          >
                            <option value="manual">Manual g</option>
                            <option value="hardware">Hardware Tag</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5">
                          <input
                            type="number"
                            min={0}
                            required
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                            placeholder="kcal"
                            className="rounded-lg border border-white/10 bg-[#070A08] px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            type="number"
                            min={0}
                            step="0.1"
                            value={protein}
                            onChange={(e) => setProtein(e.target.value)}
                            placeholder="Pro g"
                            className="rounded-lg border border-white/10 bg-[#070A08] px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            type="number"
                            min={0}
                            step="0.1"
                            value={carbs}
                            onChange={(e) => setCarbs(e.target.value)}
                            placeholder="Carb g"
                            className="rounded-lg border border-white/10 bg-[#070A08] px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            type="number"
                            min={0}
                            step="0.1"
                            value={fats}
                            onChange={(e) => setFats(e.target.value)}
                            placeholder="Fat g"
                            className="rounded-lg border border-white/10 bg-[#070A08] px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            type="number"
                            min={0}
                            step="0.1"
                            value={fibre}
                            onChange={(e) => setFibre(e.target.value)}
                            placeholder="Fib g"
                            className="rounded-lg border border-white/10 bg-[#070A08] px-2 py-1.5 text-[11px] text-white"
                          />
                        </div>

                        {foodSource === "hardware" && (
                          <input
                            type="text"
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value)}
                            placeholder="Optional Hardware Device ID (e.g. hx711-scale-01)"
                            className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-1.5 text-[11px] text-zinc-200"
                          />
                        )}

                        <button
                          type="submit"
                          disabled={foodSaving}
                          className="w-full rounded-xl bg-[#A3FF12] py-2 text-xs font-bold text-[#050706] hover:bg-[#b8ff42] disabled:opacity-50"
                        >
                          {foodSaving ? "Saving..." : "+ Add Food Entry"}
                        </button>
                      </form>
                    </div>

                    <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {dashboard.recent_foods.length === 0 ? (
                        <li className="rounded-xl border border-dashed border-white/10 p-3 text-center text-[11px] text-zinc-500">
                          No meals logged on {selectedDate}. Scan a dish or add grams manually.
                        </li>
                      ) : (
                        dashboard.recent_foods.map((entry) => (
                          <li
                            key={entry.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#080B09] px-3 py-2 text-xs"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              {entry.image_ref && (
                                <img
                                  src={`${API_BASE_URL}${entry.image_ref}`}
                                  alt={entry.meal_name}
                                  className="h-9 w-9 shrink-0 rounded-lg border border-white/10 object-cover"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-white">
                                  {entry.meal_name}
                                </p>
                                <p className="font-mono text-[10px] text-zinc-400">
                                  {Math.round(entry.total_portion_grams)}g •{" "}
                                  {Math.round(entry.calories)} kcal • P {entry.protein}g •{" "}
                                  <span className="text-[#34D399]">
                                    {entry.measurement_source}
                                    {entry.confirmed_by_user ? " (confirmed)" : " (est.)"}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                void deleteTrackedFoodEntry(entry.id).then(
                                  loadProfileDashboard,
                                )
                              }
                              aria-label={`Delete ${entry.meal_name}`}
                              className="rounded-lg p-1 text-zinc-500 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  {/* 2. Hydration Logger & Timeline */}
                  <div className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#121212] p-5">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-display text-base font-bold text-white">
                          <Droplets className="h-4 w-4 text-cyan-300" />
                          <span>Hydration (mL)</span>
                        </h3>
                        <span className="font-mono text-xs font-bold text-cyan-300">
                          {Math.round(dashboard.hydration_summary.total_ml)} mL today
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {[150, 250, 500].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            disabled={waterSaving}
                            onClick={() => void handleQuickWater(preset)}
                            className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 py-2 font-mono text-xs font-bold text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-50"
                          >
                            +{preset} mL
                          </button>
                        ))}
                      </div>

                      <div className="mt-2.5 flex gap-2">
                        <input
                          type="number"
                          min={1}
                          max={5000}
                          value={waterMl}
                          onChange={(e) => setWaterMl(e.target.value)}
                          placeholder="Custom mL"
                          className="w-28 rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-xs text-white"
                        />
                        <select
                          value={waterSource}
                          onChange={(e) =>
                            setWaterSource(e.target.value as HydrationMeasurementSource)
                          }
                          className="rounded-xl border border-white/10 bg-[#070A08] px-2 py-2 text-xs text-zinc-300"
                        >
                          <option value="manual">Manual</option>
                          <option value="hardware">Hardware Tag</option>
                        </select>
                        <button
                          type="button"
                          disabled={waterSaving}
                          onClick={() => void handleQuickWater(Number(waterMl) || 0)}
                          className="flex-1 rounded-xl bg-[#34D399] px-3 py-2 text-xs font-bold text-[#050706] hover:bg-emerald-300 disabled:opacity-50"
                        >
                          Log Water
                        </button>
                      </div>

                      <input
                        type="text"
                        value={waterNotes}
                        onChange={(e) => setWaterNotes(e.target.value)}
                        placeholder="Optional note (e.g. Morning electrolyte)"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-1.5 text-[11px] text-white"
                      />
                    </div>

                    <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {dashboard.hydration_entries.length === 0 ? (
                        <li className="rounded-xl border border-dashed border-white/10 p-3 text-center text-[11px] text-zinc-500">
                          No hydration logged on {selectedDate}.
                        </li>
                      ) : (
                        dashboard.hydration_entries.map((entry) => (
                          <li
                            key={entry.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#080B09] px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-mono font-semibold text-cyan-200">
                                {Math.round(entry.amount_ml)} mL{" "}
                                <span className="text-[10px] font-normal text-zinc-400">
                                  ({entry.measurement_source})
                                </span>
                              </p>
                              <p className="truncate text-[10px] text-zinc-500">
                                {new Date(entry.logged_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {entry.notes ? ` • ${entry.notes}` : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                void deleteHydrationEntry(entry.id).then(
                                  loadProfileDashboard,
                                )
                              }
                              aria-label="Delete hydration entry"
                              className="rounded-lg p-1 text-zinc-500 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  {/* 3. Physical Activity Tracker */}
                  <div className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#121212] p-5">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-display text-base font-bold text-white">
                          <Activity className="h-4 w-4 text-[#A3FF12]" />
                          <span>Activity &amp; Movement</span>
                        </h3>
                        <span className="font-mono text-xs font-bold text-[#A3FF12]">
                          {dashboard.activity_summary.total_minutes} min
                        </span>
                      </div>

                      <form
                        onSubmit={(e) => void handleAddActivity(e)}
                        className="mt-3 space-y-2.5"
                      >
                        <input
                          type="text"
                          required
                          value={activityType}
                          onChange={(e) => setActivityType(e.target.value)}
                          placeholder="Activity (e.g. Walk, Strength, Yoga)"
                          className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-xs text-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min={1}
                            max={1440}
                            value={activityMins}
                            onChange={(e) => setActivityMins(e.target.value)}
                            placeholder="Minutes"
                            className="rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-xs text-white"
                          />
                          <select
                            value={activityIntensity}
                            onChange={(e) => setActivityIntensity(e.target.value)}
                            className="rounded-xl border border-white/10 bg-[#070A08] px-2 py-2 text-xs text-white"
                          >
                            <option value="light">Light</option>
                            <option value="moderate">Moderate</option>
                            <option value="vigorous">Vigorous</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={activityNotes}
                          onChange={(e) => setActivityNotes(e.target.value)}
                          placeholder="Optional notes (e.g. Post-dinner walk)"
                          className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-1.5 text-[11px] text-white"
                        />
                        <button
                          type="submit"
                          disabled={activitySaving}
                          className="w-full rounded-xl border border-[#A3FF12]/40 bg-[#A3FF12]/15 py-2 text-xs font-bold text-[#A3FF12] hover:bg-[#A3FF12]/25 disabled:opacity-50"
                        >
                          {activitySaving ? "Saving..." : "+ Log Activity"}
                        </button>
                      </form>
                    </div>

                    <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {dashboard.activity_entries.length === 0 ? (
                        <li className="rounded-xl border border-dashed border-white/10 p-3 text-center text-[11px] text-zinc-500">
                          No activity recorded on {selectedDate}.
                        </li>
                      ) : (
                        dashboard.activity_entries.map((entry) => (
                          <li
                            key={entry.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#080B09] px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">
                                {entry.activity_type}
                              </p>
                              <p className="font-mono text-[10px] text-zinc-400">
                                {entry.duration_minutes} min • {entry.intensity || "moderate"}
                                {entry.notes ? ` • ${entry.notes}` : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                void deleteActivityEntry(entry.id).then(
                                  loadProfileDashboard,
                                )
                              }
                              aria-label="Delete activity entry"
                              className="rounded-lg p-1 text-zinc-500 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>

                {/* Date-Wise Daily History & Multi-Metric Trends */}
                <section className="rounded-3xl border border-white/[0.08] bg-[#121212] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">
                        Date-Wise History &amp; Daily Trends
                      </h3>
                      <p className="text-xs text-[#A1A1AA]">
                        Daily nutrition, hydration (mL), and movement minutes for{" "}
                        {activeProfile.display_name}.
                      </p>
                    </div>
                    <div className="flex rounded-xl border border-white/10 bg-[#070A08] p-1">
                      {([7, 30] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setHistoryDays(d)}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                            historyDays === d
                              ? "bg-[#A3FF12] text-[#050706]"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {d} Days
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-[11px] text-zinc-400">
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Calories</th>
                          <th className="py-2 pr-3">Protein / Fibre</th>
                          <th className="py-2 pr-3">Water</th>
                          <th className="py-2 pr-3">Activity</th>
                          <th className="py-2">Calorie Trend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {[...dashboard.daily_history].reverse().map((day) => {
                          const barPct =
                            day.calories > 0
                              ? Math.max(
                                  6,
                                  Math.round((day.calories / maxHistoryCalories) * 100),
                                )
                              : 0;
                          const isSelectedDay = day.date === selectedDate;
                          return (
                            <tr
                              key={day.date}
                              onClick={() => setSelectedDate(day.date)}
                              className={`cursor-pointer transition hover:bg-white/[0.03] ${
                                isSelectedDay ? "bg-[#A3FF12]/[0.05]" : ""
                              }`}
                            >
                              <td className="py-2.5 pr-3 font-mono font-semibold text-white">
                                {day.date}
                              </td>
                              <td className="py-2.5 pr-3 font-mono text-[#A3FF12]">
                                {Math.round(day.calories)} kcal ({day.meal_count})
                              </td>
                              <td className="py-2.5 pr-3 font-mono text-[#34D399]">
                                {day.protein}g P / {day.fibre}g Fib
                              </td>
                              <td className="py-2.5 pr-3 font-mono text-cyan-300">
                                {Math.round(day.water_ml)} mL
                              </td>
                              <td className="py-2.5 pr-3 font-mono text-zinc-200">
                                {day.activity_minutes} min
                              </td>
                              <td className="w-40 py-2.5">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${barPct}%` }}
                                    transition={{ duration: 0.4, ease: EASE_PREMIUM }}
                                    className="h-full rounded-full bg-gradient-to-r from-[#34D399] to-[#A3FF12]"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )
          )}
        </>
      )}

      <ProfileFormModal
        open={profileModalOpen}
        editingProfile={editingProfile}
        defaultChapter={modalDefaultChapter}
        onClose={() => setProfileModalOpen(false)}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
