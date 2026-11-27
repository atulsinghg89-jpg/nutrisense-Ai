import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Download,
  Flower2,
  History,
  Info,
  Loader2,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  calculateAndSaveBmiEstimate,
  recordWomensConsent,
  withdrawWomensConsent,
} from "../../lib/api";
import type {
  AccountProfile,
  BmiHistoryEntry,
  ConsentEvent,
  ConsentType,
  WomensSummaryData,
} from "../../types/nutrition";

interface WomenOnboardingProfileProps {
  profile: AccountProfile | null;
  profileId: number | null;
  summary: WomensSummaryData | null;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onSavePreferences: (payload: {
    consent_given?: boolean;
    tracking_enabled?: boolean;
    reminders_enabled?: boolean;
    typical_cycle_length?: number;
    typical_period_days?: number;
    age_band?: string | null;
    dietary_preferences?: string[];
    activity_preferences?: string[];
    optional_goals?: string[];
    bmi_consent_given?: boolean;
    height_cm?: number | null;
    weight_kg?: number | null;
    clear_bmi_metrics?: boolean;
  }) => Promise<void>;
  onRefreshSummary: () => Promise<void>;
  onExportData: () => Promise<void>;
  onDeleteAllData: () => Promise<void>;
  onNotify: (msg: string) => void;
}

const AGE_BAND_OPTIONS = [
  "Prefer not to say",
  "13–17 (Youth / Teen)",
  "18–25 (Young Adult / College)",
  "26–35",
  "36–45",
  "46+",
];

const DIETARY_CHIPS = [
  "Vegetarian",
  "Non-Vegetarian",
  "Eggetarian",
  "Lactose-Friendly",
  "Iron-Focused Plates",
  "Quick College / Work Meals",
];

const ACTIVITY_CHIPS = [
  "Gentle Walking",
  "Home Yoga & Stretching",
  "Beginner Strength",
  "Low-Impact Cardio",
  "Rest & Recovery Days",
];

const GOAL_CHIPS = [
  "Balanced everyday energy",
  "Comfort during periods",
  "Better hydration habits",
  "Gentle bone & muscle strength",
  "Restorative sleep rhythm",
  "Cycle pattern awareness",
];

const CONSENT_LABELS: Record<ConsentType, { title: string; desc: string }> = {
  wellness_profile: {
    title: "Wellness Profile Personalization",
    desc: "Stores your dietary style, optional goals, and movement preferences.",
  },
  period_tracking: {
    title: "Optional Cycle & Comfort Journal",
    desc: "Stores dates, flow, symptoms, and mood privately for your account only.",
  },
  bmi_screening: {
    title: "Optional BMI Context History",
    desc: "Saves when and from which height/weight a screening calculation ran.",
  },
  reminders: {
    title: "Optional Soft Reminders",
    desc: "Enables informational period estimate display inside your sanctuary.",
  },
};

export function WomenOnboardingProfile({
  profile,
  profileId,
  summary,
  isAuthenticated,
  onOpenAuth,
  onSavePreferences,
  onRefreshSummary,
  onExportData,
  onDeleteAllData,
  onNotify,
}: WomenOnboardingProfileProps) {
  const [ageBand, setAgeBand] = useState("Prefer not to say");
  const [cycleLength, setCycleLength] = useState("28");
  const [periodDays, setPeriodDays] = useState("5");
  const [dietPrefs, setDietPrefs] = useState<string[]>([]);
  const [activityPrefs, setActivityPrefs] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);

  // Optional BMI state
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [bmiConsentChecked, setBmiConsentChecked] = useState(false);

  const [savingPref, setSavingPref] = useState(false);
  const [savingBmi, setSavingBmi] = useState(false);
  const [consentBusy, setConsentBusy] = useState<string | null>(null);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!summary) return;
    const p = summary.preferences;
    setAgeBand(p.age_band || "Prefer not to say");
    setCycleLength(String(p.typical_cycle_length ?? 28));
    setPeriodDays(String(p.typical_period_days ?? 5));
    setDietPrefs(p.dietary_preferences ?? []);
    setActivityPrefs(p.activity_preferences ?? []);
    setGoals(p.optional_goals ?? []);
    setBmiConsentChecked(Boolean(p.bmi_consent_given));
    setHeightInput(p.height_cm != null ? String(p.height_cm) : "");
    setWeightInput(p.weight_kg != null ? String(p.weight_kg) : "");
  }, [summary, profile]);

  function toggleChip(
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    setter((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value],
    );
  }

  async function handleSaveOnboarding(e: FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    setSavingPref(true);
    setLocalMsg(null);
    try {
      await onSavePreferences({
        consent_given: true,
        age_band: ageBand === "Prefer not to say" ? null : ageBand,
        typical_cycle_length: Math.max(20, Math.min(45, Number(cycleLength) || 28)),
        typical_period_days: Math.max(2, Math.min(12, Number(periodDays) || 5)),
        dietary_preferences: dietPrefs,
        activity_preferences: activityPrefs,
        optional_goals: goals,
      });
      if (profileId) {
        await recordWomensConsent({
          profile_id: profileId,
          consent_type: "wellness_profile",
          consent_status: "granted",
        });
        await onRefreshSummary();
      }
      setLocalMsg("Saved smoothly to your encrypted PostgreSQL profile.");
      onNotify("Women's Wellness preferences updated.");
    } finally {
      setSavingPref(false);
    }
  }

  async function handleCalculateBmi(e: FormEvent) {
    e.preventDefault();
    if (!isAuthenticated || !profileId) {
      onOpenAuth();
      return;
    }
    const h = Number(heightInput);
    const w = Number(weightInput);
    if (!Number.isFinite(h) || h < 50 || h > 250 || !Number.isFinite(w) || w < 10 || w > 350) {
      setLocalMsg("Please enter realistic optional height (cm) and weight (kg) or skip BMI.");
      return;
    }
    if (!bmiConsentChecked) {
      setLocalMsg("Check the consent box first to store optional BMI calculation history.");
      return;
    }
    setSavingBmi(true);
    setLocalMsg(null);
    try {
      await calculateAndSaveBmiEstimate({
        profile_id: profileId,
        height_cm: h,
        weight_kg: w,
        consent_confirmed: true,
      });
      await onRefreshSummary();
      onNotify("Supportive BMI context recorded with provenance timestamp.");
    } finally {
      setSavingBmi(false);
    }
  }

  async function handleConsentAction(type: ConsentType, currentlyGranted: boolean, latestId?: number) {
    if (!profileId) return;
    setConsentBusy(type);
    try {
      if (currentlyGranted && latestId) {
        await withdrawWomensConsent(latestId);
        if (type === "period_tracking") {
          await onSavePreferences({ tracking_enabled: false });
        } else if (type === "bmi_screening") {
          await onSavePreferences({ clear_bmi_metrics: true });
        }
        onNotify(`Consent withdrawn for ${CONSENT_LABELS[type].title}.`);
      } else {
        await recordWomensConsent({
          profile_id: profileId,
          consent_type: type,
          consent_status: "granted",
        });
        if (type === "period_tracking") {
          await onSavePreferences({ consent_given: true, tracking_enabled: true });
        }
        onNotify(`Consent granted for ${CONSENT_LABELS[type].title}.`);
      }
      await onRefreshSummary();
    } finally {
      setConsentBusy(null);
    }
  }

  const latestConsentByType = new Map<string, ConsentEvent>();
  for (const c of summary?.consents ?? []) {
    if (!latestConsentByType.has(c.consent_type)) {
      latestConsentByType.set(c.consent_type, c);
    }
  }

  const bmiHistory: BmiHistoryEntry[] = summary?.bmi_history ?? [];

  return (
    <div className="space-y-6">
      {/* Gentle Onboarding Banner */}
      <div className="rounded-3xl border border-[#ebd4dc] bg-[#fff8fa] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6c5ce] bg-white px-3 py-1 text-xs font-semibold text-[#9b3d57]">
              <Flower2 className="h-3.5 w-3.5" />
              My Wellness Profile • Reuses Your NutriSense Account
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-[#2d1a24] sm:text-3xl">
              Hey there! Let&apos;s personalize your wellness experience.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#644a57]">
              Share only what feels comfortable — you can skip any step, edit details later, or
              withdraw permission anytime. Your core NutriSense account (name, allergies, conditions)
              is automatically reused with zero duplicate signups.
            </p>
          </div>

          {!isAuthenticated && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#9b3d57] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#842f48]"
            >
              <Lock className="h-4 w-4" />
              Sign In to Save Privately
            </button>
          )}
        </div>

        {/* Reusable Core Identity Card */}
        {profile && (
          <div className="mt-5 grid gap-3 rounded-2xl border border-[#f0dce2] bg-white p-4 text-xs sm:grid-cols-4">
            <div>
              <p className="font-semibold text-[#8c6e7b]">Active Profile</p>
              <p className="mt-0.5 font-bold text-[#2d1a24]">{profile.display_name}</p>
            </div>
            <div>
              <p className="font-semibold text-[#8c6e7b]">Recorded Age</p>
              <p className="mt-0.5 font-bold text-[#2d1a24]">
                {profile.age_years != null ? `${profile.age_years} yrs` : "Not set (optional)"}
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#8c6e7b]">Known Allergies</p>
              <p className="mt-0.5 font-medium text-[#3f6f52]">
                {profile.allergies.length > 0 ? profile.allergies.join(", ") : "None recorded"}
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#8c6e7b]">Health Context</p>
              <p className="mt-0.5 font-medium text-[#4a3240]">
                {profile.health_conditions.length > 0
                  ? profile.health_conditions.join(", ")
                  : "None added"}
              </p>
            </div>
          </div>
        )}
      </div>

      {localMsg && (
        <div className="rounded-2xl border border-[#cde2d4] bg-[#eef6f1] px-4 py-3 text-xs font-semibold text-[#2b5239]">
          {localMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Personal Preferences Form */}
        <form
          onSubmit={handleSaveOnboarding}
          className="space-y-5 rounded-3xl border border-[#ebd4dc] bg-white p-6 lg:col-span-7"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold text-[#2d1a24]">
              <Sparkles className="h-5 w-5 text-[#9b3d57]" />
              Lifestyle, Food &amp; Cycle Preferences
            </h3>
            <span className="rounded-full bg-[#fdf0f4] px-2.5 py-1 text-[10px] font-semibold text-[#9b3d57]">
              All fields optional
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-[#5d4250]">
              Age Band (Optional)
              <select
                value={ageBand}
                onChange={(e) => setAgeBand(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
              >
                {AGE_BAND_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-[#5d4250]">
              Typical Cycle Days
              <input
                type="number"
                min={20}
                max={45}
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
              />
            </label>

            <label className="block text-xs font-semibold text-[#5d4250]">
              Typical Period Days
              <input
                type="number"
                min={2}
                max={12}
                value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#5d4250]">Dietary Preferences</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIETARY_CHIPS.map((chip) => {
                const active = dietPrefs.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleChip(chip, setDietPrefs)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-[#9b3d57] text-white"
                        : "border border-[#ebd4dc] bg-[#fff8fa] text-[#5d4250] hover:bg-[#fdf0f4]"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#5d4250]">Movement &amp; Fitness Comfort</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACTIVITY_CHIPS.map((chip) => {
                const active = activityPrefs.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleChip(chip, setActivityPrefs)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-[#3f6f52] text-white"
                        : "border border-[#d8e6dc] bg-[#f7fbf8] text-[#3f5d49] hover:bg-[#edf5ef]"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#5d4250]">Supportive Focus Areas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {GOAL_CHIPS.map((chip) => {
                const active = goals.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleChip(chip, setGoals)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-[#7d5b96] text-white"
                        : "border border-[#e3d8ee] bg-[#faf7fd] text-[#5c4570] hover:bg-[#f2eaf9]"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={savingPref}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#9b3d57] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#842f48] disabled:opacity-60"
            >
              {savingPref ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Preferences
            </button>

            <button
              type="button"
              onClick={onExportData}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[#e6c5ce] bg-white px-4 py-2.5 text-xs font-semibold text-[#5d4250] hover:bg-[#fff5f7]"
            >
              <Download className="h-3.5 w-3.5" />
              Export My Data (JSON)
            </button>

            <button
              type="button"
              onClick={onDeleteAllData}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Women&apos;s Data
            </button>
          </div>
        </form>

        {/* Right: Consent Audit Trail & Optional BMI Screening */}
        <div className="space-y-6 lg:col-span-5">
          {/* Consent Management */}
          <div className="rounded-3xl border border-[#ebd4dc] bg-white p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-[#2d1a24]">
              <ShieldCheck className="h-5 w-5 text-[#3f6f52]" />
              Granular Consent &amp; Withdrawal
            </h3>
            <p className="mt-1 text-xs text-[#6c525f]">
              Every sensitive tracker asks consent separately and keeps a timestamped audit log.
            </p>

            <div className="mt-4 space-y-2.5">
              {(Object.keys(CONSENT_LABELS) as ConsentType[]).map((cType) => {
                const latest = latestConsentByType.get(cType);
                const granted = latest?.consent_status === "granted";
                return (
                  <div
                    key={cType}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#f0dce2] bg-[#fffaf8] p-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#2d1a24]">{CONSENT_LABELS[cType].title}</p>
                      <p className="mt-0.5 text-[11px] text-[#6f5762]">{CONSENT_LABELS[cType].desc}</p>
                      {latest && (
                        <p className="mt-1 text-[10px] font-medium text-[#3f6f52]">
                          {granted
                            ? `Granted ${new Date(latest.consented_at).toLocaleDateString()}`
                            : "Withdrawn"}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!isAuthenticated || consentBusy === cType}
                      onClick={() => handleConsentAction(cType, granted, latest?.id)}
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                        granted
                          ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "bg-[#3f6f52] text-white hover:bg-[#325941]"
                      } disabled:opacity-50`}
                    >
                      {consentBusy === cType ? "..." : granted ? "Withdraw" : "Grant"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional Non-Prescriptive BMI Context */}
          <form
            onSubmit={handleCalculateBmi}
            className="space-y-4 rounded-3xl border border-[#ebd4dc] bg-white p-6"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-[#2d1a24]">
                <Scale className="h-5 w-5 text-[#7d5b96]" />
                Optional BMI Screening Context
              </h3>
              <span className="rounded-full bg-[#f5effa] px-2.5 py-0.5 text-[10px] font-semibold text-[#5e4078]">
                Skippable
              </span>
            </div>

            <div className="rounded-2xl border border-[#e3d8ee] bg-[#faf7fd] p-3 text-[11px] leading-relaxed text-[#523d66]">
              <p className="flex items-center gap-1 font-bold">
                <Info className="h-3.5 w-3.5" />
                Gentle &amp; Non-Prescriptive Science
              </p>
              <p className="mt-1">
                Ages &lt;18 automatically use sex- and age-specific{" "}
                <strong>CDC BMI-for-Age Percentiles</strong> — fixed adult BMI cutoffs or diet/weight
                targets are never applied to minors. BMI never measures muscle, bone, or overall worth.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-[#5d4250]">
                Height (cm)
                <input
                  type="number"
                  step="0.1"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
                />
              </label>

              <label className="text-xs font-semibold text-[#5d4250]">
                Weight (kg)
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
                />
              </label>
            </div>

            <label className="flex items-start gap-2 text-[11px] text-[#5d4250]">
              <input
                type="checkbox"
                checked={bmiConsentChecked}
                onChange={(e) => setBmiConsentChecked(e.target.checked)}
                className="mt-0.5 rounded accent-[#9b3d57]"
              />
              <span>
                I consent to compute and save when this optional screening context was calculated
                from these profile inputs.
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={savingBmi}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#7d5b96] px-4 py-2 text-xs font-bold text-white hover:bg-[#694980] disabled:opacity-50"
              >
                {savingBmi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scale className="h-3.5 w-3.5" />}
                View BMI Context
              </button>

              <button
                type="button"
                onClick={() => onSavePreferences({ clear_bmi_metrics: true })}
                className="rounded-xl border border-[#ebd4dc] px-3 py-2 text-xs font-semibold text-[#6f5762] hover:bg-[#fdf0f4]"
              >
                Clear Metrics
              </button>
            </div>

            {/* BMI Provenance History */}
            {bmiHistory.length > 0 && (
              <div className="space-y-2 border-t border-[#f0dce2] pt-3">
                <p className="flex items-center gap-1 text-[11px] font-bold text-[#5d4250]">
                  <History className="h-3.5 w-3.5 text-[#7d5b96]" />
                  Recent BMI Screening Log (With Provenance)
                </p>
                {bmiHistory.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-[#f0dce2] bg-[#fffaf8] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#2d1a24]">{entry.headline}</span>
                      <span className="text-[10px] text-[#7a5d69]">
                        {new Date(entry.calculated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#5d4250]">{entry.context_note}</p>
                    <p className="mt-1 font-mono text-[10px] text-[#8c6e7b]">
                      Inputs used: {entry.height_cm_used} cm, {entry.weight_kg_used} kg
                      {entry.age_years_used != null ? `, age ${entry.age_years_used}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
