// Draft content, needs review.
import type { ModuleContent } from "../../types/modules";

// Draft content, needs review.
// Note: Specific numeric calorie/gram prescriptions and supplement doses are omitted;
// TODO: verify with official guideline if personalized targets are later integrated from clinical standards.
export const MEN_HEALTH_MODULE: ModuleContent = {
  id: "men",
  badge: "Educational Guide • Men's Nutrition",
  title: "Men's Health Nutrition Guide",
  subtitle:
    "Practical, food-first guidance supporting everyday energy, strength upkeep, heart wellness, digestion, and realistic home meal habits.",
  disclaimerTitle: "General Educational Guidance Only",
  disclaimer:
    "This module shares general everyday food and lifestyle education for adult men. It does not replace medical evaluation, blood work interpretation, personalized clinical nutrition plans, or safe training advice from a qualified doctor or registered dietitian.",
  scannerCtaTitle: "Check Your Meal Balance in Seconds",
  scannerCtaDescription:
    "Use the NutriSense AI Food Scanner to inspect protein, fiber-rich vegetables, carbs, and everyday cooking balance on your plate.",
  sections: [
    {
      id: "overview",
      title: "A. Everyday Foundations & Sustainable Energy",
      summary:
        "Consistent, balanced home meals support daily stamina, focus, digestive comfort, and long-term vitality better than extreme short-term diet rules.",
      points: [
        "Build regular meal rhythms around whole foods rather than skipping meals during busy workdays and overeating late at night.",
        "Aim for plate variety across complex carbohydrates, protein foods, colorful vegetables, and moderate healthy fats.",
        "Remember that everyday energy and strength depend on total diet pattern, sleep, stress management, and regular physical movement—no single superfood guarantees vitality or hormone changes.",
      ],
      tags: ["Whole Foods", "Regular Meals", "Long-Term Habits"],
    },
    {
      id: "protein-strength",
      title: "B. Protein & Muscle Upkeep Support",
      summary:
        "Including an approachable source of protein across breakfast, lunch, and dinner supports muscle maintenance, tissue repair, and steadier fullness.",
      points: [
        "Pair plant and dairy combinations common in everyday kitchens, such as dal or rajma with whole grains, paneer, plain curd (dahi), roasted chana, soy chunks, or nuts and seeds.",
        "If eating non-vegetarian foods, include simple preparations like boiled or scrambled eggs, grilled fish, or skinless poultry alongside cooked vegetables.",
        "Distribute protein across morning and midday meals as well as dinner instead of concentrating nearly all protein into one heavy late meal.",
        "Pair adequate protein eating with regular resistance or bodyweight movement, as food works best alongside physical activity.",
      ],
      tags: ["Dal & Pulses", "Eggs / Paneer / Curd", "Fish & Soy", "Even Distribution"],
    },
    {
      id: "heart-metabolic",
      title: "C. Heart & Metabolic Health Habits",
      summary:
        "Early, modest food habits can support healthier blood pressure, cholesterol balance, and steady blood sugar over the years.",
      points: [
        "Fill a larger share of meals with fiber-rich vegetables, seasonal fruits, leafy greens, oats, brown rice, whole wheat, and traditional millets (jowar, bajra, ragi).",
        "Favor unsalted nuts, seeds, and measured cold-pressed or everyday vegetable oils over deep-fried snacks, bakery shortening, and heavily buttered restaurant dishes.",
        "Keep salt modest during cooking and taste food before adding extra salt or salty pickles and chutneys.",
        "Cut back gradually on sugar-sweetened teas/coffees, soft drinks, packaged chips, and refined flour snacks.",
      ],
      caution:
        "Notice: General dietary habits do not substitute for routine blood pressure, lipid, or blood sugar screenings with a healthcare professional.",
      tags: ["Dietary Fiber", "Whole Grains & Millets", "Moderate Salt", "Less Ultra-Processed"],
    },
    {
      id: "indian-swaps",
      title: "D. Smart Everyday Indian & Common Meal Swaps",
      summary:
        "Small, affordable adjustments to familiar meals preserve flavor and cultural satisfaction while improving nutrient density.",
      points: [
        "Tea-time snack swap: Trade deep-fried samosas, namkeen mixtures, or sweet biscuits most days for roasted chana, boiled sprouts chaat, fruit, or a small handful of unsalted peanuts/almonds.",
        "Lunch plate adjustment: Instead of a mound of polished white rice with minimal sides, balance modest rice or whole-wheat rotis with thicker dal, a generous bowl of mixed sabzi, and plain curd or salad.",
        "Breakfast upgrade: Pair poha, upma, or idli with added vegetables, peanuts, sambar, boiled egg, or a glass of unsweetened buttermilk or milk for better morning satiety.",
        "Restaurant & takeaway tip: Pick tandoori/grilled options, dal tadka, and plain roti more often than creamy gravies, double-fried starters, and bottomless sugary beverages.",
      ],
      tags: ["Balanced Thali", "Roasted Chana", "Vegetable Sambar", "Portion Awareness"],
    },
    {
      id: "hydration-recovery",
      title: "E. Hydration & Everyday Recovery Basics",
      summary:
        "Simple fluids and sensible evening habits help recovery after work, heat exposure, or exercise.",
      points: [
        "Make plain drinking water your primary fluid throughout the day, adding unsweetened chaas (buttermilk), nimbu pani without heavy sugar, or clear homemade soups in warm weather.",
        "Be mindful of liquid calories from sweetened sodas, bottled juices, specialty coffees, and commercial energy drinks.",
        "Keep caffeinated drinks earlier in the day if sleep quality suffers, and limit alcohol intake as excess alcohol burdens sleep, liver health, and metabolic balance.",
      ],
      tags: ["Plain Water", "Unsweetened Chaas", "Sleep Hygiene", "Limit Energy Drinks"],
    },
    {
      id: "when-to-seek-care",
      title: "F. When to Seek Individual Guidance",
      summary:
        "Personalized labs and professional medical oversight matter when general wellness education is not enough.",
      points: [
        "Consult a physician or registered dietitian if you experience persistent fatigue, unexplained weight change, digestive discomfort, or chest/breath symptoms.",
        "Ask your clinician for tailored targets if you have elevated blood pressure, cholesterol concerns, diabetes, kidney issues, or before using protein powders, creatine, or herbal boosters.",
        "Avoid restrictive crash diets or unverified extreme meal regimens pushed on social media.",
      ],
      caution:
        "Always check with a qualified clinician before starting dietary supplements—especially if you take regular prescription medications.",
      tags: ["Doctor Review", "Registered Dietitian", "Lab Screening"],
    },
  ],
  sources: [
    {
      label: "WHO — Healthy Diet Fact Sheet",
      url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    },
    {
      label: "ICMR–National Institute of Nutrition (India)",
      url: "https://www.nin.res.in",
    },
    {
      label: "Ministry of Health & Family Welfare (India)",
      url: "https://www.mohfw.gov.in",
    },
    {
      label: "American Heart Association — Healthy Eating",
      url: "https://www.heart.org/en/healthy-living/healthy-eating",
    },
  ],
};
