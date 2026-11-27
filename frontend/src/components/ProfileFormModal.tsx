import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert, X } from "lucide-react";
import type {
  AccountProfile,
  AccountProfileCreate,
  AccountProfileType,
  AccountProfileUpdate,
  AudienceChapterId,
} from "../types/nutrition";
import { EASE_PREMIUM } from "./MotionPrimitives";

interface ProfileFormModalProps {
  open: boolean;
  editingProfile: AccountProfile | null;
  defaultChapter?: AudienceChapterId | null;
  onClose: () => void;
  onSave: (
    payload: AccountProfileCreate | AccountProfileUpdate,
    editingId?: number,
  ) => Promise<void>;
}

function parseCommaTags(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProfileFormModal({
  open,
  editingProfile,
  defaultChapter = null,
  onClose,
  onSave,
}: ProfileFormModalProps) {
  const [profileType, setProfileType] = useState<AccountProfileType>("personal");
  const [audienceChapter, setAudienceChapter] = useState<AudienceChapterId>("men");
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("vegetarian");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [allergiesText, setAllergiesText] = useState("");
  const [conditionsText, setConditionsText] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [configureGoals, setConfigureGoals] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState("");
  const [proteinGoal, setProteinGoal] = useState("");
  const [carbsGoal, setCarbsGoal] = useState("");
  const [fatsGoal, setFatsGoal] = useState("");
  const [fibreGoal, setFibreGoal] = useState("");
  const [waterGoalMl, setWaterGoalMl] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingProfile) {
      setProfileType(editingProfile.profile_type);
      setAudienceChapter(editingProfile.audience_chapter);
      setDisplayName(editingProfile.display_name);
      setDateOfBirth(editingProfile.date_of_birth ?? "");
      setAgeYears(editingProfile.age_years !== null ? String(editingProfile.age_years) : "");
      setAgeMonths(
        editingProfile.age_months !== null ? String(editingProfile.age_months) : "",
      );
      setDietaryPreference(editingProfile.dietary_preference ?? "vegetarian");
      setActivityLevel(editingProfile.activity_level ?? "moderate");
      setAllergiesText(editingProfile.allergies.join(", "));
      setConditionsText(editingProfile.health_conditions.join(", "));
      setIsDefault(editingProfile.is_default);

      const hasAnyGoal =
        editingProfile.calorie_goal !== null ||
        editingProfile.protein_goal !== null ||
        editingProfile.carbs_goal !== null ||
        editingProfile.fats_goal !== null ||
        editingProfile.fibre_goal !== null ||
        editingProfile.water_goal_ml !== null;
      setConfigureGoals(hasAnyGoal);
      setCalorieGoal(
        editingProfile.calorie_goal !== null ? String(editingProfile.calorie_goal) : "",
      );
      setProteinGoal(
        editingProfile.protein_goal !== null ? String(editingProfile.protein_goal) : "",
      );
      setCarbsGoal(
        editingProfile.carbs_goal !== null ? String(editingProfile.carbs_goal) : "",
      );
      setFatsGoal(editingProfile.fats_goal !== null ? String(editingProfile.fats_goal) : "");
      setFibreGoal(
        editingProfile.fibre_goal !== null ? String(editingProfile.fibre_goal) : "",
      );
      setWaterGoalMl(
        editingProfile.water_goal_ml !== null ? String(editingProfile.water_goal_ml) : "",
      );
    } else {
      const chap = defaultChapter ?? "men";
      const nextType: AccountProfileType =
        chap === "babies" ? "baby" : chap === "patients" ? "patient" : "personal";
      setProfileType(nextType);
      setAudienceChapter(chap);
      setDisplayName("");
      setDateOfBirth("");
      setAgeYears("");
      setAgeMonths("");
      setDietaryPreference(
        nextType === "baby"
          ? "pediatric_balanced"
          : nextType === "patient"
            ? "medical_guided"
            : "vegetarian",
      );
      setActivityLevel("moderate");
      setAllergiesText("");
      setConditionsText("");
      setIsDefault(false);
      setConfigureGoals(false);
      setCalorieGoal("");
      setProteinGoal("");
      setCarbsGoal("");
      setFatsGoal("");
      setFibreGoal("");
      setWaterGoalMl("");
    }
  }, [open, editingProfile, defaultChapter]);

  function toOptionalPositive(raw: string): number | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }

    const basePayload: AccountProfileCreate = {
      profile_type: profileType,
      audience_chapter: audienceChapter,
      display_name: trimmedName,
      date_of_birth: dateOfBirth.trim() || null,
      age_years: ageYears.trim() ? Math.round(Number(ageYears)) : null,
      age_months: ageMonths.trim() ? Math.round(Number(ageMonths)) : null,
      dietary_preference: dietaryPreference || null,
      activity_level: activityLevel || null,
      allergies: parseCommaTags(allergiesText),
      health_conditions: parseCommaTags(conditionsText),
      is_default: isDefault,
      calorie_goal: configureGoals ? toOptionalPositive(calorieGoal) : null,
      protein_goal: configureGoals ? toOptionalPositive(proteinGoal) : null,
      carbs_goal: configureGoals ? toOptionalPositive(carbsGoal) : null,
      fats_goal: configureGoals ? toOptionalPositive(fatsGoal) : null,
      fibre_goal: configureGoals ? toOptionalPositive(fibreGoal) : null,
      water_goal_ml: configureGoals ? toOptionalPositive(waterGoalMl) : null,
    };

    setSaving(true);
    try {
      if (editingProfile) {
        const updatePayload: AccountProfileUpdate = {
          ...basePayload,
          clear_goals: !configureGoals,
        };
        await onSave(updatePayload, editingProfile.id);
      } else {
        await onSave(basePayload);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save profile changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: EASE_PREMIUM }}
              className="relative my-6 w-full max-w-xl rounded-3xl border border-white/15 bg-[#0D110E] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-white">
                    {editingProfile
                      ? `Edit Profile — ${editingProfile.display_name}`
                      : "Create Tracked Profile"}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#A1A1AA]">
                    Create only the profiles you need (Personal, Baby, or Patient). Goals are optional.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close profile dialog"
                  className="rounded-xl border border-white/10 p-1.5 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "personal", label: "Personal Profile", chapter: "men" },
                      { id: "baby", label: "Baby Profile", chapter: "babies" },
                      { id: "patient", label: "Patient Profile", chapter: "patients" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setProfileType(item.id);
                        setAudienceChapter(
                          item.id === "personal" && audienceChapter === "women"
                            ? "women"
                            : item.chapter,
                        );
                      }}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        profileType === item.id
                          ? "border-[#A3FF12]/60 bg-[#A3FF12]/15 text-[#A3FF12]"
                          : "border-white/10 bg-[#070A08] text-zinc-400 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {profileType === "personal" && (
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: "men", label: "Men's Chapter" },
                        { id: "women", label: "Women's Chapter" },
                      ] as const
                    ).map((chap) => (
                      <button
                        key={chap.id}
                        type="button"
                        onClick={() => setAudienceChapter(chap.id)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                          audienceChapter === chap.id
                            ? "border-[#34D399]/60 bg-[#34D399]/15 text-[#34D399]"
                            : "border-white/10 bg-[#070A08] text-zinc-400"
                        }`}
                      >
                        {chap.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={
                        profileType === "baby"
                          ? "e.g. Baby Ananya"
                          : profileType === "patient"
                            ? "e.g. Mom Recovery Care"
                            : "e.g. Rohan Fitness"
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-sm text-white focus:border-[#A3FF12]/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      Date of Birth (optional)
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-sm text-white focus:border-[#A3FF12]/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      {profileType === "baby" ? "Age (Months)" : "Age (Years)"}
                    </label>
                    {profileType === "baby" ? (
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={ageMonths}
                        onChange={(e) => setAgeMonths(e.target.value)}
                        placeholder="e.g. 9"
                        className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-sm text-white"
                      />
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={125}
                        value={ageYears}
                        onChange={(e) => setAgeYears(e.target.value)}
                        placeholder="e.g. 29"
                        className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-sm text-white"
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      Dietary Preference
                    </label>
                    <select
                      value={dietaryPreference}
                      onChange={(e) => setDietaryPreference(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-sm text-white"
                    >
                      <option value="vegetarian">Vegetarian</option>
                      <option value="eggetarian">Eggetarian</option>
                      <option value="non_vegetarian">Non-Vegetarian</option>
                      <option value="vegan">Vegan</option>
                      <option value="pediatric_balanced">Pediatric Soft / Puree</option>
                      <option value="medical_guided">Clinician-Guided Diet</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      Activity Level
                    </label>
                    <select
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3 py-2 text-sm text-white"
                    >
                      <option value="sedentary">Sedentary / Resting</option>
                      <option value="light">Light Activity</option>
                      <option value="moderate">Moderate Activity</option>
                      <option value="active">Active</option>
                      <option value="very_active">Very Active</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-rose-200">
                      Food Allergies (strict exclusions, comma-separated)
                    </label>
                    <input
                      type="text"
                      value={allergiesText}
                      onChange={(e) => setAllergiesText(e.target.value)}
                      placeholder="e.g. Peanuts, Shellfish"
                      className="w-full rounded-xl border border-rose-400/25 bg-[#070A08] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-rose-400/60 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-amber-200">
                      Health Conditions / Cautions (awareness notes)
                    </label>
                    <input
                      type="text"
                      value={conditionsText}
                      onChange={(e) => setConditionsText(e.target.value)}
                      placeholder="e.g. Low-sodium care, Prediabetes"
                      className="w-full rounded-xl border border-amber-400/25 bg-[#070A08] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-400/60 focus:outline-none"
                    />
                  </div>
                </div>

                {profileType === "patient" && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <span>
                      Non-diagnostic notice: Allergies list strict food exclusions; health conditions record clinician awareness notes only. Always follow your physician or dietitian plan.
                    </span>
                  </div>
                )}

                {/* Optional Goals Accordion */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#070A08] p-3.5">
                  <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-white">
                    <span>Configure Daily Nutrition &amp; Water Goals (Optional)</span>
                    <input
                      type="checkbox"
                      checked={configureGoals}
                      onChange={(e) => setConfigureGoals(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#A3FF12]"
                    />
                  </label>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Leave unchecked if you prefer logging actual intake without imposed universal targets.
                  </p>

                  {configureGoals && (
                    <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-white/[0.06] pt-3 sm:grid-cols-3">
                      <div>
                        <label className="text-[11px] text-zinc-400">Calories (kcal)</label>
                        <input
                          type="number"
                          min={1}
                          step="10"
                          value={calorieGoal}
                          onChange={(e) => setCalorieGoal(e.target.value)}
                          placeholder="e.g. 2100"
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#121613] px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400">Protein (g)</label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={proteinGoal}
                          onChange={(e) => setProteinGoal(e.target.value)}
                          placeholder="e.g. 110"
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#121613] px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400">Carbs (g)</label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={carbsGoal}
                          onChange={(e) => setCarbsGoal(e.target.value)}
                          placeholder="e.g. 220"
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#121613] px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400">Fats (g)</label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={fatsGoal}
                          onChange={(e) => setFatsGoal(e.target.value)}
                          placeholder="e.g. 65"
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#121613] px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400">Fibre (g)</label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={fibreGoal}
                          onChange={(e) => setFibreGoal(e.target.value)}
                          placeholder="e.g. 30"
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#121613] px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400">Hydration (mL)</label>
                        <input
                          type="number"
                          min={50}
                          step="50"
                          value={waterGoalMl}
                          onChange={(e) => setWaterGoalMl(e.target.value)}
                          placeholder="e.g. 2500"
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#121613] px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#34D399]"
                  />
                  <span>Set as default profile when opening Dashboard</span>
                </label>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-5 py-2 text-xs font-bold text-[#050706] hover:bg-[#b8ff42] disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    <span>{editingProfile ? "Save Changes" : "Create Profile"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
