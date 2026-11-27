import { useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  Flower2,
  Heart,
  Info,
  Loader2,
  Lock,
  Plus,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  PERIOD_EDUCATION_CARDS,
  PERIOD_FOOD_SUGGESTIONS,
  PERIOD_MEDICAL_RED_FLAGS,
  PERIOD_YOGA_POSES,
  WOMEN_FOOD_ALTERNATIVES,
  type PeriodEducationCard,
} from "../../data/womensWellnessData";
import {
  createPeriodRecord,
  createSymptomMoodRecord,
  deletePeriodRecord,
  deleteSymptomRecord,
  recordWomensConsent,
  updatePeriodRecord,
} from "../../lib/api";
import type {
  ActivityEntryCreate,
  FlowLevel,
  PeriodRecord,
  TrackedFoodEntryCreate,
  WomensSummaryData,
} from "../../types/nutrition";
import { RecommendedProductsHub } from "../products/RecommendedProductsHub";
import {
  BotanicalCornerBloom,
  PetalDivider,
  YogaPoseIllustration,
} from "./BotanicalDecor";

interface PeriodCareGardenProps {
  profileId: number | null;
  summary: WomensSummaryData | null;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onRefreshSummary: () => Promise<void>;
  onSavePreferences: (payload: {
    consent_given?: boolean;
    tracking_enabled?: boolean;
    reminders_enabled?: boolean;
  }) => Promise<void>;
  onLogFood: (payload: Omit<TrackedFoodEntryCreate, "profile_id">) => Promise<void>;
  onLogActivity: (payload: Omit<ActivityEntryCreate, "profile_id">) => Promise<void>;
  onNotify: (msg: string) => void;
}

type GardenTab =
  | "calendar"
  | "foods"
  | "essentials"
  | "yoga"
  | "facts"
  | "help";

const SYMPTOM_CHIPS = [
  { id: "cramps", label: "Cramps" },
  { id: "bloating", label: "Bloating" },
  { id: "headache", label: "Headache" },
  { id: "fatigue", label: "Fatigue" },
  { id: "back_pain", label: "Back Pain" },
  { id: "mood_changes", label: "Mood Changes" },
  { id: "nausea", label: "Nausea" },
  { id: "no_symptoms", label: "No Symptoms" },
  { id: "other", label: "Other" },
] as const;

const MOOD_CHIPS = [
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "calm", label: "Calm", emoji: "🌿" },
  { id: "tired", label: "Tired", emoji: "😴" },
  { id: "low", label: "Low", emoji: "🌧️" },
  { id: "irritated", label: "Irritated", emoji: "⚡" },
  { id: "anxious", label: "Anxious", emoji: "🌊" },
  { id: "other", label: "Other", emoji: "✨" },
] as const;

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function PeriodCareGarden({
  profileId,
  summary,
  isAuthenticated,
  onOpenAuth,
  onRefreshSummary,
  onSavePreferences,
  onLogFood,
  onLogActivity,
  onNotify,
}: PeriodCareGardenProps) {
  const [subTab, setSubTab] = useState<GardenTab>("calendar");
  const [foodDietFilter, setFoodDietFilter] = useState<"all" | "vegetarian" | "non_vegetarian">("all");
  const [copiedFactId, setCopiedFactId] = useState<string | null>(null);

  // Calendar & Period form state
  const [calCursor, setCalCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [editingRecord, setEditingRecord] = useState<PeriodRecord | null>(null);
  const [periodStart, setPeriodStart] = useState(todayYmd);
  const [periodEnd, setPeriodEnd] = useState("");
  const [flowLevel, setFlowLevel] = useState<FlowLevel>("moderate");
  const [periodNotes, setPeriodNotes] = useState("");
  const [savingPeriod, setSavingPeriod] = useState(false);

  // Symptom & mood log state
  const [checkInDate, setCheckInDate] = useState(todayYmd);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [crampsLevel, setCrampsLevel] = useState<"none" | "mild" | "moderate" | "severe">("mild");
  const [energyLevel, setEnergyLevel] = useState<"low" | "moderate" | "steady">("moderate");
  const [symptomSeverity, setSymptomSeverity] = useState<"mild" | "moderate" | "severe">("mild");
  const [symptomOtherText, setSymptomOtherText] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodOtherText, setMoodOtherText] = useState("");
  const [symptomNotes, setSymptomNotes] = useState("");
  const [savingSymptoms, setSavingSymptoms] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const trackingEnabled = Boolean(summary?.preferences.tracking_enabled);

  async function handleEnableTracking() {
    if (!isAuthenticated || !profileId) {
      onOpenAuth();
      return;
    }
    await recordWomensConsent({
      profile_id: profileId,
      consent_type: "period_tracking",
      consent_status: "granted",
    });
    await onSavePreferences({ consent_given: true, tracking_enabled: true });
    await onRefreshSummary();
    onNotify("Optional cycle & comfort tracking enabled privately.");
  }

  function startEditPeriod(rec: PeriodRecord) {
    setEditingRecord(rec);
    setPeriodStart(rec.start_date);
    setPeriodEnd(rec.end_date ?? "");
    setFlowLevel(rec.flow_level ?? "moderate");
    setPeriodNotes(rec.notes ?? "");
    setFormErr(null);
  }

  function cancelEditPeriod() {
    setEditingRecord(null);
    setPeriodStart(todayYmd());
    setPeriodEnd("");
    setFlowLevel("moderate");
    setPeriodNotes("");
  }

  async function handleSavePeriod(e: FormEvent) {
    e.preventDefault();
    if (!isAuthenticated || !profileId) {
      onOpenAuth();
      return;
    }
    setSavingPeriod(true);
    setFormErr(null);
    try {
      if (editingRecord) {
        await updatePeriodRecord(editingRecord.id, {
          start_date: periodStart,
          end_date: periodEnd || null,
          flow_level: flowLevel,
          notes: periodNotes.trim() || null,
        });
        onNotify("Updated period dates safely.");
        cancelEditPeriod();
      } else {
        await createPeriodRecord({
          profile_id: profileId,
          start_date: periodStart,
          end_date: periodEnd || null,
          flow_level: flowLevel,
          notes: periodNotes.trim() || null,
        });
        onNotify("Logged period dates privately.");
        setPeriodNotes("");
        setPeriodEnd("");
      }
      await onRefreshSummary();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Could not save period dates.");
    } finally {
      setSavingPeriod(false);
    }
  }

  function toggleSymptomChip(id: string) {
    setSelectedSymptoms((prev) => {
      if (id === "no_symptoms") {
        return prev.includes("no_symptoms") ? [] : ["no_symptoms"];
      }
      const withoutNone = prev.filter((x) => x !== "no_symptoms");
      return withoutNone.includes(id)
        ? withoutNone.filter((x) => x !== id)
        : [...withoutNone, id];
    });
  }

  async function handleSaveSymptoms(e: FormEvent) {
    e.preventDefault();
    if (!isAuthenticated || !profileId) {
      onOpenAuth();
      return;
    }
    setSavingSymptoms(true);
    setFormErr(null);
    try {
      await createSymptomMoodRecord({
        profile_id: profileId,
        record_date: checkInDate,
        symptoms: selectedSymptoms,
        symptom_severity: selectedSymptoms.includes("no_symptoms") ? null : symptomSeverity,
        cramps_level: crampsLevel,
        energy_level: energyLevel,
        symptom_other_text: selectedSymptoms.includes("other") ? symptomOtherText.trim() || null : null,
        mood: selectedMood,
        mood_other_text: selectedMood === "other" ? moodOtherText.trim() || null : null,
        notes: symptomNotes.trim() || null,
      });
      await onRefreshSummary();
      onNotify("Daily comfort & mood check-in saved.");
      setSymptomNotes("");
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Could not save check-in.");
    } finally {
      setSavingSymptoms(false);
    }
  }

  async function handleShareFact(card: PeriodEducationCard) {
    const shareText = `${card.title} — ${card.summary} (Source: ${card.sourceName} ${card.sourceUrl})`;
    try {
      if (navigator.share) {
        await navigator.share({ title: card.title, text: shareText, url: card.sourceUrl });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
      setCopiedFactId(card.id);
      setTimeout(() => setCopiedFactId(null), 2500);
    } catch {
      await navigator.clipboard.writeText(shareText).catch(() => {});
      setCopiedFactId(card.id);
      setTimeout(() => setCopiedFactId(null), 2500);
    }
  }

  const calendarCells = useMemo(() => {
    const y = calCursor.getFullYear();
    const m = calCursor.getMonth();
    const firstWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const loggedDates = new Set<string>();
    for (const p of summary?.period_records ?? []) {
      const s = new Date(`${p.start_date}T00:00:00`);
      const e = p.end_date
        ? new Date(`${p.end_date}T00:00:00`)
        : new Date(
            s.getTime() +
              Math.max(1, (summary?.preferences.typical_period_days ?? 5) - 1) * 86400000,
          );
      for (let t = s.getTime(); t <= e.getTime(); t += 86400000) {
        const dt = new Date(t);
        loggedDates.add(
          `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
            dt.getDate(),
          ).padStart(2, "0")}`,
        );
      }
    }
    const estNext = summary?.estimate.next_period_estimated_start;
    const symptomDates = new Set(
      (summary?.symptom_records ?? []).map((sr) => sr.record_date),
    );
    const cells: ({
      ymd: string;
      day: number;
      isPeriod: boolean;
      isEstimated: boolean;
      hasCheckin: boolean;
    } | null)[] = Array(firstWeekday).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        ymd,
        day: d,
        isPeriod: loggedDates.has(ymd),
        isEstimated: Boolean(estNext && ymd === estNext),
        hasCheckin: symptomDates.has(ymd),
      });
    }
    return cells;
  }, [calCursor, summary]);

  const monthLabel = calCursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Gentle Floral Botanical Hero Banner */}
      <section className="relative overflow-hidden rounded-[2rem] border border-[#ebd0d9] bg-gradient-to-br from-[#fff5f8] via-[#fcf2fb] to-[#f3f8f4] p-6 sm:p-9">
        <BotanicalCornerBloom className="absolute -top-4 -right-4 h-40 w-40 text-[#c96a7e]" />
        <BotanicalCornerBloom className="absolute -bottom-6 -left-6 h-36 w-36 rotate-180 text-[#7d5b96]" />

        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5bac6] bg-white/90 px-3.5 py-1 text-xs font-semibold text-[#9b3d57]">
            <Flower2 className="h-3.5 w-3.5 text-[#c96a7e]" />
            Period Care Garden
          </span>

          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#2d1a24] sm:text-4xl">
            Your cycle is natural. Your comfort matters.
          </h2>
          <p className="mt-2 text-base font-medium text-[#6c4558]">
            Let&apos;s make these days a little easier.
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#725866] sm:text-sm">
            Zero shame, zero compulsory workouts, zero taboo food policing. Log only when you want,
            nourish gently with iron and fluids, stretch comfortably, or rest with confidence.
          </p>
        </div>

        {/* Garden 6-Pillar Navigation Pills */}
        <div className="relative z-10 mt-6 flex flex-wrap gap-2">
          {(
            [
              { id: "calendar", label: "A. Calendar & Tracking" },
              { id: "foods", label: "B. Period Food Guide" },
              { id: "essentials", label: "C. Comfort Essentials" },
              { id: "yoga", label: "D. Gentle Yoga & Care" },
              { id: "facts", label: "E. Little Period Facts" },
              { id: "help", label: "F. When to Seek Care" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                subTab === t.id
                  ? "bg-[#9b3d57] text-white shadow-sm"
                  : "border border-[#e6c5ce] bg-white/90 text-[#5d4250] hover:bg-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {formErr && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {formErr}
        </div>
      )}

      {/* A. PERIOD CALENDAR & CYCLE TRACKING */}
      {subTab === "calendar" && (
        <div className="space-y-6">
          {!isAuthenticated ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#ebd4dc] bg-white p-6">
              <div>
                <h3 className="font-display text-lg font-bold text-[#2d1a24]">
                  Sign in to Store Your Cycle &amp; Comfort Journal Privately
                </h3>
                <p className="mt-1 text-xs text-[#644a57]">
                  Sensitive dates and symptoms are saved only inside your encrypted PostgreSQL account —
                  never in unencrypted browser storage.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#9b3d57] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#842f48]"
              >
                <Lock className="h-3.5 w-3.5" />
                Sign In to Track
              </button>
            </div>
          ) : !trackingEnabled ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#ebd4dc] bg-[#fff8fa] p-6">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-[#2d1a24]">
                  <ShieldCheck className="h-5 w-5 text-[#3f6f52]" />
                  Enable Optional Cycle Tracking?
                </h3>
                <p className="mt-1 max-w-2xl text-xs text-[#644a57]">
                  Grant permission if you&apos;d like calendar tracking, simple symptom pills, and
                  soft estimates. You can skip tracking or withdraw consent anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={handleEnableTracking}
                className="rounded-2xl bg-[#3f6f52] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#325941]"
              >
                I Consent — Enable Tracker
              </button>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Monthly Calendar & Estimate Info */}
            <div className="space-y-4 rounded-3xl border border-[#ebd4dc] bg-white p-6 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-[#2d1a24]">
                  <CalendarDays className="h-5 w-5 text-[#9b3d57]" />
                  {monthLabel}
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() =>
                      setCalCursor(new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1))
                    }
                    className="rounded-xl border border-[#ebd4dc] p-1.5 text-[#5d4250] hover:bg-[#fdf0f4]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() =>
                      setCalCursor(new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1))
                    }
                    className="rounded-xl border border-[#ebd4dc] p-1.5 text-[#5d4250] hover:bg-[#fdf0f4]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-[#8c6e7b]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                {calendarCells.map((cell, idx) =>
                  !cell ? (
                    <div key={`empty-${idx}`} className="h-10" />
                  ) : (
                    <div
                      key={cell.ymd}
                      className={`relative flex h-10 flex-col items-center justify-center rounded-xl border font-semibold ${
                        cell.isPeriod
                          ? "border-[#c96a7e] bg-[#fbe3ea] text-[#842f48]"
                          : cell.isEstimated
                            ? "border-dashed border-[#7d5b96] bg-[#f5effa] text-[#5e4078]"
                            : "border-[#f3e5ea] bg-[#fffcfb] text-[#4a3240]"
                      }`}
                    >
                      <span>{cell.day}</span>
                      {cell.hasCheckin && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3f6f52]" title="Comfort check-in logged" />
                      )}
                    </div>
                  ),
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-[11px] text-[#644a57]">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-[#c96a7e] bg-[#fbe3ea]" /> Logged Period
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-dashed border-[#7d5b96] bg-[#f5effa]" /> Estimated Next Start
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#3f6f52]" /> Symptom/Mood Check-In
                </span>
              </div>

              {/* Informational Estimate Box */}
              <div className="rounded-2xl border border-[#e3d8ee] bg-[#faf7fd] p-4 text-xs text-[#523d66]">
                <p className="font-bold">
                  {summary?.estimate.has_estimate && summary.estimate.next_period_estimated_start
                    ? `Informational Estimate: Around ${summary.estimate.next_period_estimated_start} (~${summary.estimate.average_cycle_days}-day pattern)`
                    : "Cycle Estimate Waiting on Your Rhythm"}
                </p>
                <p className="mt-1 text-[11px]">
                  {summary?.estimate.disclaimer ??
                    "Based on typical logged intervals — real cycles naturally vary, especially during teen years or stressful weeks, so estimates are informational only."}
                </p>
              </div>

              {/* Recent Period History */}
              {(summary?.period_records.length ?? 0) > 0 && (
                <div className="space-y-2 border-t border-[#f0dce2] pt-3">
                  <p className="text-xs font-bold text-[#2d1a24]">Logged Cycles (Edit / Delete Anytime)</p>
                  {summary?.period_records.slice(0, 5).map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-[#f0dce2] bg-[#fff8fa] px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <p className="font-bold text-[#2d1a24]">
                          {rec.start_date} {rec.end_date ? `→ ${rec.end_date}` : "(Ongoing / 1 date logged)"}
                        </p>
                        <p className="text-[11px] text-[#6f5762]">
                          Flow: {rec.flow_level ?? "unspecified"} {rec.notes ? `• ${rec.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditPeriod(rec)}
                          aria-label="Edit period record"
                          className="rounded-lg p-1.5 text-[#5e4078] hover:bg-white"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deletePeriodRecord(rec.id);
                            await onRefreshSummary();
                            onNotify("Period record deleted.");
                          }}
                          aria-label="Delete period record"
                          className="rounded-lg p-1.5 text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Simple Log Forms (Period Dates + Symptoms/Cramps/Energy/Mood) */}
            <div className="space-y-5 lg:col-span-6">
              {/* Log / Edit Period Dates */}
              <form
                onSubmit={handleSavePeriod}
                className="space-y-3 rounded-3xl border border-[#ebd4dc] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-[#2d1a24]">
                    {editingRecord ? "Edit Logged Period Dates" : "Log Period Start / End Dates"}
                  </h3>
                  {editingRecord && (
                    <button
                      type="button"
                      onClick={cancelEditPeriod}
                      className="text-xs font-semibold text-[#9b3d57] underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-[#5d4250]">
                    Start Date
                    <input
                      type="date"
                      required
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#5d4250]">
                    End Date (Optional)
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#5d4250]">
                    Flow Level
                    <select
                      value={flowLevel}
                      onChange={(e) => setFlowLevel(e.target.value as FlowLevel)}
                      className="mt-1 w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
                    >
                      <option value="spotting">Spotting</option>
                      <option value="light">Light</option>
                      <option value="moderate">Moderate</option>
                      <option value="heavy">Heavy</option>
                      <option value="skipped">Skipped / Irregular</option>
                    </select>
                  </label>
                </div>

                <input
                  type="text"
                  maxLength={250}
                  value={periodNotes}
                  onChange={(e) => setPeriodNotes(e.target.value)}
                  placeholder="Optional personal note..."
                  className="w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
                />

                <button
                  type="submit"
                  disabled={savingPeriod}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#9b3d57] px-4 py-2 text-xs font-bold text-white hover:bg-[#842f48] disabled:opacity-50"
                >
                  {savingPeriod ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {editingRecord ? "Update Period Record" : "Save Period Log"}
                </button>
              </form>

              {/* Daily Symptoms, Cramps, Energy & Mood Check-In */}
              <form
                onSubmit={handleSaveSymptoms}
                className="space-y-3.5 rounded-3xl border border-[#ebd4dc] bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-[#2d1a24]">
                    Comfort, Symptoms &amp; Mood Check-In
                  </h3>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    aria-label="Check-in date"
                    className="rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-2.5 py-1 text-xs text-[#2d1a24]"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOM_CHIPS.map((s) => {
                    const active = selectedSymptoms.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSymptomChip(s.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "bg-[#9b3d57] text-white"
                            : "border border-[#ebd4dc] bg-[#fff8fa] text-[#5d4250]"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {selectedSymptoms.includes("other") && (
                  <input
                    type="text"
                    value={symptomOtherText}
                    onChange={(e) => setSymptomOtherText(e.target.value)}
                    placeholder="Describe other symptom..."
                    className="w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-1.5 text-xs text-[#2d1a24]"
                  />
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-[11px] font-semibold text-[#5d4250]">
                    Cramps Level
                    <select
                      value={crampsLevel}
                      onChange={(e) => setCrampsLevel(e.target.value as typeof crampsLevel)}
                      className="mt-1 w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-2.5 py-1.5 text-xs text-[#2d1a24]"
                    >
                      <option value="none">None</option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                  </label>
                  <label className="text-[11px] font-semibold text-[#5d4250]">
                    Energy Level
                    <select
                      value={energyLevel}
                      onChange={(e) => setEnergyLevel(e.target.value as typeof energyLevel)}
                      className="mt-1 w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-2.5 py-1.5 text-xs text-[#2d1a24]"
                    >
                      <option value="low">Low / Rest-Needed</option>
                      <option value="moderate">Moderate</option>
                      <option value="steady">Steady</option>
                    </select>
                  </label>
                  <label className="text-[11px] font-semibold text-[#5d4250]">
                    Overall Severity
                    <select
                      value={symptomSeverity}
                      onChange={(e) => setSymptomSeverity(e.target.value as typeof symptomSeverity)}
                      className="mt-1 w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-2.5 py-1.5 text-xs text-[#2d1a24]"
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                  </label>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[#5d4250]">How Does Today Feel?</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {MOOD_CHIPS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(selectedMood === m.id ? null : m.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedMood === m.id
                            ? "bg-[#7d5b96] text-white"
                            : "border border-[#e3d8ee] bg-[#faf7fd] text-[#5c4570]"
                        }`}
                      >
                        {m.emoji} {m.label}
                      </button>
                    ))}
                  </div>
                  {selectedMood === "other" && (
                    <input
                      type="text"
                      value={moodOtherText}
                      onChange={(e) => setMoodOtherText(e.target.value)}
                      placeholder="Describe mood..."
                      className="mt-2 w-full rounded-xl border border-[#e3d8ee] bg-[#faf7fd] px-3 py-1.5 text-xs text-[#2d1a24]"
                    />
                  )}
                </div>

                <input
                  type="text"
                  maxLength={250}
                  value={symptomNotes}
                  onChange={(e) => setSymptomNotes(e.target.value)}
                  placeholder="Optional note about cramps, hydration, or sleep..."
                  className="w-full rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
                />

                <button
                  type="submit"
                  disabled={savingSymptoms}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#3f6f52] px-4 py-2 text-xs font-bold text-white hover:bg-[#325941] disabled:opacity-50"
                >
                  {savingSymptoms ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5" />}
                  Save Comfort Check-In
                </button>

                {/* Recent Check-Ins */}
                {(summary?.symptom_records.length ?? 0) > 0 && (
                  <div className="space-y-1.5 border-t border-[#f0dce2] pt-3">
                    {summary?.symptom_records.slice(0, 4).map((sr) => (
                      <div
                        key={sr.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-[#fff8fa] px-3 py-2 text-[11px]"
                      >
                        <div>
                          <strong className="text-[#2d1a24]">{sr.record_date}</strong> •{" "}
                          <span className="text-[#5d4250]">
                            {sr.symptoms.length > 0 ? sr.symptoms.join(", ") : "check-in"}
                            {sr.cramps_level ? ` • cramps: ${sr.cramps_level}` : ""}
                            {sr.energy_level ? ` • energy: ${sr.energy_level}` : ""}
                            {sr.mood ? ` • mood: ${sr.mood}` : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteSymptomRecord(sr.id);
                            await onRefreshSummary();
                          }}
                          aria-label="Delete symptom log"
                          className="text-rose-700 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* B. TWO-CATEGORY PERIOD FOOD GUIDE */}
      {subTab === "foods" && (
        <div className="space-y-8">
          {/* Category 1: Individual-Tolerance Items & Healthier Swaps */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#ebd4dc] bg-[#fff8fa] p-5">
              <h3 className="font-display text-xl font-extrabold text-[#2d1a24]">
                1. Items Some People Prefer to Limit if Uncomfortable (With Easy Swaps)
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#644a57]">
                <strong>Individual Tolerance Note:</strong> Foods affect people differently. Balanced
                everyday foods — including curd, pickles, fruit, or cool water — do not need
                universal avoidance unless they personally upset your stomach.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {WOMEN_FOOD_ALTERNATIVES.map((card) => (
                <article
                  key={card.id}
                  className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#ebd4dc] bg-white p-5"
                >
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs">
                      <span className="font-bold text-amber-900">
                        Limit If Uncomfortable: {card.originalName}
                      </span>
                      <p className="mt-0.5 text-[11px] text-amber-800">{card.originalCategoryNote}</p>
                      <p className="mt-1 text-[11px] text-[#5d4250]">{card.toleranceNote}</p>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-[#d8e6dc] bg-[#f7fbf8] p-3.5 sm:grid-cols-12">
                      <img
                        src={card.alternativeImagePath}
                        alt={card.alternativeName}
                        className="h-24 w-full rounded-xl object-cover sm:col-span-4"
                      />
                      <div className="sm:col-span-8">
                        <span className="rounded-full bg-[#eef6f1] px-2 py-0.5 text-[10px] font-bold text-[#2b5239]">
                          Gentler Alternative
                        </span>
                        <h4 className="mt-1 font-display text-sm font-bold text-[#2d1a24]">
                          {card.alternativeName}
                        </h4>
                        <p className="mt-1 text-[11px] text-[#486352]">{card.benefitsOfSwap}</p>
                        <p className="mt-1.5 font-mono text-[10px] font-semibold text-[#9b3d57]">
                          {card.alternativeStats.calories} kcal • P:{card.alternativeStats.protein}g •
                          Fibre:{card.alternativeStats.fibre}g ({card.sourceLabel})
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!isAuthenticated || !profileId) {
                        onOpenAuth();
                        return;
                      }
                      await onLogFood({
                        meal_name: card.alternativeName,
                        meal_type: "snack",
                        measurement_source: "manual",
                        total_portion_grams: card.alternativeStats.grams,
                        calories: card.alternativeStats.calories,
                        protein: card.alternativeStats.protein,
                        carbs: card.alternativeStats.carbs,
                        fats: card.alternativeStats.fats,
                        fibre: card.alternativeStats.fibre,
                        nutrition_sources: [card.sourceLabel],
                        notes: `${card.alternativeServingLabel} • Period food gentler swap`,
                      });
                      onNotify(`Logged gentler swap "${card.alternativeName}".`);
                    }}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#3f6f52] px-4 py-2 text-xs font-bold text-white hover:bg-[#325941]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Log Gentler Swap to Food Tracker
                  </button>
                </article>
              ))}
            </div>
          </div>

          <PetalDivider />

          {/* Category 2: Comforting Balanced Nourishment During Periods */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-extrabold text-[#2d1a24]">
                  2. Comforting Period Nourishment (Iron + Vitamin C, Protein &amp; Hydration)
                </h3>
                <p className="mt-0.5 text-xs text-[#644a57]">
                  Estimated nutritional references with gentle easy prep steps.
                </p>
              </div>
              <div className="flex gap-1.5">
                {(["all", "vegetarian", "non_vegetarian"] as const).map((dt) => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => setFoodDietFilter(dt)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      foodDietFilter === dt
                        ? "bg-[#9b3d57] text-white"
                        : "border border-[#ebd4dc] bg-white text-[#5d4250]"
                    }`}
                  >
                    {dt === "all" ? "All" : dt === "vegetarian" ? "Veg" : "Non-Veg"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {PERIOD_FOOD_SUGGESTIONS.filter(
                (f) => foodDietFilter === "all" || f.dietType === foodDietFilter,
              ).map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#ebd4dc] bg-white"
                >
                  <div>
                    <img
                      src={item.imagePath}
                      alt={item.name}
                      className="h-44 w-full object-cover"
                    />
                    <div className="p-5">
                      <span className="rounded-full bg-[#fdf0f4] px-2.5 py-0.5 text-[10px] font-bold text-[#9b3d57]">
                        Iron: {item.ironMg} mg • Fibre: {item.fibre} g
                      </span>
                      <h4 className="mt-2 font-display text-base font-bold text-[#2d1a24]">
                        {item.name}
                      </h4>
                      <p className="mt-1 text-xs text-[#5d4250]">{item.benefit}</p>

                      <ul className="mt-3 list-disc space-y-1 pl-4 text-[11px] text-[#6f5762]">
                        {item.simpleRecipe.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[10px] text-[#8c6e7b]">{item.sourceNote}</p>
                    </div>
                  </div>

                  <div className="border-t border-[#f0dce2] bg-[#fffaf8] p-3.5">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!isAuthenticated || !profileId) {
                          onOpenAuth();
                          return;
                        }
                        await onLogFood({
                          meal_name: item.name,
                          meal_type: "lunch",
                          measurement_source: "manual",
                          total_portion_grams: item.servingGrams,
                          calories: item.calories,
                          protein: item.protein,
                          carbs: item.carbs,
                          fats: item.fats,
                          fibre: item.fibre,
                          iron_mg: item.ironMg,
                          nutrition_sources: [item.sourceNote],
                          notes: `${item.servingLabel} • Period Care Garden nourishment`,
                        });
                        onNotify(`Logged "${item.name}" to your Food Tracker.`);
                      }}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#9b3d57] px-4 py-2 text-xs font-bold text-white hover:bg-[#842f48]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add to Food Tracker ({item.calories} kcal)
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* C. PERIOD COMFORT ESSENTIALS (CENTRALIZED CATALOG, BOTANICAL THEME) */}
      {subTab === "essentials" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e3d8ee] bg-[#faf7fd] p-4 text-xs leading-relaxed text-[#523d66]">
            <strong>Comfort First — Always Personal Choice:</strong> Filter pads, breathable cotton
            liners, washable period underwear, heating pads/warmth patches, or educational menstrual
            cup guidance. External products are presented transparently with direct brand store
            references. We never display unverified fake package imagery or invented prices.
          </div>

          <RecommendedProductsHub
            defaultCategory="women_period_care"
            defaultAudience="women"
            compact
            theme="botanical"
            referrerSection="period_care_garden"
            title="Period Comfort Essentials"
            subtitle="Thoughtful pads, reusable period briefs, warmth wraps, and educational choices organized clearly by budget tier."
          />
        </div>
      )}

      {/* D. PERIOD YOGA & GENTLE MOVEMENT */}
      {subTab === "yoga" && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-[#f0c7d3] bg-[#fff5f7] p-5 text-xs text-[#4a2e3b]">
            <p className="flex items-center gap-2 text-sm font-bold text-[#842f48]">
              <Info className="h-4 w-4 shrink-0" />
              Comfort &amp; Safety Notice — Listen Kindly to Your Body
            </p>
            <p className="mt-1.5 leading-relaxed">
              Gentle movement and breathing can ease muscle tension and calm discomfort, but{" "}
              <strong>yoga never cures pain or replaces medical care</strong>.{" "}
              <strong>Stop immediately if pain, dizziness, or sharp cramping increases.</strong>{" "}
              Exercise is never compulsory — complete rest is always okay.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PERIOD_YOGA_POSES.map((pose) => (
              <article
                key={pose.id}
                className="flex flex-col justify-between rounded-3xl border border-[#ebd4dc] bg-white p-5"
              >
                <div className="space-y-3">
                  <YogaPoseIllustration poseKey={pose.poseKey} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#f5effa] px-2.5 py-0.5 text-[10px] font-bold text-[#5e4078]">
                      {pose.intensity} • {pose.durationSuggestion}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-display text-base font-bold text-[#2d1a24]">{pose.title}</h4>
                    <p className="text-[11px] font-semibold text-[#9b3d57]">{pose.sanskritName}</p>
                  </div>
                  <p className="text-xs text-[#5d4250]">{pose.focus}</p>
                  <ul className="list-disc space-y-1 pl-4 text-[11px] text-[#6f5762]">
                    {pose.howToSteps.map((st) => (
                      <li key={st}>{st}</li>
                    ))}
                  </ul>
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-[10px] font-medium text-amber-900">
                    {pose.safetyStopNote}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!isAuthenticated || !profileId) {
                      onOpenAuth();
                      return;
                    }
                    await onLogActivity({
                      activity_type: pose.title,
                      duration_minutes: 5,
                      intensity: pose.intensity,
                      notes: "Logged from Period Care Garden gentle yoga",
                    });
                    onNotify(`Logged gentle session: ${pose.title}.`);
                  }}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d8e6dc] bg-[#eef6f1] px-3 py-2 text-xs font-bold text-[#2b5239] hover:bg-[#e1efe6]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Log Gentle Session
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* E. LITTLE PERIOD FACTS (SHAREABLE CARDS + CLICKABLE WHO/NHS/ACOG SOURCES) */}
      {subTab === "facts" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#ebd4dc] bg-[#fff8fa] p-5">
            <h3 className="flex items-center gap-2 font-display text-xl font-extrabold text-[#2d1a24]">
              <Sparkles className="h-5 w-5 text-[#9b3d57]" />
              Little Period Facts • Calm, Verified Education
            </h3>
            <p className="mt-1 text-xs text-[#644a57]">
              Practical menstrual literacy written warmly and backed by direct clickable links to
              WHO, NHS, NHS Inform, and ACOG guidance.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PERIOD_EDUCATION_CARDS.map((card) => (
              <article
                key={card.id}
                className="flex flex-col justify-between rounded-3xl border border-[#ebd4dc] bg-white p-5"
              >
                <div>
                  <span className="rounded-full bg-[#fdf0f4] px-2.5 py-0.5 text-[10px] font-bold text-[#9b3d57]">
                    {card.topic}
                  </span>
                  <h4 className="mt-2 font-display text-base font-bold text-[#2d1a24]">
                    {card.title}
                  </h4>
                  <p className="mt-1.5 text-xs font-semibold text-[#4a3240]">{card.summary}</p>
                  <p className="mt-2 text-xs leading-relaxed text-[#6f5762]">{card.detail}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0dce2] pt-3">
                  <a
                    href={card.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3f6f52] hover:underline"
                  >
                    <span>{card.sourceName}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleShareFact(card)}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#e6c5ce] bg-[#fff8fa] px-2.5 py-1 text-[11px] font-semibold text-[#9b3d57] hover:bg-[#fdf0f4]"
                  >
                    {copiedFactId === card.id ? (
                      <>
                        <Copy className="h-3 w-3" /> Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3 w-3" /> Share Fact
                      </>
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* F. WHEN TO SEEK MEDICAL HELP (CALM RED-FLAG CARD, ZERO DIAGNOSIS) */}
      {subTab === "help" && (
        <div className="rounded-3xl border border-[#ebc2cd] bg-white p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#fdf0f4] p-3 text-[#9b3d57]">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-extrabold text-[#2d1a24]">
                When to Check In With a Doctor
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[#644a57]">
                Menstrual discomfort is common, but very heavy bleeding or severe pain deserves proper
                medical attention. Checking early is reassuring self-care — not an emergency panic,
                and NutriSense AI never diagnoses medical conditions.
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5">
            {PERIOD_MEDICAL_RED_FLAGS.map((flag) => (
              <li
                key={flag}
                className="flex items-start gap-2.5 rounded-2xl border border-[#f0dce2] bg-[#fff8fa] p-3.5 text-xs font-medium text-[#3a2631]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#9b3d57]" />
                <span>{flag}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 rounded-2xl border border-[#d8e6dc] bg-[#eef6f1] p-4 text-xs text-[#2b5239]">
            You can visit the <strong>Find a Doctor</strong> tab to access official national medical
            registries (NMC) or MoHFW eSanjeevani teleconsultation services directly.
          </p>
        </div>
      )}
    </div>
  );
}
