import { REWARD_CONFIG } from "../game/gameData";
import type { GameSave, GameSaveV1 } from "../types/game";
import type { PurchaseClaim, RewardLedgerEntry } from "../types/rewards";

export const LEGACY_GAME_STORAGE_KEY_V1 = "nutrisense_game_v1";
export const GAME_STORAGE_KEY_V2 = "nutrisense_game_v2";

function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function createDefaultGameSave(): GameSave {
  return {
    version: 2,
    coins: 0,
    bestScore: 0,
    bestDistanceMeters: 0,
    level: 1,
    completedTaskIds: [],
    unlockedBadges: [],
    diamonds: 0,
    demoDiamonds: 0,
    claims: [],
    ledger: [],
    unlockedCosmetics: [],
    equippedCosmetics: {
      skin: null,
      trail: null,
      portal: null,
      badge: null,
    },
    demoMode: false,
    lastUniverse: "runner_3lane",
    factsSeenCount: 0,
    quizzesCorrectCount: 0,
    dailyRealDiamondsDate: localDateKey(),
    dailyRealDiamondsCount: 0,
  };
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function migrateV1ToV2(v1: GameSaveV1): GameSave {
  const base = createDefaultGameSave();
  const badges = Array.isArray(v1.unlockedBadges)
    ? v1.unlockedBadges
    : Array.isArray(v1.badges)
      ? v1.badges
      : [];

  return {
    ...base,
    coins: Math.max(0, Math.floor(Number(v1.coins) || 0)),
    bestScore: Math.max(0, Math.floor(Number(v1.bestScore) || 0)),
    level: Math.max(1, Math.floor(Number(v1.level) || 1)),
    completedTaskIds: Array.isArray(v1.completedTaskIds)
      ? v1.completedTaskIds.map(String)
      : [],
    unlockedBadges: badges.map(String),
  };
}

export function normalizeGameSave(raw: Partial<GameSave>): GameSave {
  const base = createDefaultGameSave();
  const today = localDateKey();
  const sameDay = raw.dailyRealDiamondsDate === today;

  return {
    ...base,
    ...raw,
    version: 2,
    coins: Math.max(0, Math.floor(Number(raw.coins) || 0)),
    bestScore: Math.max(0, Math.floor(Number(raw.bestScore) || 0)),
    bestDistanceMeters: Math.max(0, Math.floor(Number(raw.bestDistanceMeters) || 0)),
    level: Math.max(1, Math.floor(Number(raw.level) || 1)),
    completedTaskIds: Array.isArray(raw.completedTaskIds) ? raw.completedTaskIds : [],
    unlockedBadges: Array.isArray(raw.unlockedBadges) ? raw.unlockedBadges : [],
    diamonds: Math.max(0, Math.floor(Number(raw.diamonds) || 0)),
    demoDiamonds: Math.max(0, Math.floor(Number(raw.demoDiamonds) || 0)),
    claims: Array.isArray(raw.claims) ? raw.claims : [],
    ledger: Array.isArray(raw.ledger) ? raw.ledger : [],
    unlockedCosmetics: Array.isArray(raw.unlockedCosmetics) ? raw.unlockedCosmetics : [],
    equippedCosmetics: {
      skin: raw.equippedCosmetics?.skin ?? null,
      trail: raw.equippedCosmetics?.trail ?? null,
      portal: raw.equippedCosmetics?.portal ?? null,
      badge: raw.equippedCosmetics?.badge ?? null,
    },
    demoMode: Boolean(raw.demoMode),
    lastUniverse:
      raw.lastUniverse === "platform_bob" ? "platform_bob" : "runner_3lane",
    factsSeenCount: Math.max(0, Math.floor(Number(raw.factsSeenCount) || 0)),
    quizzesCorrectCount: Math.max(0, Math.floor(Number(raw.quizzesCorrectCount) || 0)),
    dailyRealDiamondsDate: today,
    dailyRealDiamondsCount: sameDay
      ? Math.max(0, Math.floor(Number(raw.dailyRealDiamondsCount) || 0))
      : 0,
  };
}

export function loadGameSave(): GameSave {
  try {
    const v2Parsed = safeParseJson<Partial<GameSave>>(
      localStorage.getItem(GAME_STORAGE_KEY_V2),
    );
    if (v2Parsed && typeof v2Parsed === "object" && v2Parsed.version === 2) {
      return normalizeGameSave(v2Parsed);
    }

    // Check legacy v1 key safely without deleting old data so downgrades/reads never break
    const v1Parsed = safeParseJson<GameSaveV1>(
      localStorage.getItem(LEGACY_GAME_STORAGE_KEY_V1),
    );
    if (v1Parsed && typeof v1Parsed === "object") {
      const migrated = migrateV1ToV2(v1Parsed);
      saveGameSave(migrated);
      return migrated;
    }
  } catch {
    // Graceful fallback when localStorage is blocked (private mode, CSP, sandbox)
  }
  return createDefaultGameSave();
}

export function saveGameSave(save: GameSave): void {
  try {
    localStorage.setItem(GAME_STORAGE_KEY_V2, JSON.stringify(save));
  } catch {
    // Never throw when browser storage is blocked or full
  }
}

export interface ApplyRewardResult {
  save: GameSave;
  grantedRealDiamonds: number;
  grantedDemoDiamonds: number;
  grantedCoins: number;
  reversed: boolean;
}

/**
 * Single canonical reward processor:
 * - Enforces idempotency per claim.id & clickId (never double-grants)
 * - Grants REAL diamonds strictly when claim.source === "server" and claim.status === "confirmed"
 * - Keeps DEMO diamonds completely separate (claim.source === "demo")
 * - Enforces daily real diamond cap
 * - Supports full reversal when claim.status === "reversed"
 */
export function applyReward(currentSave: GameSave, claim: PurchaseClaim): ApplyRewardResult {
  const save = normalizeGameSave(currentSave);
  const existingIdx = save.claims.findIndex(
    (c) => c.id === claim.id || c.clickId === claim.clickId,
  );
  const existingClaim = existingIdx >= 0 ? save.claims[existingIdx] : null;
  const isDemo = claim.source === "demo";

  const nextClaims = [...save.claims];
  let nextLedger = [...save.ledger];
  let nextCoins = save.coins;
  let nextDiamonds = save.diamonds;
  let nextDemoDiamonds = save.demoDiamonds;
  let nextDailyRealCount = save.dailyRealDiamondsCount;
  const today = localDateKey();

  const existingCoinsForClaim = nextLedger
    .filter((l) => l.claimId === claim.id && l.kind === "coins" && !l.reversedAt)
    .reduce((sum, l) => sum + l.amount, 0);
  const existingDiamondsForClaim = nextLedger
    .filter((l) => l.claimId === claim.id && l.kind === "diamonds" && !l.reversedAt)
    .reduce((sum, l) => sum + l.amount, 0);

  // Reversal handling: withdraw any unreversed rewards linked to this claim
  if (claim.status === "reversed") {
    const revAt = claim.reversedAt || new Date().toISOString();
    let reversedAnything = false;
    nextLedger = nextLedger.map((entry) => {
      if (entry.claimId === claim.id && !entry.reversedAt) {
        reversedAnything = true;
        if (entry.kind === "coins") {
          nextCoins = Math.max(0, nextCoins - entry.amount);
        } else if (entry.demo) {
          nextDemoDiamonds = Math.max(0, nextDemoDiamonds - entry.amount);
        } else {
          nextDiamonds = Math.max(0, nextDiamonds - entry.amount);
        }
        return { ...entry, reversedAt: revAt };
      }
      return entry;
    });

    const updatedClaim: PurchaseClaim = {
      ...claim,
      coins: 0,
      diamonds: 0,
      reversedAt: revAt,
    };
    if (existingIdx >= 0) {
      nextClaims[existingIdx] = updatedClaim;
    } else {
      nextClaims.unshift(updatedClaim);
    }

    return {
      save: {
        ...save,
        coins: nextCoins,
        diamonds: nextDiamonds,
        demoDiamonds: nextDemoDiamonds,
        claims: nextClaims,
        ledger: nextLedger,
      },
      grantedRealDiamonds: 0,
      grantedDemoDiamonds: 0,
      grantedCoins: 0,
      reversed: reversedAnything || Boolean(existingClaim && existingClaim.status !== "reversed"),
    };
  }

  // Only "confirmed" may grant; clicks/pending/rejected update claim metadata without granting
  if (claim.status !== "confirmed") {
    const storedClaim: PurchaseClaim = {
      ...claim,
      coins: existingCoinsForClaim,
      diamonds: existingDiamondsForClaim,
    };
    if (existingIdx >= 0) {
      // Never downgrade an already reversed or confirmed claim back to clicked/pending
      if (existingClaim?.status === "reversed" || existingClaim?.status === "confirmed") {
        return {
          save,
          grantedRealDiamonds: 0,
          grantedDemoDiamonds: 0,
          grantedCoins: 0,
          reversed: false,
        };
      }
      nextClaims[existingIdx] = storedClaim;
    } else {
      nextClaims.unshift(storedClaim);
    }
    return {
      save: { ...save, claims: nextClaims },
      grantedRealDiamonds: 0,
      grantedDemoDiamonds: 0,
      grantedCoins: 0,
      reversed: false,
    };
  }

  // Confirmed path: idempotent check — never grant twice for same claim
  if (existingClaim?.status === "reversed") {
    return {
      save,
      grantedRealDiamonds: 0,
      grantedDemoDiamonds: 0,
      grantedCoins: 0,
      reversed: false,
    };
  }
  if (existingDiamondsForClaim > 0 || existingCoinsForClaim > 0 || existingClaim?.status === "confirmed") {
    if (existingIdx >= 0) {
      nextClaims[existingIdx] = {
        ...claim,
        coins: existingCoinsForClaim,
        diamonds: existingDiamondsForClaim,
      };
    }
    return {
      save: { ...save, claims: nextClaims },
      grantedRealDiamonds: 0,
      grantedDemoDiamonds: 0,
      grantedCoins: 0,
      reversed: false,
    };
  }

  // Compute server/demo reward grant strictly honoring daily cap on real diamonds
  const coinsToGrant =
    claim.source === "server"
      ? Math.max(0, claim.coins)
      : REWARD_CONFIG.coinsPerPurchase;

  let diamondsToGrant = 0;
  if (claim.source === "server") {
    const remainingCap = Math.max(0, REWARD_CONFIG.dailyDiamondCap - nextDailyRealCount);
    const serverAmount = Math.max(0, claim.diamonds);
    diamondsToGrant = Math.min(serverAmount, remainingCap);
  } else {
    diamondsToGrant = REWARD_CONFIG.diamondsPerPurchase;
  }

  const nowIso = new Date().toISOString();
  const newEntries: RewardLedgerEntry[] = [];
  if (coinsToGrant > 0) {
    nextCoins += coinsToGrant;
    newEntries.push({
      id: `led_c_${claim.id}`,
      claimId: claim.id,
      kind: "coins",
      amount: coinsToGrant,
      createdAt: nowIso,
      demo: isDemo,
    });
  }
  if (diamondsToGrant > 0) {
    if (isDemo) {
      nextDemoDiamonds += diamondsToGrant;
    } else {
      nextDiamonds += diamondsToGrant;
      nextDailyRealCount += diamondsToGrant;
    }
    newEntries.push({
      id: `led_d_${claim.id}`,
      claimId: claim.id,
      kind: "diamonds",
      amount: diamondsToGrant,
      createdAt: nowIso,
      demo: isDemo,
    });
  }

  const savedClaim: PurchaseClaim = {
    ...claim,
    coins: coinsToGrant,
    diamonds: diamondsToGrant,
    confirmedAt: claim.confirmedAt || nowIso,
  };
  if (existingIdx >= 0) {
    nextClaims[existingIdx] = savedClaim;
  } else {
    nextClaims.unshift(savedClaim);
  }

  return {
    save: {
      ...save,
      coins: nextCoins,
      diamonds: nextDiamonds,
      demoDiamonds: nextDemoDiamonds,
      claims: nextClaims,
      ledger: [...newEntries, ...nextLedger],
      dailyRealDiamondsDate: today,
      dailyRealDiamondsCount: nextDailyRealCount,
    },
    grantedRealDiamonds: isDemo ? 0 : diamondsToGrant,
    grantedDemoDiamonds: isDemo ? diamondsToGrant : 0,
    grantedCoins: coinsToGrant,
    reversed: false,
  };
}
