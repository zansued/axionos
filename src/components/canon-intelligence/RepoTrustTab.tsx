import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Scale, RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useRepoTrustScore } from "@/hooks/useRepoTrustScore";

const tierColors: Record<string, string> = {
  high: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  low: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  untrusted: "bg-red-500/10 text-red-400 border-red-500/30",
};

export function RepoTrustTab() {
  const {
    trustScores, patternWeights, recalibrationLog,
    evaluateSources, weightPatterns, recalibrateConfidence, loading,
  } = useRepoTrustScore();

  const scores = trustScores.data || [];
  const weights = patternWeights.data || [];
  const recals = recalibrationLog.data || [];

  const avgTrust = scores.length
    ? (scores.reduce((s, t: any) => s + Number(t.trust_score), 0) / scores.length)
    : 0;

  const highTrust = scores.filter((s: any) => s.trust_tier === "high").length;
  const lowTrust = scores.filter((s: any) => Number(s.trust_score) < 0.4).length;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Repo Trust & Pattern Weighting</h3>
          <p className="text-sm text-muted-foreground">Source trust scores, pattern weights, and confidence recalibration</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => evaluateSources.mutate()}
            disabled={evaluateSources.isPending}
          >
            <Shield className="w-4 h-4 mr-1" />
            {evaluateSources.isPending ? "Evaluating..." : "Evaluate Sources"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => weightPatterns.mutate()}
            disabled={weightPatterns.isPending}
          >
            <Scale className="w-4 h-4 mr-1" />
            {weightPatterns.isPending ? "Weighting..." : "Weight Patterns"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => recalibrateConfidence.mutate()}
            disabled={recalibrateConfidence.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            {recalibrateConfidence.isPending ? "Recalibrating..." : "Recalibrate"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sources Evaluated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scores.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Trust Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTrust.toFixed(3)}</div>
            <Progress value={avgTrust * 100} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> High Trust
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{highTrust}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-orange-400" /> Low Trust
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{lowTrust}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trust" className="w-full">
        <TabsList>
          <TabsTrigger value="trust">Trust Scores</TabsTrigger>
          <TabsTrigger value="weights">Pattern Weights</TabsTrigger>
          <TabsTrigger value="recalibrations">Recalibrations</TabsTrigger>
        </TabsList>

        {/* Trust Scores Table */}
        <TabsContent value="trust">
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-sm text-muted-foreground p-4">Loading trust scores...</p>
              ) : scores.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No trust scores yet. Click "Evaluate Sources" to begin.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Trust Score</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Patterns</TableHead>
                      <TableHead>Promoted</TableHead>
                      <TableHead>Success Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.source_name || "Unknown"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{Number(s.trust_score).toFixed(3)}</span>
                            <Progress value={Number(s.trust_score) * 100} className="w-16 h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tierColors[s.trust_tier] || ""}>
                            {s.trust_tier}
                          </Badge>
                        </TableCell>
                        <TableCell>{s.patterns_extracted}</TableCell>
                        <TableCell>{s.patterns_promoted}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {(Number(s.promotion_success_rate) * 100).toFixed(0)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pattern Weights Table */}
        <TabsContent value="weights">
          <Card>
            <CardContent className="pt-4">
              {weights.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No pattern weights yet. Click "Weight Patterns" to begin.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Source Trust</TableHead>
                      <TableHead>Exec. Reinforcement</TableHead>
                      <TableHead>Recurrence</TableHead>
                      <TableHead>Penalties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weights.map((w: any) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-mono text-xs truncate max-w-[200px]">
                          {w.target_id?.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold">{Number(w.pattern_weight).toFixed(3)}</span>
                            <Progress value={Number(w.pattern_weight) * 100} className="w-16 h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{Number(w.source_trust).toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {Number(w.execution_reinforcement) > 0 && (
                            <span className="text-emerald-400">+{Number(w.execution_reinforcement).toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {Number(w.recurrence_bonus) > 0 && (
                            <span className="text-blue-400">+{Number(w.recurrence_bonus).toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {(Number(w.duplication_noise_penalty) + Number(w.weak_source_penalty)) > 0 && (
                            <span className="text-red-400">
                              -{(Number(w.duplication_noise_penalty) + Number(w.weak_source_penalty)).toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recalibrations */}
        <TabsContent value="recalibrations">
          <Card>
            <CardContent className="pt-4">
              {recals.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No recalibrations yet. Click "Recalibrate" to begin.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry</TableHead>
                      <TableHead>Previous</TableHead>
                      <TableHead>New</TableHead>
                      <TableHead>Delta</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recals.map((r: any) => {
                      const delta = Number(r.new_confidence) - Number(r.previous_confidence);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.target_id?.substring(0, 8)}...</TableCell>
                          <TableCell className="font-mono">{Number(r.previous_confidence).toFixed(3)}</TableCell>
                          <TableCell className="font-mono">{Number(r.new_confidence).toFixed(3)}</TableCell>
                          <TableCell>
                            <span className={`font-mono text-sm ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {delta > 0 ? "+" : ""}{delta.toFixed(3)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{r.recalibration_reason}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
