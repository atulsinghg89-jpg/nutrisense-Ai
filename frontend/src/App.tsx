import { useCallback, useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { checkBackendHealth } from "./lib/api";
import type {
  AppView,
  DailyMacroTargets,
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

  useEffect(() => {
    void checkBackendHealth().then(setApiOnline);
  }, []);

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
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar
        activeView={activeView}
        onNavigate={handleNavigate}
        alternativesCount={scanSession?.alternatives.length ?? 0}
        apiOnline={apiOnline}
      />

      <main className="mx-auto max-w-7xl px-4 pt-8 pb-20 sm:px-6 md:pb-12 lg:px-8">
        {activeView === "home" && (
          <HomeView
            onNavigate={handleNavigate}
            hasActiveScan={Boolean(scanSession && scanSession.alternatives.length > 0)}
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
      </main>
    </div>
  );
}

export default App;
