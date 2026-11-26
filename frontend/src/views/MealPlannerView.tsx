import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  CalendarDays,
  Check,
  IndianRupee,
  Info,
  Loader2,
  Scale,
  ShoppingBasket,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { AnimatedNumber } from "../components/MotionPrimitives";
import { generateAiMealPlan } from "../lib/api";
import {
  calculateBMI,
  calculateDailyTargetsFromProfile,
} from "../lib/nutritionMath";
import type {
  ActivityLevel,
  AppView,
  DailyMacroTargets,
  FitnessGoal,
  GroceryItem,
  MealPlanDay,
  UserNutritionProfile,
} from "../types/nutrition";
import { loadGroceryList, saveGroceryList } from "./GroceryListView";

type MealSlotKey = "breakfast" | "lunch" | "snack" | "dinner";

interface MealSwapOption {
  text: string;
  calories: number;
  protein: number;
}

const MEAL_SWAP_OPTIONS: Record<MealSlotKey, MealSwapOption[]> = {
  breakfast: [
    {
      text: "Moong Dal Chilla (2) + Stuffed Paneer + Mint Chutney",
      calories: 390,
      protein: 21,
    },
    {
      text: "Poha (1 bowl) with Roasted Peanuts + Curd (150g)",
      calories: 340,
      protein: 11,
    },
    {
      text: "3 Steamed Idli + Vegetable Sambar + Coconut Chutney",
      calories: 320,
      protein: 12,
    },
    {
      text: "Masala Oats Upma + 2 Boiled Egg Whites / Sprouts",
      calories: 365,
      protein: 17,
    },
  ],
  lunch: [
    {
      text: "2 Phulka Rotis + Yellow Dal Tadka + Salad + Dahi",
      calories: 520,
      protein: 22,
    },
    {
      text: "Rajma Masala (1 bowl) + Jeera Rice + Cucumber Kachumber",
      calories: 560,
      protein: 19,
    },
    {
      text: "Palak Paneer + 2 Whole Wheat Rotis + Green Salad",
      calories: 590,
      protein: 26,
    },
    {
      text: "Chole (1 bowl) + Brown Rice + Jeera Buttermilk",
      calories: 545,
      protein: 18,
    },
  ],
  snack: [
    {
      text: "Roasted Chana (40g) + Lemon Green Tea + 1 Apple",
      calories: 195,
      protein: 11,
    },
    {
      text: "Sprouts Chaat with Onion, Tomato, Coriander & Lemon",
      calories: 180,
      protein: 12,
    },
    {
      text: "Roasted Makhana (30g) + Spiced Salted Chaas",
      calories: 165,
      protein: 7,
    },
    {
      text: "Spiced Curd (150g) + Chia Seeds + Roasted Almonds (12g)",
      calories: 210,
      protein: 10,
    },
  ],
  dinner: [
    {
      text: "Paneer Bhurji (120g) + 2 Phulka Rotis + Cucumber Salad",
      calories: 490,
      protein: 26,
    },
    {
      text: "Moong Dal Khichdi (1 bowl) + Roasted Papad + Curd",
      calories: 430,
      protein: 16,
    },
    {
      text: "Soya Chunks Bhurji (45g dry) + 2 Whole Wheat Rotis",
      calories: 445,
      protein: 28,
    },
    {
      text: "Tofu & Mixed Veg Stir-Fry + 1 Jowar Bhakri + Mint Chutney",
      calories: 420,
      protein: 22,
    },
  ],
};

const SLOT_BASELINE: Record<MealSlotKey, { calories: number; protein: number }> = {
  breakfast: { calories: 350, protein: 14 },
  lunch: { calories: 550, protein: 20 },
  snack: { calories: 185, protein: 10 },
  dinner: { calories: 455, protein: 22 },
};

function swapSlotInPlan(
  days: MealPlanDay[],
  dayName: string,
  slotKey: MealSlotKey,
  storageKey: string,
): MealPlanDay[] {
  const pool = MEAL_SWAP_OPTIONS[slotKey];
  const nextDays = days.map((day) => {
    if (day.day !== dayName) return day;

    const currentText = day[slotKey];
    const currentIndex = pool.findIndex((item) => item.text === currentText);
    const nextOption = pool[(currentIndex + 1) % pool.length];
    const previousEstimate =
      currentIndex >= 0 ? pool[currentIndex] : SLOT_BASELINE[slotKey];

    return {
      ...day,
      [slotKey]: nextOption.text,
      estimated_calories: Math.max(
        900,
        Math.round(day.estimated_calories - previousEstimate.calories + nextOption.calories),
      ),
      estimated_protein_g: Math.max(
        25,
        Math.round(day.estimated_protein_g - previousEstimate.protein + nextOption.protein),
      ),
    };
  });

  try {
    localStorage.setItem(storageKey, JSON.stringify(nextDays));
  } catch {
    // Ignore storage quota errors
  }

  return nextDays;
}

const PLANNER_STORAGE_KEY = "nutrisense_weekly_meal_plan_v1";

const VERIFIED_INDIAN_WEEKLY_PLAN: MealPlanDay[] = [
  {
    day: "Monday",
    breakfast: "Vegetable Poha with roasted peanuts & lemon + 1 cup curd",
    lunch: "2 Whole Wheat Rotis + Toor Dal Tadka + Bhindi Sabzi + Salad",
    snack: "Roasted Makhana & 1 seasonal apple",
    dinner: "Moong Dal Vegetable Khichdi + Cucumber Raita",
    estimated_calories: 1840,
    estimated_protein_g: 68,
    grocery_items: ["Flattened Poha", "Toor Dal", "Moong Dal", "Ladyfinger (Bhindi)", "Curd"],
  },
  {
    day: "Tuesday",
    breakfast: "2 Moong Dal Paneer Chillas + Mint Chutney",
    lunch: "Rajma Chawal (1 bowl rice + 1.5 katori rajma) + Kachumber Salad",
    snack: "Sprouted Moong Chaat with tomato & lemon",
    dinner: "2 Phulka Rotis + Grilled Paneer Bhurji + Sautéed Greens",
    estimated_calories: 1960,
    estimated_protein_g: 86,
    grocery_items: ["Whole Moong", "Paneer", "Rajma Beans", "Whole Wheat Atta", "Spinach"],
  },
  {
    day: "Wednesday",
    breakfast: "3 Steamed Idlis + Vegetable Sambar + Coconut Chutney (light)",
    lunch: "2 Multigrain Rotis + Chole Curry + Onion-Tomato Salad",
    snack: "Handful of soaked almonds & 1 guava",
    dinner: "Palak Paneer (light cream) + 2 Phulkas",
    estimated_calories: 1920,
    estimated_protein_g: 78,
    grocery_items: ["Idli Batter", "Chickpeas (Chole)", "Palak (Spinach)", "Guava", "Almonds"],
  },
  {
    day: "Thursday",
    breakfast: "Masala Oats with mixed vegetables & chia seeds",
    lunch: "Brown/White Rice + Masoor Dal + Lauki Chana Sabzi + Curd",
    snack: "Roasted Chana + 1 banana",
    dinner: "2 Rotis + Stir-fried Tofu/Paneer & Bell Peppers",
    estimated_calories: 1890,
    estimated_protein_g: 74,
    grocery_items: ["Rolled Oats", "Masoor Dal", "Bottle Gourd (Lauki)", "Roasted Chana", "Bell Peppers"],
  },
  {
    day: "Friday",
    breakfast: "2 Plain Crisp Dosas + Drumstick Sambar",
    lunch: "2 Rotis + Kadhi Pakora (baked/light) + Jeera Rice + Salad",
    snack: "1 bowl fresh Dahi with roasted jeera & pomegranate",
    dinner: "Soy/Paneer Pulao with peas + Cucumber Raita",
    estimated_calories: 1980,
    estimated_protein_g: 76,
    grocery_items: ["Dosa Batter", "Besan", "Green Peas", "Pomegranate", "Cucumber"],
  },
  {
    day: "Saturday",
    breakfast: "Besan Vegetable Chilla + 1 glass Chaas (Buttermilk)",
    lunch: "2 Rotis + Dal Makhani (home light) + Cabbage-Peas Poriyal",
    snack: "Boiled Corn with lime & chaat masala",
    dinner: "Light Vegetable Daliya Khichdi + Roasted Papad",
    estimated_calories: 1850,
    estimated_protein_g: 72,
    grocery_items: ["Cabbage", "Sweet Corn", "Broken Wheat (Daliya)", "Urad Dal"],
  },
  {
    day: "Sunday",
    breakfast: "Paneer-Stuffed Whole Wheat Paratha (1 tsp ghee) + Curd",
    lunch: "Balanced Indian Thali: 2 Rotis, Yellow Dal, Mixed Veg & Rice",
    snack: "Seasonal fruit bowl + pumpkin seeds",
    dinner: "Clear Lentil Vegetable Soup + Grilled Paneer/Tofu Salad",
    estimated_calories: 2010,
    estimated_protein_g: 84,
    grocery_items: ["Mixed Vegetables", "Pumpkin Seeds", "Carrots", "Paneer"],
  },
];

function loadSavedPlan(): MealPlanDay[] {
  try {
    const raw = localStorage.getItem(PLANNER_STORAGE_KEY);
    if (!raw) return VERIFIED_INDIAN_WEEKLY_PLAN;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as MealPlanDay[])
      : VERIFIED_INDIAN_WEEKLY_PLAN;
  } catch {
    return VERIFIED_INDIAN_WEEKLY_PLAN;
  }
}

function guessCategory(name: string): GroceryItem["category"] {
  const lower = name.toLowerCase();
  if (/(paneer|curd|dahi|milk|tofu|egg|chicken|yogurt|buttermilk|soy)/.test(lower)) {
    return "Proteins & Dairy";
  }
  if (/(dal|rice|poha|atta|roti|oats|rajma|chole|chickpea|moong|daliya|batter|besan|bread)/.test(lower)) {
    return "Grains & Pulses";
  }
  if (/(spinach|palak|tomato|cucumber|pea|pepper|apple|guava|banana|fruit|cabbage|carrot|corn|bhindi|lauki|pomegranate|vegetable)/.test(lower)) {
    return "Produce & Herbs";
  }
  return "Pantry & Spices";
}

interface MealPlannerViewProps {
  dailyTargets: DailyMacroTargets;
  userProfile: UserNutritionProfile;
  onApplyProfileTargets: (
    profile: UserNutritionProfile,
    targets: DailyMacroTargets,
  ) => void;
  onNavigate: (view: AppView) => void;
}

export function MealPlannerView({
  dailyTargets,
  userProfile,
  onApplyProfileTargets,
  onNavigate,
}: MealPlannerViewProps) {
  const [planDays, setPlanDays] = useState<MealPlanDay[]>(() => loadSavedPlan());
  const [preference, setPreference] = useState("balanced_indian_vegetarian");
  const [budgetFriendly, setBudgetFriendly] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("Verified Balanced Indian Plan");
  const [error, setError] = useState<string | null>(null);
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  // Personalized Profile & BMI Calculator state
  const [profileDraft, setProfileDraft] =
    useState<UserNutritionProfile>(userProfile);
  const [targetsAppliedNotice, setTargetsAppliedNotice] = useState(false);

  const bmiResult = calculateBMI(profileDraft.heightCm, profileDraft.weightKg);
  const calculatedTargets = calculateDailyTargetsFromProfile(profileDraft);

  function handleSaveCalculatedTargets() {
    onApplyProfileTargets(
      { ...profileDraft, onboardingCompleted: true },
      calculatedTargets.targets,
    );
    setTargetsAppliedNotice(true);
    window.setTimeout(() => setTargetsAppliedNotice(false), 3500);
  }

  async function handleGenerateAiPlan() {
    setGenerating(true);
    setError(null);
    setExportedCount(null);

    try {
      const result = await generateAiMealPlan({
        preference,
        daily_calorie_target: dailyTargets.calories,
        budget_friendly: budgetFriendly,
      });
      if (result.days.length > 0) {
        setPlanDays(result.days);
        setSourceLabel(`AI Generated (${result.source})`);
        try {
          localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(result.days));
        } catch {
          // Ignore storage error
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate an AI meal plan right now. Showing verified plan instead.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function handleUseVerifiedPlan() {
    setPlanDays(VERIFIED_INDIAN_WEEKLY_PLAN);
    setSourceLabel("Verified Balanced Indian Plan");
    setError(null);
    try {
      localStorage.setItem(
        PLANNER_STORAGE_KEY,
        JSON.stringify(VERIFIED_INDIAN_WEEKLY_PLAN),
      );
    } catch {
      // Ignore storage error
    }
  }

  function handleSyncToGroceryList() {
    const existing = loadGroceryList();
    const existingNames = new Set(existing.map((i) => i.name.toLowerCase()));
    const toAdd: GroceryItem[] = [];

    for (const day of planDays) {
      for (const rawIng of day.grocery_items) {
        const clean = rawIng.trim();
        if (!clean || existingNames.has(clean.toLowerCase())) continue;
        existingNames.add(clean.toLowerCase());
        toAdd.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: clean,
          category: guessCategory(clean),
          completed: false,
          source: `Planner (${day.day})`,
        });
      }
    }

    saveGroceryList([...toAdd, ...existing]);
    setExportedCount(toAdd.length);
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121212] px-6 py-6 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-[#A3FF12]/10 blur-[100px]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <CalendarDays className="h-3.5 w-3.5" />
              Personalized Nutrition Planner &amp; Health Tools
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">
              Weekly Meal Planner, Calorie Estimator &amp; BMI
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[#A1A1AA]">
              Compute Mifflin-St Jeor daily targets from your profile, check
              your BMI screening score, plan 7 days of balanced Indian meals, and
              sync ingredients to your Smart Grocery List.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSyncToGroceryList}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/40 bg-[#34D399]/10 px-4 py-2 text-xs font-semibold text-[#34D399] transition hover:bg-[#34D399]/20"
            >
              <ShoppingBasket className="h-3.5 w-3.5" />
              <span>Export to Grocery List</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("grocery")}
              className="rounded-full border border-white/15 bg-[#141B16] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/30"
            >
              View Checklist
            </button>
            <button
              type="button"
              onClick={() => onNavigate("budget")}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#B6FF38]/35 bg-[#B6FF38]/10 px-4 py-2 text-xs font-semibold text-[#B6FF38] transition hover:bg-[#B6FF38]/20"
            >
              <IndianRupee className="h-3.5 w-3.5" />
              <span>Budget ₹50–₹200</span>
            </button>
          </div>
        </div>
      </div>

      {/* Phases 12 & 13: Personalized Target Planner + BMI Screening Tool */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Personalized Nutrition Profile & Calorie Estimator */}
        <section className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2.5">
              <Target className="h-5 w-5 text-[#A3FF12]" />
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  Personalized Daily Calorie &amp; Macro Planner
                </h2>
                <p className="text-xs text-[#A1A1AA]">
                  Uses Mifflin-St Jeor BMR &times; activity level + fitness goal.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveCalculatedTargets}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-3.5 py-2 text-xs font-bold text-[#0A0A0A] transition hover:bg-[#b5ff3b]"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply to My Goals</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="plan-age" className="mb-1 block text-[11px] text-[#A1A1AA]">
                Age
              </label>
              <input
                id="plan-age"
                type="number"
                min={13}
                max={100}
                value={profileDraft.age}
                onChange={(e) =>
                  setProfileDraft((p) => ({
                    ...p,
                    age: Number(e.target.value) || 24,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white focus:border-[#A3FF12]/60 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="plan-sex" className="mb-1 block text-[11px] text-[#A1A1AA]">
                BMR Ref
              </label>
              <select
                id="plan-sex"
                value={profileDraft.sex}
                onChange={(e) =>
                  setProfileDraft((p) => ({
                    ...p,
                    sex: e.target.value as "male" | "female",
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#A3FF12]/60 focus:outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label htmlFor="plan-height" className="mb-1 block text-[11px] text-[#A1A1AA]">
                Height (cm)
              </label>
              <input
                id="plan-height"
                type="number"
                min={100}
                max={240}
                value={profileDraft.heightCm}
                onChange={(e) =>
                  setProfileDraft((p) => ({
                    ...p,
                    heightCm: Number(e.target.value) || 170,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white focus:border-[#A3FF12]/60 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="plan-weight" className="mb-1 block text-[11px] text-[#A1A1AA]">
                Weight (kg)
              </label>
              <input
                id="plan-weight"
                type="number"
                min={30}
                max={250}
                value={profileDraft.weightKg}
                onChange={(e) =>
                  setProfileDraft((p) => ({
                    ...p,
                    weightKg: Number(e.target.value) || 68,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white focus:border-[#A3FF12]/60 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="plan-activity" className="mb-1 block text-[11px] text-[#A1A1AA]">
                Activity Level
              </label>
              <select
                id="plan-activity"
                value={profileDraft.activityLevel}
                onChange={(e) =>
                  setProfileDraft((p) => ({
                    ...p,
                    activityLevel: e.target.value as ActivityLevel,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#A3FF12]/60 focus:outline-none"
              >
                <option value="sedentary">Sedentary</option>
                <option value="light">Light Active (1–3 days/wk)</option>
                <option value="moderate">Moderate Active (3–5 days/wk)</option>
                <option value="active">Very Active (6–7 days/wk)</option>
                <option value="very_active">Athlete / Heavy Training</option>
              </select>
            </div>

            <div>
              <label htmlFor="plan-goal" className="mb-1 block text-[11px] text-[#A1A1AA]">
                Fitness Goal
              </label>
              <select
                id="plan-goal"
                value={profileDraft.fitnessGoal}
                onChange={(e) =>
                  setProfileDraft((p) => ({
                    ...p,
                    fitnessGoal: e.target.value as FitnessGoal,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#A3FF12]/60 focus:outline-none"
              >
                <option value="weight_loss">Weight Loss (-400 kcal)</option>
                <option value="healthy_lifestyle">Healthy Lifestyle (Maintain)</option>
                <option value="muscle_building">Muscle Building (+250 kcal)</option>
                <option value="weight_gain">Healthy Weight Gain (+400 kcal)</option>
              </select>
            </div>
          </div>

          {/* Computed Estimate Tiles */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-3 text-center">
              <p className="text-[10px] text-zinc-500">Est. TDEE</p>
              <p className="mt-1 font-mono text-sm font-bold text-white">
                {calculatedTargets.tdee}
              </p>
            </div>
            <div className="rounded-xl border border-[#A3FF12]/30 bg-[#0A0A0A] p-3 text-center">
              <p className="text-[10px] text-zinc-400">Daily Target</p>
              <p className="mt-1 font-mono text-sm font-bold text-[#A3FF12]">
                {calculatedTargets.targets.calories}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-3 text-center">
              <p className="text-[10px] text-zinc-500">Protein</p>
              <p className="mt-1 font-mono text-sm font-bold text-[#34D399]">
                {calculatedTargets.targets.protein}g
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-3 text-center">
              <p className="text-[10px] text-zinc-500">Carbs</p>
              <p className="mt-1 font-mono text-sm font-bold text-emerald-300">
                {calculatedTargets.targets.carbs}g
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-3 text-center">
              <p className="text-[10px] text-zinc-500">Fats</p>
              <p className="mt-1 font-mono text-sm font-bold text-lime-200">
                {calculatedTargets.targets.fats}g
              </p>
            </div>
          </div>

          {targetsAppliedNotice && (
            <p className="mt-3 text-xs font-semibold text-[#34D399]">
              ✓ Updated your Dashboard and AI Scanner daily macro targets!
            </p>
          )}
          <p className="mt-3 text-[11px] text-zinc-500">
            Informational formula estimates only — not clinical or medical nutrition advice.
          </p>
        </section>

        {/* Phase 13: BMI & Health Screening Tool */}
        <section className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#121212] p-6 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <Scale className="h-5 w-5 text-[#34D399]" />
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    BMI Screening Calculator
                  </h2>
                  <p className="text-xs text-[#A1A1AA]">
                    Synced with Height ({profileDraft.heightCm} cm) &amp; Weight ({profileDraft.weightKg} kg)
                  </p>
                </div>
              </div>
              <Activity className="h-4 w-4 text-[#A3FF12]" />
            </div>

            <div className="mt-5 flex items-baseline justify-between">
              <div>
                <p className="text-xs text-[#A1A1AA]">Calculated BMI</p>
                <p className="mt-1 font-mono text-4xl font-extrabold text-white tabular-nums">
                  {bmiResult.bmi}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  bmiResult.category === "Healthy Range"
                    ? "border-[#34D399]/40 bg-[#34D399]/15 text-[#34D399]"
                    : bmiResult.category === "Underweight"
                      ? "border-sky-400/40 bg-sky-400/15 text-sky-300"
                      : "border-amber-400/40 bg-amber-400/15 text-amber-300"
                }`}
              >
                {bmiResult.category}
              </span>
            </div>

            {/* Visual BMI Spectrum Scale */}
            <div className="mt-5 space-y-2">
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gradient-to-r from-sky-400 via-[#34D399] via-55% to-amber-400">
                <div
                  style={{ left: `calc(${bmiResult.scalePercent}% - 6px)` }}
                  className="absolute top-1/2 h-4 w-3 -translate-y-1/2 rounded-full border-2 border-[#0A0A0A] bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-300"
                />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-zinc-500">
                <span>&lt;18.5</span>
                <span>18.5–24.9</span>
                <span>25–29.9</span>
                <span>30+</span>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-zinc-300">
              {bmiResult.explanation}
            </p>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-3 text-[11px] text-[#A1A1AA]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34D399]" />
            <span>
              BMI is a general screening measure based on height and weight alone
              — it does not measure muscle mass, body composition, or overall
              medical health.
            </span>
          </div>
        </section>
      </div>

      {/* Meal Calendar Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#121212] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={preference}
            onChange={(e) => setPreference(e.target.value)}
            aria-label="Meal plan preference"
            className="rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2 text-xs font-semibold text-white focus:border-[#A3FF12]/60 focus:outline-none"
          >
            <option value="balanced_indian_vegetarian">Balanced Indian (Veg)</option>
            <option value="high_protein_indian">High-Protein Indian (Veg + Eggs/Paneer)</option>
            <option value="affordable_student_hostel">Affordable Pantry &amp; Hostel</option>
            <option value="light_digestive_recovery">Light Home Comfort Meals</option>
          </select>

          <button
            type="button"
            onClick={() => setBudgetFriendly((b) => !b)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              budgetFriendly
                ? "border-[#34D399]/40 bg-[#34D399]/15 text-[#34D399]"
                : "border-white/10 bg-[#0A0A0A] text-[#A1A1AA]"
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>Affordable Mode: {budgetFriendly ? "ON" : "OFF"}</span>
          </button>

          <span className="font-mono text-[11px] text-[#A1A1AA]">
            Target: {dailyTargets.calories} kcal/day
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUseVerifiedPlan}
            className="rounded-xl border border-white/15 bg-[#171717] px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-white/30"
          >
            Load Curated Indian Plan
          </button>
          <button
            type="button"
            onClick={() => void handleGenerateAiPlan()}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#0A0A0A] transition hover:bg-[#b5ff3b] disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{generating ? "Generating..." : "Generate with Gemini AI"}</span>
          </button>
        </div>
      </div>

      {exportedCount !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#34D399]/35 bg-[#34D399]/10 px-4 py-3 text-xs text-[#34D399]">
          <span className="inline-flex items-center gap-2 font-semibold">
            <Check className="h-4 w-4" />
            {exportedCount > 0
              ? `Added ${exportedCount} new ingredients to your Smart Grocery List!`
              : "All ingredients from this meal plan are already on your Grocery List."}
          </span>
          <button
            type="button"
            onClick={() => onNavigate("grocery")}
            className="font-bold underline"
          >
            Open Grocery List →
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
        <span>
          Active Plan Source: <strong className="text-[#34D399]">{sourceLabel}</strong>
        </span>
        <span>7-Day Schedule (Mon–Sun)</span>
      </div>

      {/* 7-Day Calendar Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {planDays.map((day) => (
          <motion.article
            key={day.day}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#141B16] p-5 transition hover:border-[#B6FF38]/40"
          >
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h2 className="font-display text-lg font-bold text-white">
                  {day.day}
                </h2>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="rounded-lg bg-[#080B09] px-2.5 py-1 font-bold text-[#B6FF38]">
                    ~<AnimatedNumber value={day.estimated_calories} /> kcal
                  </span>
                  <span className="rounded-lg bg-[#080B09] px-2.5 py-1 font-semibold text-[#34D399]">
                    ~<AnimatedNumber value={day.estimated_protein_g} />g P
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                {(
                  [
                    { key: "breakfast" as const, label: "Breakfast", text: day.breakfast },
                    { key: "lunch" as const, label: "Lunch", text: day.lunch },
                    { key: "snack" as const, label: "Snack", text: day.snack },
                    { key: "dinner" as const, label: "Dinner", text: day.dinner },
                  ]
                ).map((slot) => (
                  <div
                    key={slot.label}
                    className="rounded-xl border border-white/[0.06] bg-[#080B09] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#34D399]">
                        {slot.label}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setPlanDays((prev) =>
                            swapSlotInPlan(
                              prev,
                              day.day,
                              slot.key,
                              PLANNER_STORAGE_KEY,
                            ),
                          )
                        }
                        title={`Swap ${slot.label.toLowerCase()} option`}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#141B16] px-2 py-0.5 text-[10px] font-semibold text-[#A3ADA6] transition hover:border-[#B6FF38]/50 hover:text-[#B6FF38]"
                      >
                        <ArrowLeftRight className="h-2.5 w-2.5" />
                        <span>Swap</span>
                      </button>
                    </div>
                    <p className="mt-1.5 leading-relaxed text-zinc-200">
                      {slot.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/[0.08] pt-3">
              {day.grocery_items.map((ing) => (
                <span
                  key={ing}
                  className="rounded-full border border-white/10 bg-[#101713] px-2.5 py-0.5 text-[10px] text-[#A3ADA6]"
                >
                  {ing}
                </span>
              ))}
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
