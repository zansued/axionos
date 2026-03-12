import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  type WorkflowState,
  type TransitionDefinition,
  type BlockingCondition,
  type GovernanceRole,
  type ApprovalMode,
  getAvailableTransitions,
  validateTransition,
  STATE_DEFINITIONS,
  ROLE_LABELS,
} from "@/lib/governance-workflow-state-machine";
import { AlertTriangle, ArrowRight, CheckCircle2, Lock, XCircle } from "lucide-react";

interface Props {
  currentState: WorkflowState;
  evidenceCompleteness: number;
  hasAssignee: boolean;
  approvalCount: number;
  requiredApprovalMode: ApprovalMode;
  actorRole: GovernanceRole;
  onTransition: (toState: WorkflowState, metadata: Record<string, string>) => void;
  isLoading?: boolean;
}

const transitionColors: Record<string, string> = {
  approved: "bg-emerald-600 hover:bg-emerald-700 text-white",
  rejected: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
  escalated_review: "bg-orange-600 hover:bg-orange-700 text-white",
  closed: "bg-muted hover:bg-muted/80 text-muted-foreground",
};

export function TransitionActionPanel({
  currentState,
  evidenceCompleteness,
  hasAssignee,
  approvalCount,
  requiredApprovalMode,
  actorRole,
  onTransition,
  isLoading,
}: Props) {
  const [selectedTransition, setSelectedTransition] = useState<TransitionDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const available = getAvailableTransitions(currentState);
  const stateDef = STATE_DEFINITIONS[currentState];

  const validationResults = available.map((t) => ({
    transition: t,
    validation: validateTransition(currentState, t.to, {
      evidenceCompleteness,
      hasAssignee,
      approvalCount,
      requiredApprovalMode,
      actorRole,
    }),
  }));

  const handleSubmit = () => {
    if (!selectedTransition) return;
    // Check required fields
    const missing = selectedTransition.requiredFields.filter(
      (f) => f.required && !formData[f.name]?.trim()
    );
    if (missing.length > 0) return;
    onTransition(selectedTransition.to, formData);
    setSelectedTransition(null);
    setFormData({});
  };

  if (stateDef.isTerminal) {
    return (
      <Card className="border-border/30">
        <CardContent className="p-4 text-center">
          <Lock className="h-5 w-5 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">This proposal is in a terminal state. No further transitions are available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/30">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5" />
            Available Actions
          </CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Current state: <span className="font-medium text-foreground">{stateDef.label}</span>
            {" · "}Acting as: <span className="font-medium text-foreground">{ROLE_LABELS[actorRole]}</span>
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {validationResults.map(({ transition: t, validation }) => (
            <div key={`${t.from}-${t.to}`} className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`text-xs flex-1 justify-start ${validation.allowed ? transitionColors[t.to] || "" : "opacity-50"}`}
                disabled={!validation.allowed || isLoading}
                onClick={() => {
                  setSelectedTransition(t);
                  setFormData({});
                }}
              >
                <ArrowRight className="h-3 w-3 mr-1.5 shrink-0" />
                {t.label}
              </Button>
              {!validation.allowed && (
                <div className="shrink-0">
                  {validation.blockingConditions.map((bc) => (
                    <Badge key={bc.code} variant="outline" className="text-[9px] text-yellow-500 border-yellow-500/30">
                      {bc.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}

          {available.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No transitions available from this state.</p>
          )}
        </CardContent>
      </Card>

      {/* Transition Form Dialog */}
      <Dialog open={!!selectedTransition} onOpenChange={(open) => !open && setSelectedTransition(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              {selectedTransition?.label}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {STATE_DEFINITIONS[currentState].label} → {selectedTransition ? STATE_DEFINITIONS[selectedTransition.to].label : ""}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedTransition?.requiredFields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label className="text-xs">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.label}
                    className="text-sm min-h-[60px] bg-secondary/20 border-border/30"
                  />
                ) : field.type === "select" && field.options ? (
                  <Select
                    value={formData[field.name] || ""}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, [field.name]: v }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.label}
                    className="text-sm bg-secondary/20 border-border/30"
                  />
                )}
              </div>
            ))}

            {selectedTransition?.requiredFields.length === 0 && (
              <p className="text-sm text-muted-foreground">No additional information required for this transition.</p>
            )}

            {/* Side effects preview */}
            {selectedTransition && selectedTransition.sideEffects.length > 0 && (
              <div className="border-t border-border/20 pt-3">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Side Effects</span>
                <ul className="mt-1 space-y-0.5">
                  {selectedTransition.sideEffects.map((se) => (
                    <li key={se} className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500/60 shrink-0" />
                      {se.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedTransition(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={isLoading || (selectedTransition?.requiredFields.some(f => f.required && !formData[f.name]?.trim()) ?? false)}
              onClick={handleSubmit}
              className={selectedTransition ? transitionColors[selectedTransition.to] || "" : ""}
            >
              {isLoading ? "Processing…" : `Confirm: ${selectedTransition?.label}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
