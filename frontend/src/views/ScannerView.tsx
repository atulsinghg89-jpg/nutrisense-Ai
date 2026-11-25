import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  ImagePlus,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react";
import { MacroProgressBars } from "../components/MacroProgressBars";
import {
  computeTotals,
  createMealLog,
  recalculateMacros,
  scaleItemFromPortion,
  scanFoodImage,
} from "../lib/api";
import type {
  AppView,
  DailyMacroTargets,
  EditableFoodItem,
  MealType,
  ScanSession,
} from "../types/nutrition";

interface ScannerViewProps {
  scanSession: ScanSession | null;
  onScanComplete: (session: ScanSession) => void;
  onUpdateItems: (items: EditableFoodItem[], totals: ScanSession["totals"]) => void;
  dailyTargets: DailyMacroTargets;
  onNavigate: (view: AppView) => void;
  onMealLogged: () => void;
}

const ACCEPTED_MIME_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*";

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export function ScannerView({
  scanSession,
  onScanComplete,
  onUpdateItems,
  dailyTargets,
  onNavigate,
  onMealLogged,
}: ScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recalcAbortRef = useRef<AbortController | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    scanSession?.imagePreviewUrl ?? null,
  );
  const [isDragging, setIsDragging] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [recalcStatus, setRecalcStatus] = useState<"idle" | "syncing" | "synced">(
    "idle",
  );

  // Log meal form state
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [mealNotes, setMealNotes] = useState("");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState(false);

  const items = scanSession?.items ?? [];
  const totals = scanSession?.totals ?? {
    portion_grams: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  };

  // Suggest meal name whenever new scan items arrive
  useEffect(() => {
    if (items.length > 0) {
      const topNames = items.slice(0, 3).map((item) => item.name);
      const suggested =
        items.length > 3
          ? `${topNames.join(", ")} +${items.length - 3} more`
          : topNames.join(", ");
      setMealName(suggested);
      setLogSuccess(false);
      setLogError(null);
    }
  }, [scanSession?.scannedAt]);

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      stopWebcamStream();
      recalcAbortRef.current?.abort();
    };
  }, []);

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
        "Live webcam access is unavailable in this browser. Use 'Take Photo' or 'Upload Image' instead.",
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
        handleFileSelected(capturedFile);
      },
      "image/jpeg",
      0.92,
    );
  }

  function handleFileSelected(file: File) {
    setScanError(null);
    setLogSuccess(false);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  }

  async function handleAnalyzeMeal() {
    if (!selectedFile) {
      setScanError("Please upload or capture a food image first.");
      return;
    }

    setScanning(true);
    setScanError(null);
    setRecalcStatus("idle");

    try {
      const result = await scanFoodImage(selectedFile);
      const editableItems: EditableFoodItem[] = result.items.map((item, idx) => ({
        ...item,
        id: `${Date.now()}-${idx}`,
        initial_portion_grams: item.portion_grams,
      }));

      onScanComplete({
        imagePreviewUrl: previewUrl,
        fileName: selectedFile.name,
        items: editableItems,
        totals: result.totals,
        alternatives: result.healthier_alternatives,
        scannedAt: new Date().toISOString(),
      });
    } catch (error) {
      setScanError(
        error instanceof Error
          ? error.message
          : "Unable to scan food image. Ensure the backend server is running.",
      );
    } finally {
      setScanning(false);
    }
  }

  // Debounced server recalculation whenever portions change
  useEffect(() => {
    if (!scanSession || items.length === 0 || recalcStatus !== "syncing") {
      return;
    }

    const controller = new AbortController();
    recalcAbortRef.current = controller;

    const timer = window.setTimeout(async () => {
      try {
        const res = await recalculateMacros(items, controller.signal);
        if (controller.signal.aborted) return;
        const syncedItems: EditableFoodItem[] = items.map((existing, idx) => {
          const updated = res.items[idx];
          if (!updated) return existing;
          return {
            ...existing,
            ...updated,
          };
        });
        onUpdateItems(syncedItems, res.totals);
        setRecalcStatus("synced");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setRecalcStatus("idle");
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [items, recalcStatus]);

  function handlePortionChange(itemId: string, nextGrams: number) {
    const safeGrams = Number.isFinite(nextGrams) ? Math.max(0, nextGrams) : 0;
    const updatedItems = items.map((item) =>
      item.id === itemId ? scaleItemFromPortion(item, safeGrams) : item,
    );
    const updatedTotals = computeTotals(updatedItems);
    onUpdateItems(updatedItems, updatedTotals);
    setRecalcStatus("syncing");
    setLogSuccess(false);
  }

  function handleResetPortion(itemId: string) {
    const target = items.find((item) => item.id === itemId);
    if (!target) return;
    handlePortionChange(itemId, target.initial_portion_grams);
  }

  function handleResetAllPortions() {
    const resetItems = items.map((item) =>
      scaleItemFromPortion(item, item.initial_portion_grams),
    );
    onUpdateItems(resetItems, computeTotals(resetItems));
    setRecalcStatus("syncing");
    setLogSuccess(false);
  }

  async function handleLogMeal() {
    if (items.length === 0) return;

    setLogging(true);
    setLogError(null);
    setLogSuccess(false);

    try {
      await createMealLog({
        meal_name: mealName.trim() || undefined,
        meal_type: mealType,
        notes: mealNotes.trim() || undefined,
        items: items.map((item) => ({
          name: item.name,
          portion_grams: item.portion_grams,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fats: item.fats,
        })),
      });
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
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-3 py-1 text-xs font-medium text-[#A3FF12]">
            <Camera className="h-3.5 w-3.5" />
            POST /api/scan
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white">
            AI Food Scanner
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Upload a meal photo or use your camera to detect items, adjust portions in grams, and
            inspect Calorie, Protein, Carbs, and Fat bars.
          </p>
        </div>

        {scanSession && scanSession.alternatives.length > 0 && (
          <button
            type="button"
            onClick={() => onNavigate("alternatives")}
            className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-4 py-2 text-sm font-semibold text-[#34D399] transition hover:bg-[#34D399]/20"
          >
            <Sparkles className="h-4 w-4" />
            <span>View {scanSession.alternatives.length} Healthier Swaps</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Image Upload / Camera + Scan Trigger */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">
                Meal Image Input
              </h2>
              {fileSizeLabel && (
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                  {fileSizeLabel}
                </span>
              )}
            </div>

            {/* Live Webcam View */}
            {cameraOpen ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-[#A3FF12]/40 bg-black">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={stopWebcamStream}
                    aria-label="Close camera"
                    className="absolute top-3 right-3 rounded-full bg-black/70 p-2 text-white hover:bg-black"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={captureWebcamFrame}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#A3FF12] px-4 py-3 text-sm font-bold text-[#0A0A0A] transition hover:bg-[#b5ff3b]"
                >
                  <Camera className="h-4 w-4" />
                  <span>Capture Meal Photo</span>
                </button>
              </div>
            ) : (
              /* Dropzone / Preview */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative overflow-hidden rounded-xl border border-dashed transition ${
                  isDragging
                    ? "border-[#A3FF12] bg-[#A3FF12]/10"
                    : "border-white/15 bg-[#0A0A0A]"
                }`}
              >
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Selected meal preview"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    {scanning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0A0A0A]/75 backdrop-blur-xs">
                        <Loader2 className="h-8 w-8 animate-spin text-[#A3FF12]" />
                        <p className="text-sm font-medium text-white">
                          Analyzing ingredients &amp; macros...
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute right-3 bottom-3 rounded-lg border border-white/15 bg-[#0A0A0A]/85 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:border-[#A3FF12]/50"
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 p-6 text-center transition hover:bg-white/[0.02]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#A3FF12]/25 bg-[#A3FF12]/10 text-[#A3FF12]">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Drop your food photo here, or browse
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        JPEG, PNG, WEBP, GIF, or HEIC up to 20 MB
                      </p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Hidden File + Mobile Camera Inputs */}
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
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              className="hidden"
            />

            {/* Upload / Camera Controls */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-white transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                <Upload className="h-3.5 w-3.5 text-[#34D399]" />
                <span>Upload</span>
              </button>

              <button
                type="button"
                onClick={() => cameraCaptureInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-white transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                <Camera className="h-3.5 w-3.5 text-[#A3FF12]" />
                <span>Take Photo</span>
              </button>

              <button
                type="button"
                onClick={cameraOpen ? stopWebcamStream : startWebcamStream}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-white transition hover:border-white/25 hover:bg-white/[0.08]"
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
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{scanError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyzeMeal}
              disabled={scanning || !selectedFile}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#A3FF12] px-5 py-3.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_24px_rgba(163,255,18,0.22)] transition hover:bg-[#b5ff3b] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scanning with NutriSense AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Analyze Meal</span>
                </>
              )}
            </button>
          </div>

          {/* Macro Progress Bars Panel */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  Meal Macro Progress
                </h2>
                <p className="text-xs text-zinc-400">
                  Measured against your {dailyTargets.calories.toLocaleString()} kcal daily goal
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-[#0A0A0A] px-3 py-1 font-mono text-xs font-medium text-[#34D399] tabular-nums">
                {totals.portion_grams.toFixed(0)} g total
              </span>
            </div>

            <MacroProgressBars
              calories={totals.calories}
              protein={totals.protein}
              carbs={totals.carbs}
              fats={totals.fats}
              targets={dailyTargets}
            />
          </div>
        </div>

        {/* Right Column: Detected Items with Portion Sliders & Log Meal */}
        <div className="space-y-5 lg:col-span-7">
          <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  Detected Food Items &amp; Portion Sliders
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Drag any slider to edit portion size in grams; macros recalculate live.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {recalcStatus === "syncing" && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A3FF12]" />
                    Syncing...
                  </span>
                )}
                {recalcStatus === "synced" && (
                  <span className="inline-flex items-center gap-1 text-xs text-[#34D399]">
                    <Check className="h-3.5 w-3.5" />
                    Synced
                  </span>
                )}
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAllPortions}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset All
                  </button>
                )}
              </div>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#0A0A0A] text-zinc-500">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="mt-4 font-display text-base font-semibold text-white">
                  No food scanned yet
                </p>
                <p className="mt-1.5 max-w-sm text-sm text-zinc-400">
                  Select or capture a food image on the left and click{" "}
                  <span className="text-[#A3FF12]">Analyze Meal</span> to populate detected items
                  with interactive portion sliders.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {items.map((item) => {
                  const sliderMax = Math.max(
                    500,
                    Math.ceil((item.initial_portion_grams * 2.5) / 10) * 10,
                  );
                  const fillPercent = Math.min(
                    100,
                    Math.max(0, (item.portion_grams / sliderMax) * 100),
                  );

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/[0.08] bg-[#0A0A0A] p-4 transition hover:border-white/15"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-base font-semibold text-white">
                            {item.name}
                          </h3>
                          <p className="mt-0.5 font-mono text-[11px] text-zinc-500 tabular-nums">
                            Base: {item.calories_per_100g} kcal / 100g • P{" "}
                            {item.protein_per_100g}g • C {item.carbs_per_100g}g • F{" "}
                            {item.fats_per_100g}g
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-lg border border-white/10 bg-[#141414] px-2.5 py-1">
                            <input
                              type="number"
                              min={0}
                              max={2500}
                              step={5}
                              aria-label={`${item.name} portion in grams`}
                              value={Math.round(item.portion_grams)}
                              onChange={(e) =>
                                handlePortionChange(
                                  item.id,
                                  Number.parseFloat(e.target.value || "0"),
                                )
                              }
                              className="w-14 bg-transparent text-right font-mono text-sm font-semibold text-[#A3FF12] tabular-nums focus:outline-none"
                            />
                            <span className="ml-1 font-mono text-xs text-zinc-400">
                              g
                            </span>
                          </div>

                          {Math.abs(item.portion_grams - item.initial_portion_grams) >
                            0.5 && (
                            <button
                              type="button"
                              onClick={() => handleResetPortion(item.id)}
                              title="Reset to detected portion"
                              className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:text-white"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Portion Range Slider */}
                      <div className="mt-3.5">
                        <input
                          type="range"
                          min={0}
                          max={sliderMax}
                          step={5}
                          aria-label={`${item.name} portion slider`}
                          value={Math.min(item.portion_grams, sliderMax)}
                          onChange={(e) =>
                            handlePortionChange(item.id, Number(e.target.value))
                          }
                          className="nutri-slider w-full"
                          style={{
                            background: `linear-gradient(to right, #A3FF12 0%, #34D399 ${fillPercent}%, rgba(255,255,255,0.12) ${fillPercent}%, rgba(255,255,255,0.12) 100%)`,
                          }}
                        />
                        <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500">
                          <span>0g</span>
                          <span>Detected: {Math.round(item.initial_portion_grams)}g</span>
                          <span>{sliderMax}g</span>
                        </div>
                      </div>

                      {/* Per-item Live Macros */}
                      <div className="mt-3.5 grid grid-cols-4 gap-2 text-center font-mono text-xs tabular-nums">
                        <div className="rounded-lg bg-[#141414] px-2 py-1.5">
                          <span className="block text-[10px] text-zinc-500">
                            CALORIES
                          </span>
                          <span className="font-semibold text-[#A3FF12]">
                            {Math.round(item.calories)} kcal
                          </span>
                        </div>
                        <div className="rounded-lg bg-[#141414] px-2 py-1.5">
                          <span className="block text-[10px] text-zinc-500">
                            PROTEIN
                          </span>
                          <span className="font-semibold text-[#34D399]">
                            {item.protein.toFixed(1)} g
                          </span>
                        </div>
                        <div className="rounded-lg bg-[#141414] px-2 py-1.5">
                          <span className="block text-[10px] text-zinc-500">
                            CARBS
                          </span>
                          <span className="font-semibold text-emerald-300">
                            {item.carbs.toFixed(1)} g
                          </span>
                        </div>
                        <div className="rounded-lg bg-[#141414] px-2 py-1.5">
                          <span className="block text-[10px] text-zinc-500">
                            FAT
                          </span>
                          <span className="font-semibold text-lime-200">
                            {item.fats.toFixed(1)} g
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Log Meal to Dashboard */}
          {items.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Save Meal to Dashboard
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Logs adjusted portions via POST /api/logs so your daily totals stay accurate.
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-[#A3FF12]">
                  {Math.round(totals.calories)} kcal total
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="meal-name"
                    className="mb-1 block text-xs font-medium text-zinc-400"
                  >
                    Meal Name
                  </label>
                  <input
                    id="meal-name"
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="e.g. Grilled Chicken Rice Bowl"
                    className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#A3FF12]/60 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="meal-type"
                    className="mb-1 block text-xs font-medium text-zinc-400"
                  >
                    Meal Type
                  </label>
                  <select
                    id="meal-type"
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as MealType)}
                    className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white focus:border-[#A3FF12]/60 focus:outline-none"
                  >
                    {MEAL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label
                  htmlFor="meal-notes"
                  className="mb-1 block text-xs font-medium text-zinc-400"
                >
                  Notes (optional)
                </label>
                <input
                  id="meal-notes"
                  type="text"
                  value={mealNotes}
                  onChange={(e) => setMealNotes(e.target.value)}
                  placeholder="Optional notes about prep, dressing, or substitutions..."
                  className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-[#A3FF12]/60 focus:outline-none"
                />
              </div>

              {logError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <span>{logError}</span>
                </div>
              )}

              {logSuccess && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 p-3 text-xs text-[#34D399]">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Check className="h-4 w-4" />
                    Meal logged to your Dashboard!
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate("dashboard")}
                    className="font-semibold text-[#A3FF12] hover:underline"
                  >
                    Open Dashboard →
                  </button>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate("alternatives")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34D399] hover:text-[#A3FF12]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Explore 3 Healthier Alternatives</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogMeal}
                  disabled={logging}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#34D399] px-5 py-2.5 text-sm font-bold text-[#0A0A0A] transition hover:bg-[#4adeb0] disabled:opacity-50"
                >
                  {logging ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Log Meal to Dashboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
