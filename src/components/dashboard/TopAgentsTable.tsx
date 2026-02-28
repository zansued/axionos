import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  devops: "DevOps", qa: "QA", architect: "Architect", sm: "Scrum Master",
  po: "Product Owner", dev: "Developer", analyst: "Analyst", pm: "PM",
  ux_expert: "UX Expert", aios_master: "AIOS Master", aios_orchestrator: "Orchestrator",
};

export function TopAgentsTable({ agents }: { agents: { name: string; role: string; completed: number }[] }) {
  if (agents.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" /> Agentes Mais Produtivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum agente com subtasks completadas ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" /> Agentes Mais Produtivos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {agents.map((agent, i) => (
          <div key={agent.name + i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
              <div>
                <p className="text-sm font-medium">{agent.name}</p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {ROLE_LABELS[agent.role] || agent.role}
                </Badge>
              </div>
            </div>
            <span className="text-sm font-bold font-display">{agent.completed}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
