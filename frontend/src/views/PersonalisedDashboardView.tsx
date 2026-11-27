import { useEffect, useState } from "react";
import { Flower2, Globe2, LayoutDashboard, Users } from "lucide-react";
import { GlobalNutritionDashboard } from "../components/global/GlobalNutritionDashboard";
import { ProfileTrackerWorkspace } from "../components/ProfileTrackerWorkspace";
import { useAuth } from "../context/AuthContext";
import type {
  AppView,
  AudienceChapterId,
  DailyMacroTargets,
  UserNutritionProfile,
} from "../types/nutrition";
import { DashboardView } from "./DashboardView";
import { WomensWellnessView } from "./WomensWellnessView";

interface PersonalisedDashboardViewProps {
  dailyTargets: DailyMacroTargets;
  onUpdateTargets: (targets: DailyMacroTargets) => void;
  onNavigate: (view: AppView) => void;
  refreshTrigger: number;
  openGoalsInitially?: boolean;
  onConsumedGoalsTrigger?: () => void;
  userProfile?: UserNutritionProfile;
  requestedChapter?: AudienceChapterId | null;
  onConsumedRequestedChapter?: () => void;
  onProfileDataChanged?: () => void;
  onDataLogged?: (message: string) => void;
}

export function PersonalisedDashboardView({
  dailyTargets,
  onUpdateTargets,
  onNavigate,
  refreshTrigger,
  openGoalsInitially,
  onConsumedGoalsTrigger,
  userProfile,
  requestedChapter = null,
  onConsumedRequestedChapter,
  onProfileDataChanged,
  onDataLogged,
}: PersonalisedDashboardViewProps) {
  const { user, activeProfile, openAuthModal } = useAuth();
  const [subTab, setSubTab] = useState<
    "profile_hub" | "meal_logs" | "women_wellness" | "global_insights"
  >("profile_hub");
  const isWomenProfile = activeProfile?.audience_chapter === "women";

  useEffect(() => {
    if (!isWomenProfile && subTab === "women_wellness") {
      setSubTab("profile_hub");
    }
  }, [isWomenProfile, subTab]);

  return (
    <div className="space-y-6">
      {user && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#0D110E] px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
            <span>Workspace View:</span>
          </div>
          <div className="flex flex-wrap rounded-xl border border-white/10 bg-[#050706] p-1">
            <button
              type="button"
              onClick={() => setSubTab("profile_hub")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                subTab === "profile_hub"
                  ? "bg-[#A3FF12] text-[#050706]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Personalised Profiles, Hydration &amp; Activity</span>
            </button>
            {isWomenProfile && (
              <button
                type="button"
                onClick={() => setSubTab("women_wellness")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  subTab === "women_wellness"
                    ? "bg-rose-300 text-[#140B10]"
                    : "text-rose-200 hover:text-white"
                }`}
              >
                <Flower2 className="h-3.5 w-3.5" />
                <span>Women Wellness &amp; Period Garden</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSubTab("global_insights")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                subTab === "global_insights"
                  ? "bg-[#A3FF12] text-[#050706]"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Globe2 className="h-3.5 w-3.5" />
              <span>Global &amp; Balance Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("meal_logs")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                subTab === "meal_logs"
                  ? "bg-[#34D399] text-[#050706]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Shared Scan Meal Logs</span>
            </button>
          </div>
        </div>
      )}

      {(!user || subTab === "profile_hub") && (
        <ProfileTrackerWorkspace
          requestedChapter={requestedChapter}
          onConsumedRequestedChapter={onConsumedRequestedChapter}
          onNavigateScanner={() => onNavigate("scanner")}
          onProfileDataChanged={onProfileDataChanged}
        />
      )}

      {user && isWomenProfile && subTab === "women_wellness" && (
        <WomensWellnessView
          onNavigate={onNavigate}
          onDataLogged={(msg) => {
            onProfileDataChanged?.();
            onDataLogged?.(msg);
          }}
          embeddedInWomenSection
        />
      )}

      {user && subTab === "global_insights" && (
        <GlobalNutritionDashboard
          profileId={activeProfile?.id ?? null}
          isAuthenticated={Boolean(user)}
          onOpenAuth={() => openAuthModal("login", null)}
        />
      )}

      {(!user || subTab === "meal_logs") && (
        <DashboardView
          dailyTargets={dailyTargets}
          onUpdateTargets={onUpdateTargets}
          onNavigate={onNavigate}
          refreshTrigger={refreshTrigger}
          openGoalsInitially={openGoalsInitially}
          onConsumedGoalsTrigger={onConsumedGoalsTrigger}
          userProfile={userProfile}
        />
      )}
    </div>
  );
}
