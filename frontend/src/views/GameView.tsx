import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Camera,
  CheckCircle2,
  Coins,
  Droplets,
  Flame,
  Gamepad2,
  Gem,
  HelpCircle,
  Lock,
  Pause,
  Play,
  ShieldAlert,
  Sparkles,
  Trophy,
  Upload,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MyRewardsPanel } from "../components/game/MyRewardsPanel";
import { ProductSuggestion } from "../components/game/ProductSuggestion";
import { RunSummary } from "../components/game/RunSummary";
import {
  CHECKPOINT_TASKS,
  GAME_FACTS_HACKS,
  GAME_QUIZ_QUESTIONS,
} from "../game/gameData";
import { NutriRunCanvas } from "../game/NutriRunCanvas";
import {
  createHydrationEntry,
  scanFoodImage,
  validateFoodImageFile,
} from "../lib/api";
import { applyReward, loadGameSave, saveGameSave } from "../lib/gameStorage";
import { DemoRewardsProvider, ServerRewardsProvider } from "../lib/rewardsApi";
import type {
  GameCosmeticItem,
  GameCosmeticSlot,
  GameFactHack,
  GameQuizQuestion,
  GameSave,
  GameTaskRequirement,
  GameUniverse,
} from "../types/game";
import type { AppView, ScanResponse } from "../types/nutrition";
import type { PurchaseClaim } from "../types/rewards";

interface GameViewProps {
  onNavigate: (view: AppView) => void;
  onDataLogged?: (message: string) => void;
}

type GameTab = "play" | "tasks" | "rewards";

export function GameView({ onNavigate, onDataLogged }: GameViewProps) {
  const { activeProfile } = useAuth();
  const [save, setSave] = useState<GameSave>(() => loadGameSave());
  const [activeTab, setActiveTab] = useState<GameTab>("play");
  const [universe, setUniverse] = useState<GameUniverse>(save.lastUniverse);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const [runScore, setRunScore] = useState(0);
  const [runCoins, setRunCoins] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [actionSignal, setActionSignal] = useState<{
    seq: number;
    action: "left" | "right" | "jump";
  } | null>(null);

  // Interactive Event Modals
  const [activeFact, setActiveFact] = useState<GameFactHack | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<GameQuizQuestion | null>(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSolved, setQuizSolved] = useState(false);
  const [portalPromptOpen, setPortalPromptOpen] = useState(false);
  const [activeTaskModal, setActiveTaskModal] =
    useState<GameTaskRequirement | null>(null);

  // Task 1: Water Before & After Photo States
  const [waterBeforeName, setWaterBeforeName] = useState<string | null>(null);
  const [waterAfterName, setWaterAfterName] = useState<string | null>(null);
  const [waterError, setWaterError] = useState<string | null>(null);
  const [syncWaterToProfile, setSyncWaterToProfile] = useState(true);

  // Task 2: Healthy Meal Scan Photo States
  const [mealPhotoName, setMealPhotoName] = useState<string | null>(null);
  const [mealScanResult, setMealScanResult] = useState<ScanResponse | null>(null);
  const [mealScanning, setMealScanning] = useState(false);
  const [mealError, setMealError] = useState<string | null>(null);

  // Rewards Provider State
  const serverProviderRef = useRef(new ServerRewardsProvider());
  const demoProviderRef = useRef(new DemoRewardsProvider());
  const [serverStatusMessage, setServerStatusMessage] = useState<string | null>(
    null,
  );
  const [refreshingServer, setRefreshingServer] = useState(false);
  const [rareRevealMessage, setRareRevealMessage] = useState<string | null>(
    null,
  );

  const factCursorRef = useRef(0);
  const quizCursorRef = useRef(0);

  const isUnder18 = useMemo(() => {
    if (!activeProfile) return false;
    if (activeProfile.profile_type === "baby") return true;
    if (typeof activeProfile.age_years === "number" && activeProfile.age_years < 18) {
      return true;
    }
    if (activeProfile.date_of_birth) {
      const dob = new Date(activeProfile.date_of_birth);
      if (!Number.isNaN(dob.getTime())) {
        const diffYears =
          (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return diffYears < 18;
      }
    }
    return false;
  }, [activeProfile]);

  const persistSave = useCallback((updater: (prev: GameSave) => GameSave) => {
    setSave((prev) => {
      const next = updater(prev);
      saveGameSave(next);
      return next;
    });
  }, []);

  const refreshServerRewards = useCallback(async () => {
    if (isUnder18) return;
    setRefreshingServer(true);
    try {
      await serverProviderRef.current.refresh();
      setServerStatusMessage(serverProviderRef.current.statusMessage);
      const serverClaims = await serverProviderRef.current.listClaims();
      if (serverClaims.length > 0) {
        let totalNewReal = 0;
        persistSave((prev) => {
          let curr = prev;
          for (const claim of serverClaims) {
            const res = applyReward(curr, claim);
            curr = res.save;
            totalNewReal += res.grantedRealDiamonds;
          }
          return curr;
        });
        if (totalNewReal > 0) {
          setRareRevealMessage(
            `Confirmed purchase verified! You unlocked +${totalNewReal} rare diamond${
              totalNewReal > 1 ? "s" : ""
            }.`,
          );
        }
      }
    } finally {
      setRefreshingServer(false);
    }
  }, [isUnder18, persistSave]);

  useEffect(() => {
    void refreshServerRewards();
  }, [refreshServerRewards]);

  const hasWaterTask = save.completedTaskIds.includes("task_water_5km");
  const hasMealTask = save.completedTaskIds.includes("task_meal_10km");

  const selectUniverse = useCallback(
    (nextUniverse: GameUniverse) => {
      setUniverse(nextUniverse);
      persistSave((prev) => ({ ...prev, lastUniverse: nextUniverse }));
    },
    [persistSave],
  );

  const startFreshRun = (chosenUniverse: GameUniverse = universe) => {
    selectUniverse(chosenUniverse);
    setDistanceKm(0);
    setRunScore(0);
    setRunCoins(0);
    setShowSummary(false);
    setActiveFact(null);
    setActiveQuiz(null);
    setPortalPromptOpen(false);
    setActiveTaskModal(null);
    setPaused(false);
    setRunning(true);
    setActiveTab("play");
  };

  const finishRun = () => {
    setRunning(false);
    setPaused(false);
    setShowSummary(true);
    persistSave((prev) => ({
      ...prev,
      bestScore: Math.max(prev.bestScore, runScore),
      bestDistanceMeters: Math.max(
        prev.bestDistanceMeters,
        Math.round(distanceKm * 1000),
      ),
    }));
  };

  const handleDistanceTick = useCallback(
    (nextKm: number, nextScore: number, coinsCollected: number) => {
      setDistanceKm(nextKm);
      setRunScore(nextScore);
      setRunCoins(coinsCollected);

      // Task Gate 1: At 5 km require Hydration Before/After Photos before advancing to Level 2
      if (nextKm >= 5 && !save.completedTaskIds.includes("task_water_5km")) {
        const task = CHECKPOINT_TASKS[0];
        setPaused(true);
        setActiveTaskModal(task);
        return;
      }

      // Task Gate 2: At 10 km require Meal Scan Photo before advancing to Level 3
      if (nextKm >= 10 && !save.completedTaskIds.includes("task_meal_10km")) {
        const task = CHECKPOINT_TASKS[1];
        setPaused(true);
        setActiveTaskModal(task);
      }
    },
    [save.completedTaskIds],
  );

  const handlePickupCoin = useCallback(
    (amount: number) => {
      persistSave((prev) => ({ ...prev, coins: prev.coins + amount }));
    },
    [persistSave],
  );

  const handlePickupFact = useCallback(() => {
    const idx = factCursorRef.current % GAME_FACTS_HACKS.length;
    factCursorRef.current += 1;
    setPaused(true);
    setActiveFact(GAME_FACTS_HACKS[idx]);
    persistSave((prev) => ({
      ...prev,
      factsSeenCount: prev.factsSeenCount + 1,
    }));
  }, [persistSave]);

  const handlePickupQuiz = useCallback(() => {
    const idx = quizCursorRef.current % GAME_QUIZ_QUESTIONS.length;
    quizCursorRef.current += 1;
    setPaused(true);
    setSelectedQuizOption(null);
    setQuizSolved(false);
    setActiveQuiz(GAME_QUIZ_QUESTIONS[idx]);
  }, []);

  const handlePortalReached = useCallback(() => {
    setPaused(true);
    setPortalPromptOpen(true);
  }, []);

  const handleRecordClaim = useCallback(
    (claim: PurchaseClaim) => {
      persistSave((prev) => applyReward(prev, claim).save);
    },
    [persistSave],
  );

  const handleSimulateDemoConfirm = () => {
    if (!save.demoMode || isUnder18) return;
    const clickId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const simulated = demoProviderRef.current.createSimulatedConfirmation({
      clickId,
      productId: 1,
      retailerName: "Demo Simulator Store",
      productName: "Wellness Demo Item (Presentation)",
    });
    const result = applyReward(save, simulated);
    saveGameSave(result.save);
    setSave(result.save);
    if (result.grantedDemoDiamonds > 0) {
      setRareRevealMessage(
        `DEMO ONLY: +${result.grantedDemoDiamonds} Demo Diamond & +${result.grantedCoins} Coins simulated.`,
      );
    }
  };

  const handleSimulateDemoReverse = (claimId: string) => {
    if (!save.demoMode) return;
    const target = save.claims.find((c) => c.id === claimId);
    if (!target) return;
    const reversed = applyReward(save, { ...target, status: "reversed" });
    saveGameSave(reversed.save);
    setSave(reversed.save);
    setRareRevealMessage("Demo purchase reward reversed cleanly.");
  };

  const handleUnlockCosmetic = (item: GameCosmeticItem) => {
    if (save.unlockedCosmetics.includes(item.id)) return;
    const totalAvailable = save.demoMode
      ? save.diamonds + save.demoDiamonds
      : save.diamonds;
    if (totalAvailable < item.diamondCost) return;

    persistSave((prev) => {
      let realLeft = prev.diamonds;
      let demoLeft = prev.demoDiamonds;
      let remainingCost = item.diamondCost;

      if (realLeft >= remainingCost) {
        realLeft -= remainingCost;
        remainingCost = 0;
      } else {
        remainingCost -= realLeft;
        realLeft = 0;
        if (prev.demoMode && demoLeft >= remainingCost) {
          demoLeft -= remainingCost;
        }
      }

      return {
        ...prev,
        diamonds: realLeft,
        demoDiamonds: demoLeft,
        unlockedCosmetics: [...prev.unlockedCosmetics, item.id],
        equippedCosmetics: {
          ...prev.equippedCosmetics,
          [item.slot]: item.id,
        },
      };
    });
  };

  const handleEquipCosmetic = (
    slot: GameCosmeticSlot,
    cosmeticId: string | null,
  ) => {
    persistSave((prev) => ({
      ...prev,
      equippedCosmetics: {
        ...prev.equippedCosmetics,
        [slot]: cosmeticId,
      },
    }));
  };

  const handleWaterFileSelect = async (
    which: "before" | "after",
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    setWaterError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = await validateFoodImageFile(file);
    if (!valid.valid) {
      setWaterError(valid.error || "Please upload a valid JPG, PNG, or WEBP photo.");
      return;
    }
    if (which === "before") {
      setWaterBeforeName(file.name);
    } else {
      setWaterAfterName(file.name);
    }
  };

  const handleCompleteWaterTask = async () => {
    if (!waterBeforeName || !waterAfterName) {
      setWaterError("Please select both Before Drinking and After Drinking water photos.");
      return;
    }

    if (syncWaterToProfile && activeProfile) {
      try {
        await createHydrationEntry({
          profile_id: activeProfile.id,
          amount_ml: 250,
          measurement_source: "manual",
          notes: "Logged via NutriSense Run 5 km hydration task",
        });
        onDataLogged?.("Logged +250 mL hydration from NutriSense Run task!");
      } catch {
        // Non-blocking: game progression never locks if hydration API is offline
      }
    }

    persistSave((prev) => ({
      ...prev,
      coins: prev.coins + 40,
      level: Math.max(prev.level, 2),
      completedTaskIds: Array.from(new Set([...prev.completedTaskIds, "task_water_5km"])),
      unlockedBadges: Array.from(
        new Set([...prev.unlockedBadges, "Hydration Sprinters Badge"]),
      ),
    }));
    setRunCoins((c) => c + 40);
    setActiveTaskModal(null);
    setPaused(false);
  };

  const handleMealTaskPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    setMealError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = await validateFoodImageFile(file);
    if (!valid.valid) {
      setMealError(valid.error || "Please select a valid JPG, PNG, or WEBP meal photo.");
      return;
    }
    setMealPhotoName(file.name);
    setMealScanning(true);
    try {
      const res = await scanFoodImage(file);
      setMealScanResult(res);
    } catch {
      // Allow offline completion gracefully while offering AI scanner shortcut
      setMealScanResult(null);
    } finally {
      setMealScanning(false);
    }
  };

  const handleCompleteMealTask = () => {
    if (!mealPhotoName) {
      setMealError("Please upload today's nutritious meal photo or scan a meal first.");
      return;
    }
    persistSave((prev) => ({
      ...prev,
      coins: prev.coins + 60,
      level: Math.max(prev.level, 3),
      completedTaskIds: Array.from(new Set([...prev.completedTaskIds, "task_meal_10km"])),
      unlockedBadges: Array.from(
        new Set([...prev.unlockedBadges, "Balanced Plate Explorer"]),
      ),
    }));
    setRunCoins((c) => c + 60);
    setActiveTaskModal(null);
    setPaused(false);
  };

  const sendAction = (action: "left" | "right" | "jump") => {
    setActionSignal((prev) => ({ seq: (prev?.seq ?? 0) + 1, action }));
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Top Game Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-[#A3FF12]/25 bg-[#101411] p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-[#A3FF12]/10 blur-[100px]"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/40 bg-[#A3FF12]/10 px-3 py-1 text-xs font-semibold text-[#A3FF12]">
              <Gamepad2 className="h-3.5 w-3.5" />
              <span>NutriSense Run • Health &amp; Hydration Arcade</span>
            </span>
            <h1 className="mt-2.5 font-display text-3xl font-extrabold tracking-tight text-white">
              Run, Learn Hacks &amp; Complete Real Health Checkpoints
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#A1A1AA] sm:text-sm">
              Dash through the 3-Lane Nutrition Track or switch dimensions at Portal Gates into Bob Run Platform World. Collect coins, unlock winter &amp; wellness hacks, and level up through real hydration &amp; meal tasks.
            </p>
          </div>

          {/* Live Player Balances */}
          <div className="flex flex-wrap items-center gap-2.5">
            {save.equippedCosmetics.badge && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-pink-300/35 bg-pink-400/15 px-3 py-2 text-xs font-bold text-pink-200">
                <Trophy className="h-3.5 w-3.5" />
                <span>Patron Crest</span>
              </span>
            )}
            <div className="rounded-xl border border-amber-300/25 bg-[#16140D] px-3.5 py-2 text-xs">
              <span className="flex items-center gap-1 font-mono font-bold text-amber-200">
                <Coins className="h-3.5 w-3.5 text-amber-300" />
                {save.coins} Coins
              </span>
            </div>
            <div className="rounded-xl border border-sky-300/25 bg-[#0F1619] px-3.5 py-2 text-xs">
              <span className="flex items-center gap-1 font-mono font-bold text-sky-200">
                <Gem className="h-3.5 w-3.5 text-sky-300" />
                {save.diamonds} 💎
              </span>
            </div>
            {(save.demoMode || save.demoDiamonds > 0) && (
              <div className="rounded-xl border border-fuchsia-300/35 bg-[#1B121F] px-3.5 py-2 text-xs">
                <span className="font-mono font-bold text-fuchsia-200">
                  Demo: {save.demoDiamonds} 💎
                </span>
              </div>
            )}
            <span className="rounded-xl border border-[#34D399]/35 bg-[#111915] px-3.5 py-2 font-mono text-xs font-bold text-[#34D399]">
              Level {save.level}
            </span>
          </div>
        </div>

        {/* Navigation Tabs & Demo Mode Toggle (OFF by default) */}
        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "play", label: "Play NutriSense Run" },
                { id: "tasks", label: `Health Tasks (${save.completedTaskIds.length}/2)` },
                { id: "rewards", label: "My Rewards & Cosmetics" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === tab.id
                    ? "bg-[#A3FF12] text-[#050706]"
                    : "border border-white/10 bg-[#0A0A0A] text-zinc-300 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-1.5 text-[11px] text-zinc-300">
            <input
              type="checkbox"
              checked={save.demoMode}
              onChange={(e) =>
                persistSave((prev) => ({ ...prev, demoMode: e.target.checked }))
              }
              className="h-3.5 w-3.5 accent-fuchsia-400"
            />
            <span>Demo Mode (Presentation Only)</span>
          </label>
        </div>
      </section>

      {/* PLAY TAB */}
      {activeTab === "play" && (
        <div className="space-y-5">
          {showSummary ? (
            <RunSummary
              distanceKm={distanceKm}
              runCoins={runCoins}
              runScore={runScore}
              save={save}
              rareRevealMessage={rareRevealMessage}
              serverStatusMessage={serverStatusMessage}
              refreshingServer={refreshingServer}
              isUnder18={isUnder18}
              onRefreshServer={() => void refreshServerRewards()}
              onUnlockCosmetic={handleUnlockCosmetic}
              onEquipCosmetic={handleEquipCosmetic}
              onSimulateDemoConfirm={handleSimulateDemoConfirm}
              onSimulateDemoReverse={handleSimulateDemoReverse}
              onPlayAgain={() => startFreshRun(universe)}
            />
          ) : (
            <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-4 sm:p-6">
              {/* HUD & Universe Controls */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Prominent 2-Universe Switcher Pill (instant switch anytime) */}
                  <div
                    role="group"
                    aria-label="Switch game universe"
                    className="inline-flex items-center rounded-xl border border-sky-300/30 bg-[#0A0A0A] p-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => selectUniverse("runner_3lane")}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        universe === "runner_3lane"
                          ? "bg-[#34D399] text-[#050706] shadow-sm"
                          : "text-zinc-300 hover:text-white"
                      }`}
                    >
                      <Gamepad2 className="h-3.5 w-3.5" />
                      <span>3-Lane Track</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectUniverse("platform_bob")}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        universe === "platform_bob"
                          ? "bg-sky-300 text-[#071318] shadow-sm"
                          : "text-zinc-300 hover:text-white"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Bob Run World</span>
                    </button>
                  </div>

                  {running ? (
                    <button
                      type="button"
                      onClick={() => setPaused((p) => !p)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      <span>{paused ? "Resume" : "Pause"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startFreshRun(universe)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3FF12] px-4 py-1.5 text-xs font-bold text-[#050706] hover:bg-[#b8ff42]"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Start Run</span>
                    </button>
                  )}

                  {running && (
                    <button
                      type="button"
                      onClick={finishRun}
                      className="rounded-xl border border-white/10 bg-[#171717] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white"
                    >
                      Finish Run
                    </button>
                  )}
                </div>

                {/* Distance / Score / Next Task Milestone Readout */}
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                  <span className="rounded-lg border border-white/10 bg-[#0A0A0A] px-2.5 py-1 text-[#34D399]">
                    {distanceKm.toFixed(2)} km
                  </span>
                  <span className="rounded-lg border border-white/10 bg-[#0A0A0A] px-2.5 py-1 text-[#A3FF12]">
                    Score: {runScore}
                  </span>
                  <span className="text-zinc-400">
                    {!hasWaterTask
                      ? "Next Task: 5.0 km Water Check"
                      : !hasMealTask
                        ? "Next Task: 10.0 km Meal Scan"
                        : "Level 3 Unlocked!"}
                  </span>
                </div>
              </div>

              {/* Main Game Canvas + Overlays */}
              <div className="relative">
                <NutriRunCanvas
                  universe={universe}
                  paused={paused}
                  running={running}
                  level={save.level}
                  initialDistanceKm={0}
                  equippedCosmetics={save.equippedCosmetics}
                  actionSignal={actionSignal}
                  onDistanceTick={handleDistanceTick}
                  onPickupCoin={handlePickupCoin}
                  onPickupFact={handlePickupFact}
                  onPickupQuiz={handlePickupQuiz}
                  onPortalReached={handlePortalReached}
                />

                {/* Pre-Start Hero Overlay */}
                {!running && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-2xl bg-[#050706]/72 p-3 sm:p-6 text-center backdrop-blur-[2px]">
                    <span className="rounded-full border border-[#A3FF12]/40 bg-[#A3FF12]/15 px-3 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#A3FF12]">
                      Choose Universe • Portal Gate at 0.45 km
                    </span>
                    <h2 className="mt-1.5 sm:mt-2 font-display text-lg sm:text-2xl font-extrabold text-white">
                      Ready to Run?
                    </h2>
                    <p className="mt-1 hidden sm:block max-w-lg text-xs leading-relaxed text-zinc-300">
                      Collect 3D coins, open Fact/Hack crates &amp; Quiz gates, warp between universes via early Portal Gates, and finish 5 km &amp; 10 km photo tasks to level up.
                    </p>

                    {/* Side-by-side Universe Picker */}
                    <div className="mt-2 sm:mt-3 grid w-full max-w-md grid-cols-2 gap-2">
                      {(
                        [
                          {
                            id: "runner_3lane",
                            title: "3-Lane Track",
                            subtitle: "Subway-style 3D road",
                          },
                          {
                            id: "platform_bob",
                            title: "Bob Run World",
                            subtitle: "Parallax jump adventure",
                          },
                        ] as const
                      ).map((mode) => {
                        const selected = universe === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => selectUniverse(mode.id)}
                            className={`rounded-xl border px-2.5 py-1.5 sm:px-3 sm:py-2 text-left transition ${
                              selected
                                ? "border-[#A3FF12] bg-[#A3FF12]/15 text-white shadow-[0_0_16px_rgba(163,255,18,0.2)]"
                                : "border-white/15 bg-[#0A0A0A]/80 text-zinc-300 hover:border-white/30"
                            }`}
                          >
                            <p className="text-[11px] sm:text-xs font-bold">{mode.title}</p>
                            <p className="hidden sm:block text-[10px] text-zinc-400">
                              {mode.subtitle}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => startFreshRun(universe)}
                      className="mt-2.5 sm:mt-3.5 inline-flex items-center gap-2 rounded-2xl bg-[#A3FF12] px-5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-bold text-[#050706] shadow-[0_0_24px_rgba(163,255,18,0.35)] transition hover:bg-[#b8ff42]"
                    >
                      <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                      <span>
                        Start in{" "}
                        {universe === "runner_3lane" ? "3-Lane Track" : "Bob Run World"}
                      </span>
                    </button>
                  </div>
                )}

                {/* Optional Dimension Portal Prompt */}
                {portalPromptOpen && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#050706]/85 p-5 backdrop-blur-md">
                    <div className="max-w-md rounded-2xl border border-sky-300/40 bg-[#0F1619] p-5 text-center shadow-2xl">
                      <Sparkles className="mx-auto h-7 w-7 text-sky-300" />
                      <h3 className="mt-2 font-display text-lg font-extrabold text-white">
                        Dimension Portal Reached!
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                        {universe === "runner_3lane"
                          ? "Want to warp into Bob Run Platform World (platform jumps & floating coin arcs), or stay on the 3-Lane Track?"
                          : "Want to warp back to the 3-Lane NutriSense Track, or keep exploring Bob Run World?"}
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const next: GameUniverse =
                              universe === "runner_3lane"
                                ? "platform_bob"
                                : "runner_3lane";
                            selectUniverse(next);
                            setPortalPromptOpen(false);
                            setPaused(false);
                          }}
                          className="rounded-xl bg-sky-300 px-4 py-2 text-xs font-bold text-[#071318] hover:bg-sky-200"
                        >
                          Switch to{" "}
                          {universe === "runner_3lane"
                            ? "Bob Run World"
                            : "3-Lane Track"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPortalPromptOpen(false);
                            setPaused(false);
                          }}
                          className="rounded-xl border border-white/15 bg-[#121212] px-4 py-2 text-xs font-semibold text-zinc-200 hover:text-white"
                        >
                          Stay Here
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Touch / Mouse / Mobile Controls Bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!running || paused}
                    onClick={() => sendAction("left")}
                    className="inline-flex h-12 min-w-[68px] items-center justify-center gap-1 rounded-xl border border-white/15 bg-[#171717] px-3 text-xs font-bold text-white transition active:scale-95 disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Left</span>
                  </button>
                  <button
                    type="button"
                    disabled={!running || paused}
                    onClick={() => sendAction("jump")}
                    className="inline-flex h-12 min-w-[76px] items-center justify-center gap-1 rounded-xl border border-[#A3FF12]/40 bg-[#A3FF12]/15 px-4 text-xs font-bold text-[#A3FF12] transition active:scale-95 disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" />
                    <span>Jump</span>
                  </button>
                  <button
                    type="button"
                    disabled={!running || paused}
                    onClick={() => sendAction("right")}
                    className="inline-flex h-12 min-w-[68px] items-center justify-center gap-1 rounded-xl border border-white/15 bg-[#171717] px-3 text-xs font-bold text-white transition active:scale-95 disabled:opacity-40"
                  >
                    <span>Right</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-[11px] text-zinc-400">
                  Controls: Arrow Keys / WASD / Space • Swipe Left, Right, or Up on mobile
                </p>
              </div>
            </div>
          )}

          {/* FACT / WINTER HACK OVERLAY MODAL */}
          {activeFact && (
            <div
              role="dialog"
              aria-modal="true"
              className="rounded-3xl border border-[#34D399]/40 bg-[#101814] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-3 py-1 text-[11px] font-bold text-[#34D399]">
                    <Flame className="h-3.5 w-3.5" />
                    <span>{activeFact.sourceTag}</span>
                  </span>
                  <h3 className="mt-2 font-display text-xl font-extrabold text-white">
                    {activeFact.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                    {activeFact.tip}
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    <span>{activeFact.disclaimer}</span>
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    persistSave((prev) => ({ ...prev, coins: prev.coins + 10 }));
                    setRunCoins((c) => c + 10);
                    setActiveFact(null);
                    setPaused(false);
                  }}
                  className="rounded-xl bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#050706] hover:bg-[#b8ff42]"
                >
                  Collect +10 Coins &amp; Resume
                </button>
              </div>
            </div>
          )}

          {/* QUIZ + PRODUCT SUGGESTION MODAL (Sketch flow: Q -> Congrats + Product options) */}
          {activeQuiz && (
            <div
              role="dialog"
              aria-modal="true"
              className="space-y-4 rounded-3xl border border-pink-300/35 bg-[#151015] p-6 shadow-2xl"
            >
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-300/35 bg-pink-400/10 px-3 py-1 text-[11px] font-bold text-pink-200">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Wellness Quiz Gate</span>
                </span>
                <h3 className="mt-2 font-display text-xl font-extrabold text-white">
                  {activeQuiz.question}
                </h3>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {activeQuiz.options.map((opt, idx) => {
                  const isPicked = selectedQuizOption === idx;
                  const isCorrect = idx === activeQuiz.correctIndex;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSelectedQuizOption(idx);
                        if (isCorrect && !quizSolved) {
                          setQuizSolved(true);
                          persistSave((prev) => ({
                            ...prev,
                            coins: prev.coins + 20,
                            quizzesCorrectCount: prev.quizzesCorrectCount + 1,
                          }));
                          setRunCoins((c) => c + 20);
                        }
                      }}
                      className={`rounded-xl border px-4 py-3 text-left text-xs font-semibold transition ${
                        isPicked && isCorrect
                          ? "border-[#34D399] bg-[#34D399]/15 text-[#34D399]"
                          : isPicked
                            ? "border-rose-400 bg-rose-400/15 text-rose-200"
                            : "border-white/10 bg-[#1B141A] text-zinc-200 hover:border-white/30"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selectedQuizOption !== null &&
                selectedQuizOption !== activeQuiz.correctIndex && (
                  <p className="text-xs font-medium text-rose-300">
                    Not quite! Try another option to unlock your coin bonus.
                  </p>
                )}

              {quizSolved && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#34D399]/35 bg-[#101914] p-4">
                    <p className="flex items-center gap-2 font-display text-sm font-bold text-[#A3FF12]">
                      <CheckCircle2 className="h-4 w-4 text-[#34D399]" />
                      <span>{activeQuiz.congratsMessage} (+20 Coins!)</span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                      {activeQuiz.explanation}
                    </p>
                  </div>

                  {activeQuiz.recommendedCategory && (
                    <ProductSuggestion
                      category={activeQuiz.recommendedCategory}
                      subCategory={activeQuiz.recommendedSubCategory}
                      isMedicalExclusion={activeQuiz.isMedicalExclusion}
                      onClaimRecorded={handleRecordClaim}
                      onGoToCatalog={() => onNavigate("recommended-products")}
                    />
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-3">
                <p className="text-[10px] text-zinc-400">{activeQuiz.disclaimer}</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuiz(null);
                    setPaused(false);
                  }}
                  className="rounded-xl bg-[#A3FF12] px-4 py-2 text-xs font-bold text-[#050706] hover:bg-[#b8ff42]"
                >
                  Continue Run
                </button>
              </div>
            </div>
          )}

          {/* LEVEL-GATING HEALTH CHECKPOINT TASK MODAL */}
          {activeTaskModal && (
            <div
              role="dialog"
              aria-modal="true"
              className="space-y-4 rounded-3xl border border-[#A3FF12]/45 bg-[#121613] p-6 shadow-2xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A3FF12]/40 bg-[#A3FF12]/15 px-3 py-1 text-xs font-bold text-[#A3FF12]">
                    <Lock className="h-3.5 w-3.5" />
                    <span>{activeTaskModal.milestoneKm} km Checkpoint Gate</span>
                  </span>
                  <h3 className="mt-2 font-display text-xl font-extrabold text-white">
                    {activeTaskModal.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                    {activeTaskModal.description}
                  </p>
                </div>
                <span className="rounded-xl border border-amber-300/35 bg-amber-400/10 px-3 py-1.5 font-mono text-xs font-bold text-amber-200">
                  Reward: +{activeTaskModal.rewardCoins} Coins
                </span>
              </div>

              {activeTaskModal.kind === "water_photos" ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-sky-300/35 bg-[#0C1418] p-4 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-sky-200">
                        <Camera className="h-4 w-4" />
                        <span>1. Before Drinking Water Photo</span>
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        onChange={(e) => void handleWaterFileSelect("before", e)}
                        className="text-[11px] text-zinc-300"
                      />
                      {waterBeforeName && (
                        <span className="font-mono text-[11px] text-[#34D399]">
                          ✓ {waterBeforeName}
                        </span>
                      )}
                    </label>

                    <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-emerald-300/35 bg-[#0D1713] p-4 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-emerald-200">
                        <Upload className="h-4 w-4" />
                        <span>2. After Drinking Water Photo</span>
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        onChange={(e) => void handleWaterFileSelect("after", e)}
                        className="text-[11px] text-zinc-300"
                      />
                      {waterAfterName && (
                        <span className="font-mono text-[11px] text-[#34D399]">
                          ✓ {waterAfterName}
                        </span>
                      )}
                    </label>
                  </div>

                  {activeProfile && (
                    <label className="flex items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={syncWaterToProfile}
                        onChange={(e) => setSyncWaterToProfile(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#34D399]"
                      />
                      <span>Also log +250 mL to my NutriSense Hydration Tracker</span>
                    </label>
                  )}

                  {waterError && (
                    <p className="text-xs font-semibold text-rose-300">{waterError}</p>
                  )}

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={finishRun}
                      className="rounded-xl border border-white/15 bg-[#0A0A0A] px-4 py-2 text-xs font-semibold text-zinc-300"
                    >
                      Save &amp; End Run
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCompleteWaterTask()}
                      className="rounded-xl bg-[#A3FF12] px-5 py-2 text-xs font-bold text-[#050706] hover:bg-[#b8ff42]"
                    >
                      Verify Photos &amp; Unlock Level 2
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-[#A3FF12]/35 bg-[#0C120E] p-4 text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-[#A3FF12]">
                      <Camera className="h-4 w-4" />
                      <span>Upload Photo of What You Ate Today</span>
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={(e) => void handleMealTaskPhoto(e)}
                      className="text-[11px] text-zinc-300"
                    />
                    {mealScanning && (
                      <span className="text-[11px] text-amber-200">
                        Scanning nutrients with Gemini Vision...
                      </span>
                    )}
                    {mealPhotoName && !mealScanning && (
                      <span className="font-mono text-[11px] text-[#34D399]">
                        ✓ {mealPhotoName}
                      </span>
                    )}
                  </label>

                  {mealScanResult && (
                    <div className="rounded-2xl border border-[#34D399]/35 bg-[#101814] p-3.5 text-xs">
                      <p className="font-bold text-[#34D399]">
                        Detected: {mealScanResult.food_name || "Meal"} (
                        {Math.round(mealScanResult.totals.calories)} kcal •{" "}
                        {mealScanResult.totals.protein.toFixed(1)}g P •{" "}
                        {mealScanResult.totals.carbs.toFixed(1)}g C •{" "}
                        {mealScanResult.totals.fats.toFixed(1)}g F)
                      </p>
                    </div>
                  )}

                  {mealError && (
                    <p className="text-xs font-semibold text-rose-300">{mealError}</p>
                  )}

                  <div className="flex flex-wrap justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate("scanner")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:text-white"
                    >
                      <Camera className="h-3.5 w-3.5 text-[#34D399]" />
                      <span>Open Full AI Food Scanner</span>
                    </button>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={finishRun}
                        className="rounded-xl border border-white/15 bg-[#0A0A0A] px-4 py-2 text-xs font-semibold text-zinc-300"
                      >
                        End Run
                      </button>
                      <button
                        type="button"
                        onClick={handleCompleteMealTask}
                        className="rounded-xl bg-[#A3FF12] px-5 py-2 text-xs font-bold text-[#050706] hover:bg-[#b8ff42]"
                      >
                        Complete Meal Task &amp; Unlock Level 3
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TASKS TAB */}
      {activeTab === "tasks" && (
        <div className="grid gap-4 md:grid-cols-2">
          {CHECKPOINT_TASKS.map((task) => {
            const done = save.completedTaskIds.includes(task.id);
            return (
              <div
                key={task.id}
                className={`flex flex-col justify-between rounded-3xl border p-6 ${
                  done
                    ? "border-[#34D399]/35 bg-[#101814]"
                    : "border-white/[0.08] bg-[#121212]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-[#A3FF12]">
                      <Droplets className="h-3.5 w-3.5 text-sky-300" />
                      <span>{task.milestoneKm} km Gate → Level {task.levelRequiredFor}</span>
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        done
                          ? "bg-[#34D399]/20 text-[#34D399]"
                          : "bg-white/10 text-zinc-300"
                      }`}
                    >
                      {done ? "Completed" : "Required for Next Level"}
                    </span>
                  </div>

                  <h3 className="mt-2 font-display text-lg font-bold text-white">
                    {task.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                    {task.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3">
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-200">
                    <Award className="h-3.5 w-3.5 text-amber-300" />
                    +{task.rewardCoins} Coins
                  </span>
                  {!done && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTaskModal(task);
                        setActiveTab("play");
                        setPaused(true);
                      }}
                      className="rounded-xl bg-[#A3FF12] px-3.5 py-2 text-xs font-bold text-[#050706] hover:bg-[#b8ff42]"
                    >
                      Complete Task Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REWARDS TAB */}
      {activeTab === "rewards" && (
        <MyRewardsPanel
          save={save}
          serverStatusMessage={serverStatusMessage}
          refreshingServer={refreshingServer}
          isUnder18={isUnder18}
          onRefreshServer={() => void refreshServerRewards()}
          onUnlockCosmetic={handleUnlockCosmetic}
          onEquipCosmetic={handleEquipCosmetic}
          onSimulateDemoConfirm={handleSimulateDemoConfirm}
          onSimulateDemoReverse={handleSimulateDemoReverse}
        />
      )}
    </div>
  );
}
