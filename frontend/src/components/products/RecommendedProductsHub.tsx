import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Info,
  Layers,
  Loader2,
  Package,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { API_BASE_URL, fetchRecommendedProducts } from "../../lib/api";
import type {
  ProductBudgetTier,
  ProductCatalogEntry,
  ProductCategoryId,
} from "../../types/nutrition";

interface RecommendedProductsHubProps {
  defaultCategory?: ProductCategoryId | "all";
  defaultAudience?: string | "all";
  title?: string;
  subtitle?: string;
  referrerSection?: string;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<ProductCategoryId | "all", string> = {
  all: "All Wellness Essentials",
  women_period_care: "Women's Period Care",
  hydration_products: "Hydration Products",
  fitness_accessories: "Fitness Accessories",
  nutrition_products: "Nutrition Staples",
  baby_care: "Baby Care",
  patient_care: "Patient Care",
};

const TIER_META: Record<
  ProductBudgetTier,
  { label: string; desc: string; badgeClass: string }
> = {
  budget_friendly: {
    label: "Budget Friendly",
    desc: "Affordable everyday essentials with dependable quality",
    badgeClass: "border-[#34D399]/40 bg-[#34D399]/12 text-[#34D399]",
  },
  value_for_money: {
    label: "Value for Money",
    desc: "Balanced pricing, durability & practical features",
    badgeClass: "border-[#A3FF12]/40 bg-[#A3FF12]/12 text-[#A3FF12]",
  },
  premium_quality: {
    label: "Premium Quality",
    desc: "Higher-end specs or reusable long-cycle designs",
    badgeClass: "border-rose-300/40 bg-rose-400/12 text-rose-200",
  },
};

export function RecommendedProductsHub({
  defaultCategory = "all",
  defaultAudience = "all",
  title = "Curated Wellness Essentials",
  subtitle = "Transparent comparison across Budget Friendly, Value for Money, and Premium Quality tiers from one centralized catalog.",
  referrerSection = "catalog",
  compact = false,
}: RecommendedProductsHubProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    ProductCategoryId | "all"
  >(defaultCategory);
  const [selectedAudience, setSelectedAudience] = useState<string>(defaultAudience);
  const [tierView, setTierView] = useState<"all" | ProductBudgetTier>("all");
  const [products, setProducts] = useState<ProductCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCategory(defaultCategory);
  }, [defaultCategory]);

  useEffect(() => {
    setSelectedAudience(defaultAudience);
  }, [defaultAudience]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchRecommendedProducts({
      category: selectedCategory === "all" ? undefined : selectedCategory,
      audience: selectedAudience === "all" ? undefined : selectedAudience,
    })
      .then((res) => {
        if (active) setProducts(res);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load curated products catalog.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCategory, selectedAudience]);

  const filteredProducts = useMemo(() => {
    if (tierView === "all") return products;
    return products.filter((p) => p.budget_tier === tierView);
  }, [products, tierView]);

  const anyAffiliateActive = useMemo(
    () => products.some((p) => p.listings.some((l) => l.is_affiliate)),
    [products],
  );

  return (
    <section className="rounded-3xl border border-white/[0.09] bg-[#101411] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/35 bg-rose-400/10 px-3 py-1 text-[11px] font-semibold text-rose-200">
            <Package className="h-3.5 w-3.5" />
            Centralized NutriSense Product Catalog
          </span>
          <h3 className="mt-2.5 font-display text-2xl font-extrabold text-white">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA] sm:text-sm">
            {subtitle}
          </p>
        </div>

        {/* Honest Transparent Commercial / Affiliate Disclosure Banner */}
        <div className="max-w-sm rounded-2xl border border-white/10 bg-[#070A08] p-3.5 text-[11px] text-zinc-300">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Info className="h-3.5 w-3.5 text-[#34D399]" />
            <span>
              {anyAffiliateActive
                ? "Affiliate Disclosure Active"
                : "Transparent Retailer Disclosure"}
            </span>
          </div>
          <p className="mt-1 leading-relaxed text-zinc-400">
            {anyAffiliateActive
              ? "Links marked 'Affiliate' may earn NutriSense AI a commission at no extra cost to you. Non-affiliate links are clearly distinguished and medical recommendations are never ranked by commission."
              : "Direct official brand/retailer links shown below are non-affiliate references (no commission is active). Affordable options are never excluded."}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      {!compact && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              Object.keys(CATEGORY_LABELS) as (ProductCategoryId | "all")[]
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? "bg-[#A3FF12] text-[#050706]"
                    : "border border-white/10 bg-[#070A08] text-zinc-400 hover:text-white"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedAudience}
              onChange={(e) => setSelectedAudience(e.target.value)}
              aria-label="Filter products by audience"
              className="rounded-xl border border-white/10 bg-[#070A08] px-3 py-1.5 text-xs text-white"
            >
              <option value="all">All Audiences</option>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="babies">Babies</option>
              <option value="patients">Patients</option>
            </select>

            <div className="flex rounded-xl border border-white/10 bg-[#070A08] p-1">
              <button
                type="button"
                onClick={() => setTierView("all")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  tierView === "all"
                    ? "bg-white/15 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                All Tiers
              </button>
              {(
                ["budget_friendly", "value_for_money", "premium_quality"] as ProductBudgetTier[]
              ).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setTierView(tier)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                    tierView === tier
                      ? "bg-[#A3FF12] text-[#050706]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {TIER_META[tier].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {compact && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTierView("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                tierView === "all"
                  ? "bg-rose-300 text-[#050706]"
                  : "border border-white/10 bg-[#070A08] text-zinc-400"
              }`}
            >
              Compare All Tiers
            </button>
            {(
              ["budget_friendly", "value_for_money", "premium_quality"] as ProductBudgetTier[]
            ).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierView(tier)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  tierView === tier
                    ? "bg-rose-300 text-[#050706]"
                    : "border border-white/10 bg-[#070A08] text-zinc-400 hover:text-white"
                }`}
              >
                {TIER_META[tier].label}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-1 text-[11px] text-zinc-400">
            <Layers className="h-3.5 w-3.5 text-[#34D399]" />
            Expensive products are never assumed better automatically
          </span>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-2 py-12 text-xs text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-[#A3FF12]" />
          <span>Loading verified products catalog...</span>
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
          {error}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-8 text-center text-xs text-zinc-400">
          No catalog entries match the selected category and tier filter yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const tierInfo =
              TIER_META[product.budget_tier] ?? TIER_META.value_for_money;

            return (
              <article
                key={product.id}
                className="flex flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.09] bg-[#080B09] transition hover:border-rose-300/35"
              >
                <div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#121613]">
                    <img
                      src={product.image_path}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080B09] via-transparent to-black/35" />

                    <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-md ${tierInfo.badgeClass}`}
                      >
                        {tierInfo.label}
                      </span>
                      <span className="rounded-full border border-white/15 bg-black/65 px-2.5 py-0.5 text-[10px] font-medium text-zinc-300 backdrop-blur-md">
                        {CATEGORY_LABELS[product.category] ?? product.category}
                      </span>
                    </div>

                    <p className="absolute right-3 bottom-2 left-3 text-[10px] text-zinc-300/85">
                      {product.image_caption}
                    </p>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                        {product.brand}
                      </span>
                    </div>

                    <h4 className="mt-1 font-display text-base font-bold text-white">
                      {product.name}
                    </h4>

                    <ul className="mt-3 space-y-1.5 text-xs text-zinc-300">
                      {product.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-[11px] leading-snug text-zinc-400">
                      <strong className="text-zinc-200">Quality Note:</strong>{" "}
                      {product.quality_notes}
                    </p>
                  </div>
                </div>

                {/* Verified Retailer Comparison Rows */}
                <div className="space-y-2 border-t border-white/[0.07] bg-[#0B0F0C] p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <Tag className="h-3 w-3 text-[#A3FF12]" />
                    Compare Retailers &amp; Availability
                  </p>

                  {product.listings.map((listing) => (
                    <div
                      key={listing.listing_id}
                      className="space-y-2 rounded-2xl border border-white/[0.08] bg-[#070A08] p-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-white">
                              {listing.retailer_name}
                            </span>
                            {listing.is_affiliate ? (
                              <span className="rounded-full border border-amber-400/50 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                                Affiliate
                              </span>
                            ) : (
                              <span className="rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-2 py-0.5 text-[10px] font-semibold text-[#34D399]">
                                Direct Link (Non-Affiliate)
                              </span>
                            )}
                            {listing.is_sponsored && (
                              <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-zinc-300">
                                Sponsored
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-[#A3FF12]">
                            {listing.price_display}
                          </p>
                          <p className="mt-0.5 text-[10px] text-zinc-400">
                            {listing.availability} • Checked {listing.last_checked_at}
                          </p>
                        </div>

                        <a
                          href={`${API_BASE_URL}${listing.redirect_path}?referrer=${encodeURIComponent(
                            referrerSection,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#A3FF12] px-3 py-2 text-[11px] font-bold text-[#050706] transition hover:bg-[#b8ff42]"
                        >
                          <span>Buy Now</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <p className="flex items-start gap-1 text-[10px] text-zinc-400">
                        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
                        <span>
                          {listing.is_affiliate
                            ? "Affiliate: NutriSense AI may earn a commission if you purchase through this link."
                            : listing.disclosure_text}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
