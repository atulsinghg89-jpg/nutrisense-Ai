export type DoshaId = "vata" | "pitta" | "kapha";

export type DoshaFoodCategoryKey =
  | "grains"
  | "fruits"
  | "vegetables"
  | "pulses"
  | "dairy"
  | "spices"
  | "meals";

export interface DoshaFoodExample {
  name: string;
  preparationNote: string;
  indianFoodsMatchId?: string;
}

export interface DoshaFoodCategoryGroup {
  key: DoshaFoodCategoryKey;
  label: string;
  favouredTrait: string;
  examples: DoshaFoodExample[];
}

export interface DoshaLifestylePillar {
  title: string;
  perspective: string;
}

export interface DoshaThemeTokens {
  accentHex: string;
  secondaryHex: string;
  badgeClasses: string;
  borderHoverClasses: string;
  glowStyle: string;
  buttonClasses: string;
  chipClasses: string;
}

export interface DoshaProfileData {
  id: DoshaId;
  name: string;
  chapterNumber: string;
  rhythmTitle: string;
  subtitle: string;
  elementsLabel: string;
  elements: [string, string];
  coverImage: string;
  coverAlt: string;
  coverObjectPosition: string;
  ctaLabel: string;
  shortIntro: string;
  detailedIntro: string;
  qualities: string[];
  favouredQualities: string[];
  tastes: string[];
  miniChart: {
    label: string;
    value: string;
  }[];
  examplePreviewChips: string[];
  foodPerspectiveSummary: string;
  foodCategories: DoshaFoodCategoryGroup[];
  lifestylePillars: DoshaLifestylePillar[];
  theme: DoshaThemeTokens;
}

export const DOSHA_DISCLAIMER_TEXT =
  "Vata, Pitta and Kapha are traditional Ayurvedic concepts. They are not scientifically validated body classifications or diagnostic tools. Food guidance presented here is educational and does not replace evidence-based nutrition advice or professional healthcare.";

export const DOSHA_PROFILES: DoshaProfileData[] = [
  {
    id: "vata",
    name: "Vata",
    chapterNumber: "01",
    rhythmTitle: "The Rhythm of Movement",
    subtitle: "Associated with movement, adaptability, circulation, and shifting natural rhythms.",
    elementsLabel: "Air + Space",
    elements: ["Air", "Space"],
    coverImage: "/images/dosha-vata.jpg",
    coverAlt: "Vata Rhythm of Movement editorial fitness cover image",
    coverObjectPosition: "object-[center_20%]",
    ctaLabel: "Explore Vata",
    shortIntro:
      "Within traditional Ayurveda, Vata embodies air and space — expressing light, changeable energy, curiosity, and natural kinetic flow.",
    detailedIntro:
      "In classical Ayurvedic philosophy, Vata represents the subtle principle of motion across breath, nervous signaling, creativity, and adaptability. Because Air and Space naturally carry cool, dry, and mobile characteristics, Ayurvedic traditions explore warm, freshly cooked, moist dishes to complement that airy rhythm.",
    qualities: ["Light", "Dry", "Cool", "Mobile"],
    favouredQualities: ["Warm & freshly cooked", "Soft moisture & broths", "Comforting & grounding"],
    tastes: ["Sweet", "Sour", "Salty"],
    miniChart: [
      { label: "Traditionally favoured", value: "Warm & nourishing preparations" },
      { label: "Illustrations", value: "Khichdi, dal, warm oats, cooked veg" },
      { label: "Food qualities", value: "Warm, moist, softly seasoned" },
    ],
    examplePreviewChips: ["Khichdi", "Yellow Dal", "Warm Oats", "Vegetable Soup", "Soaked Almonds"],
    foodPerspectiveSummary:
      "Traditional Vata food illustration emphasizes freshly prepared, warm, gently spiced dishes with natural moisture — favoring soft soups, cooked grains, and nourishing stews rather than dry or ice-cold textures.",
    foodCategories: [
      {
        key: "grains",
        label: "Grains",
        favouredTrait: "Softly cooked, warm whole grains",
        examples: [
          { name: "Cooked White / Basmati Rice", preparationNote: "Warm, fluffy, easy to digest", indianFoodsMatchId: "steamed-rice" },
          { name: "Warm Masala Oats Porridge", preparationNote: "Simmered soft with water or milk", indianFoodsMatchId: "masala-oats" },
          { name: "Soft Whole Wheat Phulka", preparationNote: "Served fresh and warm", indianFoodsMatchId: "whole-wheat-roti" },
        ],
      },
      {
        key: "fruits",
        label: "Fruits",
        favouredTrait: "Ripe, juicy, naturally sweet seasonal picks",
        examples: [
          { name: "Ripe Banana", preparationNote: "Naturally soft texture at room temperature" },
          { name: "Stewed Apple with Cinnamon", preparationNote: "Lightly poached in warm water" },
          { name: "Sweet Papaya & Mango", preparationNote: "Fresh ripe slices without refrigeration" },
        ],
      },
      {
        key: "vegetables",
        label: "Vegetables",
        favouredTrait: "Gently steamed, roasted or sautéed roots",
        examples: [
          { name: "Sweet Potato & Carrots", preparationNote: "Steamed tender with cumin" },
          { name: "Bottle Gourd (Lauki) & Squash", preparationNote: "Warm moist sabzi style" },
          { name: "Beets & Cooked Greens", preparationNote: "Prepared warm rather than raw salads" },
        ],
      },
      {
        key: "pulses",
        label: "Pulses",
        favouredTrait: "Well-cooked, mellow split lentils",
        examples: [
          { name: "Split Yellow Moong Dal", preparationNote: "Simmered smooth with hing and turmeric" },
          { name: "Toor Dal Tadka", preparationNote: "Light warm tempering with cumin", indianFoodsMatchId: "yellow-dal" },
          { name: "Red Masoor Lentil Soup", preparationNote: "Warm brothy bowl" },
        ],
      },
      {
        key: "dairy",
        label: "Dairy / Alternatives",
        favouredTrait: "Warm, lightly spiced or plant-based milk",
        examples: [
          { name: "Warm Milk / Almond Milk", preparationNote: "Steeped with cardamom or ginger" },
          { name: "Soft Fresh Paneer", preparationNote: "Gently cooked in mild gravies", indianFoodsMatchId: "paneer-bhurji" },
          { name: "Drizzle of Cultured Ghee", preparationNote: "Traditional finishing touch on dal" },
        ],
      },
      {
        key: "spices",
        label: "Spices",
        favouredTrait: "Gentle warming digestive aromatics",
        examples: [
          { name: "Fresh Ginger (Adrak)", preparationNote: "Grated lightly into soups & tea" },
          { name: "Cumin (Jeera) & Ajwain", preparationNote: "Toasted gently in traditional tempering" },
          { name: "Cinnamon & Cardamom", preparationNote: "Warm sweet aroma for porridge" },
        ],
      },
      {
        key: "meals",
        label: "Everyday Indian Meals",
        favouredTrait: "One-pot nourishing comfort plates",
        examples: [
          { name: "Moong Dal Khichdi", preparationNote: "Classic warm rice & lentil stew", indianFoodsMatchId: "khichdi" },
          { name: "Poha with Peanuts", preparationNote: "Warm flattened rice with curry leaves", indianFoodsMatchId: "poha" },
          { name: "Warm Dal, Rice & Cooked Veg", preparationNote: "Balanced home-cooked thali", indianFoodsMatchId: "yellow-dal" },
        ],
      },
    ],
    lifestylePillars: [
      {
        title: "Unhurried Meal Rhythms",
        perspective: "Traditional perspectives emphasize sitting calmly for warm meals at roughly consistent daily hours.",
      },
      {
        title: "Rest & Gentle Unwinding",
        perspective: "Adequate evening wind-down and warm beverages are traditionally paired with busy mental days.",
      },
      {
        title: "Grounded Movement",
        perspective: "Fluid stretching, rhythmic walking, and steady-paced routines reflect Vata's kinetic theme cleanly.",
      },
      {
        title: "Warmth & Environment",
        perspective: "Cosy layers, sheltered spaces from chilly drafts, and mindful breathing bring a grounded pause.",
      },
    ],
    theme: {
      accentHex: "#E7C675",
      secondaryHex: "#34D399",
      badgeClasses: "border-[#E7C675]/40 bg-[#E7C675]/10 text-[#E7C675]",
      borderHoverClasses: "hover:border-[#E7C675]/60",
      glowStyle: "0 0 42px rgba(231, 198, 117, 0.16)",
      buttonClasses: "bg-[#E7C675] text-[#050706] hover:bg-[#f2d68d]",
      chipClasses: "border-[#E7C675]/30 bg-[#E7C675]/10 text-[#f5dfb0]",
    },
  },
  {
    id: "pitta",
    name: "Pitta",
    chapterNumber: "02",
    rhythmTitle: "The Rhythm of Transformation",
    subtitle: "Associated with heat, focus, digestion, and clarity of purpose.",
    elementsLabel: "Fire + Water",
    elements: ["Fire", "Water"],
    coverImage: "/images/dosha-pitta.jpg",
    coverAlt: "Pitta Rhythm of Transformation athletic portrait cover image",
    coverObjectPosition: "object-[center_18%]",
    ctaLabel: "Discover Pitta",
    shortIntro:
      "Rooted in Fire and Water, traditional Ayurveda associates Pitta with sharp discernment, transformation, warmth, and fluid intensity.",
    detailedIntro:
      "Classical Ayurvedic texts view Pitta as the principle of metabolic transformation — governing clarity, heat, and enzymatic breakdown. Because its inherent qualities are described as warm and sharp, culinary folklore explores naturally refreshing, mild, and softly cooling ingredients.",
    qualities: ["Warm", "Sharp", "Fluid"],
    favouredQualities: ["Mild & gentle seasoning", "Refreshing hydration", "Natural cooling herbs"],
    tastes: ["Sweet", "Bitter", "Astringent"],
    miniChart: [
      { label: "Traditionally favoured", value: "Mild, refreshing & balanced spices" },
      { label: "Illustrations", value: "Cucumber, coconut, rice, seasonal fruit" },
      { label: "Food qualities", value: "Cooling, crisp hydration, mild dals" },
    ],
    examplePreviewChips: ["Cucumber Salad", "Fresh Coconut", "Idli & Mint", "Seasonal Fruit", "Mild Moong Dal"],
    foodPerspectiveSummary:
      "Traditional Pitta food illustration highlights hydrated, mellow-spiced dishes — bringing crisp cucumbers, tender coconut, sweet ripe fruits, coriander herbs, and gentle dals forward over fiery chilies.",
    foodCategories: [
      {
        key: "grains",
        label: "Grains",
        favouredTrait: "Cooling, softly steamed whole staples",
        examples: [
          { name: "Steamed Basmati Rice", preparationNote: "Mild and neutral backdrop", indianFoodsMatchId: "steamed-rice" },
          { name: "Steamed Idli", preparationNote: "Soft, fermented non-spicy staple", indianFoodsMatchId: "idli-sambar" },
          { name: "Barley (Jau) & Wheat Roti", preparationNote: "Served with cooling sides", indianFoodsMatchId: "whole-wheat-roti" },
        ],
      },
      {
        key: "fruits",
        label: "Fruits",
        favouredTrait: "Crisp, hydrating melons, pomegranates & pears",
        examples: [
          { name: "Pomegranate Arils", preparationNote: "Sweet-astringent refreshing crunch" },
          { name: "Watermelon & Sweet Melons", preparationNote: "Enjoyed fresh between meals" },
          { name: "Ripe Grapes & Pears", preparationNote: "Crisp seasonal fruit balance" },
        ],
      },
      {
        key: "vegetables",
        label: "Vegetables",
        favouredTrait: "Hydrating gourds, greens & crisp salads",
        examples: [
          { name: "Cucumber Kachumber", preparationNote: "Sliced crisp with fresh coriander" },
          { name: "Spinach (Palak) & Coriander Greens", preparationNote: "Lightly wilted without heavy chili", indianFoodsMatchId: "palak-paneer" },
          { name: "Ridge Gourd (Turai) & Pumpkin", preparationNote: "Naturally sweet cooling vegetables" },
        ],
      },
      {
        key: "pulses",
        label: "Pulses",
        favouredTrait: "Lightly tempered mild lentils & legumes",
        examples: [
          { name: "Mild Green & Yellow Moong Dal", preparationNote: "Seasoned gently with coriander" },
          { name: "Chana Dal & Chickpea Salad", preparationNote: "Steamed with mint and coconut" },
          { name: "Black-Eyed Peas (Lobia)", preparationNote: "Mild stewed preparation", indianFoodsMatchId: "yellow-dal" },
        ],
      },
      {
        key: "dairy",
        label: "Dairy / Alternatives",
        favouredTrait: "Cool fresh dairy & tender coconut",
        examples: [
          { name: "Fresh Set Dahi / Cucumber Raita", preparationNote: "Cooling side with mint", indianFoodsMatchId: "curd-dahi" },
          { name: "Tender Coconut Water & Cream", preparationNote: "Classic soothing tropical hydrator" },
          { name: "Mild Fresh Paneer", preparationNote: "With mild herb gravies", indianFoodsMatchId: "palak-paneer" },
        ],
      },
      {
        key: "spices",
        label: "Spices",
        favouredTrait: "Cooling aromatic seeds & fresh garden herbs",
        examples: [
          { name: "Fennel Seeds (Saunf)", preparationNote: "Refreshing sweet post-meal herb" },
          { name: "Fresh Mint (Pudina) & Coriander", preparationNote: "Chutneys without green chili" },
          { name: "Cardamom & Mild Turmeric", preparationNote: "Clean aroma without sharp heat" },
        ],
      },
      {
        key: "meals",
        label: "Everyday Indian Meals",
        favouredTrait: "Cool-balanced mild thalis & breakfasts",
        examples: [
          { name: "Idli with Fresh Coconut Chutney", preparationNote: "Lightly steamed gentle meal", indianFoodsMatchId: "idli-sambar" },
          { name: "Curd Rice with Cucumber & Pomegranate", preparationNote: "Classic South Indian cooling dish" },
          { name: "Mild Dal, Rice & Herb Raita", preparationNote: "Everyday mellow home plate", indianFoodsMatchId: "steamed-rice" },
        ],
      },
    ],
    lifestylePillars: [
      {
        title: "Cooling Daily Pauses",
        perspective: "Traditional notes value unhurried midday breaks away from overly heated or rushed environments.",
      },
      {
        title: "Balanced Effort & Rest",
        perspective: "Channelling strong focus alongside playful, non-competitive leisure keeps rhythm sustainable.",
      },
      {
        title: "Nature & Fresh Air",
        perspective: "Evening walks near greenery, gardens, or calm water align with Pitta's appreciation for stillness.",
      },
      {
        title: "Mindful Eating Temperature",
        perspective: "Enjoying freshly prepared foods at mild temperatures without excess spice keeps meals pleasant.",
      },
    ],
    theme: {
      accentHex: "#F5A64B",
      secondaryHex: "#A3FF12",
      badgeClasses: "border-[#F5A64B]/40 bg-[#F5A64B]/10 text-[#F5A64B]",
      borderHoverClasses: "hover:border-[#F5A64B]/60",
      glowStyle: "0 0 42px rgba(245, 166, 75, 0.16)",
      buttonClasses: "bg-[#F5A64B] text-[#050706] hover:bg-[#fbba6d]",
      chipClasses: "border-[#F5A64B]/30 bg-[#F5A64B]/10 text-[#fbd09c]",
    },
  },
  {
    id: "kapha",
    name: "Kapha",
    chapterNumber: "03",
    rhythmTitle: "The Rhythm of Stability",
    subtitle: "Associated with steadiness, endurance, structure, and calm nourishment.",
    elementsLabel: "Earth + Water",
    elements: ["Earth", "Water"],
    coverImage: "/images/dosha-kapha.jpg",
    coverAlt: "Kapha Rhythm of Stability grounded lifestyle cover image",
    coverObjectPosition: "object-[center_22%]",
    ctaLabel: "Explore Kapha",
    shortIntro:
      "Grounded in Earth and Water, Kapha symbolizes steady composure, resilience, lubrication, and cohesive natural strength.",
    detailedIntro:
      "In traditional Ayurveda, Kapha holds Earth and Water together — providing steadiness, patience, and physical cohesion. Because those elements express cool, steady, and rich characteristics, cultural dietary examples often highlight brisk spices, light grains, millets, and vibrant vegetables.",
    qualities: ["Steady", "Cool", "Heavy", "Smooth"],
    favouredQualities: ["Light, warm preparations", "Crisp roasted & steamed veg", "Variety & aromatic spices"],
    tastes: ["Pungent", "Bitter", "Astringent"],
    miniChart: [
      { label: "Traditionally favoured", value: "Warm, light & varied dishes" },
      { label: "Illustrations", value: "Millets, lentils, soups, brisk veggies" },
      { label: "Food qualities", value: "Light, warm, lively spice aroma" },
    ],
    examplePreviewChips: ["Foxtail Millet", "Sprouts Chaat", "Roasted Chana", "Sambar Soup", "Black Pepper"],
    foodPerspectiveSummary:
      "Traditional Kapha culinary ideas lean toward light, lively, warmly spiced dishes — incorporating ancient Indian millets, sprouted legumes, clear vegetable soups, and bitter greens for bright variety.",
    foodCategories: [
      {
        key: "grains",
        label: "Grains",
        favouredTrait: "Dry, light heritage millets & whole grains",
        examples: [
          { name: "Bajra, Ragi & Jowar Millets", preparationNote: "Fluffy roasted flatbreads or bowls" },
          { name: "Dry-Roasted Poha / Light Upma", preparationNote: "Crisp veggies and mustard seed", indianFoodsMatchId: "upma" },
          { name: "Barley & Buckwheat", preparationNote: "Naturally lighter than heavy white bread" },
        ],
      },
      {
        key: "fruits",
        label: "Fruits",
        favouredTrait: "Crisp, lighter astringent & tart fruits",
        examples: [
          { name: "Crisp Apple & Pears", preparationNote: "Clean fibrous bite" },
          { name: "Pomegranate & Fresh Berries", preparationNote: "Tart antioxidant profile" },
          { name: "Stewed Dried Figs (small amount)", preparationNote: "Served warm instead of creamy desserts" },
        ],
      },
      {
        key: "vegetables",
        label: "Vegetables",
        favouredTrait: "Lightly sautéed greens, brassicas & pungent roots",
        examples: [
          { name: "Leafy Greens, Methi & Spinach", preparationNote: "Crisp stir-fry with garlic and turmeric" },
          { name: "Cauliflower, Broccoli & Cabbage", preparationNote: "Lightly roasted dry sabzi" },
          { name: "Okra (Bhindi) & Green Beans", preparationNote: "Minimally oiled sauté" },
        ],
      },
      {
        key: "pulses",
        label: "Pulses",
        favouredTrait: "Light protein-rich split dals & sprouts",
        examples: [
          { name: "Sprouted Moong Chaat", preparationNote: "Tossed with lemon and black pepper", indianFoodsMatchId: "moong-sprouts" },
          { name: "Chole & Rajma (Moderate Soup)", preparationNote: "Lightly cooked with ginger and ajwain", indianFoodsMatchId: "rajma-chawal" },
          { name: "Toor Dal & Red Lentils", preparationNote: "Flavorful thin brothy consistency", indianFoodsMatchId: "yellow-dal" },
        ],
      },
      {
        key: "dairy",
        label: "Dairy / Alternatives",
        favouredTrait: "Warm spiced light infusions or thin buttermilk",
        examples: [
          { name: "Diluted Jeera Chaas (Buttermilk)", preparationNote: "Lighter than thick sweet lassi" },
          { name: "Warm Turmeric Plant Milk", preparationNote: "Made light with water blend" },
          { name: "Soya Chunks / Grilled Tofu", preparationNote: "Plant-forward lean protein swap", indianFoodsMatchId: "soya-bhurji" },
        ],
      },
      {
        key: "spices",
        label: "Spices",
        favouredTrait: "Aromatic, warm & lively peppery seasonings",
        examples: [
          { name: "Black Pepper & Dry Ginger", preparationNote: "Crisp warmth across soups" },
          { name: "Mustard Seeds & Curry Leaves", preparationNote: "Dry-popped aromatic tempering" },
          { name: "Turmeric, Cinnamon & Cloves", preparationNote: "Bright bitter-pungent accent" },
        ],
      },
      {
        key: "meals",
        label: "Everyday Indian Meals",
        favouredTrait: "Vibrant light soups, millets & warm sabzis",
        examples: [
          { name: "Hot Vegetable Sambar Soup", preparationNote: "Rich tamarind, lentil & vegetable broth", indianFoodsMatchId: "idli-sambar" },
          { name: "Sprouts & Roasted Chana Bowl", preparationNote: "Light protein & spice crunch", indianFoodsMatchId: "roasted-chana" },
          { name: "Millet Rotis with Methi Dal", preparationNote: "Light whole-grain evening meal", indianFoodsMatchId: "yellow-dal" },
        ],
      },
    ],
    lifestylePillars: [
      {
        title: "Fresh Morning Energy",
        perspective: "Ayurvedic folklore celebrates crisp early mornings and gentle outdoor sunlight to spark daily momentum.",
      },
      {
        title: "Varied & Active Routines",
        perspective: "Trying brisk walks, upbeat movement, or new skills reflects Kapha's complement to stagnation.",
      },
      {
        title: "Light Warm Meals",
        perspective: "Favoring fresh varied dishes and eating only when genuinely hungry aligns with simple mindful cues.",
      },
      {
        title: "Airing & Invigorating Spaces",
        perspective: "Bright open rooms, natural daylight, and varied textures create an uplifting daily backdrop.",
      },
    ],
    theme: {
      accentHex: "#A3FF12",
      secondaryHex: "#34D399",
      badgeClasses: "border-[#A3FF12]/40 bg-[#A3FF12]/10 text-[#A3FF12]",
      borderHoverClasses: "hover:border-[#A3FF12]/60",
      glowStyle: "0 0 42px rgba(163, 255, 18, 0.16)",
      buttonClasses: "bg-[#A3FF12] text-[#050706] hover:bg-[#b8ff42]",
      chipClasses: "border-[#A3FF12]/30 bg-[#A3FF12]/10 text-[#d8ff96]",
    },
  },
];
