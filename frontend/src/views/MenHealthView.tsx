import { MEN_HEALTH_MODULE } from "../data/modules/menHealth";
import type { AppView } from "../types/nutrition";
import { ModuleView } from "./ModuleView";

interface MenHealthViewProps {
  onNavigate: (view: AppView) => void;
}

export function MenHealthView({ onNavigate }: MenHealthViewProps) {
  return <ModuleView content={MEN_HEALTH_MODULE} onNavigate={onNavigate} />;
}
