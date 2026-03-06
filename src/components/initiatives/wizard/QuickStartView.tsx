import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ChevronDown, ChevronUp, Loader2, Globe, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { GENERATION_INTENTS } from "./types";
import { Badge } from "@/components/ui/badge";

interface Props {
  onAnalyze: (idea: string, referenceUrl?: string, competitor?: string, additionalContext?: string, depth?: string) => void;
  isAnalyzing: boolean;
}

export function QuickStartView({ onAnalyze, isAnalyzing }: Props) {
  const [idea, setIdea] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [depth, setDepth] = useState("full_pipeline");

  const handleSubmit = () => {
    if (!idea.trim()) return;
    onAnalyze(
      idea.trim(),
      referenceUrl.trim() || undefined,
      competitor.trim() || undefined,
      additionalContext.trim() || undefined,
      depth,
    );
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
          <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-sm font-medium">Analyzing your idea...</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            AxionOS is researching the market, identifying pain points, analyzing competitors, and generating your initiative blueprint.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-mono">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running AI analysis...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe what you want to build...&#10;&#10;Example: A SaaS platform for small clinics to manage appointments, patients, and billing. It should have a dashboard for clinic owners, automated email reminders, and integration with payment processors."
          className="min-h-[140px] text-sm resize-none"
          autoFocus
        />
        <p className="text-[10px] text-muted-foreground">
          Be as detailed as you want. The more context you provide, the better the AI blueprint.
        </p>
      </div>

      {/* Intent selector */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">How should AxionOS help you?</Label>
        <div className="grid gap-2 grid-cols-2">
          {GENERATION_INTENTS.map((intent) => (
            <button
              key={intent.value}
              onClick={() => setDepth(intent.value)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all text-xs",
                depth === intent.value
                  ? "border-foreground bg-accent"
                  : "border-border hover:border-muted-foreground/40"
              )}
            >
              <div className="flex items-center gap-1.5 font-medium">
                <span>{intent.icon}</span>
                {intent.label}
                {"badge" in intent && intent.badge && (
                  <Badge variant="secondary" className="text-[9px] ml-auto">{intent.badge}</Badge>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{intent.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced options toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Additional context (optional)
      </button>

      {showAdvanced && (
        <div className={cn("space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3 animate-in fade-in-0 slide-in-from-top-1 duration-200")}>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> Reference URL
            </Label>
            <Input
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://competitor.com or inspiration site"
              className="h-8 text-xs"
              type="url"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Users className="h-3 w-3" /> Known Competitor
            </Label>
            <Input
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
              placeholder="e.g. Calendly, Doctolib"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Additional Context
            </Label>
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Any extra requirements, constraints, or preferences..."
              className="min-h-[50px] text-xs"
            />
          </div>
        </div>
      )}

      <Button
        className="w-full gap-2"
        onClick={handleSubmit}
        disabled={!idea.trim()}
        size="lg"
      >
        <Sparkles className="h-4 w-4" />
        Analyze Idea
      </Button>
    </div>
  );
}
