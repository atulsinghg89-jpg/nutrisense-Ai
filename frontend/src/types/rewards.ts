export type PurchaseClaimStatus =
  | "clicked"
  | "pending"
  | "confirmed"
  | "rejected"
  | "reversed";

export type PurchaseClaimSource = "server" | "demo";

export interface PurchaseClaim {
  id: string;
  clickId: string;
  productId: number;
  listingId?: number;
  productName?: string;
  retailerName: string;
  clickedAt: string;
  status: PurchaseClaimStatus;
  source: PurchaseClaimSource;
  coins: number;
  diamonds: number;
  confirmedAt?: string | null;
  reversedAt?: string | null;
}

export interface RewardLedgerEntry {
  id: string;
  claimId: string;
  kind: "coins" | "diamonds";
  amount: number;
  createdAt: string;
  reversedAt?: string | null;
  demo: boolean;
}

export interface RewardConfig {
  coinsPerPurchase: number;
  diamondsPerPurchase: number;
  dailyDiamondCap: number;
}
