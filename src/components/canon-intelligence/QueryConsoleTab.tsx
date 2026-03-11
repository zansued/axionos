import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Search, Sparkles, HelpCircle } from "lucide-react";

interface QueryConsoleTabProps {
  library: any[];
}

const PRACTICE_LABELS: Record<string, string> = {
  best_practice: "Best Practice",
  implementation_pattern: "Impl. Pattern",
  architecture_pattern: "Arch. Pattern",
  template: "Template",
  checklist: "Checklist",
  anti_pattern: "Anti-Pattern",
  validation_rule: "Validation Rule",
  methodology_guideline: "Methodology",
  migration_note: "Migration Note",
};

export function QueryConsoleTab({ library }: QueryConsoleTabProps) {
  const [taskType, setTaskType] = useState("");
  const [stack, setStack] = useState("");
  const [domain, setDomain] = useState("");
  const [results, setResults] = useState<any[] | null>(null);

  const runQuery = () => {
    if (!taskType && !stack && !domain) {
      setResults(null);
      return;
    }

    const scored = library
      .filter((e: any) => e.lifecycle_status !== "deprecated" && e.lifecycle_status !== "archived")
      .map((e: any) => {
        let score = 0;
        const reasons: string[] = [];
        if (taskType && e.title?.toLowerCase().includes(taskType.toLowerCase())) { score += 40; reasons.push("Title match"); }
        if (taskType && e.summary?.toLowerCase().includes(taskType.toLowerCase())) { score += 20; reasons.push("Summary match"); }
        if (taskType && e.topic?.toLowerCase().includes(taskType.toLowerCase())) { score += 30; reasons.push("Topic match"); }
        if (stack && e.stack_scope?.toLowerCase().includes(stack.toLowerCase())) { score += 25; reasons.push("Stack match"); }
        if (domain && e.domain?.toLowerCase().includes(domain.toLowerCase())) { score += 25; reasons.push("Domain match"); }
        score += (e.confidence_score || 0) * 0.1;
        return { ...e, relevance_score: Math.min(100, Math.round(score)), retrieval_reasons: reasons };
      })
      .filter((e: any) => e.relevance_score > 0)
      .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
      .slice(0, 15);

    setResults(scored);
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Query Console
          </CardTitle>
          <CardDescription>Simulate agent retrieval — see which patterns the system would return for a given task context</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Task Type / Description</label>
              <Input
                placeholder="e.g. Create Supabase backend API"
                className="bg-muted/20 border-border/40"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Stack / Framework</label>
              <Input
                placeholder="e.g. TypeScript, React, Supabase"
                className="bg-muted/20 border-border/40"
                value={stack}
                onChange={(e) => setStack(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Domain</label>
              <Input
                placeholder="e.g. backend, frontend, validation"
                className="bg-muted/20 border-border/40"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={runQuery}
            className="mt-3 px-4 py-2 rounded-md bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors flex items-center gap-2"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Retrieve Patterns
          </button>
        </CardContent>
      </Card>

      {results !== null && (
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Retrieval Results ({results.length})</CardTitle>
            <CardDescription>Ranked by relevance score — simulating agent pattern retrieval</CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No patterns match the query. Try different terms.</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {results.map((r: any, i: number) => (
                    <div key={r.id} className="p-4 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{r.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.summary}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            r.relevance_score >= 60 ? "bg-emerald-500/20 text-emerald-400" :
                            r.relevance_score >= 30 ? "bg-amber-500/20 text-amber-400" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {r.relevance_score}%
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-11">
                        {r.practice_type && <Badge variant="outline" className="text-[10px]">{PRACTICE_LABELS[r.practice_type] || r.practice_type}</Badge>}
                        <Badge variant="outline" className="text-[10px]">{r.confidence_score ?? 0}% confidence</Badge>
                        {r.domain && <Badge variant="outline" className="text-[10px]">{r.domain}</Badge>}
                      </div>
                      {r.retrieval_reasons.length > 0 && (
                        <div className="ml-11 mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                          <HelpCircle className="h-3 w-3" />
                          Matched: {r.retrieval_reasons.join(" · ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
