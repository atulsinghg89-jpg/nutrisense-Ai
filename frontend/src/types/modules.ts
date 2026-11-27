export type ModuleId = "men" | "baby" | "patient";

export interface ModuleSection {
  id: string;
  title: string;
  summary: string;
  points: string[];
  caution?: string;
  tags?: string[];
}

export interface ModuleAgeStage {
  id: string;
  ageRange: string;
  title: string;
  focusLabel: string;
  highlights: string[];
  safetyCue: string;
}

export interface ModuleChecklistGroup {
  id: string;
  title: string;
  description: string;
  questions: string[];
}

export interface ModuleSource {
  label: string;
  url: string;
}

export interface ModuleContent {
  id: ModuleId;
  badge: string;
  title: string;
  subtitle: string;
  disclaimerTitle: string;
  disclaimer: string;
  scannerCtaTitle: string;
  scannerCtaDescription: string;
  sections: ModuleSection[];
  ageStages?: ModuleAgeStage[];
  checklistTitle?: string;
  checklistSubtitle?: string;
  checklistGroups?: ModuleChecklistGroup[];
  sources: ModuleSource[];
}
