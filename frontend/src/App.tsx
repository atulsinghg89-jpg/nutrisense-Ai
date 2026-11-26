import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { EASE_PREMIUM } from "./components/MotionPrimitives";
import { Navbar } from "./components/Navbar";
import { checkBackendHealth, fetchMealLogs, round2 } from "./lib/api";
import type {
  AppView,
  DailyMacroTargets,
  DashboardSummary,
  EditableFoodItem,
  MacroTotals,
  ScanSession,
} from "./types/nutrition";
import { AlternativesView } from "./views/AlternativesView";
import { CategoriesView } from "./views/CategoriesView";
import { DashboardView } from "./views/DashboardView";
import { HomeView } from "./views/HomeView";
import { ScannerView } from "./views/ScannerView";

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

function readInitialViewFromHash(): AppView {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (
    hash === "home" ||
    hash === "scanner" ||
    hash === "alternatives" ||
    hash === "categories" ||
    hash === "dashboard"
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
    const parsed = JSON.parse(raw) as ScanSession;
    if (Array.isArray(parsed.items) && Array.isArray(parsed.alternatives)) {
      return { ...parsed, imagePreviewUrl: null };
    }
    return null;
  } catch {
    return null;
  }
}

export function App() {
  const [activeView, setActiveView] = useState<AppView>(() =>
    readInitialViewFromHash(),
  );
  const [scanSession, setScanSession] = useState<ScanSession | null>(() =>
    loadStoredScan(),
  );
  const [dailyTargets, setDailyTargets] = useState<DailyMacroTargets>(() =>
    loadStoredTargets(),
  );
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [dashboardRefreshTrigger, setDashboardRefreshTrigger] = useState(0);
  const [todaySummary, setTodaySummary] =
    useState<DashboardSummary>(EMPTY_SUMMARY);
  const [todaySummaryLoading, setTodaySummaryLoading] = useState(true);

  useEffect(() => {
    void checkBackendHealth().then(setApiOnline);
  }, []);

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
    const onHashChange = () => {
      setActiveView(readInitialViewFromHash());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleNavigate = useCallback((view: AppView) => {
    setActiveView(view);
    window.history.replaceState(null, "", `#${view}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const persistScanWithoutLargeBlob = useCallback((session: ScanSession) => {
    try {
      const compact: ScanSession = {
        ...session,
        imagePreviewUrl: null,
      };
      localStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, []);

  const handleScanComplete = useCallback(
    (session: ScanSession) => {
      setScanSession(session);
      persistScanWithoutLargeBlob(session);
    },
    [persistScanWithoutLargeBlob],
  );

  const handleUpdateItems = useCallback(
    (items: EditableFoodItem[], totals: MacroTotals) => {
      setScanSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, items, totals };
        persistScanWithoutLargeBlob(next);
        return next;
      });
    },
    [persistScanWithoutLargeBlob],
  );

  const handleUpdateTargets = useCallback((nextTargets: DailyMacroTargets) => {
    setDailyTargets(nextTargets);
    try {
      localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(nextTargets));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen bg-[#0A0A0A] text-white">
        {/* Subtle top ambient light */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(163,255,18,0.06),transparent_65%)]"
        />

        <Navbar
          activeView={activeView}
          onNavigate={handleNavigate}
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
                  onUpdateItems={handleUpdateItems}
                  dailyTargets={dailyTargets}
                  onNavigate={handleNavigate}
                  onMealLogged={() => setDashboardRefreshTrigger((n) => n + 1)}
                />
              )}

              {activeView === "alternatives" && (
                <AlternativesView
                  scanSession={scanSession}
                  onNavigate={handleNavigate}
                />
              )}

              {activeView === "categories" && <CategoriesView />}

              {activeView === "dashboard" && (
                <DashboardView
                  dailyTargets={dailyTargets}
                  onUpdateTargets={handleUpdateTargets}
                  onNavigate={handleNavigate}
                  refreshTrigger={dashboardRefreshTrigger}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </MotionConfig>
  );
}

export default App;
