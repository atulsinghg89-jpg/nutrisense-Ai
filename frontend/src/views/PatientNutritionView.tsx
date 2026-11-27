import { PATIENT_NUTRITION_MODULE } from "../data/modules/patientNutrition";
import type { AppView } from "../types/nutrition";
import { ModuleView } from "./ModuleView";

interface PatientNutritionViewProps {
  onNavigate: (view: AppView) => void;
}

export function PatientNutritionView({ onNavigate }: PatientNutritionViewProps) {
  return (
    <ModuleView content={PATIENT_NUTRITION_MODULE} onNavigate={onNavigate} />
  );
}
