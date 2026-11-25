import type { HealthierAlternative } from "../types/nutrition";

export interface NutritionCategoryGuide {
  id: "mens-health" | "womens-health" | "baby-nutrition" | "patient-nutrition";
  title: string;
  subtitle: string;
  badge: string;
  accent: "lime" | "mint";
  summary: string;
  macroFocus: {
    label: string;
    detail: string;
  }[];
  priorities: string[];
  smartFoods: string[];
  cautionNote: string;
}

export const NUTRITION_CATEGORIES: NutritionCategoryGuide[] = [
  {
    id: "mens-health",
    title: "Men's Health",
    subtitle: "Muscle preservation, metabolic stamina & cardiovascular support",
    badge: "Educational Guidance",
    accent: "lime",
    summary:
      "Balances complete lean proteins, high-fiber complex carbohydrates, and unsaturated fats to sustain energy, support recovery, and promote long-term cardiometabolic health.",
    macroFocus: [
      { label: "Protein Priority", detail: "25–30% of daily energy from lean poultry, fish, eggs, or legumes" },
      { label: "Fiber Target", detail: "30–38 g/day via oats, quinoa, beans, greens, and berries" },
      { label: "Heart-Healthy Fats", detail: "Omega-3 rich salmon, walnuts, chia, and extra-virgin olive oil" },
    ],
    priorities: [
      "Include magnesium, potassium, and zinc sources (pumpkin seeds, spinach, lentils).",
      "Limit ultra-processed meats, refined sugars, and excess sodium.",
      "Pair resistance activity with evenly spaced protein across meals.",
    ],
    smartFoods: ["Grilled Salmon", "Greek Yogurt", "Steel-Cut Oats", "Edamame", "Avocado", "Spinach"],
    cautionNote:
      "Educational guidance only. Individual calorie and protein needs vary with age, body composition, and activity level.",
  },
  {
    id: "womens-health",
    title: "Women's Health",
    subtitle: "Iron & folate replenishment, bone density & balanced daily energy",
    badge: "Educational Guidance",
    accent: "mint",
    summary:
      "Emphasizes bioavailable iron, calcium, vitamin D, folate, and steady blood-sugar balance across different life stages and activity rhythms.",
    macroFocus: [
      { label: "Micronutrient Density", detail: "Iron + Vitamin C pairings, folate-rich greens, and calcium sources" },
      { label: "Balanced Macros", detail: "Steady complex carbs paired with protein and healthy fats at every meal" },
      { label: "Bone Support", detail: "Calcium-rich dairy or fortified plant milks, sardines, tofu, and sesame" },
    ],
    priorities: [
      "Pair plant iron (lentils, chickpeas, spinach) with vitamin C (citrus, bell peppers) for better absorption.",
      "Prioritize omega-3 fatty acids and colorful polyphenols for inflammatory balance.",
      "Keep hydration consistent throughout the day to support energy and digestion.",
    ],
    smartFoods: ["Lentil Bowl", "Fortified Tofu", "Chia Pudding", "Wild Sardines", "Bell Peppers", "Broccoli"],
    cautionNote:
      "Educational guidance only. Pregnancy, postpartum, and anemia care require tailored medical and dietitian guidance.",
  },
  {
    id: "baby-nutrition",
    title: "Baby Nutrition",
    subtitle: "Complementary feeding milestones, iron-rich textures & safe prep",
    badge: "Educational Guidance",
    accent: "lime",
    summary:
      "Focuses on nutrient-dense, age-appropriate textures during the 6–24 month complementary feeding window alongside breast milk or infant formula.",
    macroFocus: [
      { label: "First Foods (6+ mo)", detail: "Iron-rich purees or soft mashed meats, lentils, and fortified cereals" },
      { label: "Healthy Brain Fats", detail: "Mashed avocado, full-fat plain yogurt, and soft flaked fish" },
      { label: "Zero Added Sugar/Salt", detail: "Natural whole-food flavors without added salt, honey (<12 mo), or syrups" },
    ],
    priorities: [
      "Never give honey to infants under 12 months of age due to infant botulism risk.",
      "Modify firm foods (grapes, nuts, raw carrots) into smooth purees or safe soft pieces to prevent choking.",
      "Introduce common allergens one at a time in age-safe textures as advised by your pediatrician.",
    ],
    smartFoods: ["Mashed Avocado", "Iron-Fortified Oats", "Soft Steamed Sweet Potato", "Pureed Lentils", "Plain Yogurt"],
    cautionNote:
      "Educational guidance only. Always follow your pediatrician's developmental readiness cues and feeding plan.",
  },
  {
    id: "patient-nutrition",
    title: "Patient Nutrition",
    subtitle: "Gentle recovery meals, glycemic steadiness & hydration support",
    badge: "Educational Guidance",
    accent: "mint",
    summary:
      "Highlights easily digestible protein, steady low-glycemic carbohydrates, and sodium-conscious whole ingredients designed to support everyday recovery routines.",
    macroFocus: [
      { label: "Gentle Protein", detail: "Soft-cooked eggs, poached fish, tofu, strained yogurt, or smooth broths" },
      { label: "Glycemic Balance", detail: "High-fiber non-starchy vegetables paired with modest whole grains" },
      { label: "Hydration & Electrolytes", detail: "Water, herbal infusions, and low-sodium vegetable broths" },
    ],
    priorities: [
      "Favor steamed, poached, or baked preparation over deep-fried or heavily spiced dishes.",
      "Keep portions smaller and more frequent if appetite is reduced during recovery.",
      "Monitor sodium, potassium, and fluid limits closely if managing kidney, cardiac, or diabetic care.",
    ],
    smartFoods: ["Poached Cod", "Low-Sodium Broth", "Steamed Zucchini", "Oat Porridge", "Soft Scrambled Eggs", "Berries"],
    cautionNote:
      "Educational guidance only — not medical nutrition therapy. Always follow your physician or clinical dietitian's prescriptions.",
  },
];

export const SAMPLE_ALTERNATIVES: HealthierAlternative[] = [
  {
    name: "Air-Popped Herb Popcorn",
    replaces: "Deep-Fried Potato Chips",
    reason: "Whole-grain fiber volume cuts saturated fat by over 80% while keeping a crisp, savory crunch.",
    estimated_calories: 110,
    protein: 3.5,
    carbs: 21,
    fats: 1.5,
  },
  {
    name: "Baked Veggie & Beet Crisps",
    replaces: "Deep-Fried Potato Chips",
    reason: "Oven-baked root vegetables preserve potassium and phytonutrients without heavy frying oils.",
    estimated_calories: 130,
    protein: 2.0,
    carbs: 22,
    fats: 3.5,
  },
  {
    name: "Oven-Baked Sweet Potato Chips",
    replaces: "Deep-Fried Potato Chips",
    reason: "Provides beta-carotene (vitamin A) and steady fiber with significantly lower total fat per serving.",
    estimated_calories: 135,
    protein: 2.2,
    carbs: 24,
    fats: 3.2,
  },
];
