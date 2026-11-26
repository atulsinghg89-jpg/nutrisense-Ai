export type AppView =
  | "home"
  | "scanner"
  | "alternatives"
  | "categories"
  | "dashboard"
  | "planner"
  | "indian-foods"
  | "grocery";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export interface MealPlanDay {
  day: string;
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
  estimated_calories: number;
  estimated_protein_g: number;
  grocery_items: string[];
}

export interface GroceryItem {
  id: string;
  name: string;
  category: "Proteins & Dairy" | "Grains & Pulses" | "Produce & Herbs" | "Pantry & Spices";
  completed: boolean;
  source?: string;
}

export type FitnessGoal =
  | "weight_loss"
  | "weight_gain"
  | "muscle_building"
  | "healthy_lifestyle";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export interface UserNutritionProfile {
  name: string;
  age: number;
  sex: "male" | "female";
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  dietaryPreference: "vegetarian" | "eggetarian" | "non_vegetarian" | "vegan";
  fitnessGoal: FitnessGoal;
  onboardingCompleted: boolean;
}

export interface ScanHistoryEntry {
  id: string;
  scannedAt: string;
  itemsSummary: string;
  itemCount: number;
  calories: number;
  protein: number;
}

export interface MacroTotals {
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface FoodItemMacros {
  name: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface ScannedFoodItem extends FoodItemMacros {
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
}

export interface EditableFoodItem extends ScannedFoodItem {
  id: string;
  initial_portion_grams: number;
}

export interface HealthierAlternative {
  name: string;
  replaces: string;
  reason: string;
  estimated_calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface ScanResponse {
  items: ScannedFoodItem[];
  totals: MacroTotals;
  healthier_alternatives: HealthierAlternative[];
}

export interface RecalculateResponse {
  items: ScannedFoodItem[];
  totals: MacroTotals;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "meal";

export interface MealLogCreate {
  meal_name?: string;
  meal_type: MealType;
  notes?: string;
  items: FoodItemMacros[];
}

export interface LoggedFoodItemResponse extends FoodItemMacros {
  id: number;
  meal_log_id: number;
  logged_at: string;
}

export interface MealLogResponse {
  id: number;
  meal_name: string;
  meal_type: string;
  notes: string | null;
  total_portion_grams: number;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  logged_at: string;
  items: LoggedFoodItemResponse[];
}

export interface DashboardFoodEntry extends FoodItemMacros {
  id: number;
  meal_log_id: number;
  meal_name: string;
  meal_type: string;
  logged_at: string;
}

export interface DashboardSummary {
  total_meals: number;
  total_items: number;
  total_portion_grams: number;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
}

export interface DashboardFoodsResponse {
  summary: DashboardSummary;
  meals: MealLogResponse[];
  foods: DashboardFoodEntry[];
}

export interface DailyMacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface ScanSession {
  imagePreviewUrl: string | null;
  fileName: string | null;
  items: EditableFoodItem[];
  totals: MacroTotals;
  alternatives: HealthierAlternative[];
  scannedAt: string;
}
