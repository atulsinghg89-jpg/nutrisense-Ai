import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Target,
  UserCheck,
  X,
} from "lucide-react";
import {
  calculateDailyTargetsFromProfile,
  calculateBMI,
} from "../lib/nutritionMath";
import type {
  ActivityLevel,
  DailyMacroTargets,
  FitnessGoal,
  ProfileCategory,
  UserNutritionProfile,
} from "../types/nutrition";
import { HumanProfileSelector } from "./HumanSelectionCards";
import { EASE_PREMIUM } from "./MotionPrimitives";

interface OnboardingModalProps {
  open: boolean;
  initialProfile: UserNutritionProfile;
  onClose: () => void;
  onComplete: (
    profile: UserNutritionProfile,
    computedTargets: DailyMacroTargets,
  ) => void;
}

const TOTAL_STEPS = 5;

const GOALS: { id: FitnessGoal; title: string; subtitle: string }[] = [
  {
    id: "weight_loss",
    title: "Weight Loss",
    subtitle: "Gentle ~400 kcal daily deficit with high protein satiety",
  },
  {
    id: "muscle_building",
    title: "Muscle Building",
    subtitle: "Elevated protein target with modest energy surplus",
  },
  {
    id: "weight_gain",
    title: "Healthy Weight Gain",
    subtitle: "Calorie surplus built from whole nutrient-dense meals",
  },
  {
    id: "healthy_lifestyle",
    title: "Healthy Lifestyle",
    subtitle: "Maintenance calories balanced across daily whole foods",
  },
];

const DIETS: {
  id: UserNutritionProfile["dietaryPreference"];
  title: string;
  desc: string;
}[] = [
  { id: "vegetarian", title: "Vegetarian", desc: "Paneer, dals, curd, whole grains & veggies" },
  { id: "eggetarian", title: "Eggetarian", desc: "Vegetarian base plus eggs for lean protein" },
  { id: "non_vegetarian", title: "Non-Vegetarian", desc: "Fish, poultry, eggs & whole plant staples" },
  { id: "vegan", title: "Plant-Based / Vegan", desc: "Lentils, tofu, soy chunks, seeds & grains" },
];

export function OnboardingModal({
  open,
  initialProfile,
  onClose,
  onComplete,
}: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<UserNutritionProfile>(initialProfile);

  const calculation = calculateDailyTargetsFromProfile(draft);
  const bmi = calculateBMI(draft.heightCm, draft.weightKg);
  const activeProfileCategory: ProfileCategory =
    draft.userCategory ?? (draft.age < 13 ? "child" : draft.sex);

  function handleSelectProfileCategory(category: ProfileCategory) {
    setDraft((prev) => {
      if (category === "child") {
        return {
          ...prev,
          userCategory: "child",
          age: prev.age >= 13 ? 8 : prev.age,
          heightCm: prev.heightCm > 155 ? 128 : prev.heightCm,
          weightKg: prev.weightKg > 48 ? 26 : prev.weightKg,
        };
      }
      return {
        ...prev,
        userCategory: category,
        sex: category,
        age: prev.age < 13 ? 24 : prev.age,
        heightCm: prev.heightCm < 140 ? 170 : prev.heightCm,
        weightKg: prev.weightKg < 36 ? 65 : prev.weightKg,
      };
    });
  }

  function handleFinish() {
    const finalized: UserNutritionProfile = {
      ...draft,
      name: draft.name.trim() || "NutriSense Member",
      onboardingCompleted: true,
    };
    onComplete(finalized, calculation.targets);
    setStep(1);
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
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="NutriSense AI Profile Onboarding"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: EASE_PREMIUM }}
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/[0.12] bg-[#121212] p-6 shadow-2xl sm:p-8"
            >
              {/* Top Step Progress */}
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#A3FF12]/15 text-[#A3FF12]">
                    <UserCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#34D399]">
                      Step {step} of {TOTAL_STEPS}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">
                      Personalized Daily Targets Setup
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close onboarding"
                  className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                  transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                  className="h-full rounded-full bg-gradient-to-r from-[#34D399] to-[#A3FF12]"
                />
              </div>

              {/* Step Content */}
              <div className="mt-6 min-h-[250px]">
                {step === 1 && (
                  <div className="space-y-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Welcome to NutriSense AI
                    </span>
                    <h2 className="font-display text-2xl font-extrabold text-white">
                      Let&apos;s Tailor Your Daily Nutrition Targets
                    </h2>
                    <p className="text-sm leading-relaxed text-[#A1A1AA]">
                      Answer 4 quick steps so NutriSense AI can estimate balanced
                      calorie and macronutrient targets using the Mifflin-St
                      Jeor formula and store them locally in your browser.
                    </p>
                    <div className="pt-2">
                      <label
                        htmlFor="onboard-name"
                        className="mb-1.5 block text-xs font-semibold text-zinc-300"
                      >
                        Your Name (optional)
                      </label>
                      <input
                        id="onboard-name"
                        type="text"
                        value={draft.name}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="e.g. Aarav, Priya"
                        className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#A3FF12]/60 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-xl font-bold text-white">
                        Choose Profile &amp; Body Metrics
                      </h2>
                      <p className="mt-1 text-xs text-[#A1A1AA]">
                        Select Male, Female, or Child for personalized nutrition calibration.
                      </p>
                    </div>

                    <HumanProfileSelector
                      value={activeProfileCategory}
                      onChange={handleSelectProfileCategory}
                      variant="modal"
                    />

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label
                          htmlFor="onboard-age"
                          className="mb-1 block text-xs text-[#A1A1AA]"
                        >
                          Age ({activeProfileCategory === "child" ? "4–12 yrs" : "years"})
                        </label>
                        <input
                          id="onboard-age"
                          type="number"
                          min={activeProfileCategory === "child" ? 4 : 13}
                          max={activeProfileCategory === "child" ? 12 : 100}
                          value={draft.age}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              age: Number(e.target.value) || (activeProfileCategory === "child" ? 8 : 24),
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 font-mono text-sm text-white focus:border-[#A3FF12]/60 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="onboard-height"
                          className="mb-1 block text-xs text-[#A1A1AA]"
                        >
                          Height (cm)
                        </label>
                        <input
                          id="onboard-height"
                          type="number"
                          min={85}
                          max={240}
                          value={draft.heightCm}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              heightCm: Number(e.target.value) || 170,
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 font-mono text-sm text-white focus:border-[#A3FF12]/60 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="onboard-weight"
                          className="mb-1 block text-xs text-[#A1A1AA]"
                        >
                          Weight (kg)
                        </label>
                        <input
                          id="onboard-weight"
                          type="number"
                          min={14}
                          max={250}
                          value={draft.weightKg}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              weightKg: Number(e.target.value) || 68,
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 font-mono text-sm text-white focus:border-[#A3FF12]/60 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="onboard-activity"
                        className="mb-1 block text-xs text-[#A1A1AA]"
                      >
                        Weekly Activity Level
                      </label>
                      <select
                        id="onboard-activity"
                        value={draft.activityLevel}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            activityLevel: e.target.value as ActivityLevel,
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white focus:border-[#A3FF12]/60 focus:outline-none"
                      >
                        <option value="sedentary">Sedentary (desk routine, minimal exercise)</option>
                        <option value="light">Lightly Active (1–3 walks/workouts weekly)</option>
                        <option value="moderate">Moderately Active (3–5 days active)</option>
                        <option value="active">Very Active (6–7 training sessions)</option>
                        <option value="very_active">Athlete / Physical Job</option>
                      </select>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <h2 className="font-display text-xl font-bold text-white">
                      Choose Your Primary Goal
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {GOALS.map((g) => {
                        const active = draft.fitnessGoal === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() =>
                              setDraft((p) => ({ ...p, fitnessGoal: g.id }))
                            }
                            className={`rounded-2xl border p-4 text-left transition ${
                              active
                                ? "border-[#A3FF12] bg-[#A3FF12]/10"
                                : "border-white/[0.08] bg-[#0A0A0A] hover:border-white/25"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-display text-sm font-bold text-white">
                                {g.title}
                              </span>
                              {active && (
                                <Check className="h-4 w-4 text-[#A3FF12]" />
                              )}
                            </div>
                            <p className="mt-1.5 text-xs text-[#A1A1AA]">
                              {g.subtitle}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <h2 className="font-display text-xl font-bold text-white">
                      Dietary Preference
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {DIETS.map((d) => {
                        const active = draft.dietaryPreference === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() =>
                              setDraft((p) => ({ ...p, dietaryPreference: d.id }))
                            }
                            className={`rounded-2xl border p-4 text-left transition ${
                              active
                                ? "border-[#34D399] bg-[#34D399]/12"
                                : "border-white/[0.08] bg-[#0A0A0A] hover:border-white/25"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-display text-sm font-bold text-white">
                                {d.title}
                              </span>
                              {active && (
                                <Check className="h-4 w-4 text-[#34D399]" />
                              )}
                            </div>
                            <p className="mt-1.5 text-xs text-[#A1A1AA]">
                              {d.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[#A3FF12]">
                      <Target className="h-5 w-5" />
                      <h2 className="font-display text-xl font-bold text-white">
                        Your Estimated Daily Plan
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-[#A3FF12]/30 bg-[#0A0A0A] p-3.5 text-center">
                        <p className="text-[11px] text-[#A1A1AA]">Calories</p>
                        <p className="mt-1 font-mono text-lg font-bold text-[#A3FF12]">
                          {calculation.targets.calories}
                        </p>
                        <p className="text-[10px] text-zinc-500">kcal/day</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-3.5 text-center">
                        <p className="text-[11px] text-[#A1A1AA]">Protein</p>
                        <p className="mt-1 font-mono text-lg font-bold text-[#34D399]">
                          {calculation.targets.protein}g
                        </p>
                        <p className="text-[10px] text-zinc-500">daily goal</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-3.5 text-center">
                        <p className="text-[11px] text-[#A1A1AA]">Carbs</p>
                        <p className="mt-1 font-mono text-lg font-bold text-emerald-300">
                          {calculation.targets.carbs}g
                        </p>
                        <p className="text-[10px] text-zinc-500">daily goal</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-3.5 text-center">
                        <p className="text-[11px] text-[#A1A1AA]">Fats</p>
                        <p className="mt-1 font-mono text-lg font-bold text-lime-200">
                          {calculation.targets.fats}g
                        </p>
                        <p className="text-[10px] text-zinc-500">daily goal</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A] p-4 text-xs text-[#A1A1AA]">
                      <div className="flex flex-wrap justify-between gap-2 font-mono text-white">
                        <span>Estimated BMR: {calculation.bmr} kcal</span>
                        <span>Screening BMI: {bmi.bmi} ({bmi.category})</span>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                        Note: Calculated with the standard Mifflin-St Jeor
                        equation as general wellness guidance — not medical
                        advice. You can edit targets anytime on the Dashboard.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Controls */}
              <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4">
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#171717] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/30 disabled:opacity-40"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>

                {step < TOTAL_STEPS ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-5 py-2 text-xs font-bold text-[#0A0A0A] transition hover:bg-[#b5ff3b]"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#34D399] px-5 py-2 text-xs font-bold text-[#0A0A0A] transition hover:bg-[#4adeb0]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Targets &amp; Start</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
