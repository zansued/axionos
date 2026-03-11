import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2, Loader2, RotateCcw, ArrowRight,
  Lightbulb, Search, Brain, Layers, Cpu, Rocket, TrendingUp, Radio,
} from "lucide-react";
import { MACRO_STAGES } from "./pipeline-config";
import type { LucideIcon } from "lucide-react";

/* ── Phase groups ── */
interface PhaseGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  fromMacro: number;
  toMacro: number;
}

const PHASE_GROUPS: PhaseGroup[] = [
  { id: "idea", label: "Idea", icon: Lightbulb, fromMacro: 0, toMacro: 0 },
  { id: "discovery", label: "Discovery", icon: Search, fromMacro: 1, toMacro: 4 },
  { id: "architecture", label: "Architecture", icon: Brain, fromMacro: 5, toMacro: 8 },
  { id: "engineering", label: "Engineering", icon: Layers, fromMacro: 9, toMacro: 19 },
  { id: "deploy", label: "Deploy", icon: Rocket, fromMacro: 20, toMacro: 26 },
  { id: "runtime", label: "Runtime", icon: Radio, fromMacro: 27, toMacro: 28 },
];

/* ── Helpers ── */
function getPhaseStatus(
  group: PhaseGroup,
  currentMacroIndex: number
): "completed" | "in-progress" | "pending" {
  if (currentMacroIndex > group.toMacro) return "completed";
  if (currentMacroIndex >= group.fromMacro && currentMacroIndex <= group.toMacro) return "in-progress";
  return "pending";
}

function getStageStatus(
  stageIdx: number,
  currentMacroIndex: number
): "completed" | "in-progress" | "pending" {
  if (stageIdx < currentMacroIndex) return "completed";
  if (stageIdx === currentMacroIndex) return "in-progress";
  return "pending";
}

/* ── Component ── */
interface PipelineGraphViewProps {
  currentMacroIndex: number;
  runningStage: string | null;
  onRollbackToStage?: (macroKey: string) => void;
}

export default function PipelineGraphView({
  currentMacroIndex,
  runningStage,
  onRollbackToStage,
}: PipelineGraphViewProps) {
  const [openGroup, setOpenGroup] = useState<PhaseGroup | null>(null);

  return (
    <>
      {/* ── Graph row ── */}
      <div className="flex items-center gap-1 md:gap-2 flex-wrap py-2">
        {PHASE_GROUPS.map((group, gi) => {
          const status = getPhaseStatus(group, currentMacroIndex);
          const Icon = group.icon;

          return (
            <div key={group.id} className="flex items-center gap-1 md:gap-2">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setOpenGroup(group)}
                className={`
                  relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg border cursor-pointer
                  transition-colors duration-200 min-w-[72px]
                  ${status === "completed" && group.id === "growth"
                    ? "border-primary/60 bg-primary/20 text-primary ring-1 ring-primary/40"
                    : status === "completed"
                    ? "border-success/40 bg-success/10 text-success"
                    : status === "in-progress"
                    ? "border-primary/50 bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "border-border bg-muted/30 text-muted-foreground"
                  }
                `}
              >
                {status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : status === "in-progress" && runningStage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className="text-[10px] font-semibold tracking-wide leading-tight">
                  {group.label}
                </span>
                {/* Progress indicator */}
                {status === "in-progress" && (
                  <motion.div
                    layoutId="active-phase"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
                  />
                )}
              </motion.button>

              {/* Arrow connector */}
              {gi < PHASE_GROUPS.length - 1 && (
                <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${
                  status === "completed" ? "text-success/60" : "text-muted-foreground/30"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {openGroup && (
          <Dialog open={!!openGroup} onOpenChange={() => setOpenGroup(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <openGroup.icon className="h-5 w-5 text-primary" />
                  {openGroup.label}
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {getPhaseStatus(openGroup, currentMacroIndex).replace("-", " ")}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-1 mt-2 max-h-[50vh] overflow-y-auto pr-1">
                {MACRO_STAGES.slice(openGroup.fromMacro, openGroup.toMacro + 1).map(
                  (stage, i) => {
                    const absIdx = openGroup.fromMacro + i;
                    const stStatus = getStageStatus(absIdx, currentMacroIndex);
                    const StageIcon = stage.icon;

                    return (
                      <motion.div
                        key={stage.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-md text-sm
                          ${stStatus === "completed"
                            ? "bg-success/5 text-success"
                            : stStatus === "in-progress"
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground"
                          }
                        `}
                      >
                        {stStatus === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                        ) : stStatus === "in-progress" && runningStage ? (
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        ) : (
                          <StageIcon className="h-4 w-4 shrink-0 opacity-50" />
                        )}

                        <span className="flex-1">{stage.label}</span>

                        {stStatus === "completed" && onRollbackToStage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-warning"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRollbackToStage(stage.key);
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </motion.div>
                    );
                  }
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
