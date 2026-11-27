import { Filter, Leaf, Search } from "lucide-react";

interface GlobalFoodSearchProps {
  query: string;
  onQueryChange: (val: string) => void;
  country: "ALL" | "JP" | "IN";
  onCountryChange: (val: "ALL" | "JP" | "IN") => void;
  category: string;
  onCategoryChange: (val: string) => void;
  categories: string[];
  vegetarianOnly: boolean;
  onVegetarianOnlyChange: (val: boolean) => void;
}

export function GlobalFoodSearch({
  query,
  onQueryChange,
  country,
  onCountryChange,
  category,
  onCategoryChange,
  categories,
  vegetarianOnly,
  onVegetarianOnlyChange,
}: GlobalFoodSearchProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#121212] p-4">
      <div className="relative min-w-[230px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#A1A1AA]" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search rice, salmon, miso, firm tofu, seaweed, dal, paneer..."
          aria-label="Search global foods and ingredients"
          className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] py-2.5 pr-4 pl-10 text-xs text-white placeholder:text-zinc-500 focus:border-[#A3FF12]/60 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Country Pills */}
        <div className="flex rounded-xl border border-white/10 bg-[#0A0A0A] p-1">
          {(
            [
              { id: "JP", label: "Japan (MEXT)" },
              { id: "IN", label: "India (ICMR-NIN)" },
              { id: "ALL", label: "All Countries" },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCountryChange(c.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                country === c.id
                  ? "bg-[#A3FF12] text-[#050706]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Food Category Select */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0A0A0A] px-2.5 py-1.5">
          <Filter className="h-3.5 w-3.5 text-[#34D399]" />
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter by food category"
            className="bg-transparent text-xs font-semibold text-white focus:outline-none"
          >
            <option value="all" className="bg-[#121212]">
              All Categories
            </option>
            {categories.map((cat) => (
              <option key={cat} value={cat} className="bg-[#121212]">
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Vegetarian Filter */}
        <button
          type="button"
          onClick={() => onVegetarianOnlyChange(!vegetarianOnly)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
            vegetarianOnly
              ? "border-[#34D399]/60 bg-[#34D399]/18 text-[#34D399]"
              : "border-white/10 bg-[#0A0A0A] text-zinc-300 hover:border-white/25"
          }`}
        >
          <Leaf className="h-3.5 w-3.5" />
          <span>Vegetarian Only</span>
        </button>
      </div>
    </div>
  );
}
