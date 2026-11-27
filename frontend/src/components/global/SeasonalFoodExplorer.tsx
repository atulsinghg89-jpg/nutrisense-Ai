import { useEffect, useState } from "react";
import {
  Calendar,
  Info,
  Leaf,
  Loader2,
  MapPin,
  Sparkles,
  Sun,
} from "lucide-react";
import { fetchSeasonalFoods } from "../../lib/api";
import type { SeasonalFoodRecord } from "../../types/nutrition";

const SEASONS = [
  { id: "spring", label: "Spring" },
  { id: "summer", label: "Summer" },
  { id: "autumn", label: "Autumn" },
  { id: "winter", label: "Winter" },
  { id: "all", label: "All Seasons" },
] as const;

export function SeasonalFoodExplorer() {
  const [country, setCountry] = useState<"ALL" | "JP" | "IN">("ALL");
  const [season, setSeason] = useState<string>("all");
  const [vegetarianOnly, setVegetarianOnly] = useState(false);
  const [items, setItems] = useState<SeasonalFoodRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchSeasonalFoods({
      country: country === "ALL" ? undefined : country,
      season: season === "all" ? undefined : season,
      vegetarian_only: vegetarianOnly,
    })
      .then((res) => {
        if (active) setItems(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [country, season, vegetarianOnly]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/[0.08] bg-[#121212] p-6 sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-3 py-1 text-xs font-semibold text-[#34D399]">
          <Sun className="h-3.5 w-3.5" />
          Seasonal Culinary Rhythm • India &amp; Japan Separately
        </span>
        <h2 className="mt-3 font-display text-2xl font-extrabold text-white sm:text-3xl">
          Seasonal Food &amp; Recipe Intelligence
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-[#A1A1AA]">
          Discover seasonal vegetables, fruits, and sustainable harvests across Spring, Summer,
          Autumn, and Winter. All regional windows are labeled clearly — we never fabricate live
          supermarket availability or crop prices.
        </p>

        {/* Controls */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {SEASONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeason(s.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  season === s.id
                    ? "bg-[#A3FF12] text-[#050706]"
                    : "border border-white/10 bg-[#0A0A0A] text-zinc-300 hover:border-white/25"
                }`}
              >
                <Calendar className="h-3 w-3" />
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "JP", "IN"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCountry(c)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                  country === c
                    ? "bg-[#34D399] text-[#050706]"
                    : "border border-white/10 bg-[#0A0A0A] text-zinc-300"
                }`}
              >
                {c === "ALL" ? "India + Japan" : c === "JP" ? "Japan Only" : "India Only"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setVegetarianOnly((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                vegetarianOnly
                  ? "border-[#34D399]/60 bg-[#34D399]/18 text-[#34D399]"
                  : "border-white/10 bg-[#0A0A0A] text-zinc-300"
              }`}
            >
              <Leaf className="h-3.5 w-3.5" /> Vegetarian
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#A1A1AA]">
          <Loader2 className="h-4 w-4 animate-spin text-[#A3FF12]" />
          <span>Loading seasonal harvest profiles...</span>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121212]"
            >
              <div>
                {item.has_verified_image && item.image_path ? (
                  <img
                    src={item.image_path}
                    alt={item.name}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-36 w-full flex-col items-center justify-center border-b border-white/[0.06] bg-gradient-to-br from-[#171D18] via-[#111512] to-[#080B09] p-4 text-center">
                    <Sparkles className="h-6 w-6 text-[#34D399]" />
                    <span className="mt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#A3FF12]">
                      {item.country_code === "JP" ? "Japan" : "India"} • {item.season}
                    </span>
                    <span className="text-[11px] text-[#A1A1AA]">{item.food_group}</span>
                  </div>
                )}

                <div className="space-y-3 p-5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#34D399]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#34D399]">
                      {item.country_code === "JP" ? "Japan" : "India"} • {item.season}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {item.verification_status === "verified_seasonal_reference"
                        ? "Seasonal Reference"
                        : "Regional Estimate"}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold text-white">{item.name}</h3>
                  <p className="leading-relaxed text-zinc-300">{item.nutritional_highlights}</p>

                  <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-3">
                    <p className="font-bold text-[#A3FF12]">Seasonal Preparation Idea</p>
                    <p className="mt-1 text-zinc-300">{item.seasonal_recipe_idea}</p>
                  </div>

                  <p className="text-[11px] text-emerald-300">
                    <strong>Indian Pairing / Swap:</strong> {item.paired_indian_alternative}
                  </p>
                </div>
              </div>

              <div className="space-y-1 border-t border-white/[0.07] bg-[#0A0A0A] p-4 text-[10px] text-zinc-400">
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#34D399]" />
                  <span>{item.regional_availability_note}</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <Info className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
                  <span>{item.data_source}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
