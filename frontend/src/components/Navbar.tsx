import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  HeartPulse,
  Home,
  LayoutDashboard,
  Menu,
  Sparkles,
  UserCircle2,
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
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleSelectView(view: AppView) {
    setMobileMenuOpen(false);
    setProfileOpen(false);
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
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0A0A0A]/82 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0A0A0A]/72">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Left: NutriSense AI Logo */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleSelectView("home")}
            className="group flex items-center gap-3 text-left focus:outline-none"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#A3FF12]/30 bg-gradient-to-br from-[#A3FF12]/20 via-[#34D399]/15 to-[#121212] transition duration-200 group-hover:border-[#A3FF12]/60">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
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
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    apiOnline === true
                      ? "bg-[#34D399]"
                      : apiOnline === false
                        ? "bg-amber-400"
                        : "bg-zinc-500"
                  }`}
                />
                <span>{statusLabel}</span>
              </span>
            </div>
          </motion.button>

          {/* Center: Clean Minimal Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-[#121212]/90 p-1 md:flex"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectView(item.id)}
                  className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 lg:px-3.5 lg:text-sm ${
                    isActive
                      ? "text-[#0A0A0A] font-semibold"
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
                      className="absolute inset-0 rounded-full bg-[#A3FF12]"
                    />
                  )}
                  <Icon className="relative z-10 h-3.5 w-3.5 lg:h-4 lg:w-4" />
                  <span className="relative z-10 whitespace-nowrap">
                    {item.label}
                  </span>
                  {item.id === "alternatives" && alternativesCount > 0 && (
                    <span
                      className={`relative z-10 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
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

          {/* Right: Profile / Session Option + Mobile Menu Trigger */}
          <div className="flex items-center gap-2">
            {activeView !== "scanner" && (
              <button
                type="button"
                onClick={() => handleSelectView("scanner")}
                className="hidden items-center gap-1.5 rounded-full bg-[#A3FF12] px-3.5 py-2 text-xs font-bold text-[#0A0A0A] transition hover:bg-[#b5ff3b] sm:inline-flex"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Scan Food</span>
              </button>
            )}

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-expanded={profileOpen}
                aria-label="Profile and preferences"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-[#121212] px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/25 hover:text-white"
              >
                <UserCircle2 className="h-4 w-4 text-[#34D399]" />
                <span className="hidden sm:inline">Profile</span>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.16, ease: EASE_PREMIUM }}
                    className="absolute right-0 mt-2 w-60 rounded-2xl border border-white/10 bg-[#121212] p-3.5 shadow-2xl"
                  >
                    <p className="text-xs font-semibold text-white">
                      Local Session
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#A1A1AA]">
                      Daily targets and latest scan preferences are saved in
                      this browser.
                    </p>
                    <div className="mt-3 space-y-1.5 border-t border-white/[0.08] pt-2.5">
                      <button
                        type="button"
                        onClick={() => handleSelectView("dashboard")}
                        className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <span>My Nutrition Dashboard</span>
                        <span className="text-[#34D399]">→</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectView("scanner")}
                        className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <span>Open AI Food Scanner</span>
                        <span className="text-[#A3FF12]">→</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={
                mobileMenuOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
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
                  <span className="text-[#A1A1AA]">API Status</span>
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
