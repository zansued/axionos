import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Star, Sprout, Leaf, Flame } from "lucide-react";

interface Capability {
  capability_key: string;
  description: string;
  skill_count: number;
  approved_count: number;
  avg_strength: number;
  avg_confidence: number;
  maturity_score: number;
  maturity_level: string;
}

const LEVEL_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  sovereign: { label: "Soberana", variant: "default", icon: Shield },
  established: { label: "Estabelecida", variant: "default", icon: Star },
  developing: { label: "Desenvolvendo", variant: "secondary", icon: Leaf },
  emerging: { label: "Emergente", variant: "outline", icon: Sprout },
  nascent: { label: "Nascente", variant: "destructive", icon: Flame },
};

export function CapabilityMaturityTable({ capabilities }: { capabilities: Capability[] }) {
  if (!capabilities?.length) {
    return (
      <Card className="border-border/30 bg-card/40">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma capacidade mapeada ainda. Execute o Auto-Bind na aba de Capability Binding.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/30 bg-card/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Mapa de Maturidade ({capabilities.length})</CardTitle>
        <CardDescription className="text-[10px]">
          Cada capacidade é avaliada por força de vínculo, confiança das skills e taxa de aprovação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {capabilities.map((cap) => {
            const cfg = LEVEL_CONFIG[cap.maturity_level] || LEVEL_CONFIG.nascent;
            const Icon = cfg.icon;
            return (
              <div key={cap.capability_key} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{cap.capability_key}</span>
                    <Badge variant={cfg.variant} className="text-[9px] shrink-0">{cfg.label}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{cap.description}</p>
                  <Progress value={cap.maturity_score * 100} className="h-1 mt-1.5" />
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-xs font-bold">{(cap.maturity_score * 100).toFixed(0)}%</p>
                  <p className="text-[9px] text-muted-foreground">{cap.approved_count}/{cap.skill_count} skills</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
