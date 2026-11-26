import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_PREMIUM } from "./MotionPrimitives";

const PRELOADER_SESSION_KEY = "nutrisense_intro_shown_v1";

export function Preloader() {
  const prefersReduced = useReducedMotion();
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined") return false;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return false;
      }
      return sessionStorage.getItem(PRELOADER_SESSION_KEY) !== "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(PRELOADER_SESSION_KEY, "1");
    } catch {
      // Ignore storage errors
    }
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (prefersReduced) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-label="Loading NutriSense AI"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.42, ease: EASE_PREMIUM }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080B09]"
        >
          {/* Ambient Lime Energy Aura */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute h-64 w-64 rounded-full bg-[#B6FF38]/15 blur-[110px]"
          />

          <div className="relative flex flex-col items-center gap-5">
            {/* Circular Nutrition Stroke Ring + NutriSense Leaf Mark */}
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg
                className="h-24 w-24 -rotate-90"
                viewBox="0 0 96 96"
                aria-hidden="true"
              >
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="3.5"
                />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  stroke="url(#preloaderLimeGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.85, ease: EASE_PREMIUM }}
                />
                <defs>
                  <linearGradient
                    id="preloaderLimeGrad"
                    x1="0"
                    y1="0"
                    x2="96"
                    y2="96"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#B6FF38" />
                    <stop offset="1" stopColor="#34D399" />
                  </linearGradient>
                </defs>
              </svg>

              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: EASE_PREMIUM }}
                className="absolute flex h-14 w-14 items-center justify-center rounded-2xl border border-[#B6FF38]/35 bg-[#101713] shadow-[0_0_28px_rgba(182,255,56,0.25)]"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
                  <path
                    d="M19 4C11.5 4 6.5 8.5 5 15.5C8.8 14.8 12.2 12.7 14.5 9.8C13.2 13.5 9.8 16.5 5.2 17.8C6.6 19.3 8.8 20 11.4 20C16.8 20 20 15.4 20 9.6C20 7.6 19.6 5.7 19 4Z"
                    fill="#B6FF38"
                  />
                </svg>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12 }}
              className="text-center"
            >
              <p className="font-display text-2xl font-extrabold tracking-tight text-white">
                NutriSense{" "}
                <span className="bg-gradient-to-r from-[#B6FF38] to-[#34D399] bg-clip-text text-transparent">
                  AI
                </span>
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[#A3ADA6]">
                Precision Nutrition Engine
              </p>
            </motion.div>

            <button
              type="button"
              onClick={() => setVisible(false)}
              className="mt-1 rounded-full border border-white/10 bg-[#141B16] px-3.5 py-1 text-[11px] text-[#A3ADA6] transition hover:border-white/25 hover:text-white"
            >
              Enter →
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
