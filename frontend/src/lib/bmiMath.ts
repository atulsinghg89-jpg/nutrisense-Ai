/**
 * Supportive BMI & Youth BMI-for-Age Assessment Helper.
 *
 * Uses official CDC 2000 LMS parameters for ages 5–19 (Sex & Age-specific percentiles)
 * so minors (<18) are NEVER evaluated with fixed adult BMI cutoffs.
 */

export interface BmiAssessmentResult {
  bmi: number;
  mode: "youth_percentile" | "adult_informational" | "infant_pediatric_defer";
  headline: string;
  percentile: number | null;
  referenceNote: string;
  limitations: string[];
}

interface LmsRow {
  ageYears: number;
  L: number;
  M: number;
  S: number;
}

// CDC BMI-for-Age LMS midpoint values (female / male) for ages 5 to 19
const CDC_FEMALE_LMS: LmsRow[] = [
  { ageYears: 5, L: -2.011, M: 15.24, S: 0.097 },
  { ageYears: 6, L: -2.142, M: 15.27, S: 0.105 },
  { ageYears: 7, L: -2.238, M: 15.49, S: 0.114 },
  { ageYears: 8, L: -2.288, M: 15.86, S: 0.123 },
  { ageYears: 9, L: -2.288, M: 16.36, S: 0.132 },
  { ageYears: 10, L: -2.244, M: 16.96, S: 0.14 },
  { ageYears: 11, L: -2.17, M: 17.64, S: 0.146 },
  { ageYears: 12, L: -2.085, M: 18.36, S: 0.15 },
  { ageYears: 13, L: -2.008, M: 19.08, S: 0.153 },
  { ageYears: 14, L: -1.948, M: 19.74, S: 0.154 },
  { ageYears: 15, L: -1.908, M: 20.31, S: 0.155 },
  { ageYears: 16, L: -1.891, M: 20.78, S: 0.155 },
  { ageYears: 17, L: -1.896, M: 21.14, S: 0.156 },
  { ageYears: 18, L: -1.919, M: 21.41, S: 0.157 },
  { ageYears: 19, L: -1.954, M: 21.6, S: 0.158 },
];

const CDC_MALE_LMS: LmsRow[] = [
  { ageYears: 5, L: -1.693, M: 15.42, S: 0.088 },
  { ageYears: 6, L: -1.884, M: 15.43, S: 0.095 },
  { ageYears: 7, L: -2.075, M: 15.61, S: 0.104 },
  { ageYears: 8, L: -2.242, M: 15.96, S: 0.114 },
  { ageYears: 9, L: -2.369, M: 16.43, S: 0.123 },
  { ageYears: 10, L: -2.444, M: 16.98, S: 0.132 },
  { ageYears: 11, L: -2.463, M: 17.6, S: 0.139 },
  { ageYears: 12, L: -2.429, M: 18.27, S: 0.144 },
  { ageYears: 13, L: -2.356, M: 18.97, S: 0.147 },
  { ageYears: 14, L: -2.264, M: 19.68, S: 0.149 },
  { ageYears: 15, L: -2.172, M: 20.39, S: 0.15 },
  { ageYears: 16, L: -2.094, M: 21.08, S: 0.151 },
  { ageYears: 17, L: -2.043, M: 21.74, S: 0.152 },
  { ageYears: 18, L: -2.028, M: 22.36, S: 0.154 },
  { ageYears: 19, L: -2.054, M: 22.92, S: 0.156 },
];

function standardNormalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

function interpolateLms(rows: LmsRow[], age: number): LmsRow {
  const clamped = Math.max(5, Math.min(19, age));
  const lowerIdx = Math.floor(clamped) - 5;
  const upperIdx = Math.min(rows.length - 1, Math.ceil(clamped) - 5);
  if (lowerIdx === upperIdx) return rows[lowerIdx];
  const frac = clamped - Math.floor(clamped);
  const a = rows[lowerIdx];
  const b = rows[upperIdx];
  return {
    ageYears: clamped,
    L: a.L + (b.L - a.L) * frac,
    M: a.M + (b.M - a.M) * frac,
    S: a.S + (b.S - a.S) * frac,
  };
}

export function calculateSupportiveBmi(params: {
  heightCm: number;
  weightKg: number;
  ageYears: number | null;
  sexContext?: "female" | "male";
}): BmiAssessmentResult {
  const heightM = Math.max(0.4, params.heightCm / 100);
  const bmi = Math.round((params.weightKg / (heightM * heightM)) * 10) / 10;

  if (params.ageYears !== null && params.ageYears < 5) {
    return {
      bmi,
      mode: "infant_pediatric_defer",
      headline: "Pediatric Growth Curve Recommended",
      percentile: null,
      referenceNote:
        "For children under 5, WHO/IAP pediatric length-for-age and weight-for-length charts tracked with your pediatrician are required instead of BMI thresholds.",
      limitations: [
        "Numeric BMI alone is never interpreted for infants or toddlers.",
      ],
    };
  }

  if (params.ageYears !== null && params.ageYears < 18) {
    const table = params.sexContext === "male" ? CDC_MALE_LMS : CDC_FEMALE_LMS;
    const { L, M, S } = interpolateLms(table, params.ageYears);
    const z = (Math.pow(bmi / M, L) - 1) / (L * S);
    const percentile = Math.max(1, Math.min(99, Math.round(standardNormalCdf(z) * 100)));

    let band = "Between 5th and 85th CDC percentile";
    if (percentile < 5) band = "Below 5th CDC BMI-for-age percentile";
    else if (percentile >= 95) band = "At or above 95th CDC BMI-for-age percentile";
    else if (percentile >= 85) band = "85th to <95th CDC BMI-for-age percentile";

    return {
      bmi,
      mode: "youth_percentile",
      headline: `~${percentile}th Percentile (Youth BMI-for-Age)`,
      percentile,
      referenceNote: `${band} for age ${params.ageYears} yrs (${
        params.sexContext === "male" ? "male" : "female"
      } CDC growth reference).`,
      limitations: [
        "Under age 18, growth spurts and puberty timing shift body composition naturally.",
        "Percentiles are informational screening cues to review with a pediatrician — not a diagnosis or weight mandate.",
      ],
    };
  }

  return {
    bmi,
    mode: "adult_informational",
    headline: `BMI ${bmi} kg/m² (Informational Context)`,
    percentile: null,
    referenceNote:
      "General population screening metric only. NutriSense AI never recommends dieting, weight loss, or exercise regimens from BMI alone.",
    limitations: [
      "Does not distinguish muscle mass from adipose tissue or reflect hydration shifts during your cycle.",
      "Standard global cutoffs vary across South Asian and diverse body frames — discuss metabolic markers with a clinician.",
    ],
  };
}
