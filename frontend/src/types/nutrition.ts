export type AppView = "home" | "scanner" | "alternatives" | "categories" | "dashboard";

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
