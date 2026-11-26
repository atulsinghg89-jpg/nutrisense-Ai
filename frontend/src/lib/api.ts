import type {
  AnalyzedIngredient,
  DashboardFoodEntry,
  DashboardFoodsResponse,
  DashboardSummary,
  EditableFoodItem,
  MacroTotals,
  MealLogCreate,
  MealLogResponse,
  RecalculateResponse,
  ScanResponse,
} from "../types/nutrition";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
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
