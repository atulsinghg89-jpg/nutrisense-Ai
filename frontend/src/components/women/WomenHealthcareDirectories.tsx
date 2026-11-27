import { useState, type FormEvent } from "react";
import {
  Building2,
  CheckCircle2,
  Crown,
  ExternalLink,
  Info,
  Microscope,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { saveAppointmentPreviewNote } from "../../lib/api";
import type {
  AccountProfile,
  DiagnosticLabEntry,
  HealthcareProviderEntry,
  ServicePreviewEntry,
  SubscriptionPlanPreview,
} from "../../types/nutrition";

interface WomenHealthcareDirectoriesProps {
  mode: "doctors" | "labs" | "premium";
  profile: AccountProfile | null;
  profileId: number | null;
  providers: HealthcareProviderEntry[];
  labs: DiagnosticLabEntry[];
  plans: SubscriptionPlanPreview[];
  services: ServicePreviewEntry[];
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onNotify: (msg: string) => void;
}

export function WomenHealthcareDirectories({
  mode,
  profile,
  profileId,
  providers,
  labs,
  plans,
  services,
  isAuthenticated,
  onOpenAuth,
  onNotify,
}: WomenHealthcareDirectoriesProps) {
  const [selectedSlug, setSelectedSlug] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const isMinor = profile?.age_years != null && profile.age_years < 18;

  async function handleSaveInterestNote(e: FormEvent, isLab: boolean) {
    e.preventDefault();
    if (!isAuthenticated || !profileId) {
      onOpenAuth();
      return;
    }
    setSavingNote(true);
    try {
      await saveAppointmentPreviewNote({
        profile_id: profileId,
        provider_slug: isLab ? null : selectedSlug || null,
        lab_slug: isLab ? selectedSlug || null : null,
        preferred_date: preferredDate || null,
        notes: noteText.trim() || null,
      });
      setNoteText("");
      setPreferredDate("");
      onNotify("Saved private planning reminder note (external official portal handles booking).");
    } finally {
      setSavingNote(false);
    }
  }

  /* Experience #6: Find a Women's Health Professional */
  if (mode === "doctors") {
    const clinicalProviders = providers.filter(
      (p) => p.provider_type !== "fitness_platform",
    );

    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-[#ebd4dc] bg-[#fff8fa] p-6 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6c5ce] bg-white px-3 py-1 text-xs font-semibold text-[#9b3d57]">
            <Stethoscope className="h-3.5 w-3.5" />
            Verified Medical Portals &amp; Care Pathways
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-[#2d1a24] sm:text-3xl">
            Find a Women&apos;s Health Professional
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#644a57]">
            NutriSense AI never displays unverified doctor names, fabricated credentials, or fake
            online bookings. Use official national registries and government telemedicine portals below.
          </p>

          {isMinor && (
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Guardian Notice (Age &lt; 18):</strong> Paid clinical bookings require parent or
                guardian oversight. Ask a trusted adult to review appointments before booking external care.
              </span>
            </div>
          )}
        </div>

        {/* Future Planned Clinical Care Tiers */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Consultation-Only",
              desc: "Initial gynecologist or clinician conversation when future partner clinics launch.",
              status: "Future Partner Workflow",
            },
            {
              title: "Follow-Up Consultations",
              desc: "Review cycle patterns or progress securely with your licensed physician.",
              status: "Future Partner Workflow",
            },
            {
              title: "Provider-Directed Treatment",
              desc: "Medical prescriptions or investigations decided solely by your registered doctor.",
              status: "Doctor Controlled Only",
            },
          ].map((tier) => (
            <div
              key={tier.title}
              className="rounded-2xl border border-[#ebd4dc] bg-white p-5 text-xs"
            >
              <span className="rounded-full bg-[#f5effa] px-2.5 py-0.5 text-[10px] font-bold text-[#5e4078]">
                {tier.status}
              </span>
              <h3 className="mt-2 font-display text-base font-bold text-[#2d1a24]">{tier.title}</h3>
              <p className="mt-1 leading-relaxed text-[#644a57]">{tier.desc}</p>
            </div>
          ))}
        </div>

        {/* Official Verified Registries */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {clinicalProviders.map((prov) => (
            <article
              key={prov.id}
              className="flex flex-col justify-between rounded-3xl border border-[#ebd4dc] bg-white p-5 text-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#9b3d57]">{prov.hospital_or_organization}</span>
                  <span className="rounded-full bg-[#eef6f1] px-2.5 py-0.5 text-[10px] font-bold text-[#2b5239]">
                    Official Verified Portal
                  </span>
                </div>
                <h4 className="mt-2 font-display text-lg font-bold text-[#2d1a24]">{prov.name}</h4>
                <p className="mt-1 text-[#5d4250]">{prov.specialization}</p>
                <p className="mt-2 text-[11px] text-[#6f5762]">
                  {prov.qualifications} • {prov.consultation_mode}
                </p>
                <p className="mt-1 text-[11px] text-[#6f5762]">Fee policy: {prov.consultation_fees_note}</p>
              </div>

              <a
                href={prov.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#9b3d57] px-4 py-2 font-bold text-white transition hover:bg-[#842f48]"
              >
                Open Official Registry / Portal
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </article>
          ))}
        </div>

        {/* Private Consultation Preparation Note */}
        <form
          onSubmit={(e) => handleSaveInterestNote(e, false)}
          className="space-y-3 rounded-3xl border border-[#ebd4dc] bg-white p-6"
        >
          <h3 className="font-display text-base font-bold text-[#2d1a24]">
            Save a Personal Doctor Visit Preparation Note
          </h3>
          <p className="text-xs text-[#644a57]">
            Jot down cycle questions you want to ask at your appointment (saved privately as a note,
            not an active hospital reservation).
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              aria-label="Reference portal"
              className="rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
            >
              <option value="">General Gynecologist Note</option>
              {clinicalProviders.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
            />
            <input
              type="text"
              maxLength={300}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Questions for your clinician..."
              className="rounded-xl border border-[#e6c5ce] bg-[#fffaf8] px-3 py-2 text-xs text-[#2d1a24]"
            />
          </div>
          <button
            type="submit"
            disabled={savingNote}
            className="rounded-xl bg-[#3f6f52] px-4 py-2 text-xs font-bold text-white hover:bg-[#325941]"
          >
            Save Personal Reminder Note
          </button>
        </form>
      </div>
    );
  }

  /* Experience #7: Find Diagnostic Labs */
  if (mode === "labs") {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-[#ebd4dc] bg-[#fff8fa] p-6 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6c5ce] bg-white px-3 py-1 text-xs font-semibold text-[#9b3d57]">
            <Microscope className="h-3.5 w-3.5" />
            Official Diagnostic Network Portals
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-[#2d1a24] sm:text-3xl">
            Find Diagnostic Labs
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#644a57]">
            <strong>Doctor-First Policy:</strong> Appropriate laboratory investigations (iron/ferritin,
            thyroid, HbA1c, CBC, vitamin levels) must be recommended by a qualified doctor — never by
            AI. Verify NABL centre accreditation directly on each lab&apos;s official portal.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {labs.map((lab) => (
            <article
              key={lab.id}
              className="flex flex-col justify-between rounded-3xl border border-[#ebd4dc] bg-white p-5 text-xs"
            >
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef6f1] px-2.5 py-0.5 text-[10px] font-bold text-[#2b5239]">
                  <Building2 className="h-3 w-3" /> Official Portal
                </span>
                <h3 className="mt-2 font-display text-lg font-bold text-[#2d1a24]">{lab.name}</h3>
                <p className="mt-1 text-[#5d4250]">{lab.available_tests_note}</p>
                <p className="mt-2 text-[11px] text-[#6f5762]">Coverage: {lab.location}</p>
                <p className="mt-1 text-[11px] text-[#6f5762]">{lab.accreditation_note}</p>
                <p className="mt-1 font-semibold text-[#9b3d57]">{lab.pricing_note}</p>
              </div>

              <a
                href={lab.official_booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#9b3d57] px-4 py-2 font-bold text-white transition hover:bg-[#842f48]"
              >
                Visit Official Lab Portal
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </article>
          ))}
        </div>
      </div>
    );
  }

  /* Experience #8: Premium Wellness (Strict Coming Soon, Zero Fake Checkout) */
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#e3d8ee] bg-gradient-to-br from-[#faf7fd] via-[#fff8fa] to-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6c2ea] bg-white px-3 py-1 text-xs font-semibold text-[#5e4078]">
            <Crown className="h-3.5 w-3.5" />
            Premium — Coming Soon (Billing Disabled)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#eef6f1] px-3 py-1 text-xs font-bold text-[#2b5239]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Menstrual Health &amp; Period Tracking Stay Free Always
          </span>
        </div>

        <h2 className="mt-3 font-display text-2xl font-extrabold text-[#2d1a24] sm:text-3xl">
          Future Optional Guided Support Services
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#644a57]">
          Future partnerships will optionally connect registered dietitians, personal trainers,
          and licensed women&apos;s clinicians. There are{" "}
          <strong>no active payments or checkout buttons</strong> here, and essential menstrual
          education, cycle tracking, and core wellness features will never be paywalled.
        </p>
      </div>

      {/* Planned Service Categories */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="flex flex-col justify-between rounded-2xl border border-[#ebd4dc] bg-white p-5 text-xs"
          >
            <div>
              <span className="rounded-full bg-[#f5effa] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#5e4078]">
                {svc.status.replace("_", " ")}
              </span>
              <h3 className="mt-2 font-display text-base font-bold text-[#2d1a24]">
                {svc.title}
              </h3>
            </div>
            <p className="mt-3 flex items-center gap-1 text-[11px] text-[#6f5762]">
              <Info className="h-3.5 w-3.5 text-[#7d5b96]" />
              Requires external vetted clinical/trainer partner onboarding
            </p>
          </div>
        ))}
      </div>

      {/* Planned Tiers Preview */}
      <div className="grid gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className="flex flex-col justify-between rounded-3xl border border-[#e3d8ee] bg-white p-6 text-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-extrabold text-[#2d1a24]">{plan.name}</h3>
                <span className="rounded-full bg-[#f5effa] px-3 py-1 text-[10px] font-bold uppercase text-[#5e4078]">
                  {plan.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#644a57]">{plan.tagline}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-[#4a3240]">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3f6f52]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-[#d6c2ea] bg-[#faf7fd] p-3 text-center text-[11px] font-semibold text-[#5e4078]">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              Billing Active: {plan.billing_active ? "Yes" : "No — Preview Only"}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
