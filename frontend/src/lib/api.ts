import type {
  AccountProfile,
  AccountProfileCreate,
  AccountProfileUpdate,
  ActivityEntry,
  ActivityEntryCreate,
  AnalyzedIngredient,
  AuthSessionPayload,
  BmiHistoryEntry,
  ConsentEvent,
  ConsentType,
  DashboardFoodEntry,
  DashboardFoodsResponse,
  DashboardSummary,
  EditableFoodItem,
  HydrationEntry,
  HydrationEntryCreate,
  MacroTotals,
  MealLogCreate,
  MealLogResponse,
  ProductRedirectInfo,
  ProfileDashboardData,
  RecalculateResponse,
  ScanResponse,
  ServicePreviewEntry,
  TrackedFoodEntry,
  TrackedFoodEntryCreate,
  DiagnosticLabEntry,
  FlowLevel,
  HealthcareProviderEntry,
  PeriodRecord,
  ProductCatalogEntry,
  ProductCategoryId,
  SubscriptionPlanPreview,
  SymptomMoodRecord,
  WorkspaceStateData,
  WomensPreferences,
  WomensPreferencesUpdate,
  WomensSummaryData,
  BentoPlanResponse,
  FoodBalanceGuideResponse,
  FoodEducationProgressEntry,
  FoodEducationTopic,
  GlobalComparePreset,
  GlobalComparisonResponse,
  GlobalCountryInfo,
  GlobalDashboardSummary,
  GlobalFoodItem,
  SeasonalFoodRecord,
  TraditionalJapaneseMeal,
} from "../types/nutrition";

const runtimeHost =
  typeof window !== "undefined" && window.location.hostname
    ? window.location.hostname
    : "127.0.0.1";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || `http://${runtimeHost}:8000`
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
      return String(data.detail[0].msg);
    }
    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {
    // Fall back to HTTP status text when body is not JSON.
  }
  return `Request failed (${response.status} ${response.statusText || "Error"})`;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function scaleItemFromPortion(
  item: EditableFoodItem,
  portionGrams: number,
): EditableFoodItem {
  const safeGrams = Math.max(0, portionGrams);
  const factor = safeGrams / 100;
  return {
    ...item,
    portion_grams: round2(safeGrams),
    calories: round2(item.calories_per_100g * factor),
    protein: round2(item.protein_per_100g * factor),
    carbs: round2(item.carbs_per_100g * factor),
    fats: round2(item.fats_per_100g * factor),
    fibre: round2((item.fibre_per_100g ?? 0) * factor),
    sugar: round2((item.sugar_per_100g ?? 0) * factor),
    sodium_mg: round2((item.sodium_mg_per_100g ?? 0) * factor),
  };
}

export function scaleIngredientFromGrams(
  ing: AnalyzedIngredient,
  grams: number,
): AnalyzedIngredient {
  const safeGrams = Math.max(0, grams);
  const prevGrams = Math.max(ing.estimated_grams, 0);
  const factor = safeGrams / 100;
  const ratio = prevGrams > 0 ? safeGrams / prevGrams : 0;

  return {
    ...ing,
    estimated_grams: round2(safeGrams),
    calories: round2(ing.calories_per_100g * factor),
    protein: round2(ing.protein_per_100g * factor),
    carbohydrates: round2(ing.carbs_per_100g * factor),
    fats: round2(ing.fats_per_100g * factor),
    fibre: round2(ing.fibre_per_100g * factor),
    sugar: round2(ing.sugar_per_100g * factor),
    sodium_mg: round2(ing.sodium_mg_per_100g * factor),
    calcium_mg: round2(ing.calcium_mg * ratio),
    iron_mg: round2(ing.iron_mg * ratio),
    vitamin_c_mg: round2(ing.vitamin_c_mg * ratio),
    potassium_mg: round2(ing.potassium_mg * ratio),
  };
}

export interface ImageValidationResult {
  valid: boolean;
  detectedMime: "image/jpeg" | "image/png" | "image/webp" | null;
  error?: string;
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME_LIST = ["image/jpeg", "image/png", "image/webp"] as const;
const EXT_TO_MIME: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Inspect actual image binary header in browser to ensure format matches MIME/extension. */
export async function validateFoodImageFile(file: File): Promise<ImageValidationResult> {
  if (!file || file.size === 0) {
    return { valid: false, detectedMime: null, error: "Selected image file is empty." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      detectedMime: null,
      error: "Image exceeds the 20 MB upload limit. Please choose a smaller photo.",
    };
  }

  const buf = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let detectedMime: "image/jpeg" | "image/png" | "image/webp" | null = null;

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    detectedMime = "image/jpeg";
  } else if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    detectedMime = "image/png";
  } else if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    detectedMime = "image/webp";
  }

  if (!detectedMime) {
    return {
      valid: false,
      detectedMime: null,
      error: "Unsupported or corrupted image file. Please select a valid JPG, JPEG, PNG, or WEBP photo.",
    };
  }

  const rawType = (file.type || "").toLowerCase() === "image/jpg" ? "image/jpeg" : (file.type || "").toLowerCase();
  if (rawType && rawType.startsWith("image/") && !ALLOWED_MIME_LIST.includes(rawType as (typeof ALLOWED_MIME_LIST)[number])) {
    return {
      valid: false,
      detectedMime: null,
      error: `Format '${rawType}' is not supported. Use JPG, JPEG, PNG, or WEBP.`,
    };
  }
  if (rawType && rawType.startsWith("image/") && rawType !== detectedMime) {
    return {
      valid: false,
      detectedMime: null,
      error: `MIME mismatch: file contents are ${detectedMime}, not ${rawType}.`,
    };
  }

  const lowerName = (file.name || "").toLowerCase();
  const dotIdx = lowerName.lastIndexOf(".");
  if (dotIdx !== -1) {
    const ext = lowerName.slice(dotIdx);
    const expected = EXT_TO_MIME[ext];
    if (expected && expected !== detectedMime) {
      return {
        valid: false,
        detectedMime: null,
        error: `Extension '${ext}' does not match actual image encoding (${detectedMime}).`,
      };
    }
  }

  return { valid: true, detectedMime };
}

export async function lookupIngredientNutrition(
  name: string,
  grams = 100,
): Promise<{ found: boolean; ingredient: AnalyzedIngredient | null; message: string }> {
  const params = new URLSearchParams({ name, grams: String(grams) });
  const response = await fetch(`${API_BASE_URL}/api/lookup-ingredient?${params.toString()}`);
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<{ found: boolean; ingredient: AnalyzedIngredient | null; message: string }>;
}

export function computeTotals(items: EditableFoodItem[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (acc, item) => ({
      portion_grams: round2(acc.portion_grams + item.portion_grams),
      calories: round2(acc.calories + item.calories),
      protein: round2(acc.protein + item.protein),
      carbs: round2(acc.carbs + item.carbs),
      fats: round2(acc.fats + item.fats),
    }),
    { portion_grams: 0, calories: 0, protein: 0, carbs: 0, fats: 0 },
  );
}

export async function scanFoodImage(file: File): Promise<ScanResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/scan`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return response.json() as Promise<ScanResponse>;
}

export async function recalculateMacros(
  items: EditableFoodItem[],
  signal?: AbortSignal,
): Promise<RecalculateResponse> {
  const response = await fetch(`${API_BASE_URL}/api/recalculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      items: items.map((item) => ({
        name: item.name,
        portion_grams: item.portion_grams,
        calories_per_100g: item.calories_per_100g,
        protein_per_100g: item.protein_per_100g,
        carbs_per_100g: item.carbs_per_100g,
        fats_per_100g: item.fats_per_100g,
      })),
    }),
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return response.json() as Promise<RecalculateResponse>;
}

export async function createMealLog(payload: MealLogCreate): Promise<MealLogResponse> {
  const response = await fetch(`${API_BASE_URL}/api/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return response.json() as Promise<MealLogResponse>;
}

function buildSummaryFromMeals(meals: MealLogResponse[]): DashboardSummary {
  let totalItems = 0;
  let totalPortionGrams = 0;
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;

  for (const meal of meals) {
    totalItems += meal.items?.length ?? 0;
    totalPortionGrams += meal.total_portion_grams ?? 0;
    totalCalories += meal.total_calories ?? 0;
    totalProtein += meal.total_protein ?? 0;
    totalCarbs += meal.total_carbs ?? 0;
    totalFats += meal.total_fats ?? 0;
  }

  return {
    total_meals: meals.length,
    total_items: totalItems,
    total_portion_grams: round2(totalPortionGrams),
    total_calories: round2(totalCalories),
    total_protein: round2(totalProtein),
    total_carbs: round2(totalCarbs),
    total_fats: round2(totalFats),
  };
}

function normalizeDashboardPayload(data: unknown): DashboardFoodsResponse {
  if (
    data &&
    typeof data === "object" &&
    "meals" in data &&
    Array.isArray((data as DashboardFoodsResponse).meals)
  ) {
    const typed = data as Partial<DashboardFoodsResponse>;
    const meals = typed.meals ?? [];
    const foods: DashboardFoodEntry[] =
      typed.foods ??
      meals.flatMap((meal) =>
        (meal.items ?? []).map((item) => ({
          ...item,
          meal_log_id: meal.id,
          meal_name: meal.meal_name,
          meal_type: meal.meal_type,
        })),
      );
    return {
      summary: typed.summary ?? buildSummaryFromMeals(meals),
      meals,
      foods,
    };
  }

  const mealsArray: MealLogResponse[] = Array.isArray(data)
    ? (data as MealLogResponse[])
    : data && typeof data === "object" && "logs" in data && Array.isArray((data as { logs: unknown }).logs)
      ? ((data as { logs: MealLogResponse[] }).logs ?? [])
      : [];

  const foods: DashboardFoodEntry[] = mealsArray.flatMap((meal) =>
    (meal.items ?? []).map((item) => ({
      ...item,
      meal_log_id: meal.id,
      meal_name: meal.meal_name,
      meal_type: meal.meal_type,
    })),
  );

  return {
    summary: buildSummaryFromMeals(mealsArray),
    meals: mealsArray,
    foods,
  };
}

export interface FetchLogsOptions {
  mealType?: string;
  date?: string;
}

export interface DashboardFetchResult {
  data: DashboardFoodsResponse;
  endpointUsed: "/api/logs" | "/api/foods";
}

export async function fetchMealLogs(
  options: FetchLogsOptions = {},
): Promise<DashboardFetchResult> {
  const params = new URLSearchParams();
  if (options.mealType && options.mealType !== "all") {
    params.set("meal_type", options.mealType);
  }
  if (options.date) {
    params.set("date", options.date);
  }
  const query = params.toString() ? `?${params.toString()}` : "";

  const logsResponse = await fetch(`${API_BASE_URL}/api/logs${query}`);
  if (logsResponse.ok) {
    const raw = await logsResponse.json();
    return {
      data: normalizeDashboardPayload(raw),
      endpointUsed: "/api/logs",
    };
  }

  // Fallback to /api/foods when backend exposes GET /api/foods for meal log retrieval.
  if (logsResponse.status === 404 || logsResponse.status === 405) {
    const foodsResponse = await fetch(`${API_BASE_URL}/api/foods${query}`);
    if (!foodsResponse.ok) {
      throw new ApiError(
        await parseErrorMessage(foodsResponse),
        foodsResponse.status,
      );
    }
    const raw = await foodsResponse.json();
    return {
      data: normalizeDashboardPayload(raw),
      endpointUsed: "/api/foods",
    };
  }

  throw new ApiError(await parseErrorMessage(logsResponse), logsResponse.status);
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export interface NutriChatApiRequest {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  nutrition_context?: {
    today_calories?: number;
    today_protein?: number;
    today_carbs?: number;
    today_fats?: number;
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fats?: number;
    recent_meals?: string[];
  };
}

export async function askNutriAssistant(
  payload: NutriChatApiRequest,
): Promise<{ reply: string; model_used: string }> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return response.json() as Promise<{ reply: string; model_used: string }>;
}

export interface WeeklyMealPlanApiResponse {
  preference: string;
  days: {
    day: string;
    breakfast: string;
    lunch: string;
    snack: string;
    dinner: string;
    estimated_calories: number;
    estimated_protein_g: number;
    grocery_items: string[];
  }[];
  source: string;
}

export async function generateAiMealPlan(payload: {
  preference: string;
  daily_calorie_target: number;
  budget_friendly: boolean;
}): Promise<WeeklyMealPlanApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/meal-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return response.json() as Promise<WeeklyMealPlanApiResponse>;
}

// ---------------------------------------------------------------------------
// Cookie-Authenticated User, Profile & Tracker APIs
// ---------------------------------------------------------------------------

async function authedJsonFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return response.json() as Promise<T>;
}

export function registerAccount(payload: {
  full_name: string;
  email: string;
  password: string;
  initial_profile?: AccountProfileCreate;
}): Promise<AuthSessionPayload> {
  return authedJsonFetch<AuthSessionPayload>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginAccount(payload: {
  email: string;
  password: string;
}): Promise<AuthSessionPayload> {
  return authedJsonFetch<AuthSessionPayload>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logoutAccount(): Promise<{ ok: boolean }> {
  return authedJsonFetch<{ ok: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

export function fetchCurrentSession(): Promise<AuthSessionPayload> {
  return authedJsonFetch<AuthSessionPayload>("/api/auth/me");
}

export function fetchUserProfiles(): Promise<AccountProfile[]> {
  return authedJsonFetch<AccountProfile[]>("/api/profiles");
}

export function createUserProfile(
  payload: AccountProfileCreate,
): Promise<AccountProfile> {
  return authedJsonFetch<AccountProfile>("/api/profiles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUserProfile(
  profileId: number,
  payload: AccountProfileUpdate,
): Promise<AccountProfile> {
  return authedJsonFetch<AccountProfile>(`/api/profiles/${profileId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteUserProfile(
  profileId: number,
): Promise<{ deleted: boolean }> {
  return authedJsonFetch<{ deleted: boolean }>(`/api/profiles/${profileId}`, {
    method: "DELETE",
  });
}

export function fetchProfileDashboard(params: {
  profileId: number;
  date?: string;
  days?: number;
}): Promise<ProfileDashboardData> {
  const qs = new URLSearchParams();
  qs.set("profile_id", String(params.profileId));
  if (params.date) qs.set("date", params.date);
  if (params.days) qs.set("days", String(params.days));
  qs.set("tz_offset_minutes", String(-new Date().getTimezoneOffset()));
  return authedJsonFetch<ProfileDashboardData>(
    `/api/tracker/dashboard?${qs.toString()}`,
  );
}

export function createTrackedFoodEntry(
  payload: TrackedFoodEntryCreate,
): Promise<TrackedFoodEntry> {
  return authedJsonFetch<TrackedFoodEntry>("/api/tracker/foods", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteTrackedFoodEntry(
  entryId: number,
): Promise<{ deleted: boolean }> {
  return authedJsonFetch<{ deleted: boolean }>(`/api/tracker/foods/${entryId}`, {
    method: "DELETE",
  });
}

export function createHydrationEntry(
  payload: HydrationEntryCreate,
): Promise<HydrationEntry> {
  return authedJsonFetch<HydrationEntry>("/api/tracker/hydration", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteHydrationEntry(
  entryId: number,
): Promise<{ deleted: boolean }> {
  return authedJsonFetch<{ deleted: boolean }>(
    `/api/tracker/hydration/${entryId}`,
    {
      method: "DELETE",
    },
  );
}

export function createActivityEntry(
  payload: ActivityEntryCreate,
): Promise<ActivityEntry> {
  return authedJsonFetch<ActivityEntry>("/api/tracker/activities", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteActivityEntry(
  entryId: number,
): Promise<{ deleted: boolean }> {
  return authedJsonFetch<{ deleted: boolean }>(
    `/api/tracker/activities/${entryId}`,
    {
      method: "DELETE",
    },
  );
}

// ---------------------------------------------------------------------------
// Women's Wellness Companion, Centralized Product Catalog & Directory APIs
// ---------------------------------------------------------------------------

export function fetchWomensSummary(profileId: number): Promise<WomensSummaryData> {
  return authedJsonFetch<WomensSummaryData>(
    `/api/women/summary?profile_id=${profileId}`,
  );
}

export function updateWomensPreferences(
  payload: WomensPreferencesUpdate,
): Promise<WomensPreferences> {
  return authedJsonFetch<WomensPreferences>("/api/women/preferences", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchWomensConsents(profileId: number): Promise<ConsentEvent[]> {
  return authedJsonFetch<ConsentEvent[]>(
    `/api/women/consents?profile_id=${profileId}`,
  );
}

export function recordWomensConsent(payload: {
  profile_id: number;
  consent_type: ConsentType;
  consent_status?: "granted" | "withdrawn";
  consent_version?: string;
}): Promise<ConsentEvent> {
  return authedJsonFetch<ConsentEvent>("/api/women/consents", {
    method: "POST",
    body: JSON.stringify({
      consent_status: "granted",
      consent_version: "v1.0",
      ...payload,
    }),
  });
}

export function withdrawWomensConsent(
  consentId: number,
): Promise<{ withdrawn: boolean }> {
  return authedJsonFetch<{ withdrawn: boolean }>(
    `/api/women/consents/${consentId}`,
    {
      method: "DELETE",
    },
  );
}

export function calculateAndSaveBmiEstimate(payload: {
  profile_id: number;
  height_cm: number;
  weight_kg: number;
  consent_confirmed: boolean;
}): Promise<BmiHistoryEntry> {
  return authedJsonFetch<BmiHistoryEntry>("/api/women/bmi/estimate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchBmiHistory(profileId: number): Promise<BmiHistoryEntry[]> {
  return authedJsonFetch<BmiHistoryEntry[]>(
    `/api/women/bmi/history?profile_id=${profileId}`,
  );
}

export function createPeriodRecord(payload: {
  profile_id: number;
  start_date: string;
  end_date?: string | null;
  flow_level?: FlowLevel | null;
  notes?: string | null;
}): Promise<PeriodRecord> {
  return authedJsonFetch<PeriodRecord>("/api/women/cycle", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePeriodRecord(
  recordId: number,
  payload: {
    start_date?: string;
    end_date?: string | null;
    flow_level?: FlowLevel | null;
    notes?: string | null;
  },
): Promise<PeriodRecord> {
  return authedJsonFetch<PeriodRecord>(`/api/women/cycle/${recordId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePeriodRecord(
  recordId: number,
): Promise<{ deleted: boolean }> {
  return authedJsonFetch<{ deleted: boolean }>(`/api/women/cycle/${recordId}`, {
    method: "DELETE",
  });
}

export function createSymptomMoodRecord(payload: {
  profile_id: number;
  period_record_id?: number | null;
  record_date: string;
  symptoms: string[];
  symptom_severity?: "mild" | "moderate" | "severe" | null;
  cramps_level?: "none" | "mild" | "moderate" | "severe" | null;
  energy_level?: "low" | "moderate" | "steady" | null;
  symptom_other_text?: string | null;
  mood?: string | null;
  mood_other_text?: string | null;
  notes?: string | null;
}): Promise<SymptomMoodRecord> {
  return authedJsonFetch<SymptomMoodRecord>("/api/women/symptoms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteSymptomRecord(
  recordId: number,
): Promise<{ deleted: boolean }> {
  return authedJsonFetch<{ deleted: boolean }>(
    `/api/women/symptoms/${recordId}`,
    {
      method: "DELETE",
    },
  );
}

export function exportWomensWellnessData(
  profileId: number,
): Promise<Record<string, unknown>> {
  return authedJsonFetch<Record<string, unknown>>(
    `/api/women/export?profile_id=${profileId}`,
  );
}

export function deleteAllWomensWellnessData(
  profileId: number,
): Promise<{ deleted_all: boolean }> {
  return authedJsonFetch<{ deleted_all: boolean }>(
    `/api/women/data?profile_id=${profileId}`,
    {
      method: "DELETE",
    },
  );
}

export async function fetchRecommendedProducts(params?: {
  category?: ProductCategoryId;
  sub_category?: string;
  audience?: string;
}): Promise<ProductCatalogEntry[]> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.sub_category) qs.set("sub_category", params.sub_category);
  if (params?.audience) qs.set("audience", params.audience);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/products${query}`);
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<ProductCatalogEntry[]>;
}

export async function recordProductAffiliateClick(
  productId: number,
  listingId: number,
  referrerSection: string,
): Promise<ProductRedirectInfo> {
  const response = await fetch(
    `${API_BASE_URL}/api/women/products/${productId}/affiliate-click`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_id: listingId,
        referrer_section: referrerSection,
      }),
    },
  );
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<ProductRedirectInfo>;
}

export async function fetchVerifiedProviders(
  providerType?: string,
  verifiedOnly?: boolean,
): Promise<HealthcareProviderEntry[]> {
  const qs = new URLSearchParams();
  if (providerType) qs.set("provider_type", providerType);
  if (verifiedOnly) qs.set("verified_only", "true");
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/directory/providers${query}`);
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<HealthcareProviderEntry[]>;
}

export async function fetchDiagnosticLabs(): Promise<DiagnosticLabEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/directory/labs`);
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<DiagnosticLabEntry[]>;
}

export async function fetchSubscriptionPreviews(): Promise<
  SubscriptionPlanPreview[]
> {
  const response = await fetch(`${API_BASE_URL}/api/directory/subscriptions`);
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<SubscriptionPlanPreview[]>;
}

export async function fetchPremiumServices(): Promise<ServicePreviewEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/women/premium/services`);
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<ServicePreviewEntry[]>;
}

export function saveAppointmentPreviewNote(payload: {
  profile_id: number;
  provider_slug?: string | null;
  lab_slug?: string | null;
  preferred_date?: string | null;
  notes?: string | null;
}): Promise<{ id: number; booking_status: string }> {
  return authedJsonFetch<{ id: number; booking_status: string }>(
    "/api/directory/appointments",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteOwnAccount(): Promise<{ account_deleted: boolean }> {
  return authedJsonFetch<{ account_deleted: boolean }>("/api/auth/account", {
    method: "DELETE",
  });
}

export function fetchWorkspaceState(): Promise<WorkspaceStateData> {
  return authedJsonFetch<WorkspaceStateData>("/api/workspace/state");
}

export function saveWorkspaceState(payload: {
  saved_meal_plan?: WorkspaceStateData["saved_meal_plan"];
  planner_source?: string | null;
  grocery_items?: WorkspaceStateData["grocery_items"];
  daily_targets?: WorkspaceStateData["daily_targets"];
}): Promise<WorkspaceStateData> {
  return authedJsonFetch<WorkspaceStateData>("/api/workspace/state", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Global & Japan-Inspired Nutrition Intelligence APIs
// ---------------------------------------------------------------------------

export async function fetchGlobalCountries(): Promise<{
  countries: GlobalCountryInfo[];
  compare_presets: GlobalComparePreset[];
}> {
  const response = await fetch(`${API_BASE_URL}/api/global/countries`);
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json();
}

export async function fetchGlobalFoods(params?: {
  country?: string;
  category?: string;
  q?: string;
  vegetarian_only?: boolean;
}): Promise<GlobalFoodItem[]> {
  const qs = new URLSearchParams();
  if (params?.country) qs.set("country", params.country);
  if (params?.category) qs.set("category", params.category);
  if (params?.q) qs.set("q", params.q);
  if (params?.vegetarian_only) qs.set("vegetarian_only", "true");
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/global/foods${query}`);
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<GlobalFoodItem[]>;
}

export async function fetchGlobalFoodDetail(
  foodRef: string | number,
): Promise<GlobalFoodItem> {
  const response = await fetch(
    `${API_BASE_URL}/api/global/foods/${encodeURIComponent(String(foodRef))}`,
  );
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<GlobalFoodItem>;
}

export async function compareGlobalFoods(payload: {
  left_food_slug: string;
  right_food_slug: string;
  left_grams?: number;
  right_grams?: number;
  diet_preference?: string;
  allergies?: string[];
  profile_id?: number | null;
  save_comparison?: boolean;
}): Promise<GlobalComparisonResponse> {
  const response = await fetch(`${API_BASE_URL}/api/global/compare`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<GlobalComparisonResponse>;
}

export async function fetchFoodBalanceGuide(
  profileId?: number | null,
): Promise<FoodBalanceGuideResponse> {
  const qs = profileId ? `?profile_id=${profileId}` : "";
  const response = await fetch(
    `${API_BASE_URL}/api/global/food-balance-guide${qs}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<FoodBalanceGuideResponse>;
}

export async function fetchGlobalEducation(): Promise<{
  module_title: string;
  inspiration: string;
  topics: FoodEducationTopic[];
}> {
  const response = await fetch(`${API_BASE_URL}/api/global/education`);
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json();
}

export function fetchEducationProgress(
  profileId: number,
): Promise<FoodEducationProgressEntry[]> {
  return authedJsonFetch<FoodEducationProgressEntry[]>(
    `/api/global/education/progress?profile_id=${profileId}`,
  );
}

export function saveEducationProgress(payload: {
  profile_id: number;
  topic_slug: string;
  completed?: boolean;
  quiz_score: number;
  quiz_total: number;
  notes?: string | null;
}): Promise<FoodEducationProgressEntry> {
  return authedJsonFetch<FoodEducationProgressEntry>(
    "/api/global/education/progress",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function generateBentoPlan(payload: {
  profile_id?: number | null;
  meal_category: string;
  calorie_target: number;
  protein_target: number;
  diet_preference: "any" | "vegetarian";
  allergies?: string[];
  exclusions?: string[];
  budget?: "low_budget" | "balanced" | "flexible";
  ingredient_overrides?: Record<string, string>;
  save_plan?: boolean;
}): Promise<BentoPlanResponse> {
  const response = await fetch(`${API_BASE_URL}/api/global/bento/generate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<BentoPlanResponse>;
}

export async function fetchSeasonalFoods(params?: {
  country?: string;
  season?: string;
  vegetarian_only?: boolean;
}): Promise<SeasonalFoodRecord[]> {
  const qs = new URLSearchParams();
  if (params?.country) qs.set("country", params.country);
  if (params?.season) qs.set("season", params.season);
  if (params?.vegetarian_only) qs.set("vegetarian_only", "true");
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const response = await fetch(
    `${API_BASE_URL}/api/global/seasonal-foods${query}`,
  );
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<SeasonalFoodRecord[]>;
}

export async function fetchTraditionalJapaneseMeals(params?: {
  category?: string;
  vegetarian_only?: boolean;
}): Promise<TraditionalJapaneseMeal[]> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.vegetarian_only) qs.set("vegetarian_only", "true");
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/global/meals${query}`);
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json() as Promise<TraditionalJapaneseMeal[]>;
}

export function fetchGlobalDashboardSummary(
  profileId: number,
  days: number = 7,
): Promise<GlobalDashboardSummary> {
  return authedJsonFetch<GlobalDashboardSummary>(
    `/api/global/dashboard-summary?profile_id=${profileId}&days=${days}`,
  );
}
