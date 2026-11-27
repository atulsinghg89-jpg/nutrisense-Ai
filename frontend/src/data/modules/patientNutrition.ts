// Draft content, needs review.
import type { ModuleContent } from "../../types/modules";

// Draft content, needs review.
// Note: Medication/insulin adjustments, exact kidney electrolyte/protein/fluid targets,
// and condition-curing claims are strictly excluded for clinical safety.
// TODO: verify with official guideline if personalized medical nutrition targets are linked with clinician sign-off.
export const PATIENT_NUTRITION_MODULE: ModuleContent = {
  id: "patient",
  badge: "Educational Guide • Patient Food Literacy",
  title: "Patient Nutrition Education",
  subtitle:
    "Clear, non-prescriptive dietary literacy designed to help patients and family caregivers understand food patterns and prepare confident questions for doctors and registered dietitians.",
  disclaimerTitle: "Mandatory Medical Safety Disclaimer",
  disclaimer:
    "Educational use only—NOT medical advice, diagnosis, disease treatment, or individualized medical nutrition therapy. Never use any food guide to alter prescribed medicines, insulin, dialysis schedules, or clinician diet restrictions. Always confirm personal dietary plans with your physician or registered dietitian.",
  scannerCtaTitle: "Inspect Everyday Meals with NutriSense AI",
  scannerCtaDescription:
    "Scan your plate to see general macronutrient patterns so you can discuss realistic daily meals during your next doctor or dietitian checkup.",
  sections: [
    {
      id: "purpose-safety",
      title: "A. Purpose & Medical Safety Boundaries",
      summary:
        "Navigating chronic health conditions or recovery can make food feel overwhelming. Everyday nutrition education helps you understand food groups while leaving treatment decisions strictly with your medical team.",
      points: [
        "No single food, herb, juice, or dietary pattern cures diabetes, heart disease, kidney disease, hypertension, or thyroid disorders.",
        "Individual nutrient needs change significantly based on medications, recent lab reports, age, body weight, and co-existing conditions.",
        "Use the concepts below as background reading to prepare informed questions for your doctor, endocrinologist, cardiologist, nephrologist, or clinical dietitian.",
      ],
      caution:
        "Always check with your care team before adopting restrictive diets, fasting routines, herbal remedies, or nutritional supplements.",
      tags: ["Educational Support", "Care-Team First", "No Self-Treatment"],
    },
    {
      id: "diabetes-support",
      title: "B. Diabetes & Blood Sugar Support (General Education)",
      summary:
        "Public health bodies such as the American Diabetes Association emphasize balanced plates, dietary fiber, carbohydrate quality, and steady meal rhythms rather than starvation.",
      points: [
        "Use visual balance concepts like the Diabetes Plate idea: fill roughly half your plate with non-starchy vegetables (greens, okra, gourds, broccoli, cucumber), one quarter with lean or plant protein (dal, paneer, tofu, eggs, fish), and one quarter with quality carbohydrates (whole grains, millets, brown rice, beans).",
        "Pair carbohydrate foods with fiber, vegetables, or protein to support gentler post-meal blood sugar responses compared with refined carbs eaten alone.",
        "Minimize sugary drinks, sweets, white bakery snacks, and oversized portions of polished grains.",
        "Keep meal timing reasonably consistent, and ask your doctor how your food schedule fits with any prescribed blood glucose medications or insulin to avoid highs or lows.",
      ],
      caution:
        "Never adjust insulin doses or diabetes tablets on your own based on general nutrition reading.",
      tags: ["Non-Starchy Veggies", "Balanced Plate", "Fiber Pairing", "Sync With Doctor"],
    },
    {
      id: "heart-cholesterol",
      title: "C. Heart Health & Cholesterol Awareness",
      summary:
        "Heart-healthy eating focuses on whole plant foods, soluble fiber, modest cooking fats, and fewer ultra-processed or fried foods.",
      points: [
        "Prioritize generous vegetables, whole fruits, oats, whole grains, pulses (beans, chickpeas, lentils), nuts, and seeds—rich in soluble fiber that supports heart wellness.",
        "Use modest quantities of unsaturated oils and limit deep-fried foods, hydrogenated vanaspati/trans fats, fatty processed meats, and rich pastries.",
        "Limit high-sodium packaged foods and prioritize potassium-containing whole produce unless your doctor restricts potassium for kidney or medication reasons.",
      ],
      tags: ["Soluble Fiber", "Limit Fried Foods", "Whole Produce", "Heart Patterns"],
    },
    {
      id: "kidney-care",
      title: "D. Kidney Care Awareness (General Caution Only)",
      summary:
        "Kidney nutrition is highly individualized—what helps one stage or lab profile can be inappropriate for another, so generic internet limits are unsafe to copy.",
      points: [
        "Depending on kidney function, lab values, and whether someone is in early care or on dialysis, doctors and renal dietitians evaluate sodium, potassium, phosphorus, protein, and fluid needs individually.",
        "Reducing ultra-processed foods, fast food, dark colas, and packaged snacks with phosphate additives or hidden salt is commonly discussed—ask your renal team what applies to you.",
        "Never start extreme protein shakes, potassium salt substitutes, herbal detoxes, or strict fluid restriction without specific medical instruction from your nephrologist.",
      ],
      caution:
        "Important: Personalized kidney lab targets (potassium, phosphorus, protein, fluid) must come directly from your kidney doctor or renal dietitian.",
      tags: ["Stage-Specific", "Lab-Guided Care", "Avoid Self-Limits", "Renal Dietitian"],
    },
    {
      id: "thyroid-recovery",
      title: "E. Thyroid & General Recovery Nutrition",
      summary:
        "Steady, nourishing home meals support recovery and general metabolic energy alongside consistent medical follow-up.",
      points: [
        "Eat balanced daily meals containing adequate protein, whole grains, diverse vegetables, and everyday kitchen use of iodized salt in normal moderation—no food replaces prescribed thyroid hormone therapy.",
        "Follow your prescriber's exact instructions on taking thyroid tablets on an empty stomach and waiting before coffee, milk, calcium, or iron supplements so medicine absorbs properly.",
        "Avoid unverified extreme thyroid diets or high-dose kelp/iodine supplements unless medically prescribed, as excess iodine can disrupt thyroid function.",
      ],
      caution:
        "Review timing of supplements (iron, calcium, multivitamins) with your pharmacist or doctor when taking thyroid medication.",
      tags: ["Balanced Meals", "Medication Timing", "Avoid Crash Diets"],
    },
    {
      id: "blood-pressure",
      title: "F. Blood Pressure Support (Low-Sodium Habits)",
      summary:
        "Cutting down excess dietary sodium—mostly from processed, pickled, and restaurant foods—is a core pillar recommended by WHO and heart health guidelines.",
      points: [
        "Notice hidden sodium in packaged snacks, instant noodles, soups, chips, pickles (achaar), papad, soy/chili sauces, processed cheese, and bakery breads.",
        "Season home-cooked food with garlic, ginger, turmeric, cumin, black pepper, fresh coriander, and lemon juice instead of extra table salt.",
        "Ask your doctor before switching to 'low-sodium' potassium salt substitutes, as they can be unsafe alongside certain heart, kidney, or blood pressure medicines.",
      ],
      tags: ["Fresh Home Cooking", "Herbs & Spices", "Spot Hidden Salt"],
    },
    {
      id: "labels-variety",
      title: "G. Nutrition Label Literacy & Everyday Meal Variety",
      summary:
        "Reading packaged food labels calmly empowers smarter grocery swaps across almost every condition.",
      points: [
        "Check serving sizes first on nutrition panels—a small snack pouch may list values per fraction of the pack rather than the whole bag.",
        "Scan the ingredient list for added sugars (syrups, sucrose, dextrose), sodium/salt, refined flour, and hydrogenated/palm oils appearing near the top.",
        "Lean toward minimally processed seasonal staples at home where you control oil, salt, fiber, and portion balance.",
      ],
      tags: ["Serving Sizes", "Ingredient Lists", "Seasonal Staples"],
    },
  ],
  checklistTitle: "Questions to Ask Your Doctor or Dietitian",
  checklistSubtitle:
    "Use this interactive appointment checklist to highlight questions for your next clinic visit. Ticked items are saved only in your browser for convenience.",
  checklistGroups: [
    {
      id: "general-visit",
      title: "1. Overall Care Plan & Labs",
      description: "Establish safe personal boundaries around your lab reports and daily routine.",
      questions: [
        "Which specific nutrients (such as sodium, carbs, protein, potassium, or fluids) do I need to watch based on my latest labs?",
        "Would a referral to a registered dietitian help tailor a realistic home meal plan for my culture and budget?",
        "Are any nutrition supplements, herbal products, or protein powders safe—or risky—with my medications?",
      ],
    },
    {
      id: "sugar-heart-bp",
      title: "2. Blood Sugar, Heart & Blood Pressure",
      description: "Align everyday meals with glucose, cholesterol, and blood pressure medications.",
      questions: [
        "How should my meal and snack timing match my prescribed diabetes or blood pressure medications?",
        "What everyday oil and salt patterns are best for my cholesterol and blood pressure profile?",
        "Are potassium-based salt substitutes safe alongside my current prescriptions?",
      ],
    },
    {
      id: "kidney-thyroid",
      title: "3. Kidney, Thyroid & Special Precautions",
      description: "Verify individualized absorption timing and lab-specific food adjustments.",
      questions: [
        "If I have kidney disease or elevated creatinine, what individualized protein, potassium, or phosphorus guidance applies to my stage?",
        "How long should I separate my thyroid medication from breakfast, coffee, calcium, or iron pills?",
        "Which warning symptoms around meals, hydration, or energy should prompt me to call the clinic sooner?",
      ],
    },
  ],
  sources: [
    {
      label: "American Diabetes Association — Food & Nutrition",
      url: "https://www.diabetes.org/food-nutrition",
    },
    {
      label: "American Heart Association — Healthy Eating",
      url: "https://www.heart.org/en/healthy-living/healthy-eating",
    },
    {
      label: "NIDDK (NIH) — Kidney Disease & Nutrition",
      url: "https://www.niddk.nih.gov/health-information/kidney-disease",
    },
    {
      label: "WHO — Healthy Diet Fact Sheet",
      url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    },
  ],
};
