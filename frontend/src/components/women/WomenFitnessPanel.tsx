import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  Dumbbell,
  ExternalLink,
  HeartHandshake,
  Info,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { FITNESS_GUIDES } from "../../data/womensWellnessData";
import type {
  ActivityEntryCreate,
  HealthcareProviderEntry,
  ProfileDashboardData,
} from "../../types/nutrition";

interface WomenFitnessPanelProps {
  profileId: number | null;
  dashboard: ProfileDashboardData | null;
  fitnessProviders: HealthcareProviderEntry[];
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onLogActivity: (payload: Omit<ActivityEntryCreate, "profile_id">) => Promise<void>;
  onNotify: (msg: string) => void;
  focusSection?: "movement" | "trainer_gym";
}

export function WomenFitnessPanel({
  profileId,
  dashboard,
  fitnessProviders,
  isAuthenticated,
  onOpenAuth,
  onLogActivity,
  onNotify,
  focusSection = "movement",
}: WomenFitnessPanelProps) {
  const [selectedActivity, setSelectedActivity] = useState("Beginner Strength Circuit");
  const [minutes, setMinutes] = useState(20);
  const [intensity, setIntensity] = useState("Moderate");
  const [submitting, setSubmitting] = useState(false);

  async function handleQuickLog(title?: string, presetMinutes?: number, presetIntensity?: string) {
    if (!isAuthenticated || !profileId) {
      onOpenAuth();
      return;
    }
    setSubmitting(true);
    try {
      const act = title ?? selectedActivity;
      const mins = presetMinutes ?? minutes;
      await onLogActivity({
        activity_type: act,
        duration_minutes: mins,
        intensity: presetIntensity ?? intensity,
        notes: "Logged via Women's Wellness Movement companion",
      });
      onNotify(`Logged ${mins} min of ${act} to your Activity Tracker.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Movement & Pre/Post Workout Hub */}
      {focusSection === "movement" && (
        <>
          <div className="grid gap-6 rounded-3xl border border-[#d8e6dc] bg-[#f7fbf8] p-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c3dccb] bg-white px-3 py-1 text-xs font-semibold text-[#2b5239]">
                <Dumbbell className="h-3.5 w-3.5" />
                Sustainable Strength, Walking, Yoga &amp; Rest
              </span>
              <h2 className="mt-3 font-display text-2xl font-extrabold text-[#1e3125] sm:text-3xl">
                Movement Designed Around Energy &amp; Recovery
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#486352]">
                Build bone density, pelvic strength, and cardiovascular steadiness at your pace —
                including intentional rest days whenever your period or schedule calls for gentle slowdowns.
              </p>

              <div className="mt-4 rounded-2xl border border-[#dceade] bg-white p-4 text-xs text-[#3f5d49]">
                <p className="font-bold text-[#1e3125]">Today&apos;s Synced Movement Progress</p>
                <p className="mt-1">
                  Total active minutes logged today:{" "}
                  <strong className="font-mono text-[#2b5239]">
                    {dashboard ? dashboard.activity_summary.total_minutes : 0} min
                  </strong>{" "}
                  ({dashboard ? dashboard.activity_summary.entries_count : 0} entries in shared PostgreSQL tracker)
                </p>
              </div>
            </div>

            {/* Unified Activity Logger Card */}
            <div className="space-y-3 rounded-2xl border border-[#d8e6dc] bg-white p-5 lg:col-span-5">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-[#1e3125]">
                <Activity className="h-4 w-4 text-[#2b5239]" />
                Quick Movement Logger
              </h3>

              <label className="block text-xs font-semibold text-[#486352]">
                Session Type
                <select
                  value={selectedActivity}
                  onChange={(e) => setSelectedActivity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#cfe2d5] bg-[#f7fbf8] px-3 py-2 text-xs text-[#1e3125]"
                >
                  <option value="Beginner Strength Circuit">Beginner Strength Circuit</option>
                  <option value="Brisk Outdoor Walk">Brisk Outdoor Walk</option>
                  <option value="Gentle Mobility & Yoga">Gentle Mobility &amp; Yoga</option>
                  <option value="Dumbbell & Resistance Bands">Dumbbell &amp; Resistance Bands</option>
                  <option value="Rest & Breath Recovery">Rest &amp; Breath Recovery</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-[#486352]">
                  Duration (Min)
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(5, Number(e.target.value) || 20))}
                    className="mt-1 w-full rounded-xl border border-[#cfe2d5] bg-[#f7fbf8] px-3 py-2 text-xs text-[#1e3125]"
                  />
                </label>

                <label className="text-xs font-semibold text-[#486352]">
                  Pace / Intensity
                  <select
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#cfe2d5] bg-[#f7fbf8] px-3 py-2 text-xs text-[#1e3125]"
                  >
                    <option value="Restorative">Restorative</option>
                    <option value="Gentle">Gentle</option>
                    <option value="Moderate">Moderate</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickLog()}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#2b5239] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#22422d] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Log Movement to Tracker
              </button>
            </div>
          </div>

          {/* 5 Core Movement Categories */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FITNESS_GUIDES.map((guide) => (
              <article
                key={guide.id}
                className="flex flex-col justify-between rounded-3xl border border-[#ebd4dc] bg-white p-5 shadow-sm"
              >
                <div>
                  <span className="inline-block rounded-full bg-[#eef6f1] px-2.5 py-0.5 text-[10px] font-bold text-[#2b5239]">
                    {guide.category}
                  </span>
                  <h4 className="mt-2 font-display text-lg font-bold text-[#2d1a24]">
                    {guide.title}
                  </h4>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#9b3d57]">{guide.level}</p>
                  <p className="mt-2.5 text-xs leading-relaxed text-[#5d4250]">{guide.detail}</p>
                  <div className="mt-3 rounded-xl border border-[#f0dce2] bg-[#fff8fa] p-2.5 text-[11px] text-[#6f5762]">
                    <strong className="text-[#2d1a24]">Pre/Post Fuel Tip:</strong>{" "}
                    {guide.prePostTip}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    handleQuickLog(guide.title, guide.durationMinutes, guide.intensity)
                  }
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#cde2d4] bg-[#eef6f1] px-3 py-2 text-xs font-bold text-[#2b5239] transition hover:bg-[#e1efe6]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Log {guide.durationMinutes} min Session
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      {/* Experience #5 — Free Verified Discovery of Fitness Platforms & Honest Onboarding Status */}
      <div className="rounded-3xl border border-[#ebd4dc] bg-[#fff8fa] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c3dccb] bg-white px-3 py-1 text-xs font-semibold text-[#2b5239]">
              <HeartHandshake className="h-3.5 w-3.5" />
              Find a Trainer &amp; Gym • Free Discovery &amp; Verified Platforms
            </span>
            <h3 className="mt-2.5 font-display text-2xl font-extrabold text-[#2d1a24]">
              Certified Trainers, Women-Friendly Studios &amp; Gyms
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#644a57] sm:text-sm">
              Discovery is completely free. We never invent fake personal trainer names, star
              ratings, or fake local gym availability — below are official platform links alongside
              transparent partner onboarding status.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#eef6f1] px-3 py-1 text-xs font-bold text-[#2b5239]">
            <Sparkles className="h-3.5 w-3.5" />
            Discovery Free Forever
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {fitnessProviders.length > 0 ? (
            fitnessProviders.map((prov) => (
              <div
                key={prov.id}
                className="flex flex-col justify-between rounded-2xl border border-[#ebd4dc] bg-white p-5 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#9b3d57]">
                      {prov.hospital_or_organization}
                    </span>
                    <span className="rounded-full bg-[#eef6f1] px-2.5 py-0.5 text-[10px] font-semibold text-[#2b5239]">
                      Official Portal
                    </span>
                  </div>
                  <h4 className="mt-1.5 font-display text-base font-bold text-[#2d1a24]">
                    {prov.name}
                  </h4>
                  <p className="mt-1 text-[#5d4250]">{prov.specialization}</p>
                  <p className="mt-2 text-[11px] text-[#6f5762]">
                    Location: {prov.location} • Mode: {prov.consultation_mode}
                  </p>
                </div>

                <a
                  href={prov.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#9b3d57] px-4 py-2 font-bold text-white transition hover:bg-[#842f48]"
                >
                  Inspect Official Platform
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))
          ) : null}

          {/* Honest Local Trainer/Gym Onboarding Card */}
          <div className="rounded-2xl border border-dashed border-[#d9b8c3] bg-white/80 p-5 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#2d1a24]">
              <Info className="h-4 w-4 text-[#9b3d57]" />
              Individual Local Trainers &amp; Partner Gyms
            </div>
            <p className="mt-2 leading-relaxed text-[#644a57]">
              Verified credential checks for local fitness coaches and women-friendly studio gyms
              are scheduled under future expansion (<strong>Coming Soon — External Partnership
              Required</strong>). NutriSense AI will only list individual coaches once certification
              and safety vetting are completed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
