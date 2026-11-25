import {
  Camera,
  HeartPulse,
  Home,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import type { AppView } from "../types/nutrition";

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
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0A0A0A]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="group flex items-center gap-3 text-left focus:outline-none"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#A3FF12]/30 bg-gradient-to-br from-[#A3FF12]/20 via-[#34D399]/15 to-transparent shadow-[0_0_20px_rgba(163,255,18,0.14)] transition group-hover:border-[#A3FF12]/60">
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
              <span className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
                NutriSense{" "}
                <span className="bg-gradient-to-r from-[#A3FF12] to-[#34D399] bg-clip-text text-transparent">
                  AI
                </span>
              </span>
              <span className="hidden items-center gap-1.5 text-[11px] text-zinc-400 sm:flex">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    apiOnline === true
                      ? "bg-[#34D399] shadow-[0_0_8px_#34D399]"
                      : apiOnline === false
                        ? "bg-amber-400"
                        : "bg-zinc-500"
                  }`}
                />
                {apiOnline === true
                  ? "API Connected"
                  : apiOnline === false
                    ? "API Offline"
                    : "Smart Food Intelligence"}
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-[#121212] p-1 md:flex"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#A3FF12] text-[#0A0A0A] shadow-[0_0_18px_rgba(163,255,18,0.28)]"
                      : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.id === "alternatives" && alternativesCount > 0 && (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
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

          {/* Quick Scanner Action */}
          <div className="flex items-center gap-2">
            {activeView !== "scanner" && (
              <button
                type="button"
                onClick={() => onNavigate("scanner")}
                className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-4 py-2 text-xs font-semibold text-[#0A0A0A] shadow-[0_0_20px_rgba(163,255,18,0.22)] transition hover:bg-[#b5ff3b] sm:text-sm"
              >
                <Camera className="h-4 w-4" />
                <span>Scan Food</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
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
                onClick={() => onNavigate(item.id)}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition ${
                  isActive
                    ? "bg-[#A3FF12]/15 text-[#A3FF12]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.shortLabel}</span>
                {item.id === "alternatives" && alternativesCount > 0 && (
                  <span className="absolute top-1 right-2.5 h-2 w-2 rounded-full bg-[#34D399]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
