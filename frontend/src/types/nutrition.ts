export type AppView =
  | "home"
  | "scanner"
  | "alternatives"
  | "categories"
  | "dashboard"
  | "planner"
  | "indian-foods"
  | "grocery"
  | "budget"
  | "dosha"
  | "womens-wellness"
  | "recommended-products"
  | "global-nutrition"
  | "men"
  | "baby"
  | "patient";

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

export type ProfileCategory = "male" | "female" | "child";

export interface UserNutritionProfile {
  name: string;
  age: number;
  sex: "male" | "female";
  userCategory?: ProfileCategory;
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
  fibre_per_100g?: number;
  sugar_per_100g?: number;
  sodium_mg_per_100g?: number;
  fibre?: number;
  sugar?: number;
  sodium_mg?: number;
  source_type?: "icmr_nin" | "usda_fdc" | "japan_mext" | "unmatched";
  source_label?: string;
  confident?: boolean;
  needs_confirmation?: boolean;
  uncertainty_reason?: string | null;
}

export interface EstimatedPortion {
  amount: number;
  unit: string;
  label: string;
}

export interface NutrientDetailMetric {
  name: string;
  amount: number;
  unit: string;
  source: string;
}

export interface AnalyzedIngredient {
  id: string;
  name: string;
  canonical_match?: string | null;
  estimated_grams: number;
  unit: string;
  confident: boolean;
  needs_confirmation: boolean;
  confirmed_by_user: boolean;
  uncertainty_reason?: string | null;
  source_type: "icmr_nin" | "usda_fdc" | "unmatched";
  source_label: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  fibre: number;
  sugar: number;
  sodium_mg: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  fibre_per_100g: number;
  sugar_per_100g: number;
  sodium_mg_per_100g: number;
  calcium_mg: number;
  iron_mg: number;
  vitamin_c_mg: number;
  potassium_mg: number;
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
  food_name?: string;
  food_description?: string;
  ingredients?: AnalyzedIngredient[];
  estimated_portion?: EstimatedPortion;
  portion_confidence?: "high" | "medium" | "low";
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fats?: number;
  fibre?: number;
  sugar?: number;
  sodium?: NutrientDetailMetric;
  other_available_nutrients?: NutrientDetailMetric[];
  confidence?: "high" | "medium" | "low";
  data_sources?: string[];
  analysis_limitations?: string[];
  model_used?: string;
  uploaded_file_id?: number | null;
  uploaded_image_ref?: string | null;
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
  foodName: string;
  foodDescription: string;
  estimatedPortion: EstimatedPortion;
  portionConfidence: "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  ingredients: AnalyzedIngredient[];
  initialIngredientGrams: Record<string, number>;
  fibre: number;
  sugar: number;
  sodiumMg: number;
  otherNutrients: NutrientDetailMetric[];
  dataSources: string[];
  analysisLimitations: string[];
  modelUsed?: string;
  uploadedFileId?: number | null;
  uploadedImageRef?: string | null;
  items: EditableFoodItem[];
  totals: MacroTotals;
  alternatives: HealthierAlternative[];
  scannedAt: string;
}

export type AccountProfileType = "personal" | "baby" | "patient";
export type AudienceChapterId = "men" | "women" | "babies" | "patients";
export type FoodMeasurementSource = "manual" | "ai_scan" | "hardware";
export type HydrationMeasurementSource = "manual" | "hardware";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
}

export interface AccountProfile {
  id: number;
  user_id: number;
  profile_type: AccountProfileType;
  audience_chapter: AudienceChapterId;
  display_name: string;
  date_of_birth: string | null;
  age_years: number | null;
  age_months: number | null;
  dietary_preference: string | null;
  activity_level: string | null;
  health_conditions: string[];
  allergies: string[];
  calorie_goal: number | null;
  protein_goal: number | null;
  carbs_goal: number | null;
  fats_goal: number | null;
  fibre_goal: number | null;
  water_goal_ml: number | null;
  is_default: boolean;
  created_at: string;
}

export interface AccountProfileCreate {
  profile_type: AccountProfileType;
  audience_chapter: AudienceChapterId;
  display_name: string;
  date_of_birth?: string | null;
  age_years?: number | null;
  age_months?: number | null;
  dietary_preference?: string | null;
  activity_level?: string | null;
  health_conditions?: string[];
  allergies?: string[];
  calorie_goal?: number | null;
  protein_goal?: number | null;
  carbs_goal?: number | null;
  fats_goal?: number | null;
  fibre_goal?: number | null;
  water_goal_ml?: number | null;
  is_default?: boolean;
}

export interface AccountProfileUpdate extends Partial<AccountProfileCreate> {
  clear_goals?: boolean;
}

export interface AuthSessionPayload {
  user: AuthUser;
  profiles: AccountProfile[];
}

export interface TrackedIngredientInput {
  name: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre?: number;
  sugar?: number;
  sodium_mg?: number;
  source_label?: string | null;
}

export interface TrackedFoodEntryCreate {
  profile_id: number;
  meal_name: string;
  meal_type: string;
  measurement_source: FoodMeasurementSource;
  hardware_device_id?: string | null;
  total_portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre?: number;
  sugar?: number;
  sodium_mg?: number;
  calcium_mg?: number | null;
  iron_mg?: number | null;
  vitamin_c_mg?: number | null;
  potassium_mg?: number | null;
  ingredients?: TrackedIngredientInput[];
  image_file_id?: number | null;
  image_ref?: string | null;
  ai_estimated?: boolean;
  confirmed_by_user?: boolean;
  nutrition_sources?: string[];
  notes?: string | null;
}

export interface TrackedFoodEntry {
  id: number;
  user_id: number;
  profile_id: number;
  meal_name: string;
  meal_type: string;
  measurement_source: FoodMeasurementSource;
  hardware_device_id: string | null;
  total_portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number;
  sugar: number;
  sodium_mg: number;
  calcium_mg: number | null;
  iron_mg: number | null;
  vitamin_c_mg: number | null;
  potassium_mg: number | null;
  ingredients: TrackedIngredientInput[];
  image_file_id: number | null;
  image_ref: string | null;
  ai_estimated: boolean;
  confirmed_by_user: boolean;
  confirmed_at: string | null;
  nutrition_sources: string[];
  notes: string | null;
  consumed_at: string;
}

export interface WorkspaceStateData {
  saved_meal_plan: MealPlanDay[];
  planner_source: string | null;
  grocery_items: GroceryItem[];
  daily_targets: DailyMacroTargets | null;
  updated_at: string | null;
}

export interface HydrationEntryCreate {
  profile_id: number;
  amount_ml: number;
  measurement_source?: HydrationMeasurementSource;
  hardware_device_id?: string | null;
  notes?: string | null;
}

export interface HydrationEntry {
  id: number;
  user_id: number;
  profile_id: number;
  amount_ml: number;
  measurement_source: HydrationMeasurementSource;
  hardware_device_id: string | null;
  notes: string | null;
  logged_at: string;
}

export interface ActivityEntryCreate {
  profile_id: number;
  activity_type: string;
  duration_minutes: number;
  intensity?: string | null;
  estimated_calories_burned?: number | null;
  notes?: string | null;
}

export interface ActivityEntry {
  id: number;
  user_id: number;
  profile_id: number;
  activity_type: string;
  duration_minutes: number;
  intensity: string | null;
  estimated_calories_burned: number | null;
  notes: string | null;
  logged_at: string;
}

export interface DailyHistoryPoint {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number;
  water_ml: number;
  activity_minutes: number;
  meal_count: number;
}

export interface SafetyContext {
  profile_type: AccountProfileType;
  non_diagnostic_notice: string;
  recorded_allergies: string[];
  recorded_conditions: string[];
  evidence_points: string[];
  choking_or_infant_alerts: string[];
}

export interface ProfileDashboardData {
  profile: AccountProfile;
  selected_date: string | null;
  nutrition_summary: {
    meal_count: number;
    total_portion_grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fibre: number;
    sugar: number;
    sodium_mg: number;
    calcium_mg: number;
    iron_mg: number;
    vitamin_c_mg: number;
    potassium_mg: number;
  };
  hydration_summary: {
    total_ml: number;
    entries_count: number;
    goal_ml: number | null;
  };
  activity_summary: {
    total_minutes: number;
    entries_count: number;
  };
  recent_foods: TrackedFoodEntry[];
  hydration_entries: HydrationEntry[];
  activity_entries: ActivityEntry[];
  daily_history: DailyHistoryPoint[];
  safety_context: SafetyContext;
}

export interface WomensPreferences {
  profile_id: number;
  consent_given: boolean;
  consent_updated_at: string | null;
  tracking_enabled: boolean;
  reminders_enabled: boolean;
  reminder_days_before: number | null;
  typical_cycle_length: number;
  typical_period_days: number;
  age_band: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi_consent_given: boolean;
  dietary_preferences: string[];
  activity_preferences: string[];
  optional_goals: string[];
  created_at?: string;
  updated_at: string;
}

export interface WomensPreferencesUpdate {
  profile_id: number;
  consent_given?: boolean;
  tracking_enabled?: boolean;
  reminders_enabled?: boolean;
  reminder_days_before?: number | null;
  typical_cycle_length?: number;
  typical_period_days?: number;
  age_band?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  bmi_consent_given?: boolean;
  clear_bmi_metrics?: boolean;
  dietary_preferences?: string[];
  activity_preferences?: string[];
  optional_goals?: string[];
}

export type ConsentType =
  | "wellness_profile"
  | "period_tracking"
  | "bmi_screening"
  | "reminders";

export interface ConsentEvent {
  id: number;
  profile_id: number;
  consent_type: ConsentType | string;
  consent_status: "granted" | "withdrawn" | string;
  consent_version: string;
  consented_at: string;
  withdrawn_at: string | null;
}

export interface BmiHistoryEntry {
  id: number;
  profile_id: number;
  bmi_value: number;
  assessment_mode: string;
  percentile: number | null;
  height_cm_used: number;
  weight_kg_used: number;
  age_years_used: number | null;
  consent_confirmed: boolean;
  headline: string;
  context_note: string;
  calculated_at: string;
}

export type FlowLevel = "spotting" | "light" | "moderate" | "heavy" | "skipped";

export interface PeriodRecord {
  id: number;
  profile_id: number;
  start_date: string;
  end_date: string | null;
  flow_level: FlowLevel | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SymptomMoodRecord {
  id: number;
  profile_id: number;
  period_record_id?: number | null;
  record_date: string;
  symptoms: string[];
  symptom_severity?: "mild" | "moderate" | "severe" | null;
  cramps_level?: "none" | "mild" | "moderate" | "severe" | null;
  energy_level?: "low" | "moderate" | "steady" | null;
  symptom_other_text: string | null;
  mood: string | null;
  mood_other_text: string | null;
  notes: string | null;
  created_at: string;
}

export interface CycleEstimate {
  has_estimate: boolean;
  next_period_estimated_start: string | null;
  average_cycle_days: number;
  disclaimer: string;
}

export interface WomensSummaryData {
  preferences: WomensPreferences;
  period_records: PeriodRecord[];
  symptom_records: SymptomMoodRecord[];
  consents: ConsentEvent[];
  bmi_history: BmiHistoryEntry[];
  estimate: CycleEstimate;
}

export type ProductCategoryId =
  | "women_period_care"
  | "fitness_accessories"
  | "nutrition_products"
  | "hydration_products"
  | "baby_care"
  | "patient_care";

export type ProductBudgetTier =
  | "budget_friendly"
  | "value_for_money"
  | "premium_quality";

export interface RetailerListing {
  listing_id: number;
  retailer_slug: string;
  retailer_name: string;
  retailer_domain: string;
  destination_url: string;
  redirect_path: string;
  is_affiliate: boolean;
  link_type: string;
  price_inr: number | null;
  original_price_inr?: number | null;
  price_display: string;
  live_price_verified: boolean;
  availability: string;
  last_checked_at: string;
  source_provenance?: string | null;
  disclosure_text: string;
  is_sponsored: boolean;
}

export interface ProductCatalogEntry {
  id: number;
  slug: string;
  name: string;
  variant_label?: string | null;
  brand: string;
  category: ProductCategoryId;
  sub_category?: string | null;
  audience_tags: string[];
  budget_tier: ProductBudgetTier;
  image_path: string;
  has_verified_image?: boolean;
  image_caption: string;
  features: string[];
  quality_notes: string;
  listings: RetailerListing[];
}

export interface ProductRedirectInfo {
  listing_id: number;
  destination_url: string;
  is_affiliate: boolean;
  link_type: string;
  disclosure_text: string;
  commission_status: string;
  attribution_token: string;
}

export interface ServicePreviewEntry {
  id: string;
  title: string;
  status: string;
}

export interface HealthcareProviderEntry {
  id: number;
  slug: string;
  provider_type: string;
  name: string;
  qualifications: string;
  registration_details: string;
  specialization: string;
  hospital_or_organization: string;
  location: string;
  consultation_mode: string;
  availability: string;
  consultation_fees_note: string;
  verification_source: string;
  official_url: string;
  booking_status: string;
  is_sponsored: boolean;
}

export interface DiagnosticLabEntry {
  id: number;
  slug: string;
  name: string;
  available_tests_note: string;
  location: string;
  accreditation_note: string;
  pricing_note: string;
  official_booking_url: string;
  booking_integration_status: string;
  is_sponsored: boolean;
}

export interface SubscriptionPlanPreview {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  features: string[];
  status: string;
  billing_active: boolean;
}

// ---------------------------------------------------------------------------
// Global Nutrition & Japan-Inspired National Nutrition Intelligence Types
// ---------------------------------------------------------------------------

export interface GlobalCountryInfo {
  country_code: string;
  name: string;
  system_inspiration: string;
  primary_source: string;
  foods_count: number;
  disclaimer: string;
}

export interface GlobalComparePreset {
  id: string;
  title: string;
  left_slug: string;
  right_slug: string;
  left_grams: number;
  right_grams: number;
}

export interface GlobalFoodItem {
  id: number;
  slug: string;
  name: string;
  country_code: "JP" | "IN" | string;
  food_category: string;
  is_vegetarian: boolean;
  serving_label: string;
  serving_grams: number;
  preparation_method: string;
  preparation_state: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  fibre_per_100g: number;
  iron_mg_per_100g: number;
  calcium_mg_per_100g: number;
  sodium_mg_per_100g: number;
  allergens: string[];
  healthier_swap_note: string;
  data_source: string;
  source_version: string;
  publication_year: number;
  verification_status: string;
  has_verified_image: boolean;
  image_path: string;
}

export interface ScaledGlobalFood {
  slug: string;
  name: string;
  country_code: string;
  food_category: string;
  is_vegetarian: boolean;
  grams: number;
  serving_label: string;
  preparation_method: string;
  preparation_state: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number;
  iron_mg: number;
  calcium_mg: number;
  sodium_mg: number;
  allergens: string[];
  healthier_swap_note: string;
  data_source: string;
  source_version: string;
  publication_year: number;
  verification_status: string;
  has_verified_image: boolean;
  image_path: string;
}

export interface GlobalComparisonResponse {
  left: ScaledGlobalFood;
  right: ScaledGlobalFood;
  deltas: {
    calories: number;
    protein: number;
    fibre: number;
    sodium_mg: number;
    calcium_mg: number;
  };
  key_differences: string[];
  allergen_warnings: string[];
  better_fit_notes: string[];
  budget_note: string;
}

export interface FoodBalanceGroup {
  key: string;
  layer_order: number;
  name: string;
  recommended_sv_min: number;
  recommended_sv_max: number;
  unit_label: string;
  unit_definition: string;
  examples: string[];
  color_token: string;
  current_value: number;
  balance_status: "no_data_yet" | "underrepresented" | "balanced" | "overrepresented";
}

export interface FoodBalanceGuideResponse {
  title: string;
  concept_overview: string;
  serving_unit_explainer: string;
  disclaimer: string;
  groups: FoodBalanceGroup[];
  insights: string[];
  tracked_entries_count: number;
}

export interface FoodEducationTopic {
  slug: string;
  title: string;
  tag: string;
  summary: string;
  key_points: string[];
  daily_tip: string;
  quiz_question: string;
  quiz_options: string[];
  correct_index: number;
}

export interface FoodEducationProgressEntry {
  id: number;
  profile_id: number;
  topic_slug: string;
  completed: boolean;
  quiz_score: number;
  quiz_total: number;
  notes: string | null;
  updated_at: string;
}

export interface BentoSlotItem extends ScaledGlobalFood {
  slot: string;
  replacement_options: { slug: string; name: string }[];
}

export interface BentoPlanResponse {
  plan_title: string;
  meal_category: string;
  diet_preference: string;
  calorie_target: number;
  protein_target: number;
  budget: string;
  items: BentoSlotItem[];
  totals: {
    total_grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fibre: number;
    iron_mg: number;
    calcium_mg: number;
    sodium_mg: number;
  };
  preparation_instructions: string[];
  grocery_items: string[];
  source_attribution: string;
  saved_plan_id: number | null;
}

export interface SeasonalFoodRecord {
  id: number;
  slug: string;
  country_code: "JP" | "IN" | string;
  season: "spring" | "summer" | "autumn" | "winter" | string;
  food_group: string;
  name: string;
  is_vegetarian: boolean;
  regional_availability_note: string;
  nutritional_highlights: string;
  seasonal_recipe_idea: string;
  paired_indian_alternative: string;
  data_source: string;
  verification_status: string;
  has_verified_image: boolean;
  image_path: string;
}

export interface TraditionalJapaneseMeal {
  id: string;
  title: string;
  category: string;
  is_vegetarian: boolean;
  serving_label: string;
  serving_grams: number;
  ingredient_breakdown: {
    slug: string;
    name: string;
    grams: number;
    calories: number;
    protein: number;
  }[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fibre: number;
    iron_mg: number;
    calcium_mg: number;
    sodium_mg: number;
  };
  cooking_instructions: string[];
  allergens: string[];
  healthier_indian_alternative: string;
  data_source: string;
  has_verified_image: boolean;
  image_path: string;
}

export interface GlobalDashboardSummary {
  profile_id: number;
  period_days: number;
  today_totals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fibre: number;
    hydration_ml: number;
    activity_minutes: number;
  };
  cuisine_breakdown: {
    indian_meals: number;
    japanese_meals: number;
    other_balanced_meals: number;
  };
  meal_diversity_count: number;
  education_completed_count: number;
  education_total_topics: number;
  weekly_trends: {
    date: string;
    calories: number;
    protein: number;
    fibre: number;
    water_ml: number;
    activity_minutes: number;
  }[];
  insights_note: string;
}
