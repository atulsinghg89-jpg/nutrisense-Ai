import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  ScanLine,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react";
import { EASE_PREMIUM } from "../components/MotionPrimitives";
import { ScanExperienceStory } from "../components/ScanExperienceStory";
import { useAuth } from "../context/AuthContext";
import {
  computeTotals,
  createMealLog,
  createTrackedFoodEntry,
  recalculateMacros,
  round2,
  scaleIngredientFromGrams,
  scaleItemFromPortion,
  scanFoodImage,
  validateFoodImageFile,
} from "../lib/api";
import type {
  AnalyzedIngredient,
  AppView,
  DailyMacroTargets,
  EditableFoodItem,
  MealType,
  ScanResponse,
  ScanSession,
} from "../types/nutrition";

interface ScannerViewProps {
  scanSession: ScanSession | null;
  onScanComplete: (session: ScanSession) => void;
  onUpdateSession: (session: ScanSession) => void;
  onUpdateItems: (items: EditableFoodItem[], totals: ScanSession["totals"]) => void;
  dailyTargets: DailyMacroTargets;
  onNavigate: (view: AppView) => void;
  onMealLogged: () => void;
}

const SCAN_HISTORY_STORAGE_KEY = "nutrisense_scan_history_v1";
const ACCEPTED_MIME_TYPES = "image/jpeg,image/png,image/webp";

interface CompactScanHistory {
  id: string;
  scannedAt: string;
  itemsSummary: string;
  itemCount: number;
  calories: number;
  protein: number;
}

function loadScanHistory(): CompactScanHistory[] {
  try {
    const raw = localStorage.getItem(SCAN_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CompactScanHistory[]) : [];
  } catch {
    return [];
  }
}

/** Creates a compact JPEG thumbnail (<= 960px, ~40-100KB) for smooth preview & session persistence. */
async function createCompactPreviewUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!rawDataUrl) {
        resolve("");
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height, 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function buildSessionFromScanResponse(
  result: ScanResponse,
  previewUrl: string | null,
  fileName: string | null,
): ScanSession {
  const editableItems: EditableFoodItem[] = result.items.map((item, idx) => ({
    ...item,
    id: `ing-${idx + 1}`,
    initial_portion_grams: item.portion_grams,
  }));

  const ingredients: AnalyzedIngredient[] = result.ingredients ?? [];
  const initialIngredientGrams: Record<string, number> = {};
  for (const ing of ingredients) {
    initialIngredientGrams[ing.id] = ing.estimated_grams;
  }

  return {
    imagePreviewUrl: previewUrl,
    fileName,
    foodName:
      result.food_name ||
      editableItems
        .slice(0, 2)
        .map((i) => i.name)
        .join(" & ") ||
      "Scanned Meal",
    foodDescription:
      result.food_description ||
      "Identified visible dishes and ingredients with ICMR–NIN and USDA database macros.",
    estimatedPortion: result.estimated_portion ?? {
      amount: result.totals.portion_grams,
      unit: "g",
      label: `~${Math.round(result.totals.portion_grams)} g estimated serving`,
    },
    portionConfidence: result.portion_confidence ?? "medium",
    confidence: result.confidence ?? "medium",
    ingredients,
    initialIngredientGrams,
    fibre: result.fibre ?? 0,
    sugar: result.sugar ?? 0,
    sodiumMg: result.sodium?.amount ?? 0,
    otherNutrients: result.other_available_nutrients ?? [],
    dataSources: result.data_sources ?? [
      "Google Gemini Vision",
      "ICMR–NIN IFCT 2017",
      "USDA FoodData Central",
    ],
    analysisLimitations: result.analysis_limitations ?? [
      "Portion weights are visual estimates from a single 2D photo.",
    ],
    modelUsed: result.model_used,
    uploadedFileId: result.uploaded_file_id ?? null,
    uploadedImageRef: result.uploaded_image_ref ?? null,
    items: editableItems,
    totals: result.totals,
    alternatives: result.healthier_alternatives,
    scannedAt: new Date().toISOString(),
  };
}

function recomputeSessionFromIngredients(
  prev: ScanSession,
  nextIngredients: AnalyzedIngredient[],
): ScanSession {
  let fibre = 0;
  let sugar = 0;
  let sodiumMg = 0;
  let calcium = 0;
  let iron = 0;
  let vitC = 0;
  let potassium = 0;

  const syncedItems: EditableFoodItem[] = nextIngredients.map((ing, idx) => {
    fibre += ing.fibre;
    sugar += ing.sugar;
    sodiumMg += ing.sodium_mg;
    calcium += ing.calcium_mg;
    iron += ing.iron_mg;
    vitC += ing.vitamin_c_mg;
    potassium += ing.potassium_mg;

    const existing = prev.items[idx];
    return {
      id: ing.id,
      name: ing.name,
      portion_grams: ing.estimated_grams,
      calories: ing.calories,
      protein: ing.protein,
      carbs: ing.carbohydrates,
      fats: ing.fats,
      calories_per_100g: ing.calories_per_100g,
      protein_per_100g: ing.protein_per_100g,
      carbs_per_100g: ing.carbs_per_100g,
      fats_per_100g: ing.fats_per_100g,
      fibre_per_100g: ing.fibre_per_100g,
      sugar_per_100g: ing.sugar_per_100g,
      sodium_mg_per_100g: ing.sodium_mg_per_100g,
      fibre: ing.fibre,
      sugar: ing.sugar,
      sodium_mg: ing.sodium_mg,
      source_type: ing.source_type,
      source_label: ing.source_label,
      confident: ing.confident,
      needs_confirmation: ing.needs_confirmation,
      uncertainty_reason: ing.uncertainty_reason,
      initial_portion_grams:
        prev.initialIngredientGrams[ing.id] ?? existing?.initial_portion_grams ?? ing.estimated_grams,
    };
  });

  const totals = computeTotals(syncedItems);
  const otherNutrients = [
    calcium > 0
      ? { name: "Calcium", amount: round2(calcium), unit: "mg", source: "ICMR–NIN / USDA per-100g tables" }
      : null,
    iron > 0
      ? { name: "Iron", amount: round2(iron), unit: "mg", source: "ICMR–NIN / USDA per-100g tables" }
      : null,
    vitC > 0
      ? { name: "Vitamin C", amount: round2(vitC), unit: "mg", source: "ICMR–NIN / USDA per-100g tables" }
      : null,
    potassium > 0
      ? { name: "Potassium", amount: round2(potassium), unit: "mg", source: "ICMR–NIN / USDA per-100g tables" }
      : null,
  ].filter((n): n is NonNullable<typeof n> => n !== null);

  return {
    ...prev,
    ingredients: nextIngredients,
    items: syncedItems,
    totals,
    estimatedPortion: {
      amount: totals.portion_grams,
      unit: "g",
      label: `~${Math.round(totals.portion_grams)} g adjusted serving`,
    },
    fibre: round2(fibre),
    sugar: round2(sugar),
    sodiumMg: round2(sodiumMg),
    otherNutrients,
  };
}

export function ScannerView({
  scanSession,
  onScanComplete,
  onUpdateSession,
  onUpdateItems,
  dailyTargets,
  onNavigate,
  onMealLogged,
}: ScannerViewProps) {
  const { user, profiles, activeProfileId } = useAuth();
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    activeProfileId,
  );

  useEffect(() => {
    setSelectedProfileId(activeProfileId);
  }, [activeProfileId]);

  const targetProfileId =
    selectedProfileId && profiles.some((p) => p.id === selectedProfileId)
      ? selectedProfileId
      : (activeProfileId ?? profiles[0]?.id ?? null);
  const selectedProfile =
    profiles.find((p) => p.id === targetProfileId) ?? null;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recalcAbortRef = useRef<AbortController | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    scanSession?.imagePreviewUrl ?? null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploaderOpen, setUploaderOpen] = useState<boolean>(
    !scanSession || scanSession.ingredients.length === 0,
  );

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanStageText, setScanStageText] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [recalcStatus, setRecalcStatus] = useState<"idle" | "syncing" | "synced">("idle");
  const [scanHistory, setScanHistory] = useState<CompactScanHistory[]>(() =>
    loadScanHistory(),
  );

  // Meal logging form
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [mealNotes, setMealNotes] = useState("");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState(false);

  const hasRichAnalysis = Boolean(scanSession && scanSession.ingredients.length > 0);

  // Keep meal name initialized from analyzed food name
  useEffect(() => {
    if (scanSession) {
      setMealName(scanSession.foodName || scanSession.items.slice(0, 2).map((i) => i.name).join(", "));
      if (scanSession.imagePreviewUrl && !selectedFile) {
        setPreviewUrl(scanSession.imagePreviewUrl);
      }
      setLogSuccess(false);
      setLogError(null);
    }
  }, [scanSession?.scannedAt]);

  useEffect(() => {
    return () => {
      stopWebcamStream();
      recalcAbortRef.current?.abort();
    };
  }, []);

  // Debounced server recalculation sync when quantities adjust
  useEffect(() => {
    if (!scanSession || scanSession.items.length === 0 || recalcStatus !== "syncing") {
      return;
    }

    const controller = new AbortController();
    recalcAbortRef.current = controller;

    const timer = window.setTimeout(async () => {
      try {
        const res = await recalculateMacros(scanSession.items, controller.signal);
        if (controller.signal.aborted) return;
        const syncedItems: EditableFoodItem[] = scanSession.items.map((existing, idx) => {
          const updated = res.items[idx];
          return updated ? { ...existing, ...updated } : existing;
        });
        onUpdateItems(syncedItems, res.totals);
        setRecalcStatus("synced");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setRecalcStatus("idle");
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [scanSession?.items, recalcStatus]);

  function stopWebcamStream() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setCameraOpen(false);
  }

  async function startWebcamStream() {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Live webcam access is unavailable in this browser. Use 'Take Photo' or 'Upload' instead.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setCameraError(
        "Camera permission was denied or no camera device was found. You can still upload an image file.",
      );
    }
  }

  function captureWebcamFrame() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera feed is still initializing. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File(
          [blob],
          `camera-meal-${Date.now()}.jpg`,
          { type: "image/jpeg" },
        );
        stopWebcamStream();
        void handleFileSelected(capturedFile);
      },
      "image/jpeg",
      0.92,
    );
  }

  async function handleFileSelected(file: File) {
    setScanError(null);
    setLogSuccess(false);

    const validation = await validateFoodImageFile(file);
    if (!validation.valid) {
      setSelectedFile(null);
      setScanError(validation.error || "Unsupported image file.");
      return;
    }

    setSelectedFile(file);
    const compactUrl = await createCompactPreviewUrl(file);
    if (compactUrl) {
      setPreviewUrl(compactUrl);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  }

  async function handleAnalyzeMeal() {
    if (!selectedFile) {
      setScanError("Please upload or capture a valid JPG, PNG, or WEBP food photo first.");
      return;
    }

    setScanning(true);
    setScanError(null);
    setRecalcStatus("idle");
    setScanStageText("1/3 Verifying image format & binary MIME signature...");

    const stageTimer1 = window.setTimeout(() => {
      setScanStageText("2/3 Detecting dish & ingredients with Gemini Vision...");
    }, 650);
    const stageTimer2 = window.setTimeout(() => {
      setScanStageText("3/3 Fetching nutrients from ICMR–NIN & USDA tables...");
    }, 1850);

    try {
      const result = await scanFoodImage(selectedFile);
      const nextSession = buildSessionFromScanResponse(
        result,
        previewUrl,
        selectedFile.name,
      );
      onScanComplete(nextSession);
      setUploaderOpen(false);

      const newEntry: CompactScanHistory = {
        id: `${Date.now()}`,
        scannedAt: nextSession.scannedAt,
        itemsSummary: nextSession.foodName,
        itemCount: nextSession.ingredients.length,
        calories: Math.round(result.totals.calories),
        protein: Math.round(result.totals.protein * 10) / 10,
      };
      setScanHistory((prev) => {
        const next = [newEntry, ...prev].slice(0, 5);
        try {
          localStorage.setItem(SCAN_HISTORY_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    } catch (error) {
      setScanError(
        error instanceof Error
          ? error.message
          : "Unable to analyze food image. Ensure the backend server is running.",
      );
    } finally {
      window.clearTimeout(stageTimer1);
      window.clearTimeout(stageTimer2);
      setScanning(false);
      setScanStageText("");
    }
  }

  function handleChangeIngredientGrams(ingredientId: string, grams: number) {
    if (!scanSession) return;
    const safeGrams = Number.isFinite(grams) ? Math.max(0, grams) : 0;
    const nextIngredients = scanSession.ingredients.map((ing) =>
      ing.id === ingredientId ? scaleIngredientFromGrams(ing, safeGrams) : ing,
    );
    const nextSession = recomputeSessionFromIngredients(scanSession, nextIngredients);
    onUpdateSession(nextSession);
    setRecalcStatus("syncing");
    setLogSuccess(false);
  }

  function handleConfirmIngredient(ingredientId: string) {
    if (!scanSession) return;
    const nextIngredients = scanSession.ingredients.map((ing) =>
      ing.id === ingredientId
        ? { ...ing, confirmed_by_user: true, needs_confirmation: false, confident: true }
        : ing,
    );
    const nextSession = recomputeSessionFromIngredients(scanSession, nextIngredients);
    onUpdateSession(nextSession);
    setLogSuccess(false);
  }

  function handleRemoveIngredient(ingredientId: string) {
    handleChangeIngredientGrams(ingredientId, 0);
  }

  function handleReplaceIngredient(
    ingredientId: string,
    replacement: AnalyzedIngredient,
  ) {
    if (!scanSession) return;
    const nextIngredients = scanSession.ingredients.map((ing) =>
      ing.id === ingredientId ? { ...replacement, id: ingredientId } : ing,
    );
    const nextSession = recomputeSessionFromIngredients(scanSession, nextIngredients);
    onUpdateSession(nextSession);
    setRecalcStatus("syncing");
    setLogSuccess(false);
  }

  function handleApplyServingMultiplier(multiplier: number) {
    if (!scanSession) return;
    const nextIngredients = scanSession.ingredients.map((ing) => {
      const baseG = scanSession.initialIngredientGrams[ing.id] ?? ing.estimated_grams;
      return scaleIngredientFromGrams(ing, round2(baseG * multiplier));
    });
    const nextSession = recomputeSessionFromIngredients(scanSession, nextIngredients);
    onUpdateSession(nextSession);
    setRecalcStatus("syncing");
    setLogSuccess(false);
  }

  function handleResetPortions() {
    if (!scanSession) return;
    const nextIngredients = scanSession.ingredients.map((ing) => {
      const baseG = scanSession.initialIngredientGrams[ing.id] ?? ing.estimated_grams;
      return scaleIngredientFromGrams(ing, baseG);
    });
    const nextItems = scanSession.items.map((item) =>
      scaleItemFromPortion(item, item.initial_portion_grams),
    );
    const baseSession: ScanSession = {
      ...recomputeSessionFromIngredients(scanSession, nextIngredients),
      items: nextItems,
    };
    onUpdateSession(baseSession);
    setRecalcStatus("syncing");
    setLogSuccess(false);
  }

  function handleOpenUploaderForNewMeal() {
    setUploaderOpen(true);
    setScanError(null);
    window.setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  }

  async function handleLogMeal() {
    if (!scanSession || scanSession.items.length === 0) return;

    setLogging(true);
    setLogError(null);
    setLogSuccess(false);

    const activeIngredients = scanSession.ingredients.filter(
      (i) => i.estimated_grams > 0,
    );
    const activeItems = scanSession.items.filter((i) => i.portion_grams > 0);
    const resolvedMealName =
      mealName.trim() || scanSession.foodName || "Scanned Meal";

    try {
      await createMealLog({
        meal_name: resolvedMealName,
        meal_type: mealType,
        notes: mealNotes.trim() || undefined,
        items: activeItems.map((item) => ({
          name: item.name,
          portion_grams: item.portion_grams,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fats: item.fats,
        })),
      });

      if (user && targetProfileId) {
        const sumCalcium = round2(
          activeIngredients.reduce((s, x) => s + (x.calcium_mg || 0), 0),
        );
        const sumIron = round2(
          activeIngredients.reduce((s, x) => s + (x.iron_mg || 0), 0),
        );
        const sumVitC = round2(
          activeIngredients.reduce((s, x) => s + (x.vitamin_c_mg || 0), 0),
        );
        const sumPotassium = round2(
          activeIngredients.reduce((s, x) => s + (x.potassium_mg || 0), 0),
        );

        await createTrackedFoodEntry({
          profile_id: targetProfileId,
          meal_name: resolvedMealName,
          meal_type: mealType,
          measurement_source: "ai_scan",
          total_portion_grams: Math.max(1, scanSession.totals.portion_grams),
          calories: scanSession.totals.calories,
          protein: scanSession.totals.protein,
          carbs: scanSession.totals.carbs,
          fats: scanSession.totals.fats,
          fibre: scanSession.fibre,
          sugar: scanSession.sugar,
          sodium_mg: scanSession.sodiumMg,
          calcium_mg: sumCalcium > 0 ? sumCalcium : null,
          iron_mg: sumIron > 0 ? sumIron : null,
          vitamin_c_mg: sumVitC > 0 ? sumVitC : null,
          potassium_mg: sumPotassium > 0 ? sumPotassium : null,
          ingredients: activeIngredients.map((ing) => ({
            name: ing.name,
            portion_grams: Math.max(0.1, ing.estimated_grams),
            calories: ing.calories,
            protein: ing.protein,
            carbs: ing.carbohydrates,
            fats: ing.fats,
            fibre: ing.fibre,
            sugar: ing.sugar,
            sodium_mg: ing.sodium_mg,
            source_label: ing.source_label,
          })),
          image_file_id: scanSession.uploadedFileId ?? null,
          image_ref: scanSession.uploadedImageRef ?? null,
          ai_estimated: true,
          confirmed_by_user: true,
          nutrition_sources: scanSession.dataSources,
          notes: mealNotes.trim() || null,
        });
      }

      setLogSuccess(true);
      onMealLogged();
    } catch (error) {
      setLogError(
        error instanceof Error
          ? error.message
          : "Failed to save meal log to the server.",
      );
    } finally {
      setLogging(false);
    }
  }

  const fileSizeLabel = useMemo(() => {
    if (!selectedFile) return null;
    const kb = selectedFile.size / 1024;
    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
  }, [selectedFile]);

  return (
    <div className="space-y-8 pb-10">
      {/* Scanner Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121212] px-6 py-6 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-[#A3FF12]/10 blur-[90px]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <ScanLine className="h-3.5 w-3.5" />
              Gemini Vision + ICMR–NIN &amp; USDA Hybrid Engine
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">
              AI Food Scanner
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[#A1A1AA]">
              Upload any JPG, JPEG, PNG, or WEBP food photo to inspect visible ingredients, confirm uncertain items, and compute database-grounded nutrition.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {hasRichAnalysis && !uploaderOpen && (
              <button
                type="button"
                onClick={handleOpenUploaderForNewMeal}
                className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#050706] transition hover:bg-[#b8ff42]"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Scan New Photo</span>
              </button>
            )}
            {scanSession && scanSession.alternatives.length > 0 && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate("alternatives")}
                className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-4 py-2 text-xs font-semibold text-[#34D399] transition hover:bg-[#34D399]/20"
              >
                <Sparkles className="h-4 w-4" />
                <span>View {scanSession.alternatives.length} Swaps</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Upload & Camera Dock (Always open initially or when 'Scan New Photo' clicked) */}
      {(uploaderOpen || !hasRichAnalysis) && (
        <div
          ref={uploadSectionRef}
          className="grid gap-6 lg:grid-cols-12"
        >
          <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-5 shadow-xl sm:p-6 lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#A3FF12]/10 text-[#A3FF12]">
                  <Camera className="h-4 w-4" />
                </span>
                <h2 className="font-display text-base font-semibold text-white">
                  Upload or Capture Meal Photo
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {fileSizeLabel && (
                  <span className="rounded-lg border border-white/10 bg-[#171717] px-2.5 py-0.5 font-mono text-[11px] text-zinc-300">
                    {fileSizeLabel}
                  </span>
                )}
                {hasRichAnalysis && (
                  <button
                    type="button"
                    onClick={() => setUploaderOpen(false)}
                    className="rounded-lg border border-white/10 p-1 text-zinc-400 hover:text-white"
                    aria-label="Hide upload panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {cameraOpen ? (
                <motion.div
                  key="webcam"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: EASE_PREMIUM }}
                  className="space-y-3"
                >
                  <div className="relative overflow-hidden rounded-2xl border border-[#A3FF12]/45 bg-black">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="aspect-[16/10] w-full object-cover"
                    />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-4">
                      <span className="absolute top-0 left-0 h-5 w-5 rounded-tl-md border-t-2 border-l-2 border-[#A3FF12]" />
                      <span className="absolute top-0 right-0 h-5 w-5 rounded-tr-md border-t-2 border-r-2 border-[#A3FF12]" />
                      <span className="absolute bottom-0 left-0 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-[#34D399]" />
                      <span className="absolute right-0 bottom-0 h-5 w-5 rounded-br-md border-r-2 border-b-2 border-[#34D399]" />
                    </div>
                    <button
                      type="button"
                      onClick={stopWebcamStream}
                      aria-label="Close camera"
                      className="absolute top-3 right-3 rounded-full bg-black/75 p-2 text-white backdrop-blur-md transition hover:bg-black"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={captureWebcamFrame}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#A3FF12] px-4 py-3 text-sm font-bold text-[#050706] shadow-[0_0_24px_rgba(163,255,18,0.25)] transition hover:bg-[#b8ff42]"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Capture Meal Photo</span>
                  </button>
                </motion.div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 ${
                    isDragging
                      ? "scale-[1.01] border-[#A3FF12] bg-[#A3FF12]/10 shadow-[0_0_32px_rgba(163,255,18,0.18)]"
                      : previewUrl
                        ? "border-white/15 bg-[#050706]"
                        : "border-white/15 bg-[#050706] hover:border-[#34D399]/50"
                  }`}
                >
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Selected meal preview"
                        className="aspect-[16/10] w-full object-cover"
                      />

                      {scanning && (
                        <div className="absolute inset-0 overflow-hidden bg-[#050706]/75 backdrop-blur-[2px]">
                          <div
                            aria-hidden="true"
                            className="animate-scan-beam absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#A3FF12] to-transparent shadow-[0_0_20px_4px_rgba(163,255,18,0.65)]"
                          />
                          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#A3FF12]/40 bg-[#050706]/90">
                              <Loader2 className="h-6 w-6 animate-spin text-[#A3FF12]" />
                            </div>
                            <div className="rounded-xl border border-white/10 bg-[#050706]/90 px-4 py-2.5">
                              <p className="text-sm font-semibold text-white">
                                {scanStageText || "Analyzing meal photo..."}
                              </p>
                              <p className="mt-0.5 font-mono text-[11px] text-[#34D399]">
                                Gemini Vision + ICMR–NIN / USDA Lookup
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!scanning && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute right-3 bottom-3 rounded-xl border border-white/15 bg-[#050706]/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:border-[#A3FF12]/50"
                        >
                          Change Photo
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="group flex aspect-[16/10] w-full flex-col items-center justify-center gap-3.5 p-6 text-center transition hover:bg-white/[0.02]"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#A3FF12]/30 bg-[#A3FF12]/10 text-[#A3FF12] shadow-[0_0_24px_rgba(163,255,18,0.12)] transition group-hover:scale-105">
                        <ImagePlus className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {isDragging
                            ? "Release to drop your food photo"
                            : "Drop your meal photo here, or browse"}
                        </p>
                        <p className="mt-1 text-xs text-[#A1A1AA]">
                          Strict JPG, JPEG, PNG, or WEBP verified by binary header (up to 20 MB)
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </AnimatePresence>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_MIME_TYPES}
              onChange={handleInputChange}
              className="hidden"
            />
            <input
              ref={cameraCaptureInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleInputChange}
              className="hidden"
            />

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#171717] px-3 py-2.5 text-xs font-medium text-white transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                <Upload className="h-3.5 w-3.5 text-[#34D399]" />
                <span>Upload</span>
              </button>

              <button
                type="button"
                onClick={() => cameraCaptureInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#171717] px-3 py-2.5 text-xs font-medium text-white transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                <Camera className="h-3.5 w-3.5 text-[#A3FF12]" />
                <span>Take Photo</span>
              </button>

              <button
                type="button"
                onClick={cameraOpen ? stopWebcamStream : startWebcamStream}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                  cameraOpen
                    ? "border-[#A3FF12]/40 bg-[#A3FF12]/15 text-[#A3FF12]"
                    : "border-white/10 bg-[#171717] text-white hover:border-white/25 hover:bg-white/[0.08]"
                }`}
              >
                <Video className="h-3.5 w-3.5 text-[#34D399]" />
                <span>{cameraOpen ? "Stop Cam" : "Live Cam"}</span>
              </button>
            </div>

            {cameraError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>{cameraError}</span>
              </div>
            )}

            {scanError && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <span>{scanError}</span>
                </div>
                {selectedFile && !scanning && (
                  <button
                    type="button"
                    onClick={() => void handleAnalyzeMeal()}
                    className="shrink-0 rounded-lg border border-rose-400/40 bg-[#050706] px-2.5 py-1 text-[11px] font-semibold text-white hover:border-white/40"
                  >
                    Retry Scan
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleAnalyzeMeal()}
              disabled={scanning || !selectedFile}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#A3FF12] px-5 py-3.5 text-sm font-bold text-[#050706] shadow-[0_0_26px_rgba(163,255,18,0.24)] transition hover:bg-[#b8ff42] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{scanStageText || "Analyzing Food Image..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Analyze Meal with Hybrid AI + DB</span>
                </>
              )}
            </button>
          </div>

          {/* Right Panel: How Hybrid Analysis Works & Recent Scan History */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#34D399]">
                How Hybrid Analysis Works
              </p>
              <ol className="mt-4 space-y-3 text-xs text-[#A1A1AA]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A3FF12]" />
                  <span>
                    <strong className="text-white">Strict Image Validation:</strong> Verifies JPG, PNG, or WEBP binary bytes before transmission.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" />
                  <span>
                    <strong className="text-white">Gemini Vision Recognition:</strong> Detects the dish, extracts individual visible &amp; uncertain ingredients, and estimates weights.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A3FF12]" />
                  <span>
                    <strong className="text-white">ICMR–NIN &amp; USDA Calculation:</strong> Computes calories, protein, carbs, fats, fibre, sugar, sodium &amp; micronutrients directly from verified tables.
                  </span>
                </li>
              </ol>
            </div>

            {scanHistory.length > 0 && (
              <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-white">
                    Recent AI Scans
                  </h2>
                  <span className="font-mono text-[11px] text-[#34D399]">
                    Last {scanHistory.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {scanHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.05] bg-[#050706] px-3.5 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-200">
                          {entry.itemsSummary}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {entry.itemCount} ingredients •{" "}
                          {new Date(entry.scannedAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-bold text-[#A3FF12]">
                        {entry.calories} kcal
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Save Target & Allergy Awareness Banner when Authenticated */}
      {hasRichAnalysis && scanSession && user && profiles.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#34D399]/30 bg-[#0D130F] px-4 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#34D399]">
              Logging scanned meal to profile:
            </span>
            <select
              value={targetProfileId ?? ""}
              onChange={(e) => setSelectedProfileId(Number(e.target.value))}
              className="rounded-xl border border-white/15 bg-[#050706] px-3 py-1.5 text-xs font-semibold text-white"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} ({p.profile_type})
                </option>
              ))}
            </select>
          </div>
          {selectedProfile && selectedProfile.allergies.length > 0 && (
            <span className="rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1 font-semibold text-rose-200">
              Allergy Watch ({selectedProfile.display_name}):{" "}
              {selectedProfile.allergies.join(", ")}
            </span>
          )}
        </div>
      )}

      {/* Full 3-Stage Scroll-Based Analysis Experience */}
      {hasRichAnalysis && scanSession && (
        <ScanExperienceStory
          session={scanSession}
          previewUrl={previewUrl}
          dailyTargets={dailyTargets}
          recalcStatus={recalcStatus}
          onChangeIngredientGrams={handleChangeIngredientGrams}
          onConfirmIngredient={handleConfirmIngredient}
          onRemoveIngredient={handleRemoveIngredient}
          onReplaceIngredient={handleReplaceIngredient}
          onApplyServingMultiplier={handleApplyServingMultiplier}
          onResetPortions={handleResetPortions}
          onRescan={() => void handleAnalyzeMeal()}
          onUploadNew={handleOpenUploaderForNewMeal}
          onNavigate={onNavigate}
          scanning={scanning}
          hasSelectedFile={Boolean(selectedFile)}
          mealName={mealName}
          onMealNameChange={setMealName}
          mealType={mealType}
          onMealTypeChange={setMealType}
          mealNotes={mealNotes}
          onMealNotesChange={setMealNotes}
          logging={logging}
          logError={logError}
          logSuccess={logSuccess}
          onLogMeal={() => void handleLogMeal()}
        />
      )}
    </div>
  );
}
