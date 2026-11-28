import { Award, Coins, Flag, Gem, Play, Route } from "lucide-react";
import type { GameCosmeticItem, GameCosmeticSlot, GameSave } from "../../types/game";
import { MyRewardsPanel } from "./MyRewardsPanel";

interface RunSummaryProps {
  distanceKm: number;
  runCoins: number;
  runScore: number;
  save: GameSave;
  rareRevealMessage: string | null;
  serverStatusMessage: string | null;
  refreshingServer: boolean;
  isUnder18: boolean;
  onRefreshServer: () => void;
  onUnlockCosmetic: (item: GameCosmeticItem) => void;
  onEquipCosmetic: (slot: GameCosmeticSlot, id: string | null) => void;
  onSimulateDemoConfirm?: () => void;
  onSimulateDemoReverse?: (claimId: string) => void;
  onPlayAgain: () => void;
}

export function RunSummary({
  distanceKm,
  runCoins,
  runScore,
  save,
  rareRevealMessage,
  serverStatusMessage,
  refreshingServer,
  isUnder18,
  onRefreshServer,
  onUnlockCosmetic,
  onEquipCosmetic,
  onSimulateDemoConfirm,
  onSimulateDemoReverse,
  onPlayAgain,
}: RunSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Subtle CSS-only Rare Diamond Reveal with Screen Reader Announcement */}
      <div aria-live="polite" aria-atomic="true">
        {rareRevealMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-sky-300/45 bg-gradient-to-r from-sky-400/15 via-[#10181C] to-emerald-400/15 px-5 py-4 text-sm text-sky-100 motion-safe:animate-[fadeSlideIn_0.45s_ease-out]">
            <Gem className="h-5 w-5 shrink-0 text-sky-300" />
            <div>
              <p className="font-display text-sm font-bold text-white">
                Rare Reward Update
              </p>
              <p className="text-xs text-sky-200">{rareRevealMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Run Telemetry Summary Card */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#34D399]">
              <Flag className="h-3.5 w-3.5" />
              Run Complete
            </span>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-white">
              NutriSense Run Summary
            </h2>
          </div>

          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#A3FF12] px-5 py-3 text-sm font-bold text-[#050706] transition hover:bg-[#b8ff42]"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Run Again</span>
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#171717] p-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Route className="h-3.5 w-3.5 text-[#34D399]" />
              <span>Distance Covered</span>
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
              {distanceKm.toFixed(2)} km
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#171717] p-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Award className="h-3.5 w-3.5 text-[#A3FF12]" />
              <span>Run Score (Best: {save.bestScore})</span>
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-[#A3FF12] tabular-nums">
              {runScore}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#171717] p-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Coins className="h-3.5 w-3.5 text-amber-300" />
              <span>Coins Earned This Run</span>
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-amber-200 tabular-nums">
              +{runCoins}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#171717] p-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span>Active Level</span>
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-white">
              Level {save.level}
            </p>
          </div>
        </div>
      </div>

      {/* Rewards & Claims Panel */}
      <MyRewardsPanel
        save={save}
        serverStatusMessage={serverStatusMessage}
        refreshingServer={refreshingServer}
        isUnder18={isUnder18}
        onRefreshServer={onRefreshServer}
        onUnlockCosmetic={onUnlockCosmetic}
        onEquipCosmetic={onEquipCosmetic}
        onSimulateDemoConfirm={onSimulateDemoConfirm}
        onSimulateDemoReverse={onSimulateDemoReverse}
      />
    </div>
  );
}
