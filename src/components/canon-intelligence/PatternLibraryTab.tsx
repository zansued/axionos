import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Search, BookOpen, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";

interface PatternLibraryTabProps {
  library: any[];
  loading: boolean;
  onSelectPattern?: (pattern: any) => void;
}

const LIFECYCLE_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  candidate: "bg-muted text-muted-foreground",
  proposed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  experimental: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  deprecated: "bg-muted text-muted-foreground line-through",
  archived: "bg-muted/50 text-muted-foreground/50",
  superseded: "bg-muted text-muted-foreground",
};

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

export function PatternLibraryTab({ library, loading, onSelectPattern }: PatternLibraryTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [practiceFilter, setPracticeFilter] = useState<string>("all");
  const [selectedPattern, setSelectedPattern] = useState<any | null>(null);

  const filtered = useMemo(() => {
    return library.filter((e: any) => {
      const matchesSearch = !search ||
        e.title?.toLowerCase().includes(search.toLowerCase()) ||
        e.summary?.toLowerCase().includes(search.toLowerCase()) ||
        e.topic?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || e.lifecycle_status === statusFilter;
      const matchesPractice = practiceFilter === "all" || e.practice_type === practiceFilter;
      return matchesSearch && matchesStatus && matchesPractice;
    });
  }, [library, search, statusFilter, practiceFilter]);

  const domains = useMemo(() => {
    const d = new Set<string>();
    library.forEach((e: any) => { if (e.domain) d.add(e.domain); if (e.stack_scope) d.add(e.stack_scope); });
    return [...d];
  }, [library]);

  if (selectedPattern) {
    return <PatternDetailView pattern={selectedPattern} onBack={() => setSelectedPattern(null)} />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patterns by title, summary, topic..."
            className="pl-9 bg-muted/20 border-border/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-muted/20 border-border/40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="candidate">Candidate</SelectItem>
            <SelectItem value="experimental">Experimental</SelectItem>
            <SelectItem value="deprecated">Deprecated</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={practiceFilter} onValueChange={setPracticeFilter}>
          <SelectTrigger className="w-[160px] bg-muted/20 border-border/40">
            <SelectValue placeholder="Practice Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(PRACTICE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{filtered.length} of {library.length} patterns</span>
        {domains.length > 0 && <span>{domains.length} domains</span>}
      </div>

      {/* Pattern Grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading pattern library...</p>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No patterns match your filters.</p>
        </div>
      ) : (
        <ScrollArea className="h-[520px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((e: any) => (
              <Card
                key={e.id}
                className="border-border/30 bg-card/60 hover:bg-card/80 transition-all cursor-pointer group"
                onClick={() => setSelectedPattern(e)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{e.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.summary}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <Badge variant="outline" className={`text-[10px] ${LIFECYCLE_BADGE[e.lifecycle_status] || LIFECYCLE_BADGE.draft}`}>
                      {e.lifecycle_status}
                    </Badge>
                    {e.practice_type && (
                      <Badge variant="outline" className="text-[10px]">
                        {PRACTICE_LABELS[e.practice_type] || e.practice_type}
                      </Badge>
                    )}
                    {e.anti_pattern_flag && (
                      <Badge variant="outline" className="text-[10px] bg-destructive/20 text-destructive border-destructive/30">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Anti
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2.5 text-[10px] text-muted-foreground/60">
                    {e.domain && <span>{e.domain}</span>}
                    {e.stack_scope && <span>{e.stack_scope}</span>}
                    <span className="flex items-center gap-0.5">
                      <TrendingUp className="h-2.5 w-2.5" />{e.confidence_score ?? 0}%
                    </span>
                    <span>v{e.current_version || 1}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function PatternDetailView({ pattern, onBack }: { pattern: any; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
        ← Back to Library
      </button>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{pattern.title}</CardTitle>
              <CardDescription className="mt-1">
                {pattern.domain && <span className="mr-3">{pattern.domain}</span>}
                {pattern.stack_scope && <span className="mr-3">{pattern.stack_scope}</span>}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`${LIFECYCLE_BADGE[pattern.lifecycle_status] || LIFECYCLE_BADGE.draft}`}>
                {pattern.lifecycle_status}
              </Badge>
              {pattern.practice_type && (
                <Badge variant="outline">{PRACTICE_LABELS[pattern.practice_type] || pattern.practice_type}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Summary */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Summary</h4>
            <p className="text-sm text-foreground/90">{pattern.summary || "No summary provided."}</p>
          </div>

          {/* Structured Guidance */}
          {pattern.structured_guidance && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Implementation Guidance</h4>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/20 text-sm text-foreground/80">
                {typeof pattern.structured_guidance === "string"
                  ? pattern.structured_guidance
                  : JSON.stringify(pattern.structured_guidance, null, 2)}
              </div>
            </div>
          )}

          {/* Code Snippet */}
          {pattern.code_snippet && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Code Example</h4>
              <pre className="p-3 rounded-lg bg-muted/30 border border-border/20 text-xs font-mono text-foreground/80 overflow-x-auto">
                {pattern.code_snippet}
              </pre>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricBox label="Confidence" value={`${pattern.confidence_score ?? 0}%`} />
            <MetricBox label="Version" value={`v${pattern.current_version || 1}`} />
            <MetricBox label="Topic" value={pattern.topic || "—"} />
            <MetricBox label="Subtopic" value={pattern.subtopic || "—"} />
          </div>

          {/* Applicability Scope */}
          {pattern.applicability_scope && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Applicability Scope</h4>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/20 text-sm text-foreground/80">
                {typeof pattern.applicability_scope === "string"
                  ? pattern.applicability_scope
                  : JSON.stringify(pattern.applicability_scope, null, 2)}
              </div>
            </div>
          )}

          {/* Source Reference */}
          {pattern.source_reference && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Source Reference</h4>
              <p className="text-xs text-muted-foreground">{pattern.source_reference}</p>
            </div>
          )}

          {/* Supersession */}
          {pattern.superseded_by && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400">⚠ This pattern has been superseded by: <span className="font-mono">{pattern.superseded_by}</span></p>
            </div>
          )}

          {/* Anti-Pattern Warning */}
          {pattern.anti_pattern_flag && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive">⚠ This entry is flagged as an anti-pattern. Avoid using this approach.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-border/20 bg-muted/10 text-center">
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
