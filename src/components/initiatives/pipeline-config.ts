import {
  Lightbulb, Brain, Users, FileText, Cpu, BookOpen, Hammer, CheckCircle2,
  Shield, Clock, Rocket, XCircle, Archive
} from "lucide-react";

export const PIPELINE_STEPS = [
  { key: "draft", label: "Rascunho", icon: Lightbulb, color: "text-muted-foreground", bg: "bg-muted/20" },
  { key: "discovering", label: "Descobrindo", icon: Brain, color: "text-warning", bg: "bg-warning/10" },
  { key: "discovered", label: "Descoberto", icon: Brain, color: "text-accent", bg: "bg-accent/10" },
  { key: "squad_ready", label: "Squad ▶", icon: Users, color: "text-info", bg: "bg-info/10" },
  { key: "forming_squad", label: "Formando", icon: Users, color: "text-warning", bg: "bg-warning/10" },
  { key: "squad_formed", label: "Squad ✓", icon: Users, color: "text-accent", bg: "bg-accent/10" },
  { key: "planning_ready", label: "Planning ▶", icon: FileText, color: "text-info", bg: "bg-info/10" },
  { key: "planning", label: "Planejando", icon: FileText, color: "text-warning", bg: "bg-warning/10" },
  { key: "planned", label: "Planejado", icon: FileText, color: "text-accent", bg: "bg-accent/10" },
  { key: "in_progress", label: "Execução", icon: Hammer, color: "text-primary", bg: "bg-primary/10" },
  { key: "completed", label: "Concluído", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
];

// Simplified visual pipeline (just the 5 macro stages for the progress bar)
export const MACRO_STAGES = [
  { key: "discovery", label: "Descoberta", icon: Brain },
  { key: "squad", label: "Squad", icon: Users },
  { key: "planning", label: "Planning", icon: FileText },
  { key: "execution", label: "Execução", icon: Hammer },
  { key: "done", label: "Concluído", icon: CheckCircle2 },
];

export function getStepIndex(stageStatus: string): number {
  const idx = PIPELINE_STEPS.findIndex((s) => s.key === stageStatus);
  return idx === -1 ? 0 : idx;
}

export function getMacroStageIndex(stageStatus: string): number {
  const s = stageStatus;
  if (["draft", "discovering", "discovered"].includes(s)) return 0;
  if (["squad_ready", "forming_squad", "squad_formed"].includes(s)) return 1;
  if (["planning_ready", "planning", "planned"].includes(s)) return 2;
  if (["in_progress", "validating", "ready_to_publish"].includes(s)) return 3;
  if (["published", "completed"].includes(s)) return 4;
  return 0;
}

// What action buttons to show based on current stage_status
export type StageAction = {
  stage: string;
  label: string;
  type: "run" | "approve";
};

export function getAvailableActions(stageStatus: string): StageAction[] {
  switch (stageStatus) {
    case "draft":
      return [{ stage: "discovery", label: "Rodar Discovery", type: "run" }];
    case "discovered":
      return [{ stage: "approve", label: "Aprovar Descoberta", type: "approve" }];
    case "squad_ready":
      return [{ stage: "squad_formation", label: "Gerar Squad", type: "run" }];
    case "squad_formed":
      return [{ stage: "approve", label: "Aprovar Squad", type: "approve" }];
    case "planning_ready":
      return [{ stage: "planning", label: "Gerar Planning", type: "run" }];
    case "planned":
      return [{ stage: "approve", label: "Aprovar Planning", type: "approve" }];
    default:
      return [];
  }
}

export const RISK_COLORS: Record<string, string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive/20 text-destructive",
};
