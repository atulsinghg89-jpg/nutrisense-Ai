import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  HeartPulse,
  Home,
  LayoutDashboard,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import type { AppView } from "../types/nutrition";
import { EASE_PREMIUM } from "./MotionPrimitives";

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  alternativesCount: number;
  apiOnline: boolean | null;
}

const NAV_ITEMS: {
  id: AppView;
  label: string;
  shortLabel: string;
  icon: typeof Home;
}[] = [
  { id: "home", label: "Home", shortLabel: "Home", icon: Home },
  { id: "scanner", label: "AI Scanner", shortLabel: "Scanner", icon: Camera },
  {
    id: "alternatives",
    label: "Food Alternatives",
    shortLabel: "Swaps",
    icon: Sparkles,
  },
  {
    id: "categories",
    label: "Nutrition & Categories",
    shortLabel: "Guides",
    icon: HeartPulse,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    shortLabel: "Dashboard",
    icon: LayoutDashboard,
  },
];

export function Navbar({
  activeView,
  onNavigate,
  alternativesCount,
  apiOnline,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleSelectView(view: AppView) {
    setMobileMenuOpen(false);
    onNavigate(view);
  }

  const statusLabel =
    apiOnline === true
      ? "API Connected"
      : apiOnline === false
        ? "API Offline"
        : "Connecting API";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0A0A0A]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0A0A0A]/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleSelectView("home")}
            className="group flex items-center gap-3 text-left focus:outline-none"
          >
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#A3FF12]/30 bg-gradient-to-br from-[#A3FF12]/20 via-[#34D399]/15 to-[#121212] shadow-[0_0_24px_rgba(163,255,18,0.16)] transition duration-200 group-hover:border-[#A3FF12]/60 group-hover:shadow-[0_0_28px_rgba(163,255,18,0.28)]">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M19 4C11.5 4 6.5 8.5 5 15.5C8.8 14.8 12.2 12.7 14.5 9.8C13.2 13.5 9.8 16.5 5.2 17.8C6.6 19.3 8.8 20 11.4 20C16.8 20 20 15.4 20 9.6C20 7.6 19.6 5.7 19 4Z"
                  fill="url(#nutrisenseLogo)"
                />
                <defs>
                  <linearGradient
                    id="nutrisenseLogo"
                    x1="5"
                    y1="4"
                    x2="20"
                    y2="20"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#A3FF12" />
                    <stop offset="1" stopColor="#34D399" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <div>
              <span className="font-display text-base font-extrabold tracking-tight text-white sm:text-lg">
                NutriSense{" "}
                <span className="bg-gradient-to-r from-[#A3FF12] to-[#34D399] bg-clip-text text-transparent">
                  AI
                </span>
              </span>
              <span className="hidden items-center gap-1.5 text-[11px] font-medium text-[#A1A1AA] sm:flex">
                <span className="relative flex h-2 w-2 items-center justify-center">
                  {apiOnline === true && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34D399] opacity-60" />
                  )}
                  <span
                    className={`relative inline-block h-1.5 w-1.5 rounded-full ${
                      apiOnline === true
                        ? "bg-[#34D399]"
                        : apiOnline === false
                          ? "bg-amber-400"
                          : "bg-zinc-500"
                    }`}
                  />
                </span>
                <span>{statusLabel}</span>
              </span>
            </div>
          </motion.button>

          {/* Desktop Navigation Pills */}
          <nav
            aria-label="Primary Navigation"
            className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-[#121212]/90 p-1 shadow-inner md:flex"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectView(item.id)}
                  className={`relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-[#0A0A0A]"
                      : "text-[#A1A1AA] hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="navbar-active-pill"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      className="absolute inset-0 rounded-full bg-[#A3FF12] shadow-[0_0_20px_rgba(163,255,18,0.3)]"
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{item.label}</span>
                  {item.id === "alternatives" && alternativesCount > 0 && (
                    <span
                      className={`relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                        isActive
                          ? "bg-[#0A0A0A]/15 text-[#0A0A0A]"
                          : "bg-[#34D399]/20 text-[#34D399]"
                      }`}
                    >
                      {alternativesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Cluster + Mobile Menu Trigger */}
          <div className="flex items-center gap-2">
            {activeView !== "scanner" && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelectView("scanner")}
                className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#0A0A0A] shadow-[0_0_22px_rgba(163,255,18,0.25)] transition hover:bg-[#b5ff3b] sm:text-sm"
              >
                <Camera className="h-4 w-4" />
                <span>Scan Food</span>
              </motion.button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#121212] text-zinc-300 transition hover:border-white/20 hover:text-white md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE_PREMIUM }}
              className="overflow-hidden border-t border-white/[0.08] bg-[#0A0A0A]/95 backdrop-blur-xl md:hidden"
            >
              <div className="space-y-1.5 px-4 py-3">
                <div className="mb-2 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#121212] px-3 py-2 text-xs">
                  <span className="text-[#A1A1AA]">Backend Status</span>
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${
                      apiOnline === true
                        ? "text-[#34D399]"
                        : apiOnline === false
                          ? "text-amber-300"
                          : "text-zinc-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        apiOnline === true
                          ? "bg-[#34D399]"
                          : apiOnline === false
                            ? "bg-amber-400"
                            : "bg-zinc-500"
                      }`}
                    />
                    {statusLabel}
                  </span>
                </div>

                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectView(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? "bg-[#A3FF12] text-[#0A0A0A] font-semibold"
                          : "bg-[#121212]/70 text-zinc-300 hover:bg-[#171717] hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </span>
                      {item.id === "alternatives" && alternativesCount > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isActive
                              ? "bg-[#0A0A0A]/15 text-[#0A0A0A]"
                              : "bg-[#34D399]/20 text-[#34D399]"
                          }`}
                        >
                          {alternativesCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Preserved Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0A0A0A]/95 px-2 py-1.5 backdrop-blur-xl md:hidden"
      >
        <div className="grid grid-cols-5 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectView(item.id)}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition ${
                  isActive ? "text-[#A3FF12]" : "text-zinc-400 hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-indicator"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-[#A3FF12]/12"
                  />
                )}
                <Icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10 truncate">{item.shortLabel}</span>
                {item.id === "alternatives" && alternativesCount > 0 && (
                  <span className="absolute top-1 right-2.5 z-10 h-2 w-2 rounded-full bg-[#34D399]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
