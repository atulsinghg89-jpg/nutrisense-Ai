import type {
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
  };
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
