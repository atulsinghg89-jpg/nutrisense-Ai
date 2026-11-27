import { BABY_NUTRITION_MODULE } from "../data/modules/babyNutrition";
import type { AppView } from "../types/nutrition";
import { ModuleView } from "./ModuleView";

interface BabyNutritionViewProps {
  onNavigate: (view: AppView) => void;
}

export function BabyNutritionView({ onNavigate }: BabyNutritionViewProps) {
  return <ModuleView content={BABY_NUTRITION_MODULE} onNavigate={onNavigate} />;
}
