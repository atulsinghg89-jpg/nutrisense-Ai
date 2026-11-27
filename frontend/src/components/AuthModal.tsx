import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { AccountProfileType, AudienceChapterId } from "../types/nutrition";
import { EASE_PREMIUM } from "./MotionPrimitives";

function chapterDefaults(chapter: AudienceChapterId | null): {
  profileType: AccountProfileType;
  chapterId: AudienceChapterId;
  hint: string;
} {
  if (chapter === "babies") {
    return {
      profileType: "baby",
      chapterId: "babies",
      hint: "Starting with a Baby nutrition profile (age in months & safe complementary foods).",
    };
  }
  if (chapter === "patients") {
    return {
      profileType: "patient",
      chapterId: "patients",
      hint: "Starting with a Patient support profile (allergies & care notes kept strictly non-diagnostic).",
    };
  }
  if (chapter === "women") {
    return {
      profileType: "personal",
      chapterId: "women",
      hint: "Starting with a Personal profile tailored to the Women's chapter.",
    };
  }
  return {
    profileType: "personal",
    chapterId: "men",
    hint: "Starting with a Personal profile tailored to your nutrition needs.",
  };
}

export function AuthModal() {
  const {
    authModalOpen,
    authModalMode,
    authModalChapter,
    closeAuthModal,
    login,
    register,
  } = useAuth();

  const [mode, setMode] = useState<"login" | "register">(authModalMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [createInitialProfile, setCreateInitialProfile] = useState(true);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileType, setProfileType] = useState<AccountProfileType>("personal");
  const [chapterId, setChapterId] = useState<AudienceChapterId>("men");
  const [ageInput, setAgeInput] = useState("");
  const [ageUnit, setAgeUnit] = useState<"years" | "months">("years");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authModalOpen) return;
    setMode(authModalMode);
    setError(null);
    const defs = chapterDefaults(authModalChapter);
    setProfileType(defs.profileType);
    setChapterId(defs.chapterId);
    setAgeUnit(defs.profileType === "baby" ? "months" : "years");
  }, [authModalOpen, authModalMode, authModalChapter]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please fill in your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(trimmedEmail, password);
      } else {
        const trimmedName = fullName.trim();
        if (trimmedName.length < 2) {
          setError("Please enter your full name (at least 2 characters).");
          setSubmitting(false);
          return;
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters long.");
          setSubmitting(false);
          return;
        }

        const parsedAge = ageInput.trim() ? Number(ageInput.trim()) : null;
        const validAge =
          parsedAge !== null && Number.isFinite(parsedAge) && parsedAge >= 0
            ? Math.round(parsedAge)
            : null;

        await register({
          full_name: trimmedName,
          email: trimmedEmail,
          password,
          initial_profile: createInitialProfile
            ? {
                profile_type: profileType,
                audience_chapter: chapterId,
                display_name: (profileDisplayName.trim() || trimmedName).slice(0, 120),
                age_years: ageUnit === "years" ? validAge : null,
                age_months: ageUnit === "months" ? validAge : null,
                is_default: true,
              }
            : undefined,
        });
      }
      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please verify your details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {authModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAuthModal}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-modal-title"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: EASE_PREMIUM }}
              className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0D110E] p-6 shadow-2xl sm:p-7"
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#A3FF12]">
                    <Lock className="h-3 w-3" />
                    Secure HttpOnly Session Auth
                  </span>
                  <h2
                    id="auth-modal-title"
                    className="mt-2 font-display text-xl font-extrabold text-white"
                  >
                    {mode === "login"
                      ? "Sign In to NutriSense AI"
                      : "Create Your NutriSense Account"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeAuthModal}
                  aria-label="Close authentication modal"
                  className="rounded-xl border border-white/10 p-1.5 text-zinc-400 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mode Switcher */}
              <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.08] bg-[#070A08] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className={`rounded-xl py-2 text-xs font-bold transition ${
                    mode === "login"
                      ? "bg-[#A3FF12] text-[#050706]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className={`rounded-xl py-2 text-xs font-bold transition ${
                    mode === "register"
                      ? "bg-[#A3FF12] text-[#050706]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authModalChapter && mode === "register" && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-2 text-xs text-[#A7F3D0]">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                  <span>{chapterDefaults(authModalChapter).hint}</span>
                </div>
              )}

              <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3.5">
                {mode === "register" && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#A3FF12]/60 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/10 bg-[#070A08] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#A3FF12]/60 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-300">
                    Password {mode === "register" && "(min 8 characters)"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={mode === "register" ? 8 : 1}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/10 bg-[#070A08] py-2.5 pr-10 pl-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#A3FF12]/60 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {mode === "register" && (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#070A08] p-3.5">
                    <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-white">
                      <span>Set up first profile now (optional)</span>
                      <input
                        type="checkbox"
                        checked={createInitialProfile}
                        onChange={(e) => setCreateInitialProfile(e.target.checked)}
                        className="h-4 w-4 rounded accent-[#A3FF12]"
                      />
                    </label>

                    {createInitialProfile && (
                      <div className="mt-3 space-y-2.5 border-t border-white/[0.06] pt-3">
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: "personal", label: "Personal" },
                              { id: "baby", label: "Baby" },
                              { id: "patient", label: "Patient" },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setProfileType(opt.id);
                                if (opt.id === "baby") {
                                  setChapterId("babies");
                                  setAgeUnit("months");
                                } else if (opt.id === "patient") {
                                  setChapterId("patients");
                                  setAgeUnit("years");
                                } else {
                                  setChapterId(authModalChapter === "women" ? "women" : "men");
                                  setAgeUnit("years");
                                }
                              }}
                              className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                                profileType === opt.id
                                  ? "border-[#A3FF12]/60 bg-[#A3FF12]/15 text-[#A3FF12]"
                                  : "border-white/10 bg-[#121613] text-zinc-400 hover:text-white"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={profileDisplayName}
                            onChange={(e) => setProfileDisplayName(e.target.value)}
                            placeholder="Profile name (optional)"
                            className="rounded-xl border border-white/10 bg-[#121613] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-[#A3FF12]/50 focus:outline-none"
                          />
                          <div className="flex gap-1">
                            <input
                              type="number"
                              min={0}
                              max={ageUnit === "months" ? 360 : 125}
                              value={ageInput}
                              onChange={(e) => setAgeInput(e.target.value)}
                              placeholder={ageUnit === "months" ? "Months" : "Age"}
                              className="w-full rounded-xl border border-white/10 bg-[#121613] px-2.5 py-2 text-xs text-white placeholder-zinc-600 focus:border-[#A3FF12]/50 focus:outline-none"
                            />
                            <select
                              value={ageUnit}
                              onChange={(e) =>
                                setAgeUnit(e.target.value as "years" | "months")
                              }
                              className="rounded-xl border border-white/10 bg-[#121613] px-1.5 py-2 text-[11px] text-zinc-300"
                            >
                              <option value="years">yrs</option>
                              <option value="months">mo</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#A3FF12] px-4 py-3 text-sm font-bold text-[#050706] shadow-[0_0_24px_rgba(163,255,18,0.25)] transition hover:bg-[#b8ff42] disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {mode === "login" ? "Signing in..." : "Creating account..."}
                      </span>
                    </>
                  ) : mode === "login" ? (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Sign In</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-zinc-500">
                  Credentials are stored securely on the backend using salted Argon2id hashes and HttpOnly cookies — never in browser localStorage.
                </p>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
