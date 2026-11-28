import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Gem, Info, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, fetchRecommendedProducts } from "../../lib/api";
import { REWARD_CONFIG } from "../../game/gameData";
import { trackProductBuyClick } from "../../lib/rewardsApi";
import type { ProductCatalogEntry, ProductCategoryId } from "../../types/nutrition";
import type { PurchaseClaim } from "../../types/rewards";

interface ProductSuggestionProps {
  category?: ProductCategoryId;
  subCategory?: string;
  title?: string;
  isMedicalExclusion?: boolean;
  onClaimRecorded?: (claim: PurchaseClaim) => void;
  onGoToCatalog?: () => void;
}

const EXCLUDED_CATEGORIES = new Set<ProductCategoryId>(["baby_care", "patient_care"]);

function computeProfileAgeYears(
  ageYears?: number | null,
  dob?: string | null,
  profileType?: string,
): number | null {
  if (profileType === "baby") return 0;
  if (typeof ageYears === "number" && !Number.isNaN(ageYears)) return ageYears;
  if (dob) {
    const parsed = new Date(dob);
    if (!Number.isNaN(parsed.getTime())) {
      const now = new Date();
      let years = now.getFullYear() - parsed.getFullYear();
      const monthDiff = now.getMonth() - parsed.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.getDate())) {
        years -= 1;
      }
      return Math.max(0, years);
    }
  }
  return null;
}

export function ProductSuggestion({
  category = "women_period_care",
  subCategory,
  title = "Practical Essentials Across Budgets",
  isMedicalExclusion = false,
  onClaimRecorded,
  onGoToCatalog,
}: ProductSuggestionProps) {
  const { activeProfile } = useAuth();
  const [products, setProducts] = useState<ProductCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clickNotice, setClickNotice] = useState<string | null>(null);

  const profileAge = useMemo(
    () =>
      computeProfileAgeYears(
        activeProfile?.age_years,
        activeProfile?.date_of_birth,
        activeProfile?.profile_type,
      ),
    [activeProfile],
  );
  const isUnder18 = profileAge !== null && profileAge < 18;
  const ageUnknown = profileAge === null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchRecommendedProducts({
      category,
      sub_category: subCategory,
    })
      .then((rows) => {
        if (active) setProducts(rows);
      })
      .catch(() => {
        if (active) {
          setError("Could not reach the catalog server right now.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, subCategory]);

  // Order cleanly to showcase both affordable (budget/value) & higher-tier (premium) options side by side
  const featuredProducts = useMemo(() => {
    const tierOrder = {
      budget_friendly: 1,
      value_for_money: 2,
      premium_quality: 3,
    } as const;
    const sorted = [...products].sort(
      (a, b) => (tierOrder[a.budget_tier] ?? 2) - (tierOrder[b.budget_tier] ?? 2),
    );
    if (sorted.length <= 2) return sorted;
    return [sorted[0], sorted[sorted.length - 1]];
  }, [products]);

  const handleBuyClick = async (
    product: ProductCatalogEntry,
    listingId: number,
    retailerName: string,
    redirectPath: string,
    destinationUrl: string,
  ) => {
    const result = await trackProductBuyClick({
      productId: product.id,
      listingId,
      redirectPath,
      destinationUrl,
      profileId: activeProfile?.id ?? null,
      referrerSection: "nutrisense_run_suggestion",
    });

    setClickNotice(result.notice);

    if (onClaimRecorded) {
      onClaimRecorded({
        id: `clk_${result.clickId}`,
        clickId: result.clickId,
        productId: product.id,
        listingId,
        productName: product.name,
        retailerName,
        clickedAt: new Date().toISOString(),
        status: "clicked",
        source: "server",
        coins: 0,
        diamonds: 0,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 text-xs text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin text-[#A3FF12]" />
        <span>Loading verified product suggestions...</span>
      </div>
    );
  }

  if (error || featuredProducts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 text-xs text-zinc-300">
        <p>{error || "Browse affordable and premium wellness essentials in our catalog."}</p>
        {onGoToCatalog && (
          <button
            type="button"
            onClick={onGoToCatalog}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-[#A3FF12]/40 bg-[#A3FF12]/10 px-3 py-1.5 text-xs font-bold text-[#A3FF12] transition hover:bg-[#A3FF12]/20"
          >
            <span>Open Product Catalog</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  const categoryExcluded =
    isMedicalExclusion ||
    EXCLUDED_CATEGORIES.has(category) ||
    featuredProducts.some((p) => EXCLUDED_CATEGORIES.has(p.category));
  const hideRewardsCompletely = isUnder18 || categoryExcluded;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0A0D0B] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display text-sm font-bold text-white">{title}</h4>
        <span className="rounded-full border border-white/15 bg-[#121212] px-2.5 py-0.5 text-[10px] font-medium text-zinc-300">
          Affordable &amp; Premium Choices
        </span>
      </div>

      {/* Reward & Affiliate Disclosures (Ethical, Non-Pressured, Hidden for <18 or Medical/Baby/Patient) */}
      {!hideRewardsCompletely && (
        <div className="space-y-1.5 rounded-xl border border-[#34D399]/25 bg-[#101613] px-3 py-2.5 text-[11px] leading-relaxed text-zinc-200">
          {!ageUnknown ? (
            <p className="flex items-start gap-1.5 text-[#A3FF12]">
              <Gem className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
              <span>
                Bonus: earn 💎 +{REWARD_CONFIG.coinsPerPurchase} coins when your
                purchase is confirmed. Cancelled or returned orders are reversed.
              </span>
            </p>
          ) : (
            <p className="flex items-start gap-1.5 text-zinc-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34D399]" />
              <span>
                Optional store links for adults (18+). Sign in with an adult profile to link verified order confirmations.
              </span>
            </p>
          )}
          <p className="flex items-start gap-1.5 text-[10px] text-zinc-400">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-zinc-400" />
            <span>
              We may earn a commission; ranking is not influenced by commission. Purchases are strictly optional.
            </span>
          </p>
        </div>
      )}

      {clickNotice && !hideRewardsCompletely && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-xl border border-sky-300/35 bg-sky-400/10 px-3 py-2 text-xs text-sky-200"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
          <span>{clickNotice}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {featuredProducts.map((product) => {
          const listing = product.listings[0];
          const tierLabel =
            product.budget_tier === "budget_friendly"
              ? "Budget Friendly"
              : product.budget_tier === "premium_quality"
                ? "Premium Quality"
                : "Value for Money";
          const outboundUrl = listing
            ? `${API_BASE_URL}${listing.redirect_path}?referrer=nutrisense_run`
            : "#";

          return (
            <div
              key={product.id}
              className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#121614] p-3.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#34D399]">
                    {product.brand}
                  </span>
                  <span className="rounded-full border border-white/15 bg-[#0A0A0A] px-2 py-0.5 text-[10px] font-semibold text-zinc-200">
                    {tierLabel}
                  </span>
                </div>
                <p className="mt-1.5 font-display text-sm font-bold text-white">
                  {product.name}
                </p>
                {product.variant_label && (
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    {product.variant_label}
                  </p>
                )}
              </div>

              {listing && (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-zinc-200">
                      {listing.retailer_name}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">
                      {listing.price_display}
                    </p>
                  </div>

                  {!isUnder18 ? (
                    <a
                      href={outboundUrl}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      onClick={() =>
                        void handleBuyClick(
                          product,
                          listing.listing_id,
                          listing.retailer_name,
                          listing.redirect_path,
                          listing.destination_url,
                        )
                      }
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#A3FF12] px-3 py-1.5 text-[11px] font-bold text-[#050706] transition hover:bg-[#b8ff42]"
                    >
                      <span>View Store</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] text-zinc-400">
                      Adult purchase only
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
