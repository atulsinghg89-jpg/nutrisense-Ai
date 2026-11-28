import type {
  GameCosmeticItem,
  GameFactHack,
  GameQuizQuestion,
  GameTaskRequirement,
} from "../types/game";
import type { RewardConfig } from "../types/rewards";

export const REWARD_CONFIG: RewardConfig = {
  coinsPerPurchase: 50,
  diamondsPerPurchase: 1,
  dailyDiamondCap: 3,
};

export const COSMETICS_CATALOG: GameCosmeticItem[] = [
  {
    id: "skin_solar_runner",
    name: "Solar Pulse Runner",
    description: "Gold-emerald prism visor aura for your character (cosmetic only).",
    slot: "skin",
    diamondCost: 1,
    accentColor: "#A3FF12",
  },
  {
    id: "trail_mint_comet",
    name: "Emerald Comet Trail",
    description: "Glowing dual-ribbon particle trail behind lane dashes and jumps.",
    slot: "trail",
    diamondCost: 1,
    accentColor: "#34D399",
  },
  {
    id: "portal_aurora_ring",
    name: "Aurora Portal Halo",
    description: "Crystalline aurora shimmer around dimension switch gates.",
    slot: "portal",
    diamondCost: 2,
    accentColor: "#38BDF8",
  },
  {
    id: "badge_wellness_patron",
    name: "Patron Luminary Crest",
    description: "Display crest beside your NutriSense Run score banner.",
    slot: "badge",
    diamondCost: 1,
    accentColor: "#F472B6",
  },
];

export const CHECKPOINT_TASKS: GameTaskRequirement[] = [
  {
    id: "task_water_5km",
    levelRequiredFor: 2,
    milestoneKm: 5,
    kind: "water_photos",
    title: "5 km Hydration Check: Before & After Water Photos",
    description:
      "Take a quick hydration pause! Upload or capture a photo of your water glass/bottle before drinking and after finishing it to unlock Level 2.",
    rewardCoins: 40,
  },
  {
    id: "task_meal_10km",
    levelRequiredFor: 3,
    milestoneKm: 10,
    kind: "meal_scan",
    title: "10 km Nutrition Check: Share Today's Nutritious Meal",
    description:
      "Show what nutritious food you ate today! Upload a meal photo right here (uses NutriSense AI Vision when backend is online) or open the full AI Scanner to unlock Level 3.",
    rewardCoins: 60,
  },
];

export const GAME_FACTS_HACKS: GameFactHack[] = [
  {
    id: "hack_winter_skin",
    category: "winter_hack",
    title: "Winter Hack: Keep Skin Hydrated From Inside",
    tip: "Cold winter air lowers natural thirst cues while indoor heating dries skin. Sip plain warm water regularly and include seasonal produce (carrots, oranges, spinach), nuts, and seeds alongside daily skincare.",
    sourceTag: "General Seasonal Nutrition",
    disclaimer: "Educational wellness tip only; persistent skin issues should be reviewed by a clinician.",
  },
  {
    id: "hack_winter_vitality",
    category: "winter_hack",
    title: "Winter Vitality: Antioxidant-Rich Seasonal Plates",
    tip: "Eating colorful winter fruits and vegetables—such as amla, guava, beetroot, fenugreek (methi), and mustard greens—provides vitamin C and polyphenols that help protect cells during everyday stress.",
    sourceTag: "Seasonal Whole Foods",
    disclaimer: "General food education; no single food stops natural aging or replaces balanced healthcare.",
  },
  {
    id: "fact_hydration_morning",
    category: "hydration",
    title: "Hydration Check: Water Before Caffeine",
    tip: "Starting your morning with plain water before tea or coffee gently restores fluids lost overnight without adding liquid sugar.",
    sourceTag: "Everyday Hydration Habit",
    disclaimer: "Informational tip; fluid needs vary with heat, activity, and medical kidney/heart guidance.",
  },
  {
    id: "fact_fiber_pairing",
    category: "nutrition_fact",
    title: "Balanced Plate Hack: Veggies + Protein + Grain",
    tip: "Pairing roti or rice with dal, curd, paneer, or stir-fried vegetables slows digestion gently and avoids mid-afternoon energy crashes.",
    sourceTag: "Balanced Meal Architecture",
    disclaimer: "General educational guidance; individual macro goals differ by age and health profile.",
  },
  {
    id: "hack_vitamin_c_iron",
    category: "nutrition_fact",
    title: "Iron Absorption Pair: Lemon on Lentils & Greens",
    tip: "Squeezing fresh lemon or pairing bell peppers/amla with spinach, rajma, or chana helps your body absorb plant-based iron more effectively.",
    sourceTag: "ICMR–NIN Food Pairing Principle",
    disclaimer: "Nutritional pairing overview; diagnosed iron deficiency needs medical assessment.",
  },
  {
    id: "lifestyle_post_meal_walk",
    category: "lifestyle",
    title: "Post-Meal Stroll Habit",
    tip: "A relaxed 10-minute indoor or outdoor walk after meals supports comfortable digestion and steadier daytime alertness.",
    sourceTag: "Daily Movement Habit",
    disclaimer: "General lifestyle education only.",
  },
];

export const GAME_QUIZ_QUESTIONS: GameQuizQuestion[] = [
  {
    id: "quiz_period_warmth",
    question: "Do you know which comfort tool commonly helps soothe period cramps externally?",
    options: [
      "Warm water bag or heat pad over light clothing",
      "Ice-cold carbonated soda",
      "Tight rigid waist belt",
      "Skipping water all day",
    ],
    correctIndex: 0,
    congratsMessage: "Congrats! You can check soothing warmth essentials below — for yourself or someone special.",
    explanation:
      "Gentle external warmth helps relax lower abdominal muscles comfortably when used safely over clothing.",
    recommendedCategory: "women_period_care",
    recommendedSubCategory: "heating_pads",
    disclaimer:
      "Educational wellness information only; severe or persistent menstrual pain should be evaluated by a doctor.",
  },
  {
    id: "quiz_hydration_bottle",
    question: "Which simple daily habit makes steady plain water intake easiest during busy work or study days?",
    options: [
      "Keeping a clean insulated stainless steel bottle within arm's reach",
      "Waiting until midnight to drink water",
      "Replacing all water with sugary energy drinks",
      "Adding excess table salt to every glass",
    ],
    correctIndex: 0,
    congratsMessage: "Congrats! Great hydration habit — explore everyday bottle options across budgets below.",
    explanation:
      "Having fresh water visible and temperature-stable reduces forgotten hydration gaps throughout the day.",
    recommendedCategory: "hydration_products",
    recommendedSubCategory: "bottles",
    disclaimer: "General hydration habit guidance only.",
  },
  {
    id: "quiz_winter_movement",
    question: "Which compact gear helps maintain gentle stretching and strength routines indoors during cold winter mornings?",
    options: [
      "A cushioned yoga mat and light resistance bands",
      "Staying completely sedentary all season",
      "Wearing wet socks indoors",
      "Doing zero warm-up heavy lifts immediately",
    ],
    correctIndex: 0,
    congratsMessage: "Congrats! Regular gentle floor mobility supports energy and joint comfort year-round.",
    explanation:
      "A non-slip mat and portable resistance loops make short indoor movement habits easy regardless of weather.",
    recommendedCategory: "fitness_accessories",
    recommendedSubCategory: "mats_bands",
    disclaimer: "General fitness accessory education; follow professional advice if recovering from injury.",
  },
  {
    id: "quiz_winter_skin_food",
    question: "For healthy winter skin glow and steady daily energy, what nutritional pairing supports overall skin resilience?",
    options: [
      "Water + seasonal vitamin-C produce (amla/citrus/carrots) + nuts & seeds",
      "Deep-fried salty snacks all day",
      "Cutting out all vegetables completely",
      "Only drinking sweetened iced tea",
    ],
    correctIndex: 0,
    congratsMessage: "Congrats! Colorful seasonal produce, fluids, and healthy fats make a nourishing winter trio.",
    explanation:
      "Hydration combined with micronutrient-rich produce and natural food fats complements your everyday skincare routine.",
    disclaimer: "General food education; not a substitute for dermatological advice.",
  },
];
