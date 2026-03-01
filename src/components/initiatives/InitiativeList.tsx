import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, AlertTriangle, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PIPELINE_STEPS, getStepIndex } from "./pipeline-config";

interface InitiativeListProps {
  initiatives: any[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function InitiativeList({ initiatives, isLoading, selectedId, onSelect }: InitiativeListProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Iniciativas</h2>
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)}</div>
      ) : initiatives.length === 0 ? (
        <Card className="border-dashed border-2"><CardContent className="flex flex-col items-center py-8 text-center">
          <Lightbulb className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Descreva sua ideia e a IA faz o resto</p>
        </CardContent></Card>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-260px)]">
          <div className="space-y-2 pr-2">
            <AnimatePresence>
              {initiatives.map((init: any) => {
                const stepIdx = getStepIndex(init.stage_status || init.status);
                const step = PIPELINE_STEPS[stepIdx];
                const isSelected = selectedId === init.id;
                return (
                  <motion.div key={init.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <Card className={`cursor-pointer transition-all ${isSelected ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-primary/20"}`} onClick={() => onSelect(init.id)}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display text-sm font-medium leading-tight">{init.title}</p>
                          <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${step.bg} ${step.color}`}>{step.label}</Badge>
                        </div>
                        <div className="flex gap-0.5">
                          {PIPELINE_STEPS.map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIdx ? "bg-primary" : "bg-muted/40"}`} />
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {init.risk_level && init.risk_level !== "medium" && (
                            <span className="flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3" />Risco {init.risk_level}
                            </span>
                          )}
                          {init.squads?.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Users className="h-3 w-3" />{init.squads[0].squad_members?.length || 0}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
