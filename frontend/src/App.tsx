import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Bot, CheckCircle2, X } from "lucide-react";
import { AuthModal } from "./components/AuthModal";
import { EASE_PREMIUM } from "./components/MotionPrimitives";
import { Navbar } from "./components/Navbar";
import { NutriAssistantDrawer } from "./components/NutriAssistantDrawer";
import { OnboardingModal } from "./components/OnboardingModal";
import { Preloader } from "./components/Preloader";
import { AuthProvider, useAuth } from "./context/AuthContext";
import type { NutritionCategoryGuide } from "./data/categories";
import type { DoshaId } from "./data/doshas";
import {
  checkBackendHealth,
  fetchMealLogs,
  fetchWorkspaceState,
  round2,
  saveWorkspaceState,
} from "./lib/api";
import { loadUserProfile, saveUserProfile } from "./lib/nutritionMath";
import type {
  AppView,
  AudienceChapterId,
  DailyMacroTargets,
  DashboardSummary,
  EditableFoodItem,
  MacroTotals,
  ScanSession,
  UserNutritionProfile,
} from "./types/nutrition";
import { RecommendedProductsHub } from "./components/products/RecommendedProductsHub";
import { GlobalNutritionView } from "./components/global/GlobalNutritionView";
import { AlternativesView } from "./views/AlternativesView";
import { BudgetNutritionView } from "./views/BudgetNutritionView";
import { CategoriesView } from "./views/CategoriesView";
import { DoshaDetailView } from "./views/DoshaDetailView";
import { GroceryListView } from "./views/GroceryListView";
import { HomeView } from "./views/HomeView";
import { IndianFoodsView } from "./views/IndianFoodsView";
import { MealPlannerView } from "./views/MealPlannerView";
import { MenHealthView } from "./views/MenHealthView";
import { PatientNutritionView } from "./views/PatientNutritionView";
import { BabyNutritionView } from "./views/BabyNutritionView";
import { PersonalisedDashboardView } from "./views/PersonalisedDashboardView";
import { ScannerView } from "./views/ScannerView";
import { WomensWellnessView } from "./views/WomensWellnessView";

const TARGETS_STORAGE_KEY = "nutrisense_daily_targets_v1";
const SCAN_STORAGE_KEY = "nutrisense_latest_scan_v1";

const DEFAULT_TARGETS: DailyMacroTargets = {
  calories: 2200,
  protein: 150,
  carbs: 250,
  fats: 70,
};

const EMPTY_SUMMARY: DashboardSummary = {
  total_meals: 0,
  total_items: 0,
  total_portion_grams: 0,
  total_calories: 0,
  total_protein: 0,
  total_carbs: 0,
  total_fats: 0,
};

function formatLocalYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameLocalDay(isoString: string, targetYmd: string): boolean {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return false;
  return formatLocalYMD(parsed) === targetYmd;
}

function readInitialDoshaFromHash(): DoshaId {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (hash === "dosha-pitta") return "pitta";
  if (hash === "dosha-kapha") return "kapha";
  return "vata";
}

function readInitialViewFromHash(): AppView {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (
    hash === "dosha" ||
    hash === "dosha-vata" ||
    hash === "dosha-pitta" ||
    hash === "dosha-kapha"
  ) {
    return "dosha";
  }
  if (hash === "women" || hash === "women-wellness") {
    return "womens-wellness";
  }
  if (
    hash === "home" ||
    hash === "scanner" ||
    hash === "alternatives" ||
    hash === "categories" ||
    hash === "dashboard" ||
    hash === "planner" ||
    hash === "indian-foods" ||
    hash === "grocery" ||
    hash === "budget" ||
    hash === "womens-wellness" ||
    hash === "recommended-products" ||
    hash === "global-nutrition" ||
    hash === "men" ||
    hash === "baby" ||
    hash === "patient"
  ) {
    return hash;
  }
  return "home";
}

function loadStoredTargets(): DailyMacroTargets {
  try {
    const raw = localStorage.getItem(TARGETS_STORAGE_KEY);
    if (!raw) return DEFAULT_TARGETS;
    const parsed = JSON.parse(raw) as Partial<DailyMacroTargets>;
    return {
      calories: Number(parsed.calories) || DEFAULT_TARGETS.calories,
      protein: Number(parsed.protein) || DEFAULT_TARGETS.protein,
      carbs: Number(parsed.carbs) || DEFAULT_TARGETS.carbs,
      fats: Number(parsed.fats) || DEFAULT_TARGETS.fats,
    };
  } catch {
    return DEFAULT_TARGETS;
  }
}

function loadStoredScan(): ScanSession | null {
  try {
    const raw = localStorage.getItem(SCAN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ScanSession>;
    if (Array.isArray(parsed.items) && Array.isArray(parsed.alternatives) && parsed.totals) {
      return {
        imagePreviewUrl: parsed.imagePreviewUrl ?? null,
        fileName: parsed.fileName ?? null,
        foodName: parsed.foodName || parsed.items.slice(0, 2).map((i) => i.name).join(" & ") || "Scanned Meal",
        foodDescription: parsed.foodDescription || "Detected meal breakdown from recent scan.",
        estimatedPortion: parsed.estimatedPortion ?? {
          amount: parsed.totals.portion_grams,
          unit: "g",
          label: `~${Math.round(parsed.totals.portion_grams)} g estimated serving`,
        },
        portionConfidence: parsed.portionConfidence ?? "medium",
        confidence: parsed.confidence ?? "medium",
        ingredients: parsed.ingredients ?? [],
        initialIngredientGrams: parsed.initialIngredientGrams ?? {},
        fibre: parsed.fibre ?? 0,
        sugar: parsed.sugar ?? 0,
        sodiumMg: parsed.sodiumMg ?? 0,
        otherNutrients: parsed.otherNutrients ?? [],
        dataSources: parsed.dataSources ?? ["Google Gemini Vision", "ICMR–NIN / USDA Tables"],
        analysisLimitations: parsed.analysisLimitations ?? [
          "Portion sizes are visual estimates from a 2D meal image.",
        ],
        modelUsed: parsed.modelUsed,
        items: parsed.items,
        totals: parsed.totals,
        alternatives: parsed.alternatives,
        scannedAt: parsed.scannedAt ?? new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function AppShell() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<AppView>(() =>
    readInitialViewFromHash(),
  );
  const [requestedChapter, setRequestedChapter] =
    useState<AudienceChapterId | null>(null);
  const [scanSession, setScanSession] = useState<ScanSession | null>(() =>
    loadStoredScan(),
  );
  const [dailyTargets, setDailyTargets] = useState<DailyMacroTargets>(() =>
    loadStoredTargets(),
  );
  const [userProfile, setUserProfile] = useState<UserNutritionProfile>(() =>
    loadUserProfile(),
  );
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [dashboardRefreshTrigger, setDashboardRefreshTrigger] = useState(0);
  const [todaySummary, setTodaySummary] =
    useState<DashboardSummary>(EMPTY_SUMMARY);
  const [todaySummaryLoading, setTodaySummaryLoading] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [openGoalsTrigger, setOpenGoalsTrigger] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | NutritionCategoryGuide["id"]
  >("all");
  const [activeDoshaId, setActiveDoshaId] = useState<DoshaId>(() =>
    readInitialDoshaFromHash(),
  );
  const doshaReturnScrollRef = useRef<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3600);
  }, []);

  useEffect(() => {
    void checkBackendHealth().then(setApiOnline);
  }, []);

  // Hydrate persisted dailyTargets from PostgreSQL workspace on authenticated sessions
  useEffect(() => {
    if (!user) return;
    let active = true;
    void fetchWorkspaceState()
      .then((ws) => {
        if (!active || !ws.daily_targets) return;
        const dt = ws.daily_targets;
        if (dt.calories > 0) {
          setDailyTargets(dt);
          try {
            localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(dt));
          } catch {
            // Ignore offline storage quota errors
          }
        }
      })
      .catch(() => {
        // Keep current targets on transient failure
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    const loadTodaySummary = async () => {
      setTodaySummaryLoading(true);
      try {
        const res = await fetchMealLogs();
        if (!active) return;
        const todayYmd = formatLocalYMD(new Date());
        const todaysMeals = res.data.meals.filter((meal) =>
          isSameLocalDay(meal.logged_at, todayYmd),
        );
        const computed = todaysMeals.reduce<DashboardSummary>(
          (acc, meal) => ({
            total_meals: acc.total_meals + 1,
            total_items: acc.total_items + (meal.items?.length ?? 0),
            total_portion_grams: round2(
              acc.total_portion_grams + meal.total_portion_grams,
            ),
            total_calories: round2(acc.total_calories + meal.total_calories),
            total_protein: round2(acc.total_protein + meal.total_protein),
            total_carbs: round2(acc.total_carbs + meal.total_carbs),
            total_fats: round2(acc.total_fats + meal.total_fats),
          }),
          EMPTY_SUMMARY,
        );
        setTodaySummary(computed);
      } catch {
        if (active) {
          setTodaySummary(EMPTY_SUMMARY);
        }
      } finally {
        if (active) {
          setTodaySummaryLoading(false);
        }
      }
    };
    void loadTodaySummary();
    return () => {
      active = false;
    };
  }, [dashboardRefreshTrigger]);

  useEffect(() => {
    const syncViewFromHash = () => {
      const nextView = readInitialViewFromHash();
      setActiveView(nextView);
      if (nextView === "dosha") {
        setActiveDoshaId(readInitialDoshaFromHash());
      }
    };
    window.addEventListener("hashchange", syncViewFromHash);
    window.addEventListener("popstate", syncViewFromHash);
    return () => {
      window.removeEventListener("hashchange", syncViewFromHash);
      window.removeEventListener("popstate", syncViewFromHash);
    };
  }, []);

  const handleNavigate = useCallback((view: AppView) => {
    setActiveView(view);
    if (window.location.hash !== `#${view}`) {
      window.history.pushState(null, "", `#${view}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleOpenDosha = useCallback((doshaId: DoshaId) => {
    doshaReturnScrollRef.current = window.scrollY;
    setActiveDoshaId(doshaId);
    setActiveView("dosha");
    const targetHash = `#dosha-${doshaId}`;
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, "", targetHash);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSelectDoshaChapter = useCallback((doshaId: DoshaId) => {
    setActiveDoshaId(doshaId);
    const targetHash = `#dosha-${doshaId}`;
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, "", targetHash);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBackToRhythm = useCallback(() => {
    const savedY = doshaReturnScrollRef.current;
    setActiveView("home");
    if (window.location.hash !== "#home") {
      window.history.pushState(null, "", "#home");
    }
    window.setTimeout(() => {
      if (typeof savedY === "number" && savedY > 120) {
        window.scrollTo({ top: savedY, behavior: "smooth" });
      } else {
        document
          .getElementById("discover-your-rhythm")
          ?.scrollIntoView({ behavior: "smooth" });
      }
    }, 280);
  }, []);

  const handleOpenDashboardGoals = useCallback(() => {
    setOpenGoalsTrigger(true);
    handleNavigate("dashboard");
  }, [handleNavigate]);

  const persistScanSession = useCallback((session: ScanSession) => {
    try {
      const keepPreview =
        session.imagePreviewUrl && session.imagePreviewUrl.length <= 220_000
          ? session.imagePreviewUrl
          : null;
      const compact: ScanSession = {
        ...session,
        imagePreviewUrl: keepPreview,
      };
      localStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, []);

  const handleScanComplete = useCallback(
    (session: ScanSession) => {
      setScanSession(session);
      persistScanSession(session);
      showToast(
        `AI Scan Complete: ${session.foodName} (${Math.round(session.totals.calories)} kcal est.)`,
      );
    },
    [persistScanSession, showToast],
  );

  const handleUpdateSession = useCallback(
    (nextSession: ScanSession) => {
      setScanSession(nextSession);
      persistScanSession(nextSession);
    },
    [persistScanSession],
  );

  const handleUpdateItems = useCallback(
    (items: EditableFoodItem[], totals: MacroTotals) => {
      setScanSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, items, totals };
        persistScanSession(next);
        return next;
      });
    },
    [persistScanSession],
  );

  const handleUpdateTargets = useCallback(
    (nextTargets: DailyMacroTargets) => {
      setDailyTargets(nextTargets);
      try {
        localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(nextTargets));
      } catch {
        // Ignore storage quota errors
      }
      if (user) {
        void saveWorkspaceState({ daily_targets: nextTargets }).catch(() => {
          // Non-blocking sync
        });
      }
      showToast(`Daily target updated to ${nextTargets.calories} kcal`);
    },
    [showToast, user],
  );

  const handleApplyProfileAndTargets = useCallback(
    (nextProfile: UserNutritionProfile, nextTargets: DailyMacroTargets) => {
      setUserProfile(nextProfile);
      saveUserProfile(nextProfile);
      handleUpdateTargets(nextTargets);
      setOnboardingOpen(false);
    },
    [handleUpdateTargets],
  );

  const displayProfileName = userProfile.onboardingCompleted
    ? userProfile.name || "Profile"
    : undefined;

  return (
    <MotionConfig reducedMotion="user">
      <Preloader />
      <div className="relative min-h-screen bg-[#050706] text-white">
        {/* Subtle top ambient light */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(163,255,18,0.06),transparent_65%)]"
        />

        <Navbar
          activeView={activeView}
          onNavigate={handleNavigate}
          onOpenAssistant={() => setAssistantOpen(true)}
          onOpenOnboarding={() => setOnboardingOpen(true)}
          profileName={displayProfileName}
          alternativesCount={scanSession?.alternatives.length ?? 0}
          apiOnline={apiOnline}
        />

        <main className="relative mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 md:pt-8 md:pb-14 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: EASE_PREMIUM }}
            >
              {activeView === "home" && (
                <HomeView
                  onNavigate={handleNavigate}
                  onSelectCategory={(categoryId) => {
                    setSelectedCategory(categoryId);
                    handleNavigate("categories");
                  }}
                  onOpenDosha={handleOpenDosha}
                  onLaunchProfileDashboard={(chapterId) => {
                    setRequestedChapter(chapterId);
                    handleNavigate("dashboard");
                  }}
                  onOpenDashboardGoals={handleOpenDashboardGoals}
                  onOpenAssistant={() => setAssistantOpen(true)}
                  onOpenOnboarding={() => setOnboardingOpen(true)}
                  profileName={displayProfileName}
                  hasActiveScan={Boolean(
                    scanSession && scanSession.alternatives.length > 0,
                  )}
                  scanSession={scanSession}
                  dailyTargets={dailyTargets}
                  todaySummary={todaySummary}
                  todaySummaryLoading={todaySummaryLoading}
                  apiOnline={apiOnline}
                />
              )}

              {activeView === "scanner" && (
                <ScannerView
                  scanSession={scanSession}
                  onScanComplete={handleScanComplete}
                  onUpdateSession={handleUpdateSession}
                  onUpdateItems={handleUpdateItems}
                  dailyTargets={dailyTargets}
                  onNavigate={handleNavigate}
                  onMealLogged={() => {
                    setDashboardRefreshTrigger((n) => n + 1);
                    showToast("Meal logged to your PostgreSQL Dashboard");
                  }}
                />
              )}

              {activeView === "alternatives" && (
                <AlternativesView
                  scanSession={scanSession}
                  onNavigate={handleNavigate}
                />
              )}

              {activeView === "categories" && (
                <CategoriesView
                  initialCategory={selectedCategory}
                  onNavigate={handleNavigate}
                  onDataLogged={(msg) => {
                    setDashboardRefreshTrigger((n) => n + 1);
                    showToast(msg);
                  }}
                />
              )}

              {activeView === "dashboard" && (
                <PersonalisedDashboardView
                  dailyTargets={dailyTargets}
                  onUpdateTargets={handleUpdateTargets}
                  onNavigate={handleNavigate}
                  refreshTrigger={dashboardRefreshTrigger}
                  openGoalsInitially={openGoalsTrigger}
                  onConsumedGoalsTrigger={() => setOpenGoalsTrigger(false)}
                  userProfile={userProfile}
                  requestedChapter={requestedChapter}
                  onConsumedRequestedChapter={() => setRequestedChapter(null)}
                  onProfileDataChanged={() =>
                    setDashboardRefreshTrigger((n) => n + 1)
                  }
                  onDataLogged={showToast}
                />
              )}

              {activeView === "planner" && (
                <MealPlannerView
                  dailyTargets={dailyTargets}
                  userProfile={userProfile}
                  onApplyProfileTargets={handleApplyProfileAndTargets}
                  onNavigate={handleNavigate}
                />
              )}

              {activeView === "indian-foods" && (
                <IndianFoodsView
                  onNavigate={handleNavigate}
                  onMealLogged={(name) => {
                    setDashboardRefreshTrigger((n) => n + 1);
                    showToast(
                      name
                        ? `Logged ${name} to Dashboard`
                        : "Logged meal to Dashboard",
                    );
                  }}
                />
              )}

              {activeView === "budget" && (
                <BudgetNutritionView
                  onNavigate={handleNavigate}
                  onNotify={showToast}
                />
              )}

              {activeView === "grocery" && (
                <GroceryListView onNavigate={handleNavigate} />
              )}

              {activeView === "dosha" && (
                <DoshaDetailView
                  doshaId={activeDoshaId}
                  onSelectDosha={handleSelectDoshaChapter}
                  onBackToRhythm={handleBackToRhythm}
                  onNavigate={handleNavigate}
                />
              )}

              {activeView === "womens-wellness" && (
                <WomensWellnessView
                  onNavigate={handleNavigate}
                  onDataLogged={(msg) => {
                    setDashboardRefreshTrigger((n) => n + 1);
                    showToast(msg);
                  }}
                />
              )}

              {activeView === "recommended-products" && (
                <RecommendedProductsHub referrerSection="navbar_catalog" />
              )}

              {activeView === "global-nutrition" && (
                <GlobalNutritionView
                  onNavigate={handleNavigate}
                  onDataLogged={(msg) => {
                    setDashboardRefreshTrigger((n) => n + 1);
                    showToast(msg);
                  }}
                />
              )}

              {activeView === "men" && (
                <MenHealthView onNavigate={handleNavigate} />
              )}

              {activeView === "baby" && (
                <BabyNutritionView onNavigate={handleNavigate} />
              )}

              {activeView === "patient" && (
                <PatientNutritionView onNavigate={handleNavigate} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Live Event Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              className="fixed bottom-20 left-4 z-50 flex max-w-sm items-center gap-2.5 rounded-2xl border border-[#34D399]/40 bg-[#141B16]/95 px-4 py-3 text-xs font-medium text-white shadow-2xl backdrop-blur-xl md:bottom-6 md:left-6"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34D399]" />
              <span className="leading-snug">{toastMessage}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                aria-label="Dismiss notification"
                className="ml-1 rounded-md p-0.5 text-zinc-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Quick-Launch Button for Nutri AI Coach */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setAssistantOpen(true)}
          aria-label="Open Nutri AI Coach"
          className="fixed right-4 bottom-20 z-30 flex items-center gap-2 rounded-full border border-[#B6FF38]/40 bg-[#141B16]/95 px-4 py-3 text-xs font-bold text-[#B6FF38] shadow-[0_8px_30px_rgba(0,0,0,0.75)] backdrop-blur-xl transition hover:border-[#B6FF38] hover:bg-[#19221C] md:right-6 md:bottom-6"
        >
          <Bot className="h-4 w-4" />
          <span className="hidden sm:inline">Ask Nutri AI</span>
        </motion.button>

        {/* Nutri AI Slide-Over Coach Drawer */}
        <NutriAssistantDrawer
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          onNavigate={handleNavigate}
          todaySummary={todaySummary}
          dailyTargets={dailyTargets}
          scanSession={scanSession}
        />

        {/* Onboarding & Profile Goals Modal */}
        <OnboardingModal
          open={onboardingOpen}
          initialProfile={userProfile}
          onClose={() => setOnboardingOpen(false)}
          onComplete={handleApplyProfileAndTargets}
        />

        {/* Authenticated User Login & Registration Modal */}
        <AuthModal />
      </div>
    </MotionConfig>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
