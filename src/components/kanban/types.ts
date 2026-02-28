export type Story = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_agent_id: string | null;
  agents: { name: string; role: string } | null;
};

export type StoryMetrics = {
  cost: number;
  tokens: number;
  avgTime: number; // ms
  totalExecutions: number;
  validationStatus: "none" | "pass" | "fail" | "pending" | "mixed";
  riskLevel: "low" | "medium" | "high" | "critical";
  failedSubtasks: number;
  totalSubtasks: number;
  completedSubtasks: number;
};

export const COLUMNS: { id: string; label: string; accent: string }[] = [
  { id: "todo", label: "A Fazer", accent: "border-muted-foreground/30" },
  { id: "in_progress", label: "Em Progresso", accent: "border-info" },
  { id: "done", label: "Concluído", accent: "border-success" },
  { id: "blocked", label: "Bloqueado", accent: "border-destructive" },
];

export const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-muted-foreground/20 text-muted-foreground" },
  medium: { label: "Média", color: "bg-info/20 text-info" },
  high: { label: "Alta", color: "bg-warning/20 text-warning" },
  critical: { label: "Crítica", color: "bg-destructive/20 text-destructive" },
};
