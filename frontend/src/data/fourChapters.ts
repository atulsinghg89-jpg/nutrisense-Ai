import type { NutritionCategoryGuide } from "./categories";
import type { AccountProfileType, AudienceChapterId } from "../types/nutrition";

export interface AudienceChapterCard {
  id: AudienceChapterId;
  chapterNumber: string;
  title: string;
  tagline: string;
  imagePath: string;
  imageAlt: string;
  imageFocusClass: string;
  accentColor: string;
  badgeText: string;
  intro: string;
  highlights: string[];
  linkedCategoryId: NutritionCategoryGuide["id"];
  suggestedProfileType: AccountProfileType;
  safetyNote: string;
}

export const FOUR_AUDIENCE_CHAPTERS: AudienceChapterCard[] = [
  {
    id: "men",
    chapterNumber: "Chapter 01",
    title: "Men's Health",
    tagline: "Strength, metabolic vitality & sustainable fuel",
    imagePath: "/images/chapter-men.jpg",
    imageAlt: "Adult man in gym fitness mirror representing Men's Health nutrition chapter",
    imageFocusClass: "object-cover object-center",
    accentColor: "#A3FF12",
    badgeText: "Personal Nutrition",
    intro:
      "Track daily protein timing, whole-grain energy balance, hydration, and active training recovery without guesswork.",
    highlights: [
      "Complete protein & fiber pacing across Indian and global meals",
      "Activity duration logs alongside optional custom targets",
    ],
    linkedCategoryId: "mens-health",
    suggestedProfileType: "personal",
    safetyNote:
      "Informational tracking — adjust intake to age, body weight, and clinician guidance.",
  },
  {
    id: "women",
    chapterNumber: "Chapter 02",
    title: "Women's Wellness",
    tagline: "Mind-body equilibrium, iron & steady daily rhythm",
    imagePath: "/images/chapter-women.jpg",
    imageAlt: "Mind, body, and holistic lifestyle wellness portrait for Women's Wellness chapter",
    imageFocusClass: "object-cover object-center",
    accentColor: "#FDA4AF",
    badgeText: "Women's Sanctuary",
    intro:
      "Support iron + vitamin C absorption, bone-building calcium, daily hydration, cycle tracking, and calm holistic energy.",
    highlights: [
      "Micronutrient tracking for iron, calcium, and folate-rich bowls",
      "Period Care Garden, gentle yoga, and daily hydration support",
    ],
    linkedCategoryId: "womens-health",
    suggestedProfileType: "personal",
    safetyNote:
      "Pregnancy, lactation, or anemia care should follow OB-GYN or registered dietitian advice.",
  },
  {
    id: "babies",
    chapterNumber: "Chapter 03",
    title: "Babies & Children",
    tagline: "Safe complementary meals, iron & texture milestones",
    imagePath: "/images/chapter-babies.jpg",
    imageAlt: "Toddler enjoying fresh steamed broccoli, carrots, and berries safely",
    imageFocusClass: "object-cover object-top",
    accentColor: "#FCD34D",
    badgeText: "Pediatric Safety Mode",
    intro:
      "Dedicated baby and child profiles follow developmental readiness cues, safe soft textures, allergens, and gentle fluid habits.",
    highlights: [
      "Age-based honey restriction (<12 months) & safe-texture reminders",
      "Iron-rich, nutrient-dense first foods alongside milk feeding",
    ],
    linkedCategoryId: "baby-nutrition",
    suggestedProfileType: "baby",
    safetyNote:
      "Educational caregiver log only — follow pediatrician & WHO/IAP infant feeding milestones.",
  },
  {
    id: "patients",
    chapterNumber: "Chapter 04",
    title: "Patient Nutrition",
    tagline: "Careful recovery logs & clinician-ready meal literacy",
    imagePath: "/images/chapter-patients.jpg",
    imageAlt: "Clinician conversing warmly with patient in calm recovery setting",
    imageFocusClass: "object-cover object-top",
    accentColor: "#38BDF8",
    badgeText: "Non-Diagnostic Care Log",
    intro:
      "Track sodium, potassium, sugars, fibre, fluids, and medication-day meal timings clearly for clinician or dietitian visits.",
    highlights: [
      "Strictly separates food allergies from condition awareness notes",
      "Structured daily summary ready for medical care consultations",
    ],
    linkedCategoryId: "patient-nutrition",
    suggestedProfileType: "patient",
    safetyNote:
      "Non-diagnostic tracking only — NutriSense AI does not diagnose or prescribe medical diets.",
  },
];
