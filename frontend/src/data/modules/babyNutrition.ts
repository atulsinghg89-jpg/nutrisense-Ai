// Draft content, needs review.
import type { ModuleContent } from "../../types/modules";

// Draft content, needs review.
// Note: Exact ounce/gram feeding quantities, daily water mL targets, choking food specifics,
// and home allergen dosing schedules are intentionally omitted for pediatric safety.
// TODO: verify with official guideline if clinician-approved pediatric ranges are needed later.
export const BABY_NUTRITION_MODULE: ModuleContent = {
  id: "baby",
  badge: "Educational Guide • Infant & Child Nutrition",
  title: "Babies & Children's Nutrition Guide",
  subtitle:
    "Gentle, age-stage educational nutrition principles from early infancy through pre-teen growth—focused on developmental readiness, safe textures, variety, and calm mealtime habits.",
  disclaimerTitle: "Important Pediatric Safety Notice",
  disclaimer:
    "Always consult your pediatrician or child health specialist before introducing solid foods, switching milk feeds, adding dietary supplements, or managing suspected food allergies, growth concerns, or chronic feeding challenges.",
  scannerCtaTitle: "Review Family Meal Balance",
  scannerCtaDescription:
    "Use the NutriSense AI Food Scanner to inspect home-cooked meals and explore whole food groups for toddlers and older family members.",
  ageStages: [
    {
      id: "0-6-months",
      ageRange: "0–6 Months",
      title: "Milk-First Foundation",
      focusLabel: "Early Infancy",
      highlights: [
        "World Health Organization, AAP, and NHS guidance highlight exclusive breastfeeding (or pediatrician-guided iron-fortified infant formula when needed) during the first 6 months.",
        "No plain water, teas, honey, cow's milk as a main drink, or solid foods are introduced during early infancy unless specifically directed by a doctor.",
      ],
      safetyCue:
        "Follow feeding cues calmly and check newborn weight/wet diaper trends with your pediatrician.",
    },
    {
      id: "6-12-months",
      ageRange: "6–12 Months",
      title: "Readiness & First Complementary Foods",
      focusLabel: "Transition Stage",
      highlights: [
        "Begin soft, nutrient-rich complementary foods around 6 months once developmental readiness signs appear, while breast milk or infant formula remains essential.",
        "Prioritize natural iron-rich choices and gradually widen colors, soft mashed textures, and family flavors without added salt or sugar.",
      ],
      safetyCue:
        "Keep baby upright and supervised; never offer honey under 1 year of age.",
    },
    {
      id: "1-3-years",
      ageRange: "1–3 Years",
      title: "Toddler Textures & Routine Meals",
      focusLabel: "Early Childhood",
      highlights: [
        "Shift steadily toward family foods prepared with soft textures, predictable sit-down meal and snack times, and calm exploration.",
        "Appetite naturally fluctuates from day to day as growth slows slightly after year one—focus on weekly variety rather than forcing clean plates.",
      ],
      safetyCue:
        "Serve small, easy-to-chew pieces while seated; limit sugary drinks and salty snacks.",
    },
    {
      id: "4-8-years",
      ageRange: "4–8 Years",
      title: "School-Age Balanced Plates",
      focusLabel: "Foundation Growth",
      highlights: [
        "Pair whole grains, dals, vegetables, fruits, and dairy or calcium/protein foods in home meals and school lunchboxes.",
        "Encourage plain water as the default drink and build curiosity about colorful produce without labels like 'good' or 'bad' foods.",
      ],
      safetyCue:
        "Watch out for excessive sugary cereals, packaged snacks, and caffeinated drinks.",
    },
    {
      id: "9-12-years",
      ageRange: "9–12 Years",
      title: "Active Pre-Teen Fueling",
      focusLabel: "Growing Independence",
      highlights: [
        "Support steady growth, active play, and school concentration with regular breakfast, nutrient-dense snacks, protein variety, iron sources, and calcium-rich foods.",
        "Model balanced eating and body neutrality while keeping family meals warm and supportive rather than restrictive.",
      ],
      safetyCue:
        "Never place children or pre-teens on restrictive crash diets; consult a clinician for growth questions.",
    },
  ],
  sections: [
    {
      id: "stage-overview",
      title: "A. Overview & Age-Stage Approach",
      summary:
        "Nutritional needs shift rapidly across infancy and childhood, so food textures, safety practices, and meal routines should match a child's developmental stage—not rigid comparison tables.",
      points: [
        "Every baby and child grows along their own curve tracked best by your pediatrician over regular checkups.",
        "Practice responsive feeding: parents and caregivers provide safe, nutritious foods at predictable times, while the child learns to recognize hunger and fullness cues.",
        "Prioritize home-prepared whole foods with minimal added salt, refined sugars, and artificial additives whenever feasible.",
      ],
      tags: ["Responsive Feeding", "Developmental Pace", "Whole Food Variety"],
    },
    {
      id: "milk-solids",
      title: "B. Milk Feeding & Starting Solids",
      summary:
        "Major pediatric and public health guidelines (WHO, AAP, NHS) recommend milk-only feeding in early infancy before beginning solids around 6 months when readiness signs are clear.",
      points: [
        "Look for developmental readiness cues before starting solids around 6 months: steady head and neck control, ability to sit with minimal support in a feeding chair, reduced tongue-thrust reflex, and clear curiosity when others eat.",
        "When starting solids, begin with soft, iron-rich foods (such as well-mashed lentils/dal, iron-fortified infant cereals, mashed cooked vegetables, or well-cooked soft egg/meat depending on family food culture).",
        "Continue breast milk or infant formula alongside complementary foods through the first year (WHO supports continued breastfeeding alongside balanced solids up to 2 years or beyond if desired).",
        "Wait until after 12 months before offering plain whole cow's milk as a main drink (small amounts cooked in yogurt/food earlier can be discussed with your doctor).",
      ],
      tags: ["Readiness Cues", "Iron-Rich Start", "Milk Foundation"],
    },
    {
      id: "textures-safety",
      title: "C. Texture Progression & Safety Awareness",
      summary:
        "Advancing textures gently builds chewing confidence, while foundational kitchen safety protects infants and young toddlers.",
      points: [
        "Move progressively from smooth purées toward mashed, soft lumpy foods, and eventually soft finger foods as the infant develops pincer grasp and chewing coordination.",
        "Always seat infants and young children upright and stay within arm's reach and sight during eating—never feed while reclining, running, or crying.",
        "Never give honey to infants under 12 months of age due to the serious risk of infant botulism (per AAP and NHS guidance).",
        "Prepare foods safely by cooking hard fruits and vegetables until soft and discussing age-safe food preparation and choking-risk prevention directly with your pediatrician.",
        "Avoid adding salt or sugar to infant foods to protect developing kidneys and shape natural taste preferences.",
      ],
      caution:
        "Caution: Ask your pediatrician for specific safe-food cutting and choking-prevention guidance tailored to your child's chewing readiness.",
      tags: ["Seated Supervision", "No Honey < 1 Yr", "No Added Salt/Sugar"],
    },
    {
      id: "growing-habits",
      title: "D. Healthy Growing-Child Eating Habits",
      summary:
        "Repeated exposure to diverse foods in a relaxed home setting sets the stage for balanced lifelong eating.",
      points: [
        "Include foods from multiple everyday groups across the week: grains/millets, dals/beans or protein foods, vegetables, fruits, and dairy or pediatrician-appropriate calcium foods.",
        "Make water (or milk/formula as appropriate for age) the everyday drink instead of sweetened fruit punches, flavored sodas, or packaged dessert drinks.",
        "Eat together as a family when possible—children naturally imitate what caregivers eat enthusiastically.",
      ],
      tags: ["Colorful Plates", "Water First", "Family Meals"],
    },
    {
      id: "allergy-awareness",
      title: "E. Allergy Awareness (General Safety Only)",
      summary:
        "Caregivers should learn common allergen signs and work directly with their pediatrician rather than attempting unguided testing at home.",
      points: [
        "Be aware that common childhood allergens include cow's milk dairy, eggs, peanuts, tree nuts, soy, wheat, sesame, fish, and shellfish.",
        "If your baby has severe eczema, a known food reaction, or a strong family history of food allergies, talk to your pediatrician before introducing potential allergens so they can guide safe timing and medical support.",
        "Seek prompt medical care for symptoms such as hives, facial or lip swelling, persistent vomiting, breathing difficulty, or sudden lethargy after eating.",
      ],
      caution:
        "Do not run home allergen-testing challenges on your own; consult your pediatrician for personalized allergy guidance.",
      tags: ["Pediatric Guidance", "Watch Reactions", "Emergency Awareness"],
    },
    {
      id: "picky-eating",
      title: "F. Picky Eating & Positive Mealtimes",
      summary:
        "Toddler food refusal is a normal developmental phase of independence—calm patience helps far more than pressure.",
      points: [
        "Avoid pressuring, scolding, force-feeding, or bribing with dessert, which can heighten mealtime anxiety and worsen picky habits.",
        "Pair one familiar, accepted food alongside a very small tasting portion of a newer family food without pressure to finish.",
        "Keep snack timing structured so children arrive at main meals mildly hungry rather than grazing all afternoon on biscuits or milk.",
      ],
      tags: ["Calm Structure", "No Food Pressure", "Gentle Exposure"],
    },
    {
      id: "pediatric-consultation",
      title: "G. Mandatory Pediatrician Consultation Notice",
      summary:
        "Online guides never see your child's growth chart, medical background, or developmental milestones.",
      points: [
        "Contact your pediatrician before starting vitamin drops, iron/calcium supplements, special formulas, or restrictive diets (such as dairy-free or gluten-free plans).",
        "Seek prompt evaluation if you notice poor weight gain, difficulty swallowing or gagging often, chronic diarrhea/constipation, signs of dehydration, or suspected food allergies.",
      ],
      caution:
        "This section is strictly educational and does not replace regular pediatric well-child checkups or urgent medical care.",
      tags: ["Well-Child Visits", "Growth Chart", "Doctor First"],
    },
  ],
  sources: [
    {
      label: "WHO — Infant and Young Child Feeding",
      url: "https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding",
    },
    {
      label: "UK NHS — Weaning and Feeding Guide",
      url: "https://www.nhs.uk/conditions/baby/weaning-and-feeding",
    },
    {
      label: "AAP HealthyChildren — Nutrition & Parenting",
      url: "https://www.healthychildren.org",
    },
    {
      label: "ICMR–National Institute of Nutrition (India)",
      url: "https://www.nin.res.in",
    },
  ],
};
