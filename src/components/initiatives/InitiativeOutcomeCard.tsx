import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Globe, GitBranch, ExternalLink, Rocket,
  AlertTriangle, Clock, Loader2, RotateCcw, Lightbulb,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const STAGE_HINTS: Record<string, { en: string[]; pt: string[] }> = {
  discovery: {
    en: [
      "Understanding your idea and extracting requirements…",
      "Mapping user needs and business rules…",
      "Identifying key features and priorities…",
    ],
    pt: [
      "Entendendo sua ideia e extraindo requisitos…",
      "Mapeando necessidades do usuário e regras de negócio…",
      "Identificando funcionalidades-chave e prioridades…",
    ],
  },
  architecture: {
    en: [
      "Designing the system architecture…",
      "Modeling the data layer and relationships…",
      "Defining API contracts and endpoints…",
      "Mapping dependencies between components…",
      "Synthesizing the final architecture blueprint…",
    ],
    pt: [
      "Projetando a arquitetura do sistema…",
      "Modelando camada de dados e relacionamentos…",
      "Definindo contratos de API e endpoints…",
      "Mapeando dependências entre componentes…",
      "Sintetizando o blueprint final da arquitetura…",
    ],
  },
  stories: {
    en: [
      "Breaking down features into user stories…",
      "Defining acceptance criteria for each story…",
      "Organizing stories by priority and complexity…",
    ],
    pt: [
      "Quebrando funcionalidades em user stories…",
      "Definindo critérios de aceite para cada story…",
      "Organizando stories por prioridade e complexidade…",
    ],
  },
  coding: {
    en: [
      "Generating code for your application…",
      "Building components and business logic…",
      "Writing tests and validations…",
    ],
    pt: [
      "Gerando código da sua aplicação…",
      "Construindo componentes e lógica de negócio…",
      "Escrevendo testes e validações…",
    ],
  },
  validation: {
    en: [
      "Running build checks and static analysis…",
      "Validating code quality and structure…",
      "Checking for errors and inconsistencies…",
    ],
    pt: [
      "Executando verificações de build e análise estática…",
      "Validando qualidade e estrutura do código…",
      "Verificando erros e inconsistências…",
    ],
  },
  deploying: {
    en: [
      "Preparing deployment artifacts…",
      "Publishing to the target environment…",
    ],
    pt: [
      "Preparando artefatos de deploy…",
      "Publicando no ambiente de destino…",
    ],
  },
  _default: {
    en: [
      "Processing your initiative…",
      "Working on the next step…",
      "Almost there, keep watching…",
    ],
    pt: [
      "Processando sua iniciativa…",
      "Trabalhando na próxima etapa…",
      "Quase lá, continue acompanhando…",
    ],
  },
};

// Maps stage_status to a user-friendly pipeline step label
const STAGE_LABELS: Record<string, { en: string; pt: string }> = {
  discovering: { en: "Discovery", pt: "Descoberta" },
  discovery_done: { en: "Discovery done", pt: "Descoberta concluída" },
  architecting: { en: "Architecture", pt: "Arquitetura" },
  architecture_done: { en: "Architecture done", pt: "Arquitetura concluída" },
  scoping: { en: "Planning", pt: "Planejamento" },
  planning: { en: "Planning", pt: "Planejamento" },
  in_progress: { en: "Engineering", pt: "Engenharia" },
  engineering: { en: "Engineering", pt: "Engenharia" },
  coding: { en: "Coding", pt: "Codificação" },
  validating: { en: "Validation", pt: "Validação" },
  deploying: { en: "Deploy", pt: "Deploy" },
  deployed: { en: "Deployed", pt: "Implantado" },
  runtime_active: { en: "Runtime Active", pt: "Runtime Ativo" },
  observing_product: { en: "Runtime Active", pt: "Runtime Ativo" },
  product_observed: { en: "Runtime Active", pt: "Runtime Ativo" },
  optimizing_growth: { en: "Runtime Active", pt: "Runtime Ativo" },
  growth_optimized: { en: "Runtime Active", pt: "Runtime Ativo" },
};

// Pipeline stage ordering for progress estimation
const STAGE_ORDER = [
  "draft", "discovering", "discovery_done",
  "architecting", "architecture_done", "scoping", "planning",
  "in_progress", "engineering", "coding",
  "validating", "publishing", "deploying",
  "ready_to_publish", "published", "deployed",
  "runtime_active", "completed",
];

function useRotatingHint(stage: string, isActive: boolean, lang: "en" | "pt") {
  const [index, setIndex] = useState(0);

  const hints = STAGE_HINTS[stage]?.[lang] || STAGE_HINTS._default[lang];

  useEffect(() => {
    if (!isActive) return;
    setIndex(0);
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % hints.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [stage, isActive, hints.length]);

  return isActive ? hints[index] : null;
}

function useElapsed(startTime: string | null | undefined, active: boolean) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!active || !startTime) { setElapsed(""); return; }
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      if (diff < 60) setElapsed(`${diff}s`);
      else if (diff < 3600) setElapsed(`${Math.floor(diff / 60)}m ${diff % 60}s`);
      else setElapsed(`${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, active]);

  return elapsed;
}

interface InitiativeOutcomeCardProps {
  initiative: any;
}

type OutcomeInfo = {
  status: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
};

function getOutcome(init: any): OutcomeInfo {
  const stage = init.stage_status || init.status;

  if (["completed", "system_evolved", "portfolio_managed"].includes(stage)) {
    return { status: "completed", icon: CheckCircle2, color: "text-success", bgColor: "bg-success/5", borderColor: "border-success/30" };
  }
  if (stage === "deployed" && init.deploy_url) {
    return { status: "deployed", icon: Globe, color: "text-success", bgColor: "bg-success/5", borderColor: "border-success/30" };
  }
  if (stage === "deploy_failed") {
    return { status: "deploy_failed", icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/5", borderColor: "border-destructive/30" };
  }
  if (["published", "ready_to_publish"].includes(stage) || init.repo_url) {
    return { status: "repository_ready", icon: GitBranch, color: "text-primary", bgColor: "bg-primary/5", borderColor: "border-primary/30" };
  }
  if (["repair_failed"].includes(stage)) {
    return { status: "needs_attention", icon: AlertTriangle, color: "text-warning", bgColor: "bg-warning/5", borderColor: "border-warning/30" };
  }
  if (stage === "draft") {
    return { status: "not_started", icon: Lightbulb, color: "text-muted-foreground", bgColor: "", borderColor: "border-border/50" };
  }
  return { status: "in_progress", icon: Loader2, color: "text-primary", bgColor: "bg-primary/5", borderColor: "border-primary/20" };
}

export function InitiativeOutcomeCard({ initiative }: InitiativeOutcomeCardProps) {
  const { locale } = useI18n();
  const en = locale === "en-US";
  const outcome = getOutcome(initiative);
  const Icon = outcome.icon;

  const stageKey = (initiative.stage_status || initiative.status || "").replace(/^(pipeline_|stage_)/, "");
  const isInProgress = outcome.status === "in_progress";
  const hint = useRotatingHint(stageKey, isInProgress, en ? "en" : "pt");

  // Compute estimated progress from stage position
  const stageIdx = STAGE_ORDER.indexOf(stageKey);
  const progressPct = isInProgress && stageIdx > 0
    ? Math.min(95, Math.round((stageIdx / (STAGE_ORDER.length - 1)) * 100))
    : 0;

  // Get a user-friendly label for the current stage
  const stageLabel = STAGE_LABELS[stageKey];
  const stageLabelStr = stageLabel ? (en ? stageLabel.en : stageLabel.pt) : null;

  // Elapsed time since last update
  const elapsed = useElapsed(initiative.updated_at, isInProgress);

  // Latest job info for better context
  const execProgress = initiative.execution_progress;
  const hasExecDetail = execProgress && typeof execProgress === "object" && execProgress.total > 0;

  const content: Record<string, { title: string; description: string; actions?: { label: string; href?: string; variant?: "default" | "outline" }[] }> = {
    deployed: {
      title: en ? "Product deployed successfully" : "Produto deployado com sucesso",
      description: en
        ? "Your initiative is live. The code is validated, published, and deployed."
        : "Sua iniciativa está no ar. O código foi validado, publicado e deployado.",
      actions: [
        ...(initiative.deploy_url ? [{ label: en ? "Open Deployment" : "Abrir Deploy", href: initiative.deploy_url }] : []),
        ...(initiative.repo_url ? [{ label: en ? "View Repository" : "Ver Repositório", href: initiative.repo_url, variant: "outline" as const }] : []),
      ],
    },
    deploy_failed: {
      title: en ? "Deployment failed" : "Deploy falhou",
      description: en
        ? "The deploy did not succeed. Check the error details below and retry."
        : "O deploy não foi concluído. Verifique os detalhes do erro abaixo e tente novamente.",
    },
    repository_ready: {
      title: en ? "Repository ready" : "Repositório pronto",
      description: en
        ? "Your code has been validated and published to GitHub. You can now deploy it."
        : "Seu código foi validado e publicado no GitHub. Agora você pode fazer o deploy.",
      actions: initiative.repo_url ? [{ label: en ? "View Repository" : "Ver Repositório", href: initiative.repo_url }] : [],
    },
    needs_attention: {
      title: en ? "Needs attention" : "Precisa de atenção",
      description: en
        ? "The build encountered issues that require review. Check the details below."
        : "O build encontrou problemas que precisam de revisão. Veja os detalhes abaixo.",
    },
    not_started: {
      title: en ? "Ready to start" : "Pronto para começar",
      description: en
        ? "Run the pipeline to start building your product automatically."
        : "Execute o pipeline para começar a construir seu produto automaticamente.",
    },
    in_progress: {
      title: en ? "Building your product" : "Construindo seu produto",
      description: en
        ? "The pipeline is processing your initiative. Each step is tracked and traceable."
        : "O pipeline está processando sua iniciativa. Cada etapa é rastreada e rastreável.",
    },
    completed: {
      title: en ? "Initiative completed" : "Iniciativa concluída",
      description: en
        ? "This initiative has been fully processed and completed successfully."
        : "Esta iniciativa foi totalmente processada e concluída com sucesso.",
    },
  };

  const info = content[outcome.status] || content.in_progress;

  return (
    <Card className={`${outcome.borderColor} ${outcome.bgColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-muted/50 shrink-0 ${outcome.color}`}>
            <Icon className={`h-5 w-5 ${outcome.status === "in_progress" ? "animate-spin" : ""}`} />
          </div>
           <div className="flex-1 min-w-0 space-y-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{info.title}</p>
                  {isInProgress && stageLabelStr && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                      {en ? "Stage" : "Etapa"}: {stageLabelStr}
                    </Badge>
                  )}
                  {isInProgress && elapsed && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />{elapsed}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>

                {/* Progress bar for in-progress state */}
                {isInProgress && progressPct > 0 && (
                  <div className="mt-2 space-y-1">
                    <Progress value={progressPct} className="h-1.5" />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>~{progressPct}% {en ? "estimated" : "estimado"}</span>
                      {hasExecDetail && (
                        <span>{execProgress.current}/{execProgress.total} {en ? "tasks" : "tarefas"}</span>
                      )}
                    </div>
                  </div>
                )}

                {hint && (
                  <p className="text-xs text-primary/80 mt-1.5 animate-pulse transition-all duration-500" key={hint}>
                    💡 {hint}
                  </p>
                )}
              </div>
            {info.actions && info.actions.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {info.actions.map((action, i) => (
                  <a key={i} href={action.href} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant={action.variant || "default"} className="gap-1.5 text-xs">
                      {action.label}
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
