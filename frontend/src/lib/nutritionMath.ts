import type {
  ActivityLevel,
  DailyMacroTargets,
  FitnessGoal,
  UserNutritionProfile,
} from "../types/nutrition";

export const PROFILE_STORAGE_KEY = "nutrisense_user_profile_v1";

export const DEFAULT_USER_PROFILE: UserNutritionProfile = {
  name: "",
  age: 24,
  sex: "male",
  heightCm: 172,
  weightKg: 68,
  activityLevel: "moderate",
  dietaryPreference: "vegetarian",
  fitnessGoal: "healthy_lifestyle",
  onboardingCompleted: false,
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_CALORIE_OFFSET: Record<FitnessGoal, number> = {
  weight_loss: -400,
  healthy_lifestyle: 0,
  muscle_building: 250,
  weight_gain: 400,
};

export function loadUserProfile(): UserNutritionProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserNutritionProfile>;
    return {
      ...DEFAULT_USER_PROFILE,
      ...parsed,
      age: Number(parsed.age) || DEFAULT_USER_PROFILE.age,
      heightCm: Number(parsed.heightCm) || DEFAULT_USER_PROFILE.heightCm,
      weightKg: Number(parsed.weightKg) || DEFAULT_USER_PROFILE.weightKg,
    };
  } catch {
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserNutritionProfile) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage errors
  }
}

export interface BMIResult {
  bmi: number;
  category: "Underweight" | "Healthy Range" | "Overweight" | "Obesity Range";
  scalePercent: number;
  explanation: string;
}

/** Standard Body Mass Index calculation: weight(kg) / height(m)^2 */
export function calculateBMI(heightCm: number, weightKg: number): BMIResult {
  const safeHeightM = Math.max(heightCm, 50) / 100;
  const safeWeight = Math.max(weightKg, 20);
  const bmi = Math.round((safeWeight / (safeHeightM * safeHeightM)) * 10) / 10;

  let category: BMIResult["category"] = "Healthy Range";
  let explanation =
    "Falls within standard adult 18.5–24.9 screening range. Balance whole proteins, fiber, and resistance activity.";

  if (bmi < 18.5) {
    category = "Underweight";
    explanation =
      "Below 18.5 screening threshold. Consider nutrient-dense whole foods, legumes, nuts, and adequate protein.";
  } else if (bmi >= 25 && bmi < 30) {
    category = "Overweight";
    explanation =
      "Within 25.0–29.9 screening range. Prioritize protein density, vegetables, and sustainable daily activity.";
  } else if (bmi >= 30) {
    category = "Obesity Range";
    explanation =
      "At or above 30.0 screening threshold. Consult a healthcare professional for personalized nutrition and clinical guidance.";
  }

  // Map BMI 14..40 smoothly onto 0..100 scale bar
  const scalePercent = Math.min(100, Math.max(4, Math.round(((bmi - 14) / 26) * 100)));

  return { bmi, category, scalePercent, explanation };
}

/** Validated Mifflin-St Jeor BMR + TDEE daily macro target estimate */
export function calculateDailyTargetsFromProfile(
  profile: UserNutritionProfile,
): { bmr: number; tdee: number; targets: DailyMacroTargets } {
  const safeWeight = Math.max(30, Math.min(250, profile.weightKg));
  const safeHeight = Math.max(100, Math.min(240, profile.heightCm));
  const safeAge = Math.max(13, Math.min(100, profile.age));

  const s = profile.sex === "male" ? 5 : -161;
  const bmr = Math.round(10 * safeWeight + 6.25 * safeHeight - 5 * safeAge + s);
  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[profile.activityLevel] ?? 1.55));
  const targetCalories = Math.max(1200, tdee + (GOAL_CALORIE_OFFSET[profile.fitnessGoal] ?? 0));

  const proteinFactor =
    profile.fitnessGoal === "muscle_building"
      ? 1.9
      : profile.fitnessGoal === "weight_loss"
        ? 1.7
        : 1.5;

  const proteinGrams = Math.round(safeWeight * proteinFactor);
  const fatCalories = Math.round(targetCalories * 0.27);
  const fatGrams = Math.max(35, Math.round(fatCalories / 9));
  const remainingCarbCalories = Math.max(
    200,
    targetCalories - proteinGrams * 4 - fatGrams * 9,
  );
  const carbGrams = Math.round(remainingCarbCalories / 4);

  return {
    bmr,
    tdee,
    targets: {
      calories: targetCalories,
      protein: proteinGrams,
      carbs: carbGrams,
      fats: fatGrams,
    },
  };
}
