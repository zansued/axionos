import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll, useTransform, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { MACRO_STAGES } from "./pipeline-config";

// ── Layer groupings ──
const LAYER_RANGES: { label: string; from: number; to: number }[] = [
  { label: "Venture Intelligence", from: 0, to: 4 },
  { label: "Discovery & Architecture", from: 5, to: 8 },
  { label: "Infrastructure & Modeling", from: 9, to: 16 },
  { label: "Code Generation", from: 17, to: 19 },
  { label: "Squad & Execution", from: 20, to: 22 },
  { label: "Validation & Publish", from: 23, to: 25 },
  { label: "Runtime", from: 27, to: 28 },
];

function getLayerLabel(index: number): string {
  const layer = LAYER_RANGES.find((l) => index >= l.from && index <= l.to);
  return layer?.label ?? "";
}

interface PipelineTimelineProps {
  currentMacroIndex: number;
  runningStage: string | null;
  onRollbackToStage?: (macroKey: string) => void;
}

export default function PipelineTimeline({
  currentMacroIndex,
  runningStage,
  onRollbackToStage,
}: PipelineTimelineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      setHeight(ref.current.getBoundingClientRect().height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  const getStatus = (index: number): "completed" | "in-progress" | "pending" => {
    if (index < currentMacroIndex) return "completed";
    if (index === currentMacroIndex) return "in-progress";
    return "pending";
  };

  return (
    <div ref={containerRef} className="w-full bg-background font-sans">
      <div ref={ref} className="relative max-w-3xl mx-auto pb-10">
        {MACRO_STAGES.map((stage, index) => {
          const status = getStatus(index);
          const Icon = stage.icon;
          const isRunning = runningStage !== null && status === "in-progress";
          const canRollback = status === "completed" && !runningStage && onRollbackToStage && stage.key !== "done";
          const layerLabel = getLayerLabel(index);
          const prevLayer = index > 0 ? getLayerLabel(index - 1) : "";
          const showLayerHeader = layerLabel !== prevLayer;

          return (
            <div key={stage.key} className="flex justify-start pt-6 md:pt-10 md:gap-8">
              {/* Left: sticky dot + title */}
              <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
                <div className="h-8 w-8 absolute left-3 md:left-3 rounded-full bg-background flex items-center justify-center">
                  {status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : isRunning ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : status === "in-progress" ? (
                    <div className="h-3.5 w-3.5 rounded-full bg-primary border-2 border-primary/30 animate-pulse" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-muted border border-border" />
                  )}
                </div>
                <h3 className="hidden md:block text-sm md:pl-14 md:text-lg font-bold text-muted-foreground">
                  {stage.label}
                </h3>
              </div>

              {/* Right: content */}
              <div className="relative pl-16 pr-4 md:pl-4 w-full">
                <h3 className="md:hidden block text-base mb-2 text-left font-bold text-muted-foreground">
                  {stage.label}
                </h3>

                <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-2">
                  {showLayerHeader && (
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                      {layerLabel}
                    </span>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{stage.label}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 ${
                        status === "completed"
                          ? "bg-success/15 text-success border-success/30"
                          : status === "in-progress"
                            ? "bg-primary/15 text-primary border-primary/30"
                            : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {status === "completed" ? "CONCLUÍDO" : status === "in-progress" ? "EM PROGRESSO" : "PENDENTE"}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                      #{index + 1}/{MACRO_STAGES.length}
                    </span>
                  </div>

                  {canRollback && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] gap-1 text-warning border-warning/30 hover:bg-warning/10"
                      onClick={() => onRollbackToStage!(stage.key)}
                    >
                      <RotateCcw size={10} />
                      Refazer estágio
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Animated progress line */}
        <div
          style={{ height: height + "px" }}
          className="absolute md:left-[1.4rem] left-[1.4rem] top-0 overflow-hidden w-[2px] bg-gradient-to-b from-transparent via-border to-transparent [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-primary via-primary/60 to-transparent rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
