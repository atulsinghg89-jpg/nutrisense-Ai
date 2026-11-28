import { REWARD_CONFIG } from "../game/gameData";
import type { PurchaseClaim, PurchaseClaimStatus } from "../types/rewards";
import { API_BASE_URL, recordProductAffiliateClick } from "./api";
import { loadGameSave } from "./gameStorage";

export interface RewardsProvider {
  listClaims(): Promise<PurchaseClaim[]>;
  refresh(): Promise<void>;
}

interface ServerRewardEventDto {
  id: number;
  click_id: string;
  product_listing_id: number | null;
  status: PurchaseClaimStatus;
  coins: number;
  diamonds: number;
  created_at: string;
  confirmed_at: string | null;
  reversed_at: string | null;
}

interface ServerRewardsResponse {
  enabled: boolean;
  confirmed_coins: number;
  confirmed_diamonds: number;
  today_diamonds_granted: number;
  daily_diamond_cap: number;
  remaining_daily_diamonds: number;
  events: ServerRewardEventDto[];
}

export class ServerRewardsProvider implements RewardsProvider {
  private claims: PurchaseClaim[] = [];
  public statusMessage: string | null = null;
  public unavailable = false;

  async refresh(): Promise<void> {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/rewards/me`, {
        method: "GET",
        credentials: "include",
      });

      if (resp.status === 401) {
        this.unavailable = true;
        this.statusMessage =
          "Sign in to sync server-verified purchase rewards.";
        this.claims = [];
        return;
      }

      if (resp.status === 404 || !resp.ok) {
        this.unavailable = true;
        this.statusMessage = "Purchase confirmation is not available yet";
        this.claims = [];
        return;
      }

      const data = (await resp.json()) as ServerRewardsResponse;
      this.unavailable = false;
      this.statusMessage = null;
      this.claims = (data.events ?? []).map((ev) => ({
        id: `srv_${ev.id}_${ev.click_id}`,
        clickId: ev.click_id,
        productId: 0,
        listingId: ev.product_listing_id ?? undefined,
        retailerName: "Verified Partner",
        clickedAt: ev.created_at,
        status: ev.status,
        source: "server",
        coins: ev.coins,
        diamonds: ev.diamonds,
        confirmedAt: ev.confirmed_at,
        reversedAt: ev.reversed_at,
      }));
    } catch {
      this.unavailable = true;
      this.statusMessage = "Purchase confirmation is not available yet";
      this.claims = [];
    }
  }

  async listClaims(): Promise<PurchaseClaim[]> {
    return this.claims;
  }
}

export class DemoRewardsProvider implements RewardsProvider {
  private claims: PurchaseClaim[] = [];

  async refresh(): Promise<void> {
    const save = loadGameSave();
    this.claims = save.claims.filter((c) => c.source === "demo");
  }

  async listClaims(): Promise<PurchaseClaim[]> {
    await this.refresh();
    return this.claims;
  }

  createSimulatedConfirmation(params: {
    clickId: string;
    productId: number;
    listingId?: number;
    productName?: string;
    retailerName: string;
  }): PurchaseClaim {
    return {
      id: `demo_claim_${params.clickId}`,
      clickId: params.clickId,
      productId: params.productId,
      listingId: params.listingId,
      productName: params.productName,
      retailerName: params.retailerName,
      clickedAt: new Date().toISOString(),
      status: "confirmed",
      source: "demo",
      coins: REWARD_CONFIG.coinsPerPurchase,
      diamonds: REWARD_CONFIG.diamondsPerPurchase,
      confirmedAt: new Date().toISOString(),
    };
  }
}

export interface ProductBuyClickResult {
  clickId: string;
  targetUrl: string;
  serverTrackingReachable: boolean;
  notice: string;
}

/**
 * Reuses existing backend click logging without duplicating backend endpoints:
 * 1) Tries POST /api/affiliate/click if rewards flag is enabled on backend.
 * 2) Falls back to existing POST /api/women/products/{productId}/affiliate-click via lib/api.ts.
 * 3) Falls back cleanly to redirect_path on network error without ever self-granting diamonds.
 */
export async function trackProductBuyClick(params: {
  productId: number;
  listingId: number;
  redirectPath: string;
  destinationUrl: string;
  profileId?: number | null;
  referrerSection?: string;
}): Promise<ProductBuyClickResult> {
  const referrer = params.referrerSection ?? "nutrisense_run_quiz";
  const localClickId = `ns_clk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/affiliate/click`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_id: params.listingId,
        profile_id: params.profileId ?? null,
        referrer_section: referrer,
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        click_id: string;
        destination_url: string;
      };
      return {
        clickId: json.click_id,
        targetUrl: json.destination_url || params.destinationUrl,
        serverTrackingReachable: true,
        notice:
          "Thanks! We'll update your rewards if your purchase is confirmed. This can take time.",
      };
    }
  } catch {
    // Fall back to existing catalog click endpoint below
  }

  try {
    const info = await recordProductAffiliateClick(
      params.productId,
      params.listingId,
      referrer,
    );
    return {
      clickId: info.attribution_token || localClickId,
      targetUrl: info.destination_url || params.destinationUrl,
      serverTrackingReachable: true,
      notice:
        "Thanks! We'll update your rewards if your purchase is confirmed. This can take time.",
    };
  } catch {
    return {
      clickId: localClickId,
      targetUrl: params.destinationUrl || `${API_BASE_URL}${params.redirectPath}`,
      serverTrackingReachable: false,
      notice:
        "Thanks! We'll update your rewards if your purchase is confirmed. This can take time.",
    };
  }
}
