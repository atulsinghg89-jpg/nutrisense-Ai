import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarDays,
  Camera,
  ChevronDown,
  HeartPulse,
  Home,
  LayoutDashboard,
  Menu,
  ShoppingBasket,
  Sparkles,
  UserCircle2,
  Utensils,
  X,
} from "lucide-react";
import type { AppView } from "../types/nutrition";
import { EASE_PREMIUM } from "./MotionPrimitives";

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenAssistant: () => void;
  onOpenOnboarding: () => void;
  profileName?: string;
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

const HUB_ITEMS: {
  id: AppView;
  label: string;
  subtitle: string;
  icon: typeof CalendarDays;
}[] = [
  {
    id: "planner",
    label: "AI Weekly Meal Planner",
    subtitle: "7-day Indian & balanced calendar",
    icon: CalendarDays,
  },
  {
    id: "indian-foods",
    label: "Indian Food Intelligence",
    subtitle: "Roti, dal, paneer, idli macros",
    icon: Utensils,
  },
  {
    id: "grocery",
    label: "Smart Grocery List",
    subtitle: "Organized synced checklist",
    icon: ShoppingBasket,
  },
];

export function Navbar({
  activeView,
  onNavigate,
  onOpenAssistant,
  onOpenOnboarding,
  profileName,
  alternativesCount,
  apiOnline,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const hubRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hubRef.current && !hubRef.current.contains(e.target as Node)) {
        setHubOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectView(view: AppView) {
    setMobileMenuOpen(false);
    setHubOpen(false);
    onNavigate(view);
  }

  const isHubActive =
    activeView === "planner" ||
    activeView === "indian-foods" ||
    activeView === "grocery";

  const statusLabel =
    apiOnline === true
      ? "API Connected"
      : apiOnline === false
        ? "API Offline"
        : "Connecting API";

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled || mobileMenuOpen
            ? "border-b border-white/[0.08] bg-[#0A0A0A]/88 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent backdrop-blur-[2px]"
        }`}
      >
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

          {/* Desktop Navigation Pills (Preserving All 5 Primary Routes + Smart Hub Dropdown) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-[#121212]/85 p-1 shadow-inner backdrop-blur-md lg:flex"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectView(item.id)}
                  className={`relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 xl:px-3.5 xl:text-sm ${
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
                  <Icon className="relative z-10 h-3.5 w-3.5 xl:h-4 xl:w-4" />
                  <span className="relative z-10 whitespace-nowrap">
                    {item.label}
                  </span>
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

            {/* Smart Nutrition Hub Dropdown */}
            <div ref={hubRef} className="relative">
              <button
                type="button"
                onClick={() => setHubOpen((prev) => !prev)}
                aria-expanded={hubOpen}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition xl:text-sm ${
                  isHubActive || hubOpen
                    ? "bg-[#34D399]/18 text-[#34D399]"
                    : "text-[#A1A1AA] hover:text-white"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Smart Tools</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    hubOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {hubOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: EASE_PREMIUM }}
                    className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-white/[0.1] bg-[#121212]/95 p-2 shadow-2xl backdrop-blur-xl"
                  >
                    {HUB_ITEMS.map((sub) => {
                      const SubIcon = sub.icon;
                      const active = activeView === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSelectView(sub.id)}
                          className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                            active
                              ? "bg-[#A3FF12]/15 text-[#A3FF12]"
                              : "text-zinc-200 hover:bg-white/[0.06]"
                          }`}
                        >
                          <SubIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" />
                          <div>
                            <p className="text-xs font-bold">{sub.label}</p>
                            <p className="text-[11px] text-[#A1A1AA]">
                              {sub.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setHubOpen(false);
                        onOpenAssistant();
                      }}
                      className="mt-1 flex w-full items-start gap-3 rounded-xl border-t border-white/[0.08] px-3 py-2.5 text-left text-zinc-200 transition hover:bg-white/[0.06]"
                    >
                      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-[#A3FF12]" />
                      <div>
                        <p className="text-xs font-bold text-[#A3FF12]">
                          Nutri AI Assistant
                        </p>
                        <p className="text-[11px] text-[#A1A1AA]">
                          Ask Gemini nutrition questions
                        </p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Tablet-compact primary links (md to lg) */}
          <nav
            aria-label="Tablet Navigation"
            className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-[#121212]/85 p-1 md:flex lg:hidden"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectView(item.id)}
                  className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-[#A3FF12] text-[#0A0A0A]"
                      : "text-[#A1A1AA] hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Cluster + Mobile Menu Trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenOnboarding}
              title="Setup or edit nutrition profile"
              className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-[#A3FF12]/50 hover:text-white md:inline-flex"
            >
              <UserCircle2 className="h-3.5 w-3.5 text-[#A3FF12]" />
              <span className="max-w-[90px] truncate">
                {profileName ? profileName : "Get Started"}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenAssistant}
              title="Open Nutri AI Assistant"
              className="hidden items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-3 py-2 text-xs font-semibold text-[#34D399] transition hover:bg-[#34D399]/20 sm:inline-flex"
            >
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Nutri AI</span>
            </button>

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
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#121212] text-zinc-300 transition hover:border-white/20 hover:text-white lg:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Responsive Mobile / Tablet Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE_PREMIUM }}
              className="overflow-hidden border-t border-white/[0.08] bg-[#0A0A0A]/95 backdrop-blur-xl lg:hidden"
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

                <div className="pt-2">
                  <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#34D399]">
                    Smart Nutrition Tools
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {HUB_ITEMS.map((sub) => {
                      const SubIcon = sub.icon;
                      const isActive = activeView === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSelectView(sub.id)}
                          className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                            isActive
                              ? "bg-[#34D399] text-[#0A0A0A]"
                              : "bg-[#121212] text-zinc-200 hover:bg-[#171717]"
                          }`}
                        >
                          <SubIcon className="h-4 w-4 shrink-0" />
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAssistant();
                      }}
                      className="flex items-center gap-2.5 rounded-xl border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-3.5 py-2.5 text-left text-xs font-semibold text-[#A3FF12]"
                    >
                      <Bot className="h-4 w-4 shrink-0" />
                      <span>Nutri AI Assistant</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenOnboarding();
                      }}
                      className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2.5 text-left text-xs font-semibold text-white"
                    >
                      <UserCircle2 className="h-4 w-4 shrink-0 text-[#34D399]" />
                      <span>
                        {profileName ? `Profile: ${profileName}` : "Get Started / Goals Setup"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Preserved Mobile Bottom Navigation (5 Core Views) */}
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
