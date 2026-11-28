import {
  Check,
  Coins,
  Gem,
  Info,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { COSMETICS_CATALOG, REWARD_CONFIG } from "../../game/gameData";
import type { GameCosmeticItem, GameCosmeticSlot, GameSave } from "../../types/game";
import type { PurchaseClaimStatus } from "../../types/rewards";

interface MyRewardsPanelProps {
  save: GameSave;
  serverStatusMessage: string | null;
  refreshingServer: boolean;
  isUnder18: boolean;
  onRefreshServer: () => void;
  onUnlockCosmetic: (item: GameCosmeticItem) => void;
  onEquipCosmetic: (slot: GameCosmeticSlot, cosmeticId: string | null) => void;
  onSimulateDemoConfirm?: () => void;
  onSimulateDemoReverse?: (claimId: string) => void;
}

const STATUS_CHIP_STYLE: Record<PurchaseClaimStatus, string> = {
  clicked: "border-zinc-400/35 bg-zinc-400/10 text-zinc-200",
  pending: "border-amber-300/35 bg-amber-300/10 text-amber-200",
  confirmed: "border-[#34D399]/45 bg-[#34D399]/15 text-[#34D399]",
  rejected: "border-rose-400/35 bg-rose-400/10 text-rose-300",
  reversed: "border-orange-400/35 bg-orange-400/10 text-orange-300",
};

function CosmeticArtwork({ slot, accent }: { slot: GameCosmeticSlot; accent: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        fill="#0A0D0B"
        stroke={accent}
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      {slot === "skin" && (
        <g>
          <circle cx="20" cy="14" r="5" fill={accent} />
          <path d="M12 28 C12 22, 28 22, 28 28" stroke={accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      )}
      {slot === "trail" && (
        <path
          d="M8 26 Q16 14 23 20 T33 13"
          fill="none"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {slot === "portal" && (
        <g>
          <circle cx="20" cy="20" r="9" fill="none" stroke={accent} strokeWidth="2.5" strokeDasharray="4 2" />
          <circle cx="20" cy="20" r="4" fill={accent} fillOpacity="0.4" />
        </g>
      )}
      {slot === "badge" && (
        <polygon
          points="20,9 23.5,16.5 31.5,17.5 25.5,23 27,31 20,27 13,31 14.5,23 8.5,17.5 16.5,16.5"
          fill={accent}
          fillOpacity="0.85"
        />
      )}
    </svg>
  );
}

export function MyRewardsPanel({
  save,
  serverStatusMessage,
  refreshingServer,
  isUnder18,
  onRefreshServer,
  onUnlockCosmetic,
  onEquipCosmetic,
  onSimulateDemoConfirm,
  onSimulateDemoReverse,
}: MyRewardsPanelProps) {
  const showDemoCounter = save.demoMode || save.demoDiamonds > 0;
  const availableDiamondsForCosmetics = save.demoMode
    ? save.diamonds + save.demoDiamonds
    : save.diamonds;

  return (
    <div className="space-y-5 rounded-3xl border border-white/[0.08] bg-[#121212] p-5 sm:p-6">
      {/* Header + Sync Control */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#A3FF12]">
            <Gem className="h-3.5 w-3.5 text-sky-300" />
            My Rewards &amp; Cosmetics
          </span>
          <h3 className="mt-1 font-display text-lg font-bold text-white">
            Coins, Verified Diamonds &amp; Claim Ledger
          </h3>
        </div>

        {!isUnder18 && (
          <button
            type="button"
            onClick={onRefreshServer}
            disabled={refreshingServer}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-[#34D399]/50 hover:text-white disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshingServer ? "animate-spin" : ""}`} />
            <span>{refreshingServer ? "Checking..." : "Refresh Rewards"}</span>
          </button>
        )}
      </div>

      {/* Balances Row */}
      <div className={`grid gap-3 ${showDemoCounter ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div className="rounded-2xl border border-amber-300/20 bg-[#16140D] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
            <Coins className="h-4 w-4 text-amber-300" />
            <span>Gameplay &amp; Task Coins</span>
          </div>
          <p className="mt-1.5 font-mono text-2xl font-extrabold text-white tabular-nums">
            {save.coins}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            Earned freely by running, answering quizzes, &amp; health tasks.
          </p>
        </div>

        <div className="rounded-2xl border border-sky-300/25 bg-[#0F1619] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-200">
            <Gem className="h-4 w-4 text-sky-300" />
            <span>Real Diamonds (Server Verified)</span>
          </div>
          <p className="mt-1.5 font-mono text-2xl font-extrabold text-white tabular-nums">
            {save.diamonds}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            Cosmetic only. Daily limit: {save.dailyRealDiamondsCount}/{REWARD_CONFIG.dailyDiamondCap} today.
          </p>
        </div>

        {showDemoCounter && (
          <div className="rounded-2xl border border-fuchsia-400/35 bg-[#1B121F] p-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-fuchsia-200">
                <Sparkles className="h-4 w-4 text-fuchsia-300" />
                <span>Demo Diamonds</span>
              </span>
              <span className="rounded-full border border-fuchsia-300/40 bg-fuchsia-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fuchsia-200">
                DEMO: not a real purchase
              </span>
            </div>
            <p className="mt-1.5 font-mono text-2xl font-extrabold text-white tabular-nums">
              {save.demoDiamonds}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Separate presentation counter — never merged into real diamonds.
            </p>
          </div>
        )}
      </div>

      {/* Server Provider Status */}
      {serverStatusMessage && !isUnder18 && (
        <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 text-xs text-zinc-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" />
          <span>{serverStatusMessage}</span>
        </div>
      )}

      {/* Presentation Demo Mode Trigger (Only visible when Demo Mode toggle is explicitly ON) */}
      {save.demoMode && !isUnder18 && onSimulateDemoConfirm && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fuchsia-400/30 bg-[#1B121F] px-4 py-3">
          <div>
            <p className="text-xs font-bold text-fuchsia-200">
              DEMO: not a real purchase — Presentation Simulator
            </p>
            <p className="text-[11px] text-zinc-300">
              Simulates one verified confirmation into Demo Diamonds only (OFF by default).
            </p>
          </div>
          <button
            type="button"
            onClick={onSimulateDemoConfirm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-300 px-3.5 py-2 text-xs font-bold text-[#1B0D1F] transition hover:bg-fuchsia-200"
          >
            <Gem className="h-3.5 w-3.5" />
            <span>Simulate Purchase Confirmed (+1 Demo 💎)</span>
          </button>
        </div>
      )}

      {/* Original Diamond Cosmetics (Strictly Optional Visual Flair) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-display text-sm font-bold text-white">
            Optional Runner Cosmetics
          </h4>
          <span className="text-[11px] text-zinc-400">
            Cosmetic only — zero pay-to-win or level gating.
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {COSMETICS_CATALOG.map((item) => {
            const unlocked = save.unlockedCosmetics.includes(item.id);
            const equipped = save.equippedCosmetics[item.slot] === item.id;
            const canAfford = availableDiamondsForCosmetics >= item.diamondCost;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 ${
                  equipped
                    ? "border-[#A3FF12]/45 bg-[#131914]"
                    : "border-white/[0.08] bg-[#171717]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CosmeticArtwork slot={item.slot} accent={item.accentColor} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-xs font-bold text-white">
                      {item.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() =>
                        onEquipCosmetic(item.slot, equipped ? null : item.id)
                      }
                      className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                        equipped
                          ? "border border-[#A3FF12]/50 bg-[#A3FF12]/15 text-[#A3FF12]"
                          : "border border-white/15 bg-[#0A0A0A] text-white hover:border-white/35"
                      }`}
                    >
                      {equipped && <Check className="h-3 w-3" />}
                      <span>{equipped ? "Equipped" : "Equip"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onUnlockCosmetic(item)}
                      className="rounded-xl border border-sky-300/40 bg-sky-300/15 px-3 py-1.5 text-[11px] font-bold text-sky-200 transition hover:bg-sky-300/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Unlock ({item.diamondCost} 💎)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Claims List */}
      {!isUnder18 && (
        <div className="space-y-2.5">
          <h4 className="font-display text-sm font-bold text-white">
            Purchase Claim Status History
          </h4>
          {save.claims.length === 0 ? (
            <p className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] px-3.5 py-3 text-xs text-zinc-400">
              No purchase clicks or claims recorded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {save.claims.slice(0, 10).map((claim) => (
                <li
                  key={claim.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-[#0A0A0A] px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-white">
                        {claim.productName || claim.retailerName}
                      </span>
                      {claim.source === "demo" && (
                        <span className="rounded-full border border-fuchsia-300/35 bg-fuchsia-400/15 px-2 py-0.5 text-[9px] font-bold uppercase text-fuchsia-200">
                          DEMO: not a real purchase
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                      Click: {claim.clickId} •{" "}
                      {new Date(claim.clickedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                        STATUS_CHIP_STYLE[claim.status]
                      }`}
                    >
                      {claim.status}
                    </span>

                    {save.demoMode &&
                      claim.source === "demo" &&
                      claim.status === "confirmed" &&
                      onSimulateDemoReverse && (
                        <button
                          type="button"
                          onClick={() => onSimulateDemoReverse(claim.id)}
                          title="Simulate cancellation / return reversal"
                          className="inline-flex items-center gap-1 rounded-lg border border-orange-300/35 bg-orange-400/10 px-2 py-1 text-[10px] font-semibold text-orange-200 hover:bg-orange-400/20"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reverse</span>
                        </button>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
