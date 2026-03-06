import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, Link as LinkIcon, Zap, CheckCircle2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MACRO_STAGES } from "./pipeline-config";

// ── Layer groupings for related-node connections ──
const LAYER_GROUPS: Record<string, number[]> = {
  venture: [0, 1, 2, 3, 4],
  discovery: [5, 6, 7, 8],
  infrastructure: [9, 10, 11, 12, 13, 14, 15, 16],
  codegen: [17, 18, 19],
  execution: [20, 21, 22],
  validation: [23, 24, 25],
  growth: [26, 27, 28, 29, 30, 31, 32, 33, 34],
};

function getLayerForIndex(idx: number): string {
  for (const [layer, indices] of Object.entries(LAYER_GROUPS)) {
    if (indices.includes(idx)) return layer;
  }
  return "other";
}

function getRelatedIndices(idx: number): number[] {
  const layer = getLayerForIndex(idx);
  return (LAYER_GROUPS[layer] || []).filter((i) => i !== idx);
}

interface RadialOrbitalTimelineProps {
  currentMacroIndex: number;
  runningStage: string | null;
  onRollbackToStage?: (macroKey: string) => void;
}

export default function RadialOrbitalTimeline({
  currentMacroIndex,
  runningStage,
  onRollbackToStage,
}: RadialOrbitalTimelineProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);

  const totalNodes = MACRO_STAGES.length;

  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  }, []);

  const toggleItem = useCallback((id: number) => {
    setExpandedId((prev) => {
      if (prev === id) {
        setAutoRotate(true);
        setPulseEffect({});
        return null;
      }
      setAutoRotate(false);
      const related = getRelatedIndices(id);
      const pulse: Record<number, boolean> = {};
      related.forEach((r) => (pulse[r] = true));
      setPulseEffect(pulse);
      // Center on node
      const targetAngle = (id / totalNodes) * 360;
      setRotationAngle(270 - targetAngle);
      return id;
    });
  }, [totalNodes]);

  // Auto rotation
  useEffect(() => {
    if (!autoRotate) return;
    const timer = setInterval(() => {
      setRotationAngle((prev) => Number(((prev + 0.25) % 360).toFixed(3)));
    }, 50);
    return () => clearInterval(timer);
  }, [autoRotate]);

  const calculatePosition = useCallback((index: number) => {
    const angle = ((index / totalNodes) * 360 + rotationAngle) % 360;
    const radius = 170;
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);
    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(0.35, Math.min(1, 0.35 + 0.65 * ((1 + Math.sin(radian)) / 2)));
    return { x, y, angle, zIndex, opacity };
  }, [totalNodes, rotationAngle]);

  const getStatusForNode = (index: number): "completed" | "in-progress" | "pending" => {
    if (index < currentMacroIndex) return "completed";
    if (index === currentMacroIndex) return "in-progress";
    return "pending";
  };

  const getStatusBadge = (status: "completed" | "in-progress" | "pending") => {
    switch (status) {
      case "completed":
        return { label: "CONCLUÍDO", className: "bg-success/20 text-success border-success/30" };
      case "in-progress":
        return { label: "EM PROGRESSO", className: "bg-primary/20 text-primary border-primary/30" };
      case "pending":
        return { label: "PENDENTE", className: "bg-muted text-muted-foreground border-border" };
    }
  };

  const getLayerLabel = (index: number): string => {
    const layer = getLayerForIndex(index);
    const labels: Record<string, string> = {
      venture: "Venture Intelligence",
      discovery: "Discovery & Architecture",
      infrastructure: "Infrastructure & Modeling",
      codegen: "Code Generation",
      execution: "Squad & Execution",
      validation: "Validation & Publish",
      growth: "Growth & Evolution",
    };
    return labels[layer] || "";
  };

  const energyForNode = (index: number): number => {
    const status = getStatusForNode(index);
    if (status === "completed") return 100;
    if (status === "in-progress") return 60;
    return 20;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[460px] flex items-center justify-center overflow-hidden rounded-xl bg-background border border-border/50"
      onClick={handleContainerClick}
    >
      <div
        ref={orbitRef}
        className="absolute w-full h-full flex items-center justify-center"
        style={{ perspective: "1000px" }}
      >
        {/* Central nucleus */}
        <div className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-primary/60 via-primary/40 to-primary/20 animate-pulse flex items-center justify-center z-10">
          <div className="absolute w-18 h-18 rounded-full border border-primary/20 animate-ping opacity-60" />
          <div className="absolute w-22 h-22 rounded-full border border-primary/10 animate-ping opacity-40" style={{ animationDelay: "0.5s" }} />
          <div className="w-7 h-7 rounded-full bg-primary/80 backdrop-blur-md" />
        </div>

        {/* Orbit ring */}
        <div className="absolute w-[340px] h-[340px] rounded-full border border-border/20" />

        {/* Nodes */}
        {MACRO_STAGES.map((stage, index) => {
          const pos = calculatePosition(index);
          const isExpanded = expandedId === index;
          const isPulsing = pulseEffect[index];
          const status = getStatusForNode(index);
          const Icon = stage.icon;
          const canRollback = status === "completed" && !runningStage && onRollbackToStage && stage.key !== "done";
          const energy = energyForNode(index);

          return (
            <div
              key={stage.key}
              className="absolute transition-all duration-700 cursor-pointer"
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                zIndex: isExpanded ? 200 : pos.zIndex,
                opacity: isExpanded ? 1 : pos.opacity,
              }}
              onClick={(e) => {
                e.stopPropagation();
                toggleItem(index);
              }}
            >
              {/* Energy glow */}
              <div
                className={`absolute rounded-full -inset-1 ${isPulsing ? "animate-pulse" : ""}`}
                style={{
                  background: `radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)`,
                  width: `${energy * 0.4 + 36}px`,
                  height: `${energy * 0.4 + 36}px`,
                  left: `-${(energy * 0.4 + 36 - 36) / 2}px`,
                  top: `-${(energy * 0.4 + 36 - 36) / 2}px`,
                }}
              />

              {/* Node circle */}
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isExpanded
                    ? "bg-primary text-primary-foreground border-primary shadow-lg scale-150"
                    : isPulsing
                      ? "bg-primary/40 text-primary-foreground border-primary animate-pulse"
                      : status === "completed"
                        ? "bg-success/20 text-success border-success/40"
                        : status === "in-progress"
                          ? "bg-primary/20 text-primary border-primary/50"
                          : "bg-muted text-muted-foreground border-border/40"
                  }
                `}
              >
                {status === "completed" && !isExpanded ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Icon size={14} />
                )}
              </div>

              {/* Label */}
              <div
                className={`
                  absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap
                  text-[10px] font-semibold tracking-wider transition-all duration-300
                  ${isExpanded ? "text-foreground scale-110" : "text-muted-foreground"}
                `}
              >
                {stage.label}
              </div>

              {/* Expanded card */}
              {isExpanded && (
                <Card className="absolute top-16 left-1/2 -translate-x-1/2 w-60 bg-card/95 backdrop-blur-lg border-border/60 shadow-xl overflow-visible animate-scale-in">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-px h-2.5 bg-border" />
                  <CardHeader className="pb-2 px-3 pt-3">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className={`px-1.5 text-[9px] ${getStatusBadge(status).className}`}>
                        {getStatusBadge(status).label}
                      </Badge>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        #{index + 1}/{totalNodes}
                      </span>
                    </div>
                    <CardTitle className="text-xs mt-1.5">{stage.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-[10px] text-muted-foreground px-3 pb-3">
                    <p className="text-foreground/80">{getLayerLabel(index)}</p>

                    {/* Energy bar */}
                    <div className="mt-3 pt-2 border-t border-border/30">
                      <div className="flex justify-between items-center text-[9px] mb-1">
                        <span className="flex items-center gap-0.5">
                          <Zap size={8} /> Progresso
                        </span>
                        <span className="font-mono">{energy}%</span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-500"
                          style={{ width: `${energy}%` }}
                        />
                      </div>
                    </div>

                    {/* Related nodes */}
                    {getRelatedIndices(index).length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/30">
                        <div className="flex items-center mb-1.5">
                          <LinkIcon size={8} className="text-muted-foreground mr-1" />
                          <h4 className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground">
                            Nós Conectados
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {getRelatedIndices(index).slice(0, 4).map((relIdx) => (
                            <Button
                              key={relIdx}
                              variant="outline"
                              size="sm"
                              className="flex items-center h-5 px-1.5 py-0 text-[9px] rounded border-border/40 bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItem(relIdx);
                              }}
                            >
                              {MACRO_STAGES[relIdx]?.label}
                              <ArrowRight size={7} className="ml-0.5 text-muted-foreground" />
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rollback action */}
                    {canRollback && (
                      <div className="mt-3 pt-2 border-t border-border/30">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-6 text-[9px] gap-1 text-warning border-warning/30 hover:bg-warning/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRollbackToStage!(stage.key);
                          }}
                        >
                          <RotateCcw size={8} />
                          Refazer este estágio
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
