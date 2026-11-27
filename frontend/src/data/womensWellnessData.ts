export interface PeriodFoodSuggestion {
  id: string;
  name: string;
  category: "iron_rich" | "balanced_plate" | "hydrating_drink";
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
  originalImagePath: string;
  originalStats: string;
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

export interface PeriodActivityGuide {
  id: string;
  title: string;
  durationSuggestion: string;
  intensity: "Gentle" | "Restorative" | "Light";
  focus: string;
  howTo: string;
}

export interface PeriodEducationCard {
  id: string;
  topic: "Hygiene" | "Myth vs Fact" | "Sleep & Rest" | "Hydration" | "Mood & Hormones" | "Symptoms" | "When to Consult";
  title: string;
  summary: string;
  detail: string;
  reference: string;
}

export interface WomenMealTemplate {
  id: string;
  slot: "Breakfast" | "Lunch" | "Dinner" | "Healthy Snack" | "Pre-Workout" | "Post-Workout";
  title: string;
  servingLabel: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number;
  ironMg: number;
  sourceLabel: string;
  note: string;
}

export const PERIOD_FOOD_SUGGESTIONS: PeriodFoodSuggestion[] = [
  {
    id: "palak-chana-sesame-bowl",
    name: "Palak Paneer, Black Chana & Roasted Sesame Bowl",
    category: "iron_rich",
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
      "Lightly saute chopped spinach and boiled black chana with cumin and turmeric.",
      "Fold in paneer cubes and 1 tsp toasted til (sesame seeds).",
      "Finish with fresh lemon juice off heat to boost non-heme iron absorption.",
    ],
    benefit: "Combines plant iron, calcium, complete dairy protein, and vitamin C.",
  },
  {
    id: "moong-veg-khichdi",
    name: "Warm Yellow Moong Dal & Vegetable Khichdi",
    category: "balanced_plate",
    servingLabel: "1 comforting bowl (~280 g)",
    servingGrams: 280,
    imagePath: "/images/indian-hero-bowl.jpg",
    calories: 310,
    protein: 12.2,
    carbs: 48.0,
    fats: 6.8,
    fibre: 6.5,
    ironMg: 2.6,
    sourceNote: "ICMR–NIN IFCT 2017 estimated value (moong dal, rice, seasonal vegetables)",
    simpleRecipe: [
      "Pressure-cook yellow moong dal and short-grain rice (1:1) with carrots and peas.",
      "Temper lightly with cumin, grated ginger, and 1 tsp ghee.",
      "Serve warm for easy digestion on heavy or crampy days.",
    ],
    benefit: "Gentle on digestion while providing steady complex carbs and plant protein.",
  },
  {
    id: "ginger-hibiscus-jeera-cooler",
    name: "Warm Ginger-Cumin Water or Tender Coconut Lemon Cooler",
    category: "hydrating_drink",
    servingLabel: "1 tall glass (250 mL)",
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
      "Simmer crushed fresh ginger & roasted jeera in warm water OR pour chilled tender coconut water.",
      "Add 1 tbsp fresh lime/lemon juice and fresh mint leaves.",
      "Sip through the day to stay comfortably hydrated.",
    ],
    benefit: "Supports electrolyte balance and digestion; neither warm nor cold drinks are universally off-limits unless they trigger personal discomfort.",
  },
];

export const WOMEN_FOOD_ALTERNATIVES: WomenFoodAlternativeCard[] = [
  {
    id: "swap-chips-roasted-makhana",
    originalName: "Deep-Fried Salted Potato Chips (50 g)",
    originalImagePath: "/images/healthy-swaps.jpg",
    originalStats: "~268 kcal • 17g fat • ~260 mg sodium (USDA reference estimate)",
    benefitsOfSwap:
      "Cuts excess frying fats & heavy salt while giving crisp satiety, magnesium, and potassium during PMS cravings.",
    alternativeName: "Ghee-Roasted Crisp Makhana & Pumpkin Seeds (40 g)",
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
    originalName: "High-Sugar Bottled Chocolate Drink (250 mL)",
    originalImagePath: "/images/nutrition-analytics.jpg",
    originalStats: "~215 kcal • 28g added sugar (USDA label average)",
    benefitsOfSwap:
      "Replaces refined syrup spikes with calcium-rich ragi/milk, cocoa polyphenols, and steady iron + fiber.",
    alternativeName: "Warm Ragi Cacao Almond Beverage (Unsweetened/Light Jaggery, 250 mL)",
    alternativeImagePath: "/images/women-wellness-hero.jpg",
    alternativeServingLabel: "1 warm mug (250 mL)",
    alternativeStats: {
      grams: 250,
      calories: 158,
      protein: 6.4,
      carbs: 21.0,
      fats: 5.2,
      fibre: 3.1,
    },
    sourceLabel: "ICMR–NIN Finger Millet & Dairy estimate",
  },
  {
    id: "swap-cream-pastry-curd-pomegranate",
    originalName: "Cream-Filled Bakery Pastry (90 g)",
    originalImagePath: "/images/dashboard-preview.jpg",
    originalStats: "~350 kcal • 18g saturated/refined fat (estimated)",
    benefitsOfSwap:
      "Satisfies sweet cravings with probiotic curd, vitamin-C-rich pomegranate, and 70% dark cacao nibs without heavy energy crash.",
    alternativeName: "Chilled Curd, Pomegranate & Dark Cacao Chia Bowl (180 g)",
    alternativeImagePath: "/images/indian-hero-bowl.jpg",
    alternativeServingLabel: "1 bowl (~180 g)",
    alternativeStats: {
      grams: 180,
      calories: 195,
      protein: 8.5,
      carbs: 22.0,
      fats: 7.4,
      fibre: 4.2,
    },
    sourceLabel: "ICMR–NIN / USDA composition estimate",
  },
];

export const PERIOD_ACTIVITIES: PeriodActivityGuide[] = [
  {
    id: "supta-baddha",
    title: "Supta Baddha Konasana (Supported Reclined Butterfly)",
    durationSuggestion: "5–10 min",
    intensity: "Restorative",
    focus: "Gentle pelvic & lower-back relaxation with pillows under knees",
    howTo:
      "Lie back supported by cushions, bring soles of feet together comfortably, and take slow nasal breaths.",
  },
  {
    id: "balasana-child",
    title: "Wide-Knee Balasana (Supported Child's Pose)",
    durationSuggestion: "3–5 min",
    intensity: "Gentle",
    focus: "Eases lower back tension and calms the nervous system",
    howTo:
      "Rest chest onto a bolster or folded blanket with knees comfortably wide and forehead supported.",
  },
  {
    id: "box-nadi-breathing",
    title: "Slow Diaphragmatic & Nadi Shodhana Breathing",
    durationSuggestion: "5 min",
    intensity: "Gentle",
    focus: "Reduces stress-related muscle guarding during cramps",
    howTo:
      "Inhale softly for 4 counts, exhale unhurriedly for 6 counts while keeping shoulders dropped.",
  },
  {
    id: "light-walk-rest",
    title: "Unhurried 10-Min Walk or Complete Rest",
    durationSuggestion: "0–15 min",
    intensity: "Light",
    focus: "Light circulation when energy feels good; full rest when fatigued",
    howTo:
      "Exercise is never compulsory during pain. Skip workouts freely on heavy or exhausting days.",
  },
];

export const PERIOD_EDUCATION_CARDS: PeriodEducationCard[] = [
  {
    id: "hygiene",
    topic: "Hygiene",
    title: "Change Pads Every 4–6 Hours & Wash Cleanly",
    summary: "Breathable cotton underwear and regular pad/cup/period-panty changes prevent irritation.",
    detail:
      "Wash front-to-back with plain lukewarm water (avoid scented washes or douching inside the vagina, which disrupt protective pH). Wash reusable period underwear promptly in cold water before mild laundering.",
    reference: "WHO & ACOG Menstrual Hygiene Guidelines",
  },
  {
    id: "myths",
    topic: "Myth vs Fact",
    title: "Ordinary Foods Are Not Universally 'Harmful' During Periods",
    summary: "Curd, pickles, fruit, and cold drinks do not harm the uterus or block flow.",
    detail:
      "Cultural taboos often ban nutritious staples like curd, buttermilk, or specific fruits unnecessarily. Choose warm vs cool foods purely based on your personal stomach comfort.",
    reference: "ACOG / Clinical Menstrual Nutrition Consensus",
  },
  {
    id: "sleep-rest",
    topic: "Sleep & Rest",
    title: "Lower Back Heat & Consistent Rest Support Recovery",
    summary: "7–9 hours of comfortable rest helps regulate prostaglandin fatigue.",
    detail:
      "Sleeping slightly curled with a cushion between the knees or applying gentle warmth to the lower abdomen often eases nighttime discomfort.",
    reference: "ACOG Dysmenorrhea Patient Care Brief",
  },
  {
    id: "hydration",
    topic: "Hydration",
    title: "Steady Fluids Counter Headaches & Bloating",
    summary: "Drinking regular water & mineral broths actually helps reduce water-retention puffiness.",
    detail:
      "Small steady sips across the day keep energy steady without discomfort. Pair warm ginger or chamomile tea if plain chilled water feels uncomfortable.",
    reference: "ICMR–NIN / ACOG Wellness Guidance",
  },
  {
    id: "mood-hormones",
    topic: "Mood & Hormones",
    title: "Estrogen & Progesterone Shifts Affect Energy & Focus",
    summary: "Low or irritable moods reflect real neurochemical fluctuations, not weakness.",
    detail:
      "Tracking energy trends alongside sleep and protein meals over 2–3 cycles helps identify patterns gently without pressure.",
    reference: "ACOG Premenstrual Mood Education",
  },
  {
    id: "symptoms",
    topic: "Symptoms",
    title: "Individual Experiences Differ Widely Across Cycles",
    summary: "Some people experience mild bloating or tiredness while others feel no symptoms.",
    detail:
      "Both 'no symptoms' and varying mild cramps can occur naturally. Logging helps you spot personal changes over time.",
    reference: "ACOG Vital Sign Menstrual Cycle Framework",
  },
  {
    id: "when-to-consult",
    topic: "When to Consult",
    title: "Know Clear Warning Signs to Seek Medical Care",
    summary: "Severe pain or heavy bleeding should always be evaluated by a gynecologist.",
    detail:
      "Seek professional medical care if you soak through a pad/tampon every 1–2 hours for several hours, experience debilitating pain unimproved by rest/OTC relief, bleed for >8 days, miss 3+ consecutive cycles (when not pregnant), or develop dizziness/fever.",
    reference: "ACOG Abnormal Uterine Bleeding & Dysmenorrhea Red Flags",
  },
];

export const WOMEN_MEAL_TEMPLATES: WomenMealTemplate[] = [
  {
    id: "w-breakfast",
    slot: "Breakfast",
    title: "Besan Cheela (2) with Mint Coriander Chutney & Curd",
    servingLabel: "2 medium cheelas + ½ cup curd (~240 g)",
    grams: 240,
    calories: 345,
    protein: 15.8,
    carbs: 41.0,
    fats: 12.2,
    fibre: 6.4,
    ironMg: 3.1,
    sourceLabel: "ICMR–NIN IFCT 2017 chickpea flour & curd estimate",
    note: "Protein + probiotic start for steady morning satiety.",
  },
  {
    id: "w-lunch",
    slot: "Lunch",
    title: "2 Phulka Rotis, Palak Dal, Bhindi Sabzi & Kachumber Salad",
    servingLabel: "1 balanced thali (~380 g)",
    grams: 380,
    calories: 465,
    protein: 16.5,
    carbs: 68.0,
    fats: 11.8,
    fibre: 10.4,
    ironMg: 4.9,
    sourceLabel: "ICMR–NIN IFCT 2017 composite estimate",
    note: "Combines iron-rich greens & lentils with vitamin-C tomato/lemon salad.",
  },
  {
    id: "w-dinner",
    slot: "Dinner",
    title: "Paneer / Tofu Quinoa Vegetable Stir-Bowl or Light Dal Daliya",
    servingLabel: "1 evening bowl (~280 g)",
    grams: 280,
    calories: 380,
    protein: 18.2,
    carbs: 44.0,
    fats: 12.5,
    fibre: 7.2,
    ironMg: 3.4,
    sourceLabel: "USDA / ICMR–NIN composite estimate",
    note: "Easy evening digestion with balanced protein for overnight recovery.",
  },
  {
    id: "w-snack",
    slot: "Healthy Snack",
    title: "Roasted Chana, Handful of Walnuts & Orange Segments",
    servingLabel: "1 small snack plate (~140 g)",
    grams: 140,
    calories: 215,
    protein: 8.8,
    carbs: 22.0,
    fats: 9.6,
    fibre: 5.5,
    ironMg: 1.9,
    sourceLabel: "ICMR–NIN / USDA estimate",
    note: "Natural omega-3, plant protein & vitamin C afternoon lift.",
  },
  {
    id: "w-preworkout",
    slot: "Pre-Workout",
    title: "1 Medium Banana + 4 Soaked Almonds (30–45 min pre-session)",
    servingLabel: "1 quick portion (~115 g)",
    grams: 115,
    calories: 145,
    protein: 2.9,
    carbs: 27.5,
    fats: 3.6,
    fibre: 3.2,
    ironMg: 0.6,
    sourceLabel: "USDA / ICMR–NIN estimate",
    note: "Light, fast-digesting energy that avoids mid-workout sluggishness.",
  },
  {
    id: "w-postworkout",
    slot: "Post-Workout",
    title: "Greek / Hung Curd Bowl or Paneer Bhurji Toast with Berries",
    servingLabel: "1 recovery serving (~210 g)",
    grams: 210,
    calories: 285,
    protein: 19.5,
    carbs: 26.0,
    fats: 9.8,
    fibre: 3.6,
    ironMg: 1.5,
    sourceLabel: "USDA / ICMR–NIN estimate",
    note: "Supports muscle repair alongside hydration electrolytes.",
  },
];

export const FITNESS_GUIDES = [
  {
    title: "Beginner-Friendly Strength Foundations",
    level: "Beginner • 15–25 min",
    detail:
      "Start with bodyweight squats to a chair, wall or incline push-ups, glute bridges, and resistance-band rows 2 days per week for joint & bone strength.",
  },
  {
    title: "Low-Impact Cardio & Bone Density",
    level: "All Stages • 20–30 min",
    detail:
      "Brisk outdoor walks, step-ups, or rhythmic cycling improve cardiovascular endurance gently without demanding exhausting intensity.",
  },
  {
    title: "Mobility, Yoga & Core Flexibility",
    level: "Restorative • 10–20 min",
    detail:
      "Cat-cow, thoracic openers, bird-dog, and seated hamstring stretches counter desk posture and keep joints fluid.",
  },
];
