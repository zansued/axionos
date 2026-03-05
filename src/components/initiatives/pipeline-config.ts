import {
  Lightbulb, Brain, Users, FileText, Cpu, BookOpen, Hammer, CheckCircle2,
  Shield, Clock, Rocket, XCircle, Archive, GitBranch, Layers, ShieldCheck
} from "lucide-react";

export const PIPELINE_STEPS = [
  { key: "draft", label: "Rascunho", icon: Lightbulb, color: "text-muted-foreground", bg: "bg-muted/20" },
  { key: "discovering", label: "Compreensão", icon: Brain, color: "text-warning", bg: "bg-warning/10" },
  { key: "discovered", label: "Compreendido", icon: Brain, color: "text-accent", bg: "bg-accent/10" },
  { key: "architecture_ready", label: "Arquitetura ▶", icon: Layers, color: "text-info", bg: "bg-info/10" },
  { key: "architecting", label: "Arquitetando", icon: Layers, color: "text-warning", bg: "bg-warning/10" },
  { key: "architected", label: "Arquitetado", icon: Layers, color: "text-accent", bg: "bg-accent/10" },
  { key: "simulating_architecture", label: "Simulação", icon: Layers, color: "text-warning", bg: "bg-warning/10" },
  { key: "architecture_simulated", label: "Simulado", icon: Layers, color: "text-accent", bg: "bg-accent/10" },
  { key: "validating_architecture", label: "Validação Preventiva", icon: ShieldCheck, color: "text-warning", bg: "bg-warning/10" },
  { key: "architecture_validated", label: "Arquitetura Validada", icon: ShieldCheck, color: "text-accent", bg: "bg-accent/10" },
  { key: "scaffolding", label: "Scaffold ▶", icon: Hammer, color: "text-warning", bg: "bg-warning/10" },
  { key: "scaffolded", label: "Scaffold ✓", icon: Hammer, color: "text-accent", bg: "bg-accent/10" },
  { key: "squad_ready", label: "Squad ▶", icon: Users, color: "text-info", bg: "bg-info/10" },
  { key: "forming_squad", label: "Formando", icon: Users, color: "text-warning", bg: "bg-warning/10" },
  { key: "squad_formed", label: "Squad ✓", icon: Users, color: "text-accent", bg: "bg-accent/10" },
  { key: "planning_ready", label: "Planning ▶", icon: FileText, color: "text-info", bg: "bg-info/10" },
  { key: "planning", label: "Planejando", icon: FileText, color: "text-warning", bg: "bg-warning/10" },
  { key: "planned", label: "Planejado", icon: FileText, color: "text-accent", bg: "bg-accent/10" },
  { key: "in_progress", label: "Execução", icon: Hammer, color: "text-primary", bg: "bg-primary/10" },
  { key: "validating", label: "Validação", icon: Shield, color: "text-warning", bg: "bg-warning/10" },
  { key: "ready_to_publish", label: "Pronto", icon: Rocket, color: "text-accent", bg: "bg-accent/10" },
  { key: "published", label: "Publicado", icon: GitBranch, color: "text-primary", bg: "bg-primary/10" },
  { key: "completed", label: "Concluído", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
];

export const MACRO_STAGES = [
  { key: "discovery", label: "Compreensão", icon: Brain },
  { key: "architecture", label: "Arquitetura", icon: Layers },
  { key: "simulation", label: "Simulação", icon: Layers },
  { key: "preventive_validation", label: "Validação Preventiva", icon: ShieldCheck },
  { key: "scaffold", label: "Scaffold", icon: Hammer },
  { key: "squad", label: "Squad", icon: Users },
  { key: "planning", label: "Planning", icon: FileText },
  { key: "execution", label: "Execução", icon: Hammer },
  { key: "validation", label: "Validação", icon: Shield },
  { key: "publish", label: "Publicação", icon: GitBranch },
  { key: "done", label: "Concluído", icon: CheckCircle2 },
];

export function getStepIndex(stageStatus: string): number {
  const idx = PIPELINE_STEPS.findIndex((s) => s.key === stageStatus);
  return idx === -1 ? 0 : idx;
}

export function getMacroStageIndex(stageStatus: string): number {
  const s = stageStatus;
  if (["draft", "discovering", "discovered"].includes(s)) return 0;
  if (["architecture_ready", "architecting", "architected"].includes(s)) return 1;
  if (["simulating_architecture", "architecture_simulated"].includes(s)) return 2;
  if (["validating_architecture", "architecture_validated"].includes(s)) return 3;
  if (["scaffolding", "scaffolded"].includes(s)) return 4;
  if (["squad_ready", "forming_squad", "squad_formed"].includes(s)) return 5;
  if (["planning_ready", "planning", "planned"].includes(s)) return 6;
  if (["in_progress"].includes(s)) return 7;
  if (["validating", "ready_to_publish"].includes(s)) return 8;
  if (["published"].includes(s)) return 9;
  if (["completed"].includes(s)) return 10;
  return 0;
}

export type StageAction = {
  stage: string;
  label: string;
  type: "run" | "approve" | "reject" | "publish";
};

export function getAvailableActions(stageStatus: string): StageAction[] {
  switch (stageStatus) {
    case "draft":
      return [{ stage: "comprehension", label: "Iniciar Compreensão (4 agentes)", type: "run" }];
    case "discovering":
      return [
        { stage: "comprehension", label: "Re-executar Compreensão", type: "run" },
      ];
    case "discovered":
      return [
        { stage: "approve", label: "Aprovar Compreensão", type: "approve" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "architecture_ready":
      return [{ stage: "architecture", label: "Iniciar Arquitetura (4 agentes)", type: "run" }];
    case "architecting":
      return [
        { stage: "architecture", label: "Re-executar Arquitetura", type: "run" },
      ];
    case "architected":
      return [
        { stage: "architecture_simulation", label: "🌀 Simulação de Arquitetura", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "simulating_architecture":
      return [
        { stage: "architecture_simulation", label: "Re-executar Simulação", type: "run" },
      ];
    case "architecture_simulated":
      return [
        { stage: "preventive_validation", label: "🛡️ Validação Preventiva", type: "run" },
        { stage: "architecture_simulation", label: "Re-executar Simulação", type: "run" },
        { stage: "approve", label: "Aprovar (pular validação)", type: "approve" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "validating_architecture":
      return [
        { stage: "preventive_validation", label: "Re-executar Validação Preventiva", type: "run" },
      ];
    case "architecture_validated":
      return [
        { stage: "foundation_scaffold", label: "🏗️ Gerar Foundation Scaffold", type: "run" },
        { stage: "approve", label: "Aprovar (pular scaffold)", type: "approve" },
        { stage: "preventive_validation", label: "Re-executar Validação", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "scaffolding":
      return [
        { stage: "foundation_scaffold", label: "Re-executar Scaffold", type: "run" },
      ];
    case "scaffolded":
      return [
        { stage: "approve", label: "Aprovar Scaffold", type: "approve" },
        { stage: "foundation_scaffold", label: "Re-gerar Scaffold", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "squad_ready":
      return [{ stage: "squad_formation", label: "Gerar Squad", type: "run" }];
    case "forming_squad":
      return [
        { stage: "squad_formation", label: "Re-executar Squad", type: "run" },
      ];
    case "squad_formed":
      return [
        { stage: "approve", label: "Aprovar Squad", type: "approve" },
        { stage: "squad_formation", label: "Re-gerar Squad", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "planning_ready":
      return [{ stage: "planning", label: "Gerar Planning", type: "run" }];
    case "planning":
      return [
        { stage: "planning", label: "Re-executar Planning", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "planned":
      return [
        { stage: "execution", label: "Iniciar Execução (Agent Swarm)", type: "run" },
        { stage: "approve", label: "Aprovar Planning", type: "approve" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "in_progress":
      return [
        { stage: "execution", label: "Iniciar Execução", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "validating":
      return [
        { stage: "validation", label: "Rodar Fix Loop (AI)", type: "run" },
        { stage: "deep_validation", label: "Deep Static Analysis", type: "run" },
        { stage: "runtime_validation", label: "Runtime Validation (tsc + vite)", type: "run" },
        { stage: "approve", label: "✅ Aprovar Validação → Publicar", type: "approve" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "ready_to_publish":
      return [
        { stage: "runtime_validation", label: "Runtime Validation (tsc + vite build)", type: "run" },
        { stage: "deep_validation", label: "Re-executar Deep Analysis", type: "run" },
        { stage: "publish", label: "Publicar no GitHub", type: "publish" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "published":
      return [
        { stage: "publish", label: "Re-publicar no GitHub", type: "publish" },
        { stage: "approve", label: "Marcar como Concluído", type: "approve" },
      ];
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
