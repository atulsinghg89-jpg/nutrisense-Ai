import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Droplet,
  ExternalLink,
  Flame,
  Flower2,
  Heart,
  Info,
  Layers,
  Loader2,
  Package,
  ShieldCheck,
  Sparkles,
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
  theme?: "dark" | "botanical";
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

const SUB_CATEGORY_LABELS: Record<string, string> = {
  all: "All Essentials",
  pads: "Sanitary Pads",
  pantyliners: "Pantyliners",
  period_underwear: "Period Underwear",
  menstrual_cups: "Menstrual Cups (Educational)",
  heating_pads: "Heating Pads & Warmth",
  bottles: "Hydration Bottles",
  mats_bands: "Mats & Resistance Bands",
  feeding: "Baby Feeding",
  monitoring: "Patient Monitoring",
};

const TIER_META: Record<
  ProductBudgetTier,
  {
    label: string;
    desc: string;
    darkBadge: string;
    botanicalBadge: string;
  }
> = {
  budget_friendly: {
    label: "Budget Friendly",
    desc: "Affordable everyday essentials with dependable quality",
    darkBadge: "border-[#34D399]/40 bg-[#34D399]/12 text-[#34D399]",
    botanicalBadge: "border-[#3d6b4f]/30 bg-[#eef5ef] text-[#2b5239]",
  },
  value_for_money: {
    label: "Value for Money",
    desc: "Balanced pricing, durability & practical features",
    darkBadge: "border-[#A3FF12]/40 bg-[#A3FF12]/12 text-[#A3FF12]",
    botanicalBadge: "border-[#c96a7e]/35 bg-[#fdf0f3] text-[#9b3d53]",
  },
  premium_quality: {
    label: "Premium Quality",
    desc: "Higher-end specs or reusable long-cycle designs",
    darkBadge: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    botanicalBadge: "border-[#8b6ba8]/35 bg-[#f5effa] text-[#5e4078]",
  },
};

function NeutralCategoryPlaceholder({
  product,
  botanical,
}: {
  product: ProductCatalogEntry;
  botanical: boolean;
}) {
  const sub = product.sub_category ?? "";
  const Icon =
    sub === "heating_pads"
      ? Flame
      : sub === "pads" || sub === "pantyliners"
        ? Flower2
        : sub === "period_underwear"
          ? Heart
          : sub === "menstrual_cups"
            ? Sparkles
            : Droplet;

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center p-5 text-center ${
        botanical
          ? "bg-gradient-to-br from-[#fdf1f4] via-[#f8effa] to-[#f4f7f2] text-[#4a3240]"
          : "bg-gradient-to-br from-[#161b18] via-[#121614] to-[#0a0d0b] text-zinc-200"
      }`}
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
          botanical
            ? "border-[#e6c5ce] bg-white/85 text-[#b54865] shadow-sm"
            : "border-white/10 bg-white/[0.04] text-rose-300"
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <p
        className={`mt-3 font-mono text-[10px] font-semibold uppercase tracking-wider ${
          botanical ? "text-[#9b445d]" : "text-rose-300"
        }`}
      >
        {product.brand} •{" "}
        {SUB_CATEGORY_LABELS[sub] ??
          CATEGORY_LABELS[product.category] ??
          product.category}
      </p>
      <p
        className={`mt-1 max-w-[230px] text-[11px] leading-snug ${
          botanical ? "text-[#6f5762]" : "text-zinc-400"
        }`}
      >
        {product.image_caption ||
          "Inspect official packaging details directly on the verified storefront."}
      </p>
    </div>
  );
}

export function RecommendedProductsHub({
  defaultCategory = "all",
  defaultAudience = "all",
  title = "Curated Wellness Essentials",
  subtitle = "Transparent comparison across Budget Friendly, Value for Money, and Premium Quality tiers from one centralized catalog.",
  referrerSection = "catalog",
  compact = false,
  theme = "dark",
}: RecommendedProductsHubProps) {
  const isBotanical = theme === "botanical";
  const [selectedCategory, setSelectedCategory] = useState<
    ProductCategoryId | "all"
  >(defaultCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [selectedAudience, setSelectedAudience] = useState<string>(defaultAudience);
  const [tierView, setTierView] = useState<"all" | ProductBudgetTier>("all");
  const [products, setProducts] = useState<ProductCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCategory(defaultCategory);
    setSelectedSubCategory("all");
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

  const availableSubCategories = useMemo(() => {
    const subs = new Set<string>();
    for (const p of products) {
      if (p.sub_category) subs.add(p.sub_category);
    }
    return ["all", ...Array.from(subs)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (tierView !== "all" && p.budget_tier !== tierView) return false;
      if (selectedSubCategory !== "all" && p.sub_category !== selectedSubCategory) {
        return false;
      }
      return true;
    });
  }, [products, tierView, selectedSubCategory]);

  const anyAffiliateActive = useMemo(
    () => products.some((p) => p.listings.some((l) => l.is_affiliate)),
    [products],
  );

  return (
    <section
      className={`rounded-3xl border p-5 sm:p-7 ${
        isBotanical
          ? "border-[#edd2da] bg-[#fffaf8] text-[#3a2631] shadow-[0_12px_36px_-18px_rgba(176,84,114,0.18)]"
          : "border-white/[0.09] bg-[#101411] text-white"
      }`}
    >
      <div
        className={`flex flex-wrap items-start justify-between gap-4 border-b pb-5 ${
          isBotanical ? "border-[#f0dce2]" : "border-white/[0.08]"
        }`}
      >
        <div className="max-w-2xl">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
              isBotanical
                ? "border-[#e5bac6] bg-[#fdf0f4] text-[#9b3d57]"
                : "border-rose-300/35 bg-rose-400/10 text-rose-200"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Centralized NutriSense Product Catalog
          </span>
          <h3
            className={`mt-2.5 font-display text-2xl font-extrabold ${
              isBotanical ? "text-[#2d1a24]" : "text-white"
            }`}
          >
            {title}
          </h3>
          <p
            className={`mt-1 text-xs leading-relaxed sm:text-sm ${
              isBotanical ? "text-[#6c525f]" : "text-[#A1A1AA]"
            }`}
          >
            {subtitle}
          </p>
        </div>

        {/* Honest Transparent Commercial / Affiliate Disclosure Banner */}
        <div
          className={`max-w-sm rounded-2xl border p-3.5 text-[11px] ${
            isBotanical
              ? "border-[#ebd4dc] bg-[#fff4f6] text-[#4b3440]"
              : "border-white/10 bg-[#070A08] text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold">
            <Info
              className={`h-3.5 w-3.5 ${
                isBotanical ? "text-[#3f6f52]" : "text-[#34D399]"
              }`}
            />
            <span>
              {anyAffiliateActive
                ? "Affiliate Disclosure Active"
                : "Transparent Retailer Disclosure"}
            </span>
          </div>
          <p
            className={`mt-1 leading-relaxed ${
              isBotanical ? "text-[#6f5762]" : "text-zinc-400"
            }`}
          >
            {anyAffiliateActive
              ? "Links marked 'Affiliate' may earn NutriSense AI a commission at no extra cost to you. Non-affiliate links are clearly distinguished and medical advice is never ranked by commission."
              : "Direct official brand/storefront links shown below are non-affiliate references (no affiliate commission is active). Live prices are inspected directly on the store."}
          </p>
        </div>
      </div>

      {/* Category & Audience Toolbar (Full Directory Mode) */}
      {!compact && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              Object.keys(CATEGORY_LABELS) as (ProductCategoryId | "all")[]
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedSubCategory("all");
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? isBotanical
                      ? "bg-[#9b3d57] text-white"
                      : "bg-[#A3FF12] text-[#050706]"
                    : isBotanical
                      ? "border border-[#ebd4dc] bg-white text-[#5d4250] hover:bg-[#fdf3f6]"
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
              className={`rounded-xl border px-3 py-1.5 text-xs ${
                isBotanical
                  ? "border-[#e5c9d2] bg-white text-[#3a2631]"
                  : "border-white/10 bg-[#070A08] text-white"
              }`}
            >
              <option value="all">All Audiences</option>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="babies">Babies</option>
              <option value="patients">Patients</option>
            </select>
          </div>
        </div>
      )}

      {/* Sub-category + Tier Filters */}
      <div className="mt-4 space-y-2.5">
        {availableSubCategories.length > 2 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {availableSubCategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubCategory(sub)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedSubCategory === sub
                    ? isBotanical
                      ? "bg-[#3f6f52] text-white"
                      : "bg-white/20 text-white"
                    : isBotanical
                      ? "border border-[#e7cfd6] bg-white text-[#644a57] hover:bg-[#fdf4f6]"
                      : "border border-white/10 bg-[#070A08] text-zinc-400 hover:text-white"
                }`}
              >
                {SUB_CATEGORY_LABELS[sub] ?? sub}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTierView("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                tierView === "all"
                  ? isBotanical
                    ? "bg-[#9b3d57] text-white"
                    : "bg-rose-300 text-[#050706]"
                  : isBotanical
                    ? "border border-[#ebd4dc] bg-white text-[#644a57]"
                    : "border border-white/10 bg-[#070A08] text-zinc-400"
              }`}
            >
              Compare All Tiers
            </button>
            {(
              [
                "budget_friendly",
                "value_for_money",
                "premium_quality",
              ] as ProductBudgetTier[]
            ).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierView(tier)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  tierView === tier
                    ? isBotanical
                      ? "bg-[#9b3d57] text-white"
                      : "bg-rose-300 text-[#050706]"
                    : isBotanical
                      ? "border border-[#ebd4dc] bg-white text-[#644a57] hover:bg-[#fdf4f6]"
                      : "border border-white/10 bg-[#070A08] text-zinc-400 hover:text-white"
                }`}
              >
                {TIER_META[tier].label}
              </button>
            ))}
          </div>

          <span
            className={`flex items-center gap-1 text-[11px] ${
              isBotanical ? "text-[#5f4753]" : "text-zinc-400"
            }`}
          >
            <Layers
              className={`h-3.5 w-3.5 ${
                isBotanical ? "text-[#3f6f52]" : "text-[#34D399]"
              }`}
            />
            Affordable essentials stand equal — expensive never means mandatory
          </span>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div
          className={`mt-6 flex items-center justify-center gap-2 py-12 text-xs ${
            isBotanical ? "text-[#6f5762]" : "text-zinc-400"
          }`}
        >
          <Loader2
            className={`h-4 w-4 animate-spin ${
              isBotanical ? "text-[#9b3d57]" : "text-[#A3FF12]"
            }`}
          />
          <span>Loading centralized catalog...</span>
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700">
          {error}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div
          className={`mt-6 rounded-2xl border border-dashed p-8 text-center text-xs ${
            isBotanical
              ? "border-[#e6c5ce] text-[#6f5762]"
              : "border-white/15 text-zinc-400"
          }`}
        >
          No catalog entries match the selected category and tier filter yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const tierInfo =
              TIER_META[product.budget_tier] ?? TIER_META.value_for_money;
            const hasVerifiedImg = Boolean(
              product.has_verified_image && product.image_path,
            );

            return (
              <article
                key={product.id}
                className={`flex flex-col justify-between overflow-hidden rounded-3xl border transition ${
                  isBotanical
                    ? "border-[#ebd4dc] bg-white hover:border-[#d68c9e] shadow-[0_8px_24px_-16px_rgba(140,60,90,0.25)]"
                    : "border-white/[0.09] bg-[#080B09] hover:border-rose-300/35"
                }`}
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    {hasVerifiedImg ? (
                      <>
                        <img
                          src={product.image_path}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />
                      </>
                    ) : (
                      <NeutralCategoryPlaceholder
                        product={product}
                        botanical={isBotanical}
                      />
                    )}

                    <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-md ${
                          isBotanical
                            ? tierInfo.botanicalBadge
                            : tierInfo.darkBadge
                        }`}
                      >
                        {tierInfo.label}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium backdrop-blur-md ${
                          isBotanical
                            ? "border-[#e6c5ce] bg-white/90 text-[#5d4250]"
                            : "border-white/15 bg-black/65 text-zinc-300"
                        }`}
                      >
                        {SUB_CATEGORY_LABELS[product.sub_category ?? ""] ??
                          CATEGORY_LABELS[product.category] ??
                          product.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${
                          isBotanical ? "text-[#9b3d57]" : "text-rose-300"
                        }`}
                      >
                        {product.brand}
                      </span>
                    </div>

                    <h4
                      className={`mt-1 font-display text-base font-bold ${
                        isBotanical ? "text-[#2d1a24]" : "text-white"
                      }`}
                    >
                      {product.name}
                    </h4>

                    {product.variant_label && (
                      <p
                        className={`mt-0.5 text-[11px] font-medium ${
                          isBotanical ? "text-[#7a5d69]" : "text-zinc-400"
                        }`}
                      >
                        {product.variant_label}
                      </p>
                    )}

                    <ul
                      className={`mt-3 space-y-1.5 text-xs ${
                        isBotanical ? "text-[#4f3944]" : "text-zinc-300"
                      }`}
                    >
                      {product.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-1.5">
                          <CheckCircle2
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                              isBotanical ? "text-[#3f6f52]" : "text-[#34D399]"
                            }`}
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <p
                      className={`mt-3 rounded-xl border p-2.5 text-[11px] leading-snug ${
                        isBotanical
                          ? "border-[#f1dde3] bg-[#fff8fa] text-[#664e5a]"
                          : "border-white/[0.06] bg-white/[0.02] text-zinc-400"
                      }`}
                    >
                      <strong
                        className={isBotanical ? "text-[#3a2631]" : "text-zinc-200"}
                      >
                        Comfort & Safety Note:
                      </strong>{" "}
                      {product.quality_notes}
                    </p>
                  </div>
                </div>

                {/* Retailer Links & Live Price Honesty */}
                <div
                  className={`space-y-2 border-t p-4 ${
                    isBotanical
                      ? "border-[#f0dce2] bg-[#fff8fa]"
                      : "border-white/[0.07] bg-[#0B0F0C]"
                  }`}
                >
                  <p
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                      isBotanical ? "text-[#6f5762]" : "text-zinc-400"
                    }`}
                  >
                    <Tag
                      className={`h-3 w-3 ${
                        isBotanical ? "text-[#9b3d57]" : "text-[#A3FF12]"
                      }`}
                    />
                    Official Storefronts &amp; Disclosures
                  </p>

                  {product.listings.map((listing) => (
                    <div
                      key={listing.listing_id}
                      className={`space-y-2 rounded-2xl border p-3 text-xs ${
                        isBotanical
                          ? "border-[#ebd4dc] bg-white"
                          : "border-white/[0.08] bg-[#070A08]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`font-bold ${
                                isBotanical ? "text-[#2d1a24]" : "text-white"
                              }`}
                            >
                              {listing.retailer_name}
                            </span>
                            {listing.is_affiliate ? (
                              <span className="rounded-full border border-amber-400/50 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                Affiliate
                              </span>
                            ) : (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                  isBotanical
                                    ? "border-[#cde2d4] bg-[#eef6f1] text-[#2f5d40]"
                                    : "border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]"
                                }`}
                              >
                                Direct Official Link
                              </span>
                            )}
                          </div>
                          <p
                            className={`mt-0.5 font-mono text-[11px] font-semibold ${
                              isBotanical ? "text-[#9b3d57]" : "text-[#A3FF12]"
                            }`}
                          >
                            {listing.price_display}
                          </p>
                          <p
                            className={`mt-0.5 text-[10px] ${
                              isBotanical ? "text-[#7a5d69]" : "text-zinc-400"
                            }`}
                          >
                            {listing.availability}
                            {listing.source_provenance
                              ? ` • ${listing.source_provenance}`
                              : ""}
                          </p>
                        </div>

                        <a
                          href={`${API_BASE_URL}${listing.redirect_path}?referrer=${encodeURIComponent(
                            referrerSection,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold transition ${
                            isBotanical
                              ? "bg-[#9b3d57] text-white hover:bg-[#842f48]"
                              : "bg-[#A3FF12] text-[#050706] hover:bg-[#b8ff42]"
                          }`}
                        >
                          <span>View Store</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <p
                        className={`flex items-start gap-1 text-[10px] ${
                          isBotanical ? "text-[#7a5d69]" : "text-zinc-400"
                        }`}
                      >
                        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
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
