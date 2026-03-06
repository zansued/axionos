import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ChevronDown, ChevronUp, Loader2, Globe, Users, FileText, Brain, Zap, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GENERATION_INTENTS } from "./types";
import { Badge } from "@/components/ui/badge";

interface Props {
  onAnalyze: (idea: string, referenceUrl?: string, competitor?: string, additionalContext?: string, depth?: string) => void;
  isAnalyzing: boolean;
}

// --- Lightweight heuristic engine (no AI call, instant) ---

const PRODUCT_PATTERNS: { pattern: RegExp; type: string; complexity: string; competitors: string[] }[] = [
  { pattern: /\b(saas|subscription|recurring|monthly plan)\b/i, type: "SaaS platform", complexity: "High", competitors: [] },
  { pattern: /\b(dashboard|analytics|metrics|kpi|report)\b/i, type: "Analytics dashboard", complexity: "Medium", competitors: ["Metabase", "Grafana", "Mixpanel"] },
  { pattern: /\b(appointment|booking|schedule|calendar|reservation)\b/i, type: "Booking system", complexity: "Medium", competitors: ["Calendly", "Cal.com", "Acuity"] },
  { pattern: /\b(e-?commerce|shop|store|cart|checkout|product catalog)\b/i, type: "E-commerce platform", complexity: "High", competitors: ["Shopify", "WooCommerce", "Stripe"] },
  { pattern: /\b(crm|customer relationship|lead|pipeline|sales)\b/i, type: "CRM system", complexity: "High", competitors: ["HubSpot", "Salesforce", "Pipedrive"] },
  { pattern: /\b(marketplace|two.?sided|buyer.*seller|vendor)\b/i, type: "Marketplace", complexity: "High", competitors: ["Sharetribe", "Arcadier"] },
  { pattern: /\b(chat|messaging|real.?time|notification)\b/i, type: "Messaging platform", complexity: "Medium", competitors: ["Slack", "Discord", "Intercom"] },
  { pattern: /\b(project management|task|kanban|sprint|agile)\b/i, type: "Project management tool", complexity: "Medium", competitors: ["Linear", "Jira", "Asana"] },
  { pattern: /\b(clinic|patient|medical|health|ehr|hospital)\b/i, type: "Healthcare platform", complexity: "High", competitors: ["SimplePractice", "Doctolib", "Jane App"] },
  { pattern: /\b(education|course|learning|lms|student)\b/i, type: "EdTech platform", complexity: "Medium", competitors: ["Teachable", "Thinkific", "Udemy"] },
  { pattern: /\b(landing|page|waitlist|launch|coming soon)\b/i, type: "Landing page", complexity: "Low", competitors: [] },
  { pattern: /\b(crud|admin|internal tool|back.?office)\b/i, type: "Internal tool", complexity: "Low", competitors: ["Retool", "Appsmith"] },
  { pattern: /\b(social|feed|post|follow|community|forum)\b/i, type: "Social platform", complexity: "High", competitors: ["Circle", "Discord", "Mighty Networks"] },
  { pattern: /\b(fintech|payment|invoice|billing|wallet)\b/i, type: "Fintech application", complexity: "High", competitors: ["Stripe", "Square", "PayPal"] },
  { pattern: /\b(ai|artificial intelligence|machine learning|gpt|llm|chatbot)\b/i, type: "AI-powered product", complexity: "High", competitors: [] },
];

const COMPLEXITY_META: Record<string, { stages: string; duration: string; cost: string }> = {
  Low: { stages: "~12 stages", duration: "~3 min", cost: "Low" },
  Medium: { stages: "~24 stages", duration: "~5 min", cost: "Medium" },
  High: { stages: "32 stages", duration: "~7 min", cost: "Medium" },
};

function detectIntent(text: string) {
  if (text.trim().length < 15) return null;

  let bestMatch: (typeof PRODUCT_PATTERNS)[number] | null = null;
  const allCompetitors: string[] = [];

  for (const p of PRODUCT_PATTERNS) {
    if (p.pattern.test(text)) {
      if (!bestMatch) bestMatch = p;
      allCompetitors.push(...p.competitors);
    }
  }

  if (!bestMatch) {
    // Generic fallback if text is long enough
    if (text.trim().length > 40) {
      return {
        type: "Custom product",
        complexity: "Medium",
        competitors: [],
        meta: COMPLEXITY_META["Medium"],
      };
    }
    return null;
  }

  const uniqueCompetitors = [...new Set(allCompetitors)].slice(0, 3);
  return {
    type: bestMatch.type,
    complexity: bestMatch.complexity,
    competitors: uniqueCompetitors,
    meta: COMPLEXITY_META[bestMatch.complexity],
  };
}

export function QuickStartView({ onAnalyze, isAnalyzing }: Props) {
  const [idea, setIdea] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [depth, setDepth] = useState("full_pipeline");

  const prediction = useMemo(() => detectIntent(idea), [idea]);

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
          Describe your product idea. The more context you provide, the better the blueprint.
        </p>
      </div>

      {/* Live AI prediction */}
      {prediction && (
        <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 animate-in fade-in-0 slide-in-from-top-1 duration-300 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
            <Brain className="h-3 w-3 text-primary animate-pulse" />
            AxionOS is thinking...
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-0.5">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Detected type</span>
              <p className="text-xs font-medium">{prediction.type}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Complexity</span>
              <p className="text-xs font-medium flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {prediction.complexity}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Pipeline</span>
              <p className="text-xs font-medium flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                {prediction.meta.stages}
              </p>
            </div>
          </div>
          {prediction.competitors.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[9px] text-muted-foreground">Similar products:</span>
              {prediction.competitors.map((c) => (
                <Badge key={c} variant="outline" className="text-[9px] h-4 px-1.5 font-normal">{c}</Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 text-[9px] text-muted-foreground/70 font-mono pt-0.5">
            <span>⏱ {prediction.meta.duration}</span>
            <span>💰 Cost: {prediction.meta.cost}</span>
          </div>
        </div>
      )}

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
