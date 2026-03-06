import {
  Lightbulb, Brain, Users, FileText, Cpu, BookOpen, Hammer, CheckCircle2,
  Shield, Clock, Rocket, XCircle, Archive, GitBranch, Layers, ShieldCheck, Zap, Package, Wrench, Database, Monitor, GraduationCap,
  Search, BarChart3, Target, TrendingUp, DollarSign, Eye, Activity, Repeat, FolderKanban, Settings2, Globe
} from "lucide-react";

// ══════════════════════════════════════════════════
//  PIPELINE STEPS — AxionOS v3 (32 stages)
// ══════════════════════════════════════════════════

export const PIPELINE_STEPS = [
  // ── Stage 01: Idea Intake ──
  { key: "draft", label: "Idea Intake", icon: Lightbulb, color: "text-muted-foreground", bg: "bg-muted/20" },

  // ── Venture Intelligence Layer (Stages 02-05) ──
  { key: "opportunity_discovering", label: "Opportunity Discovery ▶", icon: Search, color: "text-warning", bg: "bg-warning/10" },
  { key: "opportunity_discovered", label: "Opportunity Discovered ✓", icon: Search, color: "text-accent", bg: "bg-accent/10" },
  { key: "analyzing_market_signals", label: "Market Signals ▶", icon: BarChart3, color: "text-warning", bg: "bg-warning/10" },
  { key: "market_signals_analyzed", label: "Market Signals ✓", icon: BarChart3, color: "text-accent", bg: "bg-accent/10" },
  { key: "validating_product", label: "Product Validation ▶", icon: Target, color: "text-warning", bg: "bg-warning/10" },
  { key: "product_validated", label: "Product Validated ✓", icon: Target, color: "text-accent", bg: "bg-accent/10" },
  { key: "strategizing_revenue", label: "Revenue Strategy ▶", icon: DollarSign, color: "text-warning", bg: "bg-warning/10" },
  { key: "revenue_strategized", label: "Revenue Strategy ✓", icon: DollarSign, color: "text-accent", bg: "bg-accent/10" },

  // ── Discovery & Architecture (Stages 06-10) ──
  { key: "discovering", label: "Compreensão ▶", icon: Brain, color: "text-warning", bg: "bg-warning/10" },
  { key: "discovered", label: "Compreendido ✓", icon: Brain, color: "text-accent", bg: "bg-accent/10" },
  { key: "architecture_ready", label: "Arquitetura ▶", icon: Layers, color: "text-info", bg: "bg-info/10" },
  { key: "architecting", label: "Arquitetando", icon: Layers, color: "text-warning", bg: "bg-warning/10" },
  { key: "architected", label: "Arquitetado ✓", icon: Layers, color: "text-accent", bg: "bg-accent/10" },
  { key: "simulating_architecture", label: "Simulação ▶", icon: Layers, color: "text-warning", bg: "bg-warning/10" },
  { key: "architecture_simulated", label: "Simulado ✓", icon: Layers, color: "text-accent", bg: "bg-accent/10" },
  { key: "validating_architecture", label: "Validação Preventiva ▶", icon: ShieldCheck, color: "text-warning", bg: "bg-warning/10" },
  { key: "architecture_validated", label: "Arquitetura Validada ✓", icon: ShieldCheck, color: "text-accent", bg: "bg-accent/10" },

  // ── Infrastructure & Modeling (Stages 11-16) ──
  { key: "bootstrapping", label: "Bootstrap ▶", icon: Zap, color: "text-warning", bg: "bg-warning/10" },
  { key: "bootstrapped", label: "Bootstrap ✓", icon: Zap, color: "text-accent", bg: "bg-accent/10" },
  { key: "scaffolding", label: "Scaffold ▶", icon: Hammer, color: "text-warning", bg: "bg-warning/10" },
  { key: "scaffolded", label: "Scaffold ✓", icon: Hammer, color: "text-accent", bg: "bg-accent/10" },
  { key: "simulating_modules", label: "Module Graph ▶", icon: Layers, color: "text-warning", bg: "bg-warning/10" },
  { key: "modules_simulated", label: "Module Graph ✓", icon: Layers, color: "text-accent", bg: "bg-accent/10" },
  { key: "analyzing_dependencies", label: "Dep Intelligence ▶", icon: Package, color: "text-warning", bg: "bg-warning/10" },
  { key: "dependencies_analyzed", label: "Dep Intelligence ✓", icon: Package, color: "text-accent", bg: "bg-accent/10" },
  { key: "bootstrapping_schema", label: "Schema Bootstrap ▶", icon: Database, color: "text-warning", bg: "bg-warning/10" },
  { key: "schema_bootstrapped", label: "Schema Bootstrap ✓", icon: Database, color: "text-accent", bg: "bg-accent/10" },
  { key: "provisioning_db", label: "DB Provisioning ▶", icon: Database, color: "text-warning", bg: "bg-warning/10" },
  { key: "db_provisioned", label: "DB Provisioned ✓", icon: Database, color: "text-accent", bg: "bg-accent/10" },
  { key: "analyzing_domain", label: "Domain Analysis ▶", icon: Brain, color: "text-warning", bg: "bg-warning/10" },
  { key: "domain_analyzed", label: "Domain Analyzed ✓", icon: Brain, color: "text-accent", bg: "bg-accent/10" },
  { key: "generating_data_model", label: "Data Model ▶", icon: Database, color: "text-warning", bg: "bg-warning/10" },
  { key: "data_model_generated", label: "Data Model ✓", icon: Database, color: "text-accent", bg: "bg-accent/10" },

  // ── Code Generation (Stages 17-19) ──
  { key: "synthesizing_logic", label: "Business Logic ▶", icon: Cpu, color: "text-warning", bg: "bg-warning/10" },
  { key: "logic_synthesized", label: "Business Logic ✓", icon: Cpu, color: "text-accent", bg: "bg-accent/10" },
  { key: "generating_api", label: "API Generator ▶", icon: Layers, color: "text-warning", bg: "bg-warning/10" },
  { key: "api_generated", label: "API Generated ✓", icon: Layers, color: "text-accent", bg: "bg-accent/10" },
  { key: "generating_ui", label: "UI Generator ▶", icon: Monitor, color: "text-warning", bg: "bg-warning/10" },
  { key: "ui_generated", label: "UI Generated ✓", icon: Monitor, color: "text-accent", bg: "bg-accent/10" },

  // ── Squad, Planning, Execution ──
  { key: "squad_ready", label: "Squad ▶", icon: Users, color: "text-info", bg: "bg-info/10" },
  { key: "forming_squad", label: "Formando Squad", icon: Users, color: "text-warning", bg: "bg-warning/10" },
  { key: "squad_formed", label: "Squad ✓", icon: Users, color: "text-accent", bg: "bg-accent/10" },
  { key: "planning_ready", label: "Planning ▶", icon: FileText, color: "text-info", bg: "bg-info/10" },
  { key: "planning", label: "Planejando", icon: FileText, color: "text-warning", bg: "bg-warning/10" },
  { key: "planned", label: "Planejado ✓", icon: FileText, color: "text-accent", bg: "bg-accent/10" },
  { key: "in_progress", label: "Execução", icon: Hammer, color: "text-primary", bg: "bg-primary/10" },

  // ── Validation & Publish (Stages 20-23) ──
  { key: "validating", label: "Validação (Fix Loop → Deep → Drift → Runtime)", icon: Shield, color: "text-warning", bg: "bg-warning/10" },
  { key: "repairing_build", label: "Build Repair (auto-fix) ▶", icon: Wrench, color: "text-warning", bg: "bg-warning/10" },
  { key: "build_repaired", label: "Build Repair ✓", icon: Wrench, color: "text-accent", bg: "bg-accent/10" },
  { key: "repair_failed", label: "Repair Failed", icon: Wrench, color: "text-destructive", bg: "bg-destructive/10" },
  { key: "ready_to_publish", label: "Pronto para Publicar", icon: Rocket, color: "text-accent", bg: "bg-accent/10" },
  { key: "published", label: "Publicado", icon: GitBranch, color: "text-primary", bg: "bg-primary/10" },
  { key: "deploying", label: "Deploying ▶", icon: Globe, color: "text-warning", bg: "bg-warning/10" },
  { key: "deployed", label: "Deployed ✓", icon: Globe, color: "text-success", bg: "bg-success/10" },
  { key: "deploy_failed", label: "Deploy Failed", icon: Globe, color: "text-destructive", bg: "bg-destructive/10" },

  // ── Growth & Evolution Layer (Stages 24-32) ──
  { key: "observing_product", label: "Observability ▶", icon: Eye, color: "text-warning", bg: "bg-warning/10" },
  { key: "product_observed", label: "Observability ✓", icon: Eye, color: "text-accent", bg: "bg-accent/10" },
  { key: "analyzing_product_metrics", label: "Product Analytics ▶", icon: Activity, color: "text-warning", bg: "bg-warning/10" },
  { key: "product_metrics_analyzed", label: "Product Analytics ✓", icon: Activity, color: "text-accent", bg: "bg-accent/10" },
  { key: "analyzing_user_behavior", label: "User Behavior ▶", icon: Users, color: "text-warning", bg: "bg-warning/10" },
  { key: "user_behavior_analyzed", label: "User Behavior ✓", icon: Users, color: "text-accent", bg: "bg-accent/10" },
  { key: "optimizing_growth", label: "Growth Optimization ▶", icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
  { key: "growth_optimized", label: "Growth Optimized ✓", icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
  { key: "learning_system", label: "Learning ▶", icon: GraduationCap, color: "text-warning", bg: "bg-warning/10" },
  { key: "system_learned", label: "Learning ✓", icon: GraduationCap, color: "text-accent", bg: "bg-accent/10" },
  { key: "evolving_product", label: "Product Evolution ▶", icon: Repeat, color: "text-warning", bg: "bg-warning/10" },
  { key: "product_evolved", label: "Product Evolved ✓", icon: Repeat, color: "text-accent", bg: "bg-accent/10" },
  { key: "evolving_architecture", label: "Architecture Evolution ▶", icon: Layers, color: "text-warning", bg: "bg-warning/10" },
  { key: "architecture_evolved", label: "Architecture Evolved ✓", icon: Layers, color: "text-accent", bg: "bg-accent/10" },
  { key: "managing_portfolio", label: "Portfolio Manager ▶", icon: FolderKanban, color: "text-warning", bg: "bg-warning/10" },
  { key: "portfolio_managed", label: "Portfolio Managed ✓", icon: FolderKanban, color: "text-accent", bg: "bg-accent/10" },
  { key: "evolving_system", label: "System Evolution ▶", icon: Settings2, color: "text-warning", bg: "bg-warning/10" },
  { key: "system_evolved", label: "System Evolved ✓", icon: Settings2, color: "text-accent", bg: "bg-accent/10" },

  // ── Final ──
  { key: "completed", label: "Concluído", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
];

// ══════════════════════════════════════════════════
//  MACRO STAGES — AxionOS v3 (32-stage groupings)
// ══════════════════════════════════════════════════

export const MACRO_STAGES = [
  // Venture Intelligence Layer
  { key: "idea_intake", label: "Idea Intake", icon: Lightbulb },
  { key: "opportunity_discovery", label: "Opportunity Discovery", icon: Search },
  { key: "market_signals", label: "Market Signals", icon: BarChart3 },
  { key: "product_validation", label: "Product Validation", icon: Target },
  { key: "revenue_strategy", label: "Revenue Strategy", icon: DollarSign },

  // Discovery & Architecture
  { key: "discovery", label: "Compreensão", icon: Brain },
  { key: "architecture", label: "Arquitetura", icon: Layers },
  { key: "simulation", label: "Simulação", icon: Layers },
  { key: "preventive_validation", label: "Validação Preventiva", icon: ShieldCheck },

  // Infrastructure & Modeling
  { key: "bootstrap", label: "Bootstrap", icon: Zap },
  { key: "scaffold", label: "Scaffold", icon: Hammer },
  { key: "module_graph", label: "Module Graph", icon: Layers },
  { key: "dependency_intelligence", label: "Dep Intelligence", icon: Package },
  { key: "schema_bootstrap", label: "Schema Bootstrap", icon: Database },
  { key: "db_provisioning", label: "DB Provisioning", icon: Database },
  { key: "domain_analysis", label: "Domain Analysis", icon: Brain },
  { key: "data_model_generation", label: "Data Model", icon: Database },

  // Code Generation
  { key: "business_logic", label: "Business Logic", icon: Cpu },
  { key: "api_generation", label: "API Generator", icon: Layers },
  { key: "ui_generation", label: "UI Generator", icon: Monitor },

  // Squad, Planning, Execution
  { key: "squad", label: "Squad", icon: Users },
  { key: "planning", label: "Planning", icon: FileText },
  { key: "execution", label: "Execução", icon: Hammer },

  // Validation & Publish
  { key: "validation", label: "Fix Loop (AI corrige erros)", icon: Shield },
  { key: "build_repair", label: "Build Repair (auto-fix)", icon: Wrench },
  { key: "publish", label: "Publicação (GitHub)", icon: GitBranch },
  { key: "deploy", label: "Deploy", icon: Globe },

  // Growth & Evolution Layer
  { key: "observability", label: "Observability", icon: Eye },
  { key: "product_analytics", label: "Product Analytics", icon: Activity },
  { key: "user_behavior", label: "User Behavior", icon: Users },
  { key: "growth_optimization", label: "Growth Optimization", icon: TrendingUp },
  { key: "adaptive_learning", label: "Learning", icon: GraduationCap },
  { key: "product_evolution", label: "Product Evolution", icon: Repeat },
  { key: "architecture_evolution", label: "Architecture Evolution", icon: Layers },
  { key: "portfolio_management", label: "Portfolio Manager", icon: FolderKanban },
  { key: "system_evolution", label: "System Evolution", icon: Settings2 },
  { key: "done", label: "Concluído", icon: CheckCircle2 },
];

export function getStepIndex(stageStatus: string): number {
  const idx = PIPELINE_STEPS.findIndex((s) => s.key === stageStatus);
  return idx === -1 ? 0 : idx;
}

export function getMacroStageIndex(stageStatus: string): number {
  const s = stageStatus;
  // Venture Intelligence Layer
  if (["draft"].includes(s)) return 0;
  if (["opportunity_discovering", "opportunity_discovered"].includes(s)) return 1;
  if (["analyzing_market_signals", "market_signals_analyzed"].includes(s)) return 2;
  if (["validating_product", "product_validated"].includes(s)) return 3;
  if (["strategizing_revenue", "revenue_strategized"].includes(s)) return 4;

  // Discovery & Architecture
  if (["discovering", "discovered"].includes(s)) return 5;
  if (["architecture_ready", "architecting", "architected"].includes(s)) return 6;
  if (["simulating_architecture", "architecture_simulated"].includes(s)) return 7;
  if (["validating_architecture", "architecture_validated"].includes(s)) return 8;

  // Infrastructure & Modeling
  if (["bootstrapping", "bootstrapped"].includes(s)) return 9;
  if (["scaffolding", "scaffolded"].includes(s)) return 10;
  if (["simulating_modules", "modules_simulated"].includes(s)) return 11;
  if (["analyzing_dependencies", "dependencies_analyzed"].includes(s)) return 12;
  if (["bootstrapping_schema", "schema_bootstrapped"].includes(s)) return 13;
  if (["provisioning_db", "db_provisioned"].includes(s)) return 14;
  if (["analyzing_domain", "domain_analyzed"].includes(s)) return 15;
  if (["generating_data_model", "data_model_generated"].includes(s)) return 16;

  // Code Generation
  if (["synthesizing_logic", "logic_synthesized"].includes(s)) return 17;
  if (["generating_api", "api_generated"].includes(s)) return 18;
  if (["generating_ui", "ui_generated"].includes(s)) return 19;

  // Squad, Planning, Execution
  if (["squad_ready", "forming_squad", "squad_formed"].includes(s)) return 20;
  if (["planning_ready", "planning", "planned"].includes(s)) return 21;
  if (["in_progress"].includes(s)) return 22;

  // Validation & Publish
  if (["validating"].includes(s)) return 23;
  if (["repairing_build", "build_repaired", "repair_failed"].includes(s)) return 24;
  if (["ready_to_publish", "published"].includes(s)) return 25;
  if (["deploying", "deployed", "deploy_failed"].includes(s)) return 26;

  // Growth & Evolution Layer
  if (["observing_product", "product_observed"].includes(s)) return 26;
  if (["analyzing_product_metrics", "product_metrics_analyzed"].includes(s)) return 27;
  if (["analyzing_user_behavior", "user_behavior_analyzed"].includes(s)) return 28;
  if (["optimizing_growth", "growth_optimized"].includes(s)) return 29;
  if (["learning_system", "system_learned"].includes(s)) return 30;
  if (["evolving_product", "product_evolved"].includes(s)) return 31;
  if (["evolving_architecture", "architecture_evolved"].includes(s)) return 32;
  if (["managing_portfolio", "portfolio_managed"].includes(s)) return 33;
  if (["evolving_system", "system_evolved"].includes(s)) return 34;
  if (["completed"].includes(s)) return 35;
  return 0;
}

export type StageAction = {
  stage: string;
  label: string;
  description?: string;
  type: "run" | "approve" | "reject" | "publish";
  variant?: "primary" | "secondary" | "outline";
};

export function getAvailableActions(stageStatus: string): StageAction[] {
  switch (stageStatus) {
    // ── Stage 01: Idea Intake ──
    case "draft":
      return [
        { stage: "opportunity_discovery", label: "🔍 Iniciar Opportunity Discovery", type: "run" },
        { stage: "comprehension", label: "⏩ Pular para Compreensão (v2)", type: "run" },
      ];

    // ── Stage 02: Opportunity Discovery ──
    case "opportunity_discovering":
      return [{ stage: "opportunity_discovery", label: "Re-executar Opportunity Discovery", type: "run" }];
    case "opportunity_discovered":
      return [
        { stage: "market_signal_analysis", label: "📊 Market Signal Analysis", type: "run" },
        { stage: "opportunity_discovery", label: "Re-executar Discovery", type: "run" },
        { stage: "reject", label: "Descartar Oportunidade", type: "reject" },
      ];

    // ── Stage 03: Market Signal Analyzer ──
    case "analyzing_market_signals":
      return [{ stage: "market_signal_analysis", label: "Re-executar Market Signals", type: "run" }];
    case "market_signals_analyzed":
      return [
        { stage: "product_validation", label: "🎯 Product Validation", type: "run" },
        { stage: "market_signal_analysis", label: "Re-executar Market Signals", type: "run" },
        { stage: "reject", label: "Viabilidade Insuficiente", type: "reject" },
      ];

    // ── Stage 04: Product Validation ──
    case "validating_product":
      return [{ stage: "product_validation", label: "Re-executar Product Validation", type: "run" }];
    case "product_validated":
      return [
        { stage: "revenue_strategy", label: "💰 Revenue Strategy", type: "run" },
        { stage: "product_validation", label: "Re-executar Validation", type: "run" },
        { stage: "reject", label: "Validação Insuficiente", type: "reject" },
      ];

    // ── Stage 05: Revenue Strategy ──
    case "strategizing_revenue":
      return [{ stage: "revenue_strategy", label: "Re-executar Revenue Strategy", type: "run" }];
    case "revenue_strategized":
      return [
        { stage: "approve", label: "✅ Aprovar → Iniciar Build Pipeline", type: "approve" },
        { stage: "revenue_strategy", label: "Re-executar Revenue Strategy", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];

    // ── Stages 06+: Original v2 pipeline (preserved) ──
    case "discovering":
      return [{ stage: "comprehension", label: "Re-executar Compreensão", type: "run" }];
    case "discovered":
      return [
        { stage: "approve", label: "Aprovar Compreensão", type: "approve" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "architecture_ready":
      return [{ stage: "architecture", label: "Iniciar Arquitetura (4 agentes)", type: "run" }];
    case "architecting":
      return [{ stage: "architecture", label: "Re-executar Arquitetura", type: "run" }];
    case "architected":
      return [
        { stage: "architecture_simulation", label: "🌀 Simulação de Arquitetura", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "simulating_architecture":
      return [{ stage: "architecture_simulation", label: "Re-executar Simulação", type: "run" }];
    case "architecture_simulated":
      return [
        { stage: "preventive_validation", label: "🛡️ Validação Preventiva", type: "run" },
        { stage: "architecture_simulation", label: "Re-executar Simulação", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "validating_architecture":
      return [{ stage: "preventive_validation", label: "Re-executar Validação Preventiva", type: "run" }];
    case "architecture_validated":
      return [
        { stage: "bootstrap_intelligence", label: "🧠 Bootstrap Intelligence", type: "run" },
        { stage: "preventive_validation", label: "Re-executar Validação", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "bootstrapping":
      return [{ stage: "bootstrap_intelligence", label: "Re-executar Bootstrap", type: "run" }];
    case "bootstrapped":
      return [
        { stage: "foundation_scaffold", label: "🏗️ Gerar Foundation Scaffold", type: "run" },
        { stage: "bootstrap_intelligence", label: "Re-executar Bootstrap", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "scaffolding":
      return [{ stage: "foundation_scaffold", label: "Re-executar Scaffold", type: "run" }];
    case "scaffolded":
      return [
        { stage: "module_graph_simulation", label: "🔗 Module Graph Simulation", type: "run" },
        { stage: "foundation_scaffold", label: "Re-gerar Scaffold", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "simulating_modules":
      return [{ stage: "module_graph_simulation", label: "Re-executar Module Graph", type: "run" }];
    case "modules_simulated":
      return [
        { stage: "dependency_intelligence", label: "📦 Dependency Intelligence", type: "run" },
        { stage: "module_graph_simulation", label: "Re-executar Module Graph", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "analyzing_dependencies":
      return [{ stage: "dependency_intelligence", label: "Re-executar Dep Intelligence", type: "run" }];
    case "dependencies_analyzed":
      return [
        { stage: "supabase_schema_bootstrap", label: "🗄️ Schema Bootstrap", type: "run" },
        { stage: "ecosystem_drift", label: "🌐 Ecosystem Drift Analysis", type: "run" },
        { stage: "approve", label: "Aprovar Dependencies", type: "approve" },
        { stage: "dependency_intelligence", label: "Re-executar Dep Intelligence", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "bootstrapping_schema":
      return [{ stage: "supabase_schema_bootstrap", label: "Re-executar Schema Bootstrap", type: "run" }];
    case "schema_bootstrapped":
      return [
        { stage: "supabase_provisioning", label: "🗄️ DB Provisioning", type: "run" },
        { stage: "supabase_schema_bootstrap", label: "Re-executar Schema Bootstrap", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "provisioning_db":
      return [{ stage: "supabase_provisioning", label: "Re-executar Provisioning", type: "run" }];
    case "db_provisioned":
      return [
        { stage: "domain_model_analysis", label: "🧠 Domain Model Analysis", type: "run" },
        { stage: "supabase_provisioning", label: "Re-executar Provisioning", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "analyzing_domain":
      return [{ stage: "domain_model_analysis", label: "Re-executar Domain Analysis", type: "run" }];
    case "domain_analyzed":
      return [
        { stage: "data_model_generation", label: "🗄️ Data Model Generation", type: "run" },
        { stage: "domain_model_analysis", label: "Re-executar Domain Analysis", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "generating_data_model":
      return [{ stage: "data_model_generation", label: "Re-executar Data Model", type: "run" }];
    case "data_model_generated":
      return [
        { stage: "business_logic_synthesis", label: "⚙️ Business Logic Synthesis", type: "run" },
        { stage: "data_model_generation", label: "Re-executar Data Model", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "synthesizing_logic":
      return [{ stage: "business_logic_synthesis", label: "Re-executar Business Logic", type: "run" }];
    case "logic_synthesized":
      return [
        { stage: "api_generation", label: "🔌 API Generation", type: "run" },
        { stage: "business_logic_synthesis", label: "Re-executar Business Logic", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "generating_api":
      return [{ stage: "api_generation", label: "Re-executar API Generation", type: "run" }];
    case "api_generated":
      return [
        { stage: "ui_generation", label: "🖥️ UI Generation", type: "run" },
        { stage: "api_generation", label: "Re-executar API Generation", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "generating_ui":
      return [{ stage: "ui_generation", label: "Re-executar UI Generation", type: "run" }];
    case "ui_generated":
      return [
        { stage: "approve", label: "Aprovar UI → Squad", type: "approve" },
        { stage: "ui_generation", label: "Re-executar UI Generation", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "squad_ready":
      return [{ stage: "squad_formation", label: "Gerar Squad", type: "run" }];
    case "forming_squad":
      return [{ stage: "squad_formation", label: "Re-executar Squad", type: "run" }];
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
        { stage: "validation", label: "🔍 Iniciar Validação Completa", description: "Executa automaticamente: Fix Loop (AI) → Deep Static Analysis → Drift Detection → Runtime Validation (tsc + vite build). Todo o fluxo é sequencial e automático.", type: "run", variant: "primary" },
        { stage: "approve", label: "✅ Aprovar Validação → Publicar", description: "Pular validação e ir direto para publicação (não recomendado).", type: "approve", variant: "outline" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "repairing_build":
      return [{ stage: "build_repair", label: "Re-executar Build Repair", type: "run" }];
    case "build_repaired":
      return [
        { stage: "validation", label: "🔍 Re-validar Completo", description: "Roda Fix Loop → Deep Static → Drift → Runtime novamente após o repair.", type: "run", variant: "primary" },
        { stage: "approve", label: "✅ Aprovar → Publicar", type: "approve" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "repair_failed":
      return [
        { stage: "build_repair", label: "🔧 Retry Build Repair", description: "Tenta reparar o build novamente com AI.", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "ready_to_publish":
      return [
        { stage: "publish", label: "🚀 Publicar no GitHub", description: "Gera release, changelog e push para o repositório.", type: "publish", variant: "primary" },
        { stage: "validation", label: "🔍 Re-executar Validação Completa", description: "Roda novamente: Fix Loop → Deep Static → Drift → Runtime.", type: "run" },
        { stage: "adaptive_learning", label: "🎓 Adaptive Learning", type: "run" },
        { stage: "reject", label: "Solicitar Ajustes", type: "reject" },
      ];
    case "published":
      return [
        { stage: "observability", label: "👁️ Iniciar Observability", type: "run" },
        { stage: "adaptive_learning", label: "🎓 Adaptive Learning", type: "run" },
        { stage: "publish", label: "Re-publicar no GitHub", type: "publish" },
        { stage: "approve", label: "Marcar como Concluído", type: "approve" },
      ];

    // ── Growth & Evolution Layer ──
    case "observing_product":
      return [{ stage: "observability", label: "Re-executar Observability", type: "run" }];
    case "product_observed":
      return [
        { stage: "product_analytics", label: "📊 Product Analytics", type: "run" },
        { stage: "observability", label: "Re-executar Observability", type: "run" },
      ];
    case "analyzing_product_metrics":
      return [{ stage: "product_analytics", label: "Re-executar Analytics", type: "run" }];
    case "product_metrics_analyzed":
      return [
        { stage: "user_behavior_analysis", label: "👤 User Behavior Analysis", type: "run" },
        { stage: "product_analytics", label: "Re-executar Analytics", type: "run" },
      ];
    case "analyzing_user_behavior":
      return [{ stage: "user_behavior_analysis", label: "Re-executar Behavior Analysis", type: "run" }];
    case "user_behavior_analyzed":
      return [
        { stage: "growth_optimization", label: "📈 Growth Optimization", type: "run" },
        { stage: "user_behavior_analysis", label: "Re-executar Analysis", type: "run" },
      ];
    case "optimizing_growth":
      return [{ stage: "growth_optimization", label: "Re-executar Growth Optimization", type: "run" }];
    case "growth_optimized":
      return [
        { stage: "adaptive_learning", label: "🎓 Adaptive Learning", type: "run" },
        { stage: "growth_optimization", label: "Re-executar Growth", type: "run" },
      ];
    case "learning_system":
      return [{ stage: "adaptive_learning", label: "Re-executar Learning", type: "run" }];
    case "system_learned":
      return [
        { stage: "product_evolution", label: "🔄 Product Evolution", type: "run" },
        { stage: "adaptive_learning", label: "Re-executar Learning", type: "run" },
        { stage: "approve", label: "✅ Aprovar → Concluir", type: "approve" },
      ];
    case "evolving_product":
      return [{ stage: "product_evolution", label: "Re-executar Product Evolution", type: "run" }];
    case "product_evolved":
      return [
        { stage: "architecture_evolution", label: "🏛️ Architecture Evolution", type: "run" },
        { stage: "product_evolution", label: "Re-executar Evolution", type: "run" },
      ];
    case "evolving_architecture":
      return [{ stage: "architecture_evolution", label: "Re-executar Architecture Evolution", type: "run" }];
    case "architecture_evolved":
      return [
        { stage: "portfolio_management", label: "📁 Portfolio Manager", type: "run" },
        { stage: "architecture_evolution", label: "Re-executar Evolution", type: "run" },
      ];
    case "managing_portfolio":
      return [{ stage: "portfolio_management", label: "Re-executar Portfolio Manager", type: "run" }];
    case "portfolio_managed":
      return [
        { stage: "system_evolution", label: "⚙️ System Evolution", type: "run" },
        { stage: "portfolio_management", label: "Re-executar Portfolio", type: "run" },
      ];
    case "evolving_system":
      return [{ stage: "system_evolution", label: "Re-executar System Evolution", type: "run" }];
    case "system_evolved":
      return [
        { stage: "approve", label: "✅ Ciclo Completo → Concluir", type: "approve" },
        { stage: "system_evolution", label: "Re-executar System Evolution", type: "run" },
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
