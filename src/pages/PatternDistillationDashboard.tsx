import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePatternDistillation } from "@/hooks/usePatternDistillation";
import { RefreshCw, Globe, Server, User } from "lucide-react";

const SCOPE_COLORS: Record<string, string> = {
  tenant_specific: "bg-muted text-muted-foreground",
  stack_specific: "bg-accent/20 text-accent-foreground",
  platform_wide: "bg-primary/20 text-primary",
};

const SCOPE_ICONS: Record<string, typeof Globe> = {
  tenant_specific: User,
  stack_specific: Server,
  platform_wide: Globe,
};

export default function PatternDistillationDashboard() {
  const {
    patterns, patternsLoading, summary, scanCandidates,
  } = usePatternDistillation();

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pattern Distillation</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Cross-tenant pattern analysis — identifying generalizable knowledge from local learning signals.
            </p>
          </div>
          <Button
            onClick={() => scanCandidates.mutate()}
            disabled={scanCandidates.isPending}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${scanCandidates.isPending ? "animate-spin" : ""}`} />
            Run Distillation
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Patterns</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{summary?.total || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Platform-Wide</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{summary?.by_scope?.platform_wide || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Stack-Specific</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-accent-foreground">{summary?.by_scope?.stack_specific || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">High Generalization</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{summary?.high_generalization_count || 0}</div></CardContent>
          </Card>
        </div>

        {/* Patterns table */}
        <Card>
          <CardContent className="p-0">
            {patternsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : patterns.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No distilled patterns yet. Run distillation to analyze learning candidates.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Generalization</TableHead>
                    <TableHead>Tenants</TableHead>
                    <TableHead>Stacks</TableHead>
                    <TableHead>Global Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patterns.map((p: any) => {
                    const ScopeIcon = SCOPE_ICONS[p.recommended_scope] || Globe;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-foreground">{p.pattern_signature}</TableCell>
                        <TableCell>
                          <Badge className={SCOPE_COLORS[p.recommended_scope] || ""}>
                            <ScopeIcon className="h-3 w-3 mr-1" />
                            {p.recommended_scope}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.generalization_score}</TableCell>
                        <TableCell>{p.tenant_occurrence_count}</TableCell>
                        <TableCell>{p.stack_occurrence_count}</TableCell>
                        <TableCell>{p.global_occurrence_count}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
