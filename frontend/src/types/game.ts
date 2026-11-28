import type { PurchaseClaim, RewardLedgerEntry } from "./rewards";
import type { ProductCategoryId } from "./nutrition";

export type GameUniverse = "runner_3lane" | "platform_bob";

export type GameCosmeticSlot = "skin" | "trail" | "portal" | "badge";

export interface GameCosmeticItem {
  id: string;
  name: string;
  description: string;
  slot: GameCosmeticSlot;
  diamondCost: number;
  accentColor: string;
}

export interface EquippedCosmetics {
  skin: string | null;
  trail: string | null;
  portal: string | null;
  badge: string | null;
}

export interface GameFactHack {
  id: string;
  category: "winter_hack" | "nutrition_fact" | "hydration" | "lifestyle";
  title: string;
  tip: string;
  sourceTag: string;
  disclaimer: string;
}

export interface GameQuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  congratsMessage: string;
  explanation: string;
  recommendedCategory?: ProductCategoryId;
  recommendedSubCategory?: string;
  isMedicalExclusion?: boolean;
  disclaimer: string;
}

export interface GameTaskRequirement {
  id: "task_water_5km" | "task_meal_10km";
  levelRequiredFor: number;
  milestoneKm: number;
  kind: "water_photos" | "meal_scan";
  title: string;
  description: string;
  rewardCoins: number;
}

export interface GameSaveV1 {
  version?: 1;
  coins?: number;
  bestScore?: number;
  level?: number;
  completedTaskIds?: string[];
  badges?: string[];
  unlockedBadges?: string[];
}

export interface GameSave {
  version: 2;
  coins: number;
  bestScore: number;
  bestDistanceMeters: number;
  level: number;
  completedTaskIds: string[];
  unlockedBadges: string[];
  diamonds: number;
  demoDiamonds: number;
  claims: PurchaseClaim[];
  ledger: RewardLedgerEntry[];
  unlockedCosmetics: string[];
  equippedCosmetics: EquippedCosmetics;
  demoMode: boolean;
  lastUniverse: GameUniverse;
  factsSeenCount: number;
  quizzesCorrectCount: number;
  dailyRealDiamondsDate: string;
  dailyRealDiamondsCount: number;
}
