export interface PeriodFoodSuggestion {
  id: string;
  name: string;
  category: "iron_rich" | "balanced_plate" | "hydrating_drink";
  dietType: "vegetarian" | "non_vegetarian";
  servingLabel: string;
  servingGrams: number;
  imagePath: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number;
  ironMg: number;
  sourceNote: string;
  simpleRecipe: string[];
  benefit: string;
}

export interface WomenFoodAlternativeCard {
  id: string;
  originalName: string;
  originalCategoryNote: string;
  originalImagePath: string;
  originalStats: string;
  toleranceNote: string;
  benefitsOfSwap: string;
  alternativeName: string;
  alternativeImagePath: string;
  alternativeServingLabel: string;
  alternativeStats: {
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fibre: number;
  };
  sourceLabel: string;
}

export type YogaPoseKey =
  | "childs_pose"
  | "cat_cow"
  | "knee_to_chest"
  | "seated_breathing"
  | "supported_relaxation"
  | "gentle_walk";

export interface PeriodActivityGuide {
  id: string;
  poseKey: YogaPoseKey;
  title: string;
  sanskritName: string;
  durationSuggestion: string;
  intensity: "Gentle" | "Restorative" | "Light";
  focus: string;
  howToSteps: string[];
  safetyStopNote: string;
}

export interface PeriodEducationCard {
  id: string;
  topic:
    | "Hygiene"
    | "Myth vs Fact"
    | "Sleep & Rest"
    | "Hydration"
    | "Mood & Hormones"
    | "Symptoms"
    | "Cycle Literacy";
  title: string;
  summary: string;
  detail: string;
  sourceName: string;
  sourceUrl: string;
}

export interface WomenMealTemplate {
  id: string;
  slot:
    | "Breakfast"
    | "Lunch"
    | "Dinner"
    | "Healthy Snack"
    | "Pre-Workout"
    | "Post-Workout"
    | "Hydration"
    | "Quick College / Work";
  dietType: "vegetarian" | "non_vegetarian";
  title: string;
  servingLabel: string;
  grams: number;
  imagePath: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number;
  ironMg: number;
  allergens: string[];
  ingredients: string[];
  prepSteps: string[];
  storeSuggestionNote: string;
  sourceLabel: string;
  note: string;
}

export interface FitnessCategoryGuide {
  id: string;
  category:
    | "Beginner-friendly Workouts"
    | "Strength & Mobility"
    | "Walking & Low-Impact"
    | "Yoga & Stretching"
    | "Rest & Recovery";
  title: string;
  level: string;
  durationMinutes: number;
  intensity: "Gentle" | "Moderate" | "Restorative";
  detail: string;
  prePostTip: string;
}

/**
 * Food Guide Category 1 — Items some individuals prefer to limit if uncomfortable.
 * Balanced everyday foods do not need universal restriction unless personally uncomfortable.
 */
export const WOMEN_FOOD_ALTERNATIVES: WomenFoodAlternativeCard[] = [
  {
    id: "swap-chips-roasted-makhana",
    originalName: "Ultra-Processed High-Salt Fried Chips (50 g)",
    originalCategoryNote: "Very salty / deep-fried snacks (some prefer limiting during bloating)",
    originalImagePath: "/images/healthy-swaps.jpg",
    originalStats: "~268 kcal • 17g fat • ~260 mg sodium (USDA reference estimate)",
    toleranceNote: "High sodium and heavy oil can worsen fluid retention for some people.",
    benefitsOfSwap:
      "Swaps excess oil & salt for airy crunch, potassium, magnesium, and lighter digestion.",
    alternativeName: "Roasted Makhana & Toasted Pumpkin Seeds (40 g)",
    alternativeImagePath: "/images/women-wellness-hero.jpg",
    alternativeServingLabel: "1 crisp bowl (~40 g)",
    alternativeStats: {
      grams: 40,
      calories: 162,
      protein: 5.8,
      carbs: 24.0,
      fats: 4.5,
      fibre: 2.4,
    },
    sourceLabel: "ICMR–NIN IFCT 2017 / USDA estimate",
  },
  {
    id: "swap-sugary-milkshake-ragi-cacao",
    originalName: "Sugary Bottled Drinks & Refined Sweets (250 mL)",
    originalCategoryNote: "High added-sugar items (optional moderation during energy dips)",
    originalImagePath: "/images/nutrition-analytics.jpg",
    originalStats: "~215 kcal • 28g added sugar (USDA label average)",
    toleranceNote: "Quick sugar spikes may be followed by sluggish dips and mood swings.",
    benefitsOfSwap:
      "Delivers calcium, iron, cocoa polyphenols, and steady fiber without refined syrup overload.",
    alternativeName: "Warm Ragi Cacao Almond Drink with Light Jaggery (250 mL)",
    alternativeImagePath: "/images/women-wellness-hero.jpg",
    alternativeServingLabel: "1 comforting mug (250 mL)",
    alternativeStats: {
      grams: 250,
      calories: 158,
      protein: 6.4,
      carbs: 21.0,
      fats: 5.2,
      fibre: 3.1,
    },
    sourceLabel: "ICMR–NIN Finger Millet & Milk estimate",
  },
  {
    id: "swap-excess-caffeine-chamomile-ginger",
    originalName: "Excess Strong Coffee / Energy Drinks (300 mL)",
    originalCategoryNote: "High caffeine (limit if jittery, crampy, or sleep-disrupted)",
    originalImagePath: "/images/catalog-fitness-hydration.jpg",
    originalStats: "~120–180 mg caffeine + added syrups (estimated)",
    toleranceNote: "High caffeine can disturb restorative sleep or irritate a sensitive stomach.",
    benefitsOfSwap:
      "Hydrates gently with warm chamomile/ginger soothing comfort and zero sleep disruption.",
    alternativeName: "Warm Chamomile, Ginger & Roasted Jeera Infusion (250 mL)",
    alternativeImagePath: "/images/women-wellness-hero.jpg",
    alternativeServingLabel: "1 warm cup (250 mL)",
    alternativeStats: {
      grams: 250,
      calories: 18,
      protein: 0.3,
      carbs: 4.2,
      fats: 0.1,
      fibre: 0.4,
    },
    sourceLabel: "USDA Herbal Infusion Reference",
  },
  {
    id: "swap-heavy-greasy-fast-food",
    originalName: "Heavy Greasy Fast-Food Platter (220 g)",
    originalCategoryNote: "Very greasy meals (skip if triggering nausea or heavy bloating)",
    originalImagePath: "/images/dashboard-preview.jpg",
    originalStats: "~540 kcal • 29g fat • low fibre (estimated)",
    toleranceNote: "Slow gastric emptying from heavy frying feels uncomfortable during cramps.",
    benefitsOfSwap:
      "Provides protein, probiotic curd, and crisp fiber that leaves you energized instead of sluggish.",
    alternativeName: "Spiced Curd, Pomegranate & Roasted Besan Chana Bowl (210 g)",
    alternativeImagePath: "/images/indian-hero-bowl.jpg",
    alternativeServingLabel: "1 balanced bowl (~210 g)",
    alternativeStats: {
      grams: 210,
      calories: 235,
      protein: 11.4,
      carbs: 27.0,
      fats: 7.8,
      fibre: 5.2,
    },
    sourceLabel: "ICMR–NIN / USDA composition estimate",
  },
];

/**
 * Food Guide Category 2 — Comforting Balanced Nourishment During Periods.
 */
export const PERIOD_FOOD_SUGGESTIONS: PeriodFoodSuggestion[] = [
  {
    id: "palak-chana-sesame-bowl",
    name: "Palak Paneer, Black Chana & Lemon Sesame Bowl",
    category: "iron_rich",
    dietType: "vegetarian",
    servingLabel: "1 nourishing bowl (~260 g) + squeeze of lemon",
    servingGrams: 260,
    imagePath: "/images/women-period-iron-bowl.jpg",
    calories: 365,
    protein: 18.4,
    carbs: 34.0,
    fats: 15.2,
    fibre: 8.6,
    ironMg: 4.8,
    sourceNote: "ICMR–NIN IFCT 2017 estimated composite (spinach, chickpea, paneer, sesame)",
    simpleRecipe: [
      "Saute chopped palak and boiled black chana lightly in cumin, garlic, and turmeric.",
      "Fold in fresh paneer cubes and 1 tsp toasted white sesame seeds (til).",
      "Finish with fresh lemon juice off-heat — vitamin C pairs well with plant iron.",
    ],
    benefit: "Iron + vitamin C + calcium + complete vegetarian protein in one warm plate.",
  },
  {
    id: "egg-spinach-moong-toast",
    name: "Herb Spinach Scramble (2 Eggs) on Whole-Wheat Toast + Orange",
    category: "iron_rich",
    dietType: "non_vegetarian",
    servingLabel: "2 eggs + 1 whole-grain slice + ½ orange (~230 g)",
    servingGrams: 230,
    imagePath: "/images/south-indian-breakfast.jpg",
    calories: 335,
    protein: 19.2,
    carbs: 29.0,
    fats: 14.8,
    fibre: 5.4,
    ironMg: 3.6,
    sourceNote: "USDA FoodData Central / ICMR–NIN IFCT 2017 estimate",
    simpleRecipe: [
      "Wilt chopped spinach with tomato in 1 tsp olive oil or butter.",
      "Fold in 2 lightly whisked eggs with black pepper until soft-set.",
      "Serve with toasted whole-wheat bread and fresh vitamin-C orange slices.",
    ],
    benefit: "Bioavailable egg iron, B-vitamins, choline, and comforting warmth in 8 minutes.",
  },
  {
    id: "moong-veg-khichdi",
    name: "Warm Yellow Moong Dal & Carrot-Pea Khichdi with Curd",
    category: "balanced_plate",
    dietType: "vegetarian",
    servingLabel: "1 comforting bowl (~280 g) + 2 tbsp plain curd",
    servingGrams: 280,
    imagePath: "/images/indian-hero-bowl.jpg",
    calories: 310,
    protein: 12.2,
    carbs: 48.0,
    fats: 6.8,
    fibre: 6.5,
    ironMg: 2.6,
    sourceNote: "ICMR–NIN IFCT 2017 estimated value (moong dal, rice, vegetables, curd)",
    simpleRecipe: [
      "Pressure-cook soaked yellow moong dal and rice (1:1) with diced carrots and peas.",
      "Temper lightly with jeera, grated ginger, hing, and 1 tsp ghee.",
      "Pair with plain curd or buttermilk if that feels comforting to your stomach.",
    ],
    benefit: "Soothing, gentle fiber and amino acids on crampy or low-appetite days.",
  },
  {
    id: "ginger-hibiscus-jeera-cooler",
    name: "Warm Ginger-Mint Herbal Sip or Tender Coconut Lemon Cooler",
    category: "hydrating_drink",
    dietType: "vegetarian",
    servingLabel: "1 tall glass / warm mug (250 mL)",
    servingGrams: 250,
    imagePath: "/images/women-wellness-hero.jpg",
    calories: 46,
    protein: 0.4,
    carbs: 10.5,
    fats: 0.2,
    fibre: 0.5,
    ironMg: 0.3,
    sourceNote: "USDA FoodData Central / ICMR–NIN coconut water reference estimate",
    simpleRecipe: [
      "Simmer crushed fresh ginger with mint leaves for 5 minutes OR pour chilled tender coconut water.",
      "Add 1 tbsp fresh lemon juice for vitamin C freshness.",
      "Choose warm or cool based strictly on your personal comfort.",
    ],
    benefit: "Replaces fluids smoothly without excess caffeine or heavy syrups.",
  },
];

export const PERIOD_YOGA_POSES: PeriodActivityGuide[] = [
  {
    id: "childs-pose",
    poseKey: "childs_pose",
    title: "Supported Child's Pose",
    sanskritName: "Balasana (Wide-Knee with Cushion)",
    durationSuggestion: "3–5 min",
    intensity: "Restorative",
    focus: "Softens lower back tightness and calms pelvic muscle tension.",
    howToSteps: [
      "Kneel softly on a mat with big toes touching and knees comfortably wide.",
      "Place a pillow or folded blanket beneath your chest and forehead.",
      "Let your arms rest forward or alongside legs while breathing slowly into your belly.",
    ],
    safetyStopNote: "Place extra padding under knees/ankles or skip if knees feel strained.",
  },
  {
    id: "cat-cow",
    poseKey: "cat_cow",
    title: "Slow Cat-Cow Flow",
    sanskritName: "Marjaryasana – Bitilasana",
    durationSuggestion: "2–4 min (6–8 slow breaths)",
    intensity: "Gentle",
    focus: "Rhythmic spinal warmth to ease lower-back and hip stiffness.",
    howToSteps: [
      "Start on hands and knees with a folded towel under your knees for cushioning.",
      "Inhale gently, lifting gaze slightly as belly softens downward (Cow).",
      "Exhale smoothly, rounding the back gently toward the ceiling (Cat).",
    ],
    safetyStopNote: "Keep range tiny and smooth; pause immediately if wrists or lower back ache.",
  },
  {
    id: "knee-to-chest",
    poseKey: "knee_to_chest",
    title: "Supine Knee-to-Chest",
    sanskritName: "Apanasana (Gentle Rock)",
    durationSuggestion: "2–3 min",
    intensity: "Gentle",
    focus: "Relieves trapped abdominal gas/bloating and hugs the lower spine softly.",
    howToSteps: [
      "Lie flat on your back with a soft mat beneath your lower back.",
      "Draw one or both knees softly toward your chest without pulling forcefully.",
      "Rock gently side-to-side a couple of centimeters while keeping shoulders relaxed.",
    ],
    safetyStopNote: "Hold behind your thighs instead of shins if knees or hips feel tight.",
  },
  {
    id: "seated-breathing",
    poseKey: "seated_breathing",
    title: "Gentle Seated Breathing",
    sanskritName: "Sukhāsana with 4–6 Breath",
    durationSuggestion: "4–5 min",
    intensity: "Restorative",
    focus: "Slows sympathetic tension and eases stress-amplified pain perception.",
    howToSteps: [
      "Sit cross-legged on a firm cushion or comfortably upright in a chair.",
      "Rest one hand over the lower belly and inhale softly for 4 counts.",
      "Exhale longer and unhurriedly through the nose for 6 counts, dropping jaw tension.",
    ],
    safetyStopNote: "Never hold your breath forcefully; return to natural breathing anytime you feel lightheaded.",
  },
  {
    id: "supported-relaxation",
    poseKey: "supported_relaxation",
    title: "Supported Relaxation Pose",
    sanskritName: "Supta Baddha Konasana / Cushion Savasana",
    durationSuggestion: "5–10 min",
    intensity: "Restorative",
    focus: "Total rest for high-fatigue or heavy days with zero effort.",
    howToSteps: [
      "Place pillows under your thighs or behind your upper back while reclining.",
      "Keep knees softly open (butterfly) or legs draped over a bolster.",
      "Warm hands over your abdomen or drape a mild warm cloth over clothes.",
    ],
    safetyStopNote: "Support outer thighs with rolled blankets so inner hips never feel overstretched.",
  },
  {
    id: "gentle-walk",
    poseKey: "gentle_walk",
    title: "Unhurried 10-Min Walk or Pure Rest",
    sanskritName: "Mindful Stroll (Optional)",
    durationSuggestion: "0–12 min",
    intensity: "Light",
    focus: "Encourages light circulation when energy allows; resting is equally valid.",
    howToSteps: [
      "Step outside or walk casually around the room only if you feel up to moving.",
      "Keep pace conversational and relaxed — skip timers or step pressure.",
      "If cramps or exhaustion dominate, skip movement completely and choose rest.",
    ],
    safetyStopNote: "Stop if pain, dizziness, or sharp cramping increases at any moment.",
  },
];

export const PERIOD_MEDICAL_RED_FLAGS: string[] = [
  "Soaking through a sanitary pad or tampon every 1–2 hours for several consecutive hours",
  "Severe or worsening pelvic pain that interrupts sleep, school, or work despite rest",
  "Menstrual bleeding lasting longer than 8 consecutive days or large frequent blood clots",
  "Missing 3 or more expected menstrual periods in a row (outside pregnancy)",
  "Dizziness, fainting, chest tightness, fever, or foul-smelling unusual discharge",
];

export const PERIOD_EDUCATION_CARDS: PeriodEducationCard[] = [
  {
    id: "hygiene",
    topic: "Hygiene",
    title: "Change Pads Every 4–6 Hours & Wash Gently",
    summary: "Breathable cotton underwear and regular changes keep skin comfortable and healthy.",
    detail:
      "Wash the external vulva front-to-back with plain lukewarm water (avoid internal douching or scented washes that disrupt protective pH). Wash reusable pads or period briefs promptly in cold water before regular laundering.",
    sourceName: "NHS — Starting Periods & Period Hygiene",
    sourceUrl: "https://www.nhs.uk/conditions/periods/",
  },
  {
    id: "myths",
    topic: "Myth vs Fact",
    title: "No Scientific Reason to Ban Ordinary Nutritious Foods",
    summary: "Curd, pickles, fruit, eggs, and cool water do not block flow or damage health.",
    detail:
      "Food comfort is deeply individual. Warm soups and spiced herbal teas feel wonderful for some people, while fruit bowls or curd feel refreshing for others. Choose nourishing balanced plates over fear-based taboos.",
    sourceName: "WHO — Menstrual Health Facts & Stigma-Free Care",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/menstrual-health",
  },
  {
    id: "cycle-literacy",
    topic: "Cycle Literacy",
    title: "Normal Cycles Vary From Person to Person (21–35 Days)",
    summary: "Slightly shorter or longer cycles than 28 days are often completely normal.",
    detail:
      "Teen cycles in the first few years after menarche naturally take time to find an individual rhythm. Calendar tracking helps you spot your own baseline trends over 2–3 months rather than chasing a fixed textbook day.",
    sourceName: "ACOG — Menstruation Clinical Guidance",
    sourceUrl: "https://www.acog.org/clinical",
  },
  {
    id: "sleep-rest",
    topic: "Sleep & Rest",
    title: "Lower Back Warmth & 7–9 Hours of Sleep Support Comfort",
    summary: "Resting on your side with a knee cushion eases gentle lower abdominal tension.",
    detail:
      "Warm compresses placed safely over clothing (never direct high heat on bare skin or left unattended while sleeping) relax smooth muscle tightness naturally alongside adequate rest.",
    sourceName: "NHS Inform — Periods & Pain Management",
    sourceUrl: "https://www.nhsinform.scot/healthy-living/womens-health/girls-and-young-womens-health/periods-menstruation/",
  },
  {
    id: "hydration",
    topic: "Hydration",
    title: "Regular Hydration Actually Eases Water Retention",
    summary: "Sipping water, broths, or tender coconut water gently counters bloating and headaches.",
    detail:
      "Consistent hydration keeps bowel habits comfortable and prevents fatigue amplification. Avoid forcing sudden chugging; sip evenly across morning and afternoon.",
    sourceName: "NHS — Period Pain & Self-Care",
    sourceUrl: "https://www.nhs.uk/conditions/periods/",
  },
  {
    id: "mood-hormones",
    topic: "Mood & Hormones",
    title: "Energy & Mood Shifts Reflect Real Hormone Rhythms",
    summary: "Feeling quieter, hungrier, or lower-energy before a bleed is normal biology.",
    detail:
      "Progesterone and estrogen fluctuations affect brain neurotransmitters and sleep quality. Pairing steady complex carbs, iron-rich foods, and lighter expectations supports wellbeing kindly.",
    sourceName: "ACOG — Premenstrual & Cycle Care",
    sourceUrl: "https://www.acog.org/clinical",
  },
  {
    id: "symptoms",
    topic: "Symptoms",
    title: "Zero Symptoms Is Normal Too — Not Everyone Cramps",
    summary: "Your log supports both 'No Symptoms' check-ins and detailed comfort tracking.",
    detail:
      "Some people glide through their cycle with light energy changes, while others manage fatigue or lower-back ache. Any pattern is useful personal context without self-diagnosis.",
    sourceName: "WHO — Menstrual Health Rights & Education",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/menstrual-health",
  },
];

export const WOMEN_MEAL_TEMPLATES: WomenMealTemplate[] = [
  {
    id: "w-breakfast-veg",
    slot: "Breakfast",
    dietType: "vegetarian",
    title: "Besan Vegetable Cheela (2) with Mint Chutney & Curd",
    servingLabel: "2 medium cheelas + ½ cup curd (~240 g)",
    grams: 240,
    imagePath: "/images/south-indian-breakfast.jpg",
    calories: 345,
    protein: 15.8,
    carbs: 41.0,
    fats: 12.2,
    fibre: 6.4,
    ironMg: 3.1,
    allergens: ["dairy"],
    ingredients: ["1 cup besan", "Grated carrot & spinach", "Cumin & ajwain", "½ cup plain curd"],
    prepSteps: [
      "Whisk besan, finely chopped spinach, grated carrot, ajwain, and water into a pourable batter.",
      "Cook crisp on a lightly oiled pan (~3 min/side) and pair with cooling curd + mint chutney.",
    ],
    storeSuggestionNote: "Everyday kirana / grocery staples (besan, spinach, curd).",
    sourceLabel: "ICMR–NIN IFCT 2017 chickpea flour & curd estimate",
    note: "Protein + probiotic start for steady morning energy.",
  },
  {
    id: "w-breakfast-nonveg",
    slot: "Breakfast",
    dietType: "non_vegetarian",
    title: "2-Egg Masala Bhurji with Whole-Wheat Paratha & Guava",
    servingLabel: "2 eggs + 1 phulka/light paratha + ½ guava (~250 g)",
    grams: 250,
    imagePath: "/images/south-indian-breakfast.jpg",
    calories: 375,
    protein: 18.6,
    carbs: 34.0,
    fats: 16.5,
    fibre: 5.8,
    ironMg: 3.0,
    allergens: ["egg", "gluten"],
    ingredients: ["2 whole eggs", "Onion, tomato & coriander", "1 whole-wheat chapati", "½ fresh guava"],
    prepSteps: [
      "Lightly scramble 2 eggs with chopped onion, tomato, turmeric, and green chillies.",
      "Serve with warm chapati and vitamin-C-packed guava slices.",
    ],
    storeSuggestionNote: "Available via fresh farm/local dairy & neighborhood markets.",
    sourceLabel: "USDA / ICMR–NIN IFCT 2017 estimate",
    note: "High satiety morning protein with iron absorption aid from vitamin C.",
  },
  {
    id: "w-lunch-veg",
    slot: "Lunch",
    dietType: "vegetarian",
    title: "2 Phulkas, Palak Masoor Dal, Bhindi Sabzi & Kachumber Salad",
    servingLabel: "1 balanced Indian thali (~380 g)",
    grams: 380,
    imagePath: "/images/north-indian-thali.jpg",
    calories: 465,
    protein: 16.5,
    carbs: 68.0,
    fats: 11.8,
    fibre: 10.4,
    ironMg: 4.9,
    allergens: ["gluten"],
    ingredients: ["Whole-wheat phulkas (2)", "Red masoor dal cooked with palak", "Stir-fried bhindi", "Lemon-tomato cucumber salad"],
    prepSteps: [
      "Simmer red masoor dal with chopped spinach and mild jeera-garlic tadka.",
      "Pair with 2 soft phulkas and crisp lemon-dressed kachumber for vitamin C.",
    ],
    storeSuggestionNote: "Standard home staples or clean tiffin preparation.",
    sourceLabel: "ICMR–NIN IFCT 2017 composite estimate",
    note: "Balanced vegetarian iron, folate, fiber, and complex carbs.",
  },
  {
    id: "w-lunch-nonveg",
    slot: "Lunch",
    dietType: "non_vegetarian",
    title: "Grilled Tandoori Chicken Breast, Brown Rice & Mint Kachumber",
    servingLabel: "110 g grilled chicken + 1 cup brown rice + salad (~360 g)",
    grams: 360,
    imagePath: "/images/north-indian-thali.jpg",
    calories: 455,
    protein: 32.4,
    carbs: 49.0,
    fats: 11.5,
    fibre: 5.2,
    ironMg: 2.8,
    allergens: [],
    ingredients: ["110 g marinated chicken breast", "150 g cooked brown rice", "Lemon kachumber salad"],
    prepSteps: [
      "Marinate chicken in curd, ginger-garlic, turmeric, and jeera; pan-sear or grill 10–12 min.",
      "Plate alongside steamed brown rice and crisp lemon vegetable salad.",
    ],
    storeSuggestionNote: "Lean protein prep easy to pack in college/office tiffins.",
    sourceLabel: "USDA / ICMR–NIN IFCT 2017 estimate",
    note: "Strong heme iron & complete protein without heaviness.",
  },
  {
    id: "w-dinner-veg",
    slot: "Dinner",
    dietType: "vegetarian",
    title: "Soft Paneer & Vegetable Moong Daliya Khichdi Bowl",
    servingLabel: "1 warm evening bowl (~280 g)",
    grams: 280,
    imagePath: "/images/indian-hero-bowl.jpg",
    calories: 380,
    protein: 18.2,
    carbs: 44.0,
    fats: 12.5,
    fibre: 7.2,
    ironMg: 3.4,
    allergens: ["dairy", "gluten"],
    ingredients: ["Daliya (broken wheat)", "Yellow moong dal", "60 g cubed paneer", "Carrots, peas & ginger"],
    prepSteps: [
      "Pressure-cook daliya, moong dal, and veggies until creamy.",
      "Toss lightly toasted paneer cubes on top with black pepper and coriander.",
    ],
    storeSuggestionNote: "Light evening nutrition for peaceful digestion and rest.",
    sourceLabel: "ICMR–NIN IFCT 2017 composite estimate",
    note: "Comforting dinner keeping calcium and evening fiber steady.",
  },
  {
    id: "w-dinner-nonveg",
    slot: "Dinner",
    dietType: "non_vegetarian",
    title: "Steamed Rohu / Salmon Lemon Herb Fillet with Sautéed Greens",
    servingLabel: "120 g fish + roasted sweet potato & beans (~290 g)",
    grams: 290,
    imagePath: "/images/indian-hero-bowl.jpg",
    calories: 360,
    protein: 28.5,
    carbs: 28.0,
    fats: 13.8,
    fibre: 5.6,
    ironMg: 2.2,
    allergens: ["fish"],
    ingredients: ["120 g fish fillet", "Steamed green beans", "100 g roasted sweet potato", "Lemon-garlic glaze"],
    prepSteps: [
      "Pan-steam fish seasoned with turmeric, garlic, black pepper, and lemon for 8 min.",
      "Serve alongside quick sautéed greens and sweet potato cubes.",
    ],
    storeSuggestionNote: "Rich natural omega-3 and vitamin-D dinner support.",
    sourceLabel: "USDA / ICMR–NIN coastal fish reference estimate",
    note: "Light, soothing omega-3 dinner supporting tissue recovery.",
  },
  {
    id: "w-quick-college-veg",
    slot: "Quick College / Work",
    dietType: "vegetarian",
    title: "5-Min Sattu Buttermilk + Peanut Banana Oats Jar",
    servingLabel: "1 grab-and-go tumbler + 1 oats jar (~320 g)",
    grams: 320,
    imagePath: "/images/healthy-swaps.jpg",
    calories: 335,
    protein: 14.5,
    carbs: 48.0,
    fats: 9.2,
    fibre: 7.4,
    ironMg: 3.1,
    allergens: ["peanut", "dairy"],
    ingredients: ["Rolled oats (40 g)", "½ sliced banana", "1 tbsp roasted peanuts", "2 tbsp roasted chana sattu in chaas"],
    prepSteps: [
      "Stir sattu with buttermilk, roasted jeera, and mint in a shaker bottle.",
      "Layer oats, sliced banana, and peanuts overnight for effortless morning fuel.",
    ],
    storeSuggestionNote: "Budget-friendly hostel/office staple under ₹45 per serving.",
    sourceLabel: "ICMR–NIN Sattu & Oats Reference",
    note: "Designed for busy college mornings and back-to-back office schedules.",
  },
  {
    id: "w-quick-college-nonveg",
    slot: "Quick College / Work",
    dietType: "non_vegetarian",
    title: "Boiled Egg (2) Hummus Whole-Wheat Roll with Spinach",
    servingLabel: "1 wrapped roll (~220 g)",
    grams: 220,
    imagePath: "/images/healthy-swaps.jpg",
    calories: 340,
    protein: 17.8,
    carbs: 32.0,
    fats: 14.5,
    fibre: 5.1,
    ironMg: 2.9,
    allergens: ["egg", "gluten", "sesame"],
    ingredients: ["1 whole-wheat chapati/wrap", "2 sliced boiled eggs", "2 tbsp chickpea hummus", "Baby spinach"],
    prepSteps: [
      "Spread chickpea hummus over warm roti, add baby spinach and sliced boiled eggs.",
      "Roll tightly in parchment paper for an easy travel tiffin.",
    ],
    storeSuggestionNote: "No-reheat desk/campus meal prep in under 6 minutes.",
    sourceLabel: "USDA / ICMR–NIN composite estimate",
    note: "Portable iron, choline, and fiber between lectures or meetings.",
  },
  {
    id: "w-snack",
    slot: "Healthy Snack",
    dietType: "vegetarian",
    title: "Roasted Black Chana, 3 Walnut Halves & Orange Segments",
    servingLabel: "1 crisp afternoon snack (~140 g)",
    grams: 140,
    imagePath: "/images/women-period-iron-bowl.jpg",
    calories: 215,
    protein: 8.8,
    carbs: 22.0,
    fats: 9.6,
    fibre: 5.5,
    ironMg: 1.9,
    allergens: ["tree_nut"],
    ingredients: ["40 g dry-roasted black chana", "3 walnut halves", "1 small orange peeled"],
    prepSteps: [
      "Pack dry roasted chana and walnuts in a small reusable tin.",
      "Eat alongside fresh orange segments to curb 4 PM slump naturally.",
    ],
    storeSuggestionNote: "Shelf-stable desk/bag snack with zero cooking.",
    sourceLabel: "ICMR–NIN / USDA estimate",
    note: "Natural omega-3, plant protein & vitamin C afternoon lift.",
  },
  {
    id: "w-preworkout",
    slot: "Pre-Workout",
    dietType: "vegetarian",
    title: "1 Medium Banana + 4 Soaked Almonds (30–45 min pre-session)",
    servingLabel: "1 light portion (~115 g)",
    grams: 115,
    imagePath: "/images/catalog-fitness-hydration.jpg",
    calories: 145,
    protein: 2.9,
    carbs: 27.5,
    fats: 3.6,
    fibre: 3.2,
    ironMg: 0.6,
    allergens: ["tree_nut"],
    ingredients: ["1 ripe medium banana", "4 peeled soaked almonds", "Small sip of water"],
    prepSteps: [
      "Peel soaked almonds and pair with 1 banana 30–45 minutes before walking or strength work.",
    ],
    storeSuggestionNote: "Fast, stomach-friendly fuel preventing dizzy workouts.",
    sourceLabel: "USDA / ICMR–NIN estimate",
    note: "Light carbs for steady energy without gastric heaviness.",
  },
  {
    id: "w-postworkout",
    slot: "Post-Workout",
    dietType: "vegetarian",
    title: "Hung Curd Berry Seed Bowl OR Paneer Bhurji Toast",
    servingLabel: "1 recovery serving (~210 g)",
    grams: 210,
    imagePath: "/images/women-wellness-hero.jpg",
    calories: 285,
    protein: 19.5,
    carbs: 26.0,
    fats: 9.8,
    fibre: 3.6,
    ironMg: 1.5,
    allergens: ["dairy", "gluten"],
    ingredients: ["150 g thick strained curd or 80 g crumbled paneer", "1 tbsp pumpkin/chia seeds", "½ cup chopped fruit/berries"],
    prepSteps: [
      "Whip hung curd lightly, top with pumpkin seeds and fruit OR pan-toss spiced paneer over toast.",
      "Pair with 300 mL plain or lemon water within 45 minutes post-exercise.",
    ],
    storeSuggestionNote: "High protein dairy/paneer staples from local dairy.",
    sourceLabel: "USDA / ICMR–NIN estimate",
    note: "Supports muscle repair alongside hydration electrolytes.",
  },
  {
    id: "w-hydration",
    slot: "Hydration",
    dietType: "vegetarian",
    title: "Cumin-Coriander (Jeera-Dhaniya) Infused Bottle / Lemon Chaas",
    servingLabel: "1 tall bottle or glass (300 mL)",
    grams: 300,
    imagePath: "/images/catalog-fitness-hydration.jpg",
    calories: 52,
    protein: 2.1,
    carbs: 7.4,
    fats: 1.4,
    fibre: 0.4,
    ironMg: 0.5,
    allergens: ["dairy"],
    ingredients: ["300 mL cool or room-temp water / spiced diluted curd", "1 tsp roasted jeera powder", "Fresh lemon wedge"],
    prepSteps: [
      "Whisk diluted curd with roasted jeera & mint OR infuse warm water with fennel & coriander seeds.",
    ],
    storeSuggestionNote: "Simple home electrolytes replacing sugary bottled beverages.",
    sourceLabel: "ICMR–NIN Hydration & Dairy Estimate",
    note: "Gentle electrolyte and probiotic hydration through warm commutes.",
  },
];

export const FITNESS_GUIDES: FitnessCategoryGuide[] = [
  {
    id: "beginner-strength",
    category: "Beginner-friendly Workouts",
    title: "Beginner Joint-Safe Strength Circuit",
    level: "Beginner • 15–20 min",
    durationMinutes: 20,
    intensity: "Moderate",
    detail:
      "2–3 rounds at your own pace: chair bodyweight squats (10x), wall push-ups (8x), glute bridges (12x), and gentle bird-dog holds (6/side).",
    prePostTip: "Have 1 banana pre-session & hung curd or boiled eggs within 45 min after.",
  },
  {
    id: "strength-mobility",
    category: "Strength & Mobility",
    title: "Bone-Density Dumbbell & Resistance Band Routine",
    level: "Steady Progress • 25 min",
    durationMinutes: 25,
    intensity: "Moderate",
    detail:
      "Goblet squats, resistance-band rows, overhead press, and hip hinges twice weekly support pelvic stability and lifelong bone mass.",
    prePostTip: "Sip 250 mL water before starting and prioritize 18–25 g post-workout protein.",
  },
  {
    id: "walking-cardio",
    category: "Walking & Low-Impact",
    title: "Conversational Outdoor Brisk Walk or Cycling",
    level: "All Stages • 20–30 min",
    durationMinutes: 30,
    intensity: "Moderate",
    detail:
      "Rhythmic, talk-test brisk walking elevates mood, insulin sensitivity, and stamina gently without taxing stressed joints.",
    prePostTip: "Zero special gear required — cushioned walking shoes and water bottle suffice.",
  },
  {
    id: "yoga-stretching",
    category: "Yoga & Stretching",
    title: "Desk Unwind, Hip Openers & Core Breathwork",
    level: "Gentle Mobility • 15 min",
    durationMinutes: 15,
    intensity: "Gentle",
    detail:
      "Thoracic rotations, cat-cow, seated hamstring stretches, and gentle hip circles release long study or laptop stiffness.",
    prePostTip: "Follow with warm jeera-ginger water or calm hydration.",
  },
  {
    id: "rest-recovery",
    category: "Rest & Recovery",
    title: "Intentional Rest Day, Stretching & 7–9 Hr Sleep",
    level: "Recovery Essential • 15 min",
    durationMinutes: 15,
    intensity: "Restorative",
    detail:
      "Muscles, hormones, and joints rebuild during rest. On heavy period days or exhaustion, skipping intense workouts is smart self-care.",
    prePostTip: "Focus on regular meals, warm fluids, and consistent bedtime cues.",
  },
];
