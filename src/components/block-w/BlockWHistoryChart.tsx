/**
 * Block W — Historical Trend Visualization
 * Compact history chart + trend indicators for Block W metrics over time.
 * Hardened: consistent trend labels, improved snapshot readability, dedup guard.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Clock, ArrowRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface TrendPoint {
  date: string;
  [key: string]: string | number;
}

interface MetricConfig {
  key: string;
  label: string;
  color: string;
  dangerous?: boolean;
}

interface HistoryChartProps {
  title: string;
  description?: string;
  data: TrendPoint[];
  metrics: MetricConfig[];
  loading?: boolean;
  emptyMessage?: string;
}

function computeTrend(data: TrendPoint[], key: string): "improving" | "degrading" | "stable" {
  if (data.length < 2) return "stable";
  const recent = data.slice(-3);
  const older = data.slice(0, Math.min(3, data.length - 1));
  const avgRecent = recent.reduce((s, d) => s + (Number(d[key]) || 0), 0) / recent.length;
  const avgOlder = older.reduce((s, d) => s + (Number(d[key]) || 0), 0) / older.length;
  const diff = avgRecent - avgOlder;
  if (Math.abs(diff) < 0.02) return "stable";
  return diff > 0 ? "improving" : "degrading";
}

function TrendIndicator({ trend, dangerous }: { trend: "improving" | "degrading" | "stable"; dangerous?: boolean }) {
  if (trend === "stable") return <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5"><Minus className="h-2.5 w-2.5" />Stable</Badge>;
  
  // For "dangerous" metrics (like stress/risk), "improving" = going up = bad
  const isPositive = dangerous ? trend === "degrading" : trend === "improving";
  const label = isPositive ? "Improving" : "Degrading";
  const Icon = trend === "improving" ? TrendingUp : TrendingDown;
  
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-0.5 ${
      isPositive
        ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
        : "bg-destructive/10 text-destructive border-destructive/20"
    }`}>
      <Icon className="h-2.5 w-2.5" />{label}
    </Badge>
  );
}

export function BlockWHistoryChart({
  title,
  description,
  data,
  metrics,
  loading,
  emptyMessage = "No historical data available yet. Run evaluations to build history.",
}: HistoryChartProps) {
  if (loading) return <Card className="border-border/50"><CardContent className="py-8 text-center text-muted-foreground">Loading history…</CardContent></Card>;

  // Deduplicate by date
  const seen = new Set<string>();
  const dedupData = data.filter(d => {
    if (seen.has(d.date)) return false;
    seen.add(d.date);
    return true;
  });

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {title}
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {dedupData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {/* Trend Indicators with delta */}
            <div className="flex flex-wrap gap-3">
              {metrics.map(m => {
                const trend = computeTrend(dedupData, m.key);
                const latest = dedupData[dedupData.length - 1];
                const first = dedupData[0];
                const latestVal = Number(latest[m.key]) || 0;
                const firstVal = Number(first[m.key]) || 0;
                const delta = latestVal - firstVal;
                return (
                  <div key={m.key} className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{m.label}:</span>
                    <span className="text-xs font-mono font-medium">{Math.round(latestVal * 100)}%</span>
                    {dedupData.length >= 2 && (
                      <span className={`text-[10px] font-mono ${
                        (m.dangerous ? delta < 0 : delta > 0) ? "text-green-700 dark:text-green-400" : 
                        Math.abs(delta) < 0.02 ? "text-muted-foreground" : "text-destructive"
                      }`}>
                        ({delta > 0 ? "+" : ""}{Math.round(delta * 100)}%)
                      </span>
                    )}
                    <TrendIndicator trend={trend} dangerous={m.dangerous} />
                  </div>
                );
              })}
            </div>

            {/* Chart */}
            {dedupData.length >= 2 && (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dedupData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(value: number, name: string) => {
                        const metric = metrics.find(m => m.key === name);
                        return [`${Math.round(value * 100)}%`, metric?.label ?? name];
                      }}
                    />
                    {metrics.map(m => (
                      <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={1.5} dot={{ r: 2 }} name={m.key} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Summary text for minimal data */}
            {dedupData.length === 1 && (
              <p className="text-xs text-muted-foreground text-center">Only one data point. Run more evaluations to see trends.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Snapshot Comparison ──

interface SnapshotComparisonProps {
  title: string;
  snapshots: any[];
  scoreKeys: { key: string; label: string; dangerous?: boolean }[];
  groupByKey?: string;
}

export function BlockWSnapshotComparison({ title, snapshots, scoreKeys, groupByKey }: SnapshotComparisonProps) {
  if (snapshots.length === 0) return null;

  // Deduplicate by id
  const seenIds = new Set<string>();
  const dedupSnapshots = snapshots.filter(s => {
    if (!s.id || seenIds.has(s.id)) return false;
    seenIds.add(s.id);
    return true;
  });

  // Sort newest first
  dedupSnapshots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Group snapshots by the groupByKey if provided
  const groups = new Map<string, any[]>();
  for (const s of dedupSnapshots) {
    const groupLabel = groupByKey ? (s[groupByKey] || "Unknown") : "All";
    if (!groups.has(groupLabel)) groups.set(groupLabel, []);
    groups.get(groupLabel)!.push(s);
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {title}
        </CardTitle>
        <CardDescription className="text-xs">{dedupSnapshots.length} snapshot(s), newest first</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from(groups.entries()).map(([group, items]) => (
            <div key={group} className="space-y-1.5">
              {groups.size > 1 && <p className="text-xs font-medium text-muted-foreground">{group}</p>}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-1 px-2 text-muted-foreground font-medium">Date</th>
                      {scoreKeys.map(k => (
                        <th key={k.key} className="text-center py-1 px-2 text-muted-foreground font-medium">{k.label}</th>
                      ))}
                      {items.length >= 2 && <th className="text-center py-1 px-2 text-muted-foreground font-medium">Δ</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 10).map((s: any, i: number) => {
                      const prev = items[i + 1];
                      return (
                        <tr key={s.id || i} className={`border-b border-border/30 ${i === 0 ? "bg-primary/5" : ""}`}>
                          <td className="py-1 px-2 text-muted-foreground">
                            {new Date(s.created_at).toLocaleDateString()}
                            {i === 0 && <Badge variant="outline" className="text-[9px] ml-1 px-1 py-0">latest</Badge>}
                          </td>
                          {scoreKeys.map(k => {
                            const val = Number(s[k.key]) || 0;
                            const pct = Math.round(val * 100);
                            const color = k.dangerous
                              ? (pct > 40 ? "text-destructive" : pct > 20 ? "text-yellow-600 dark:text-yellow-400" : "text-green-700 dark:text-green-400")
                              : (pct >= 70 ? "text-green-700 dark:text-green-400" : pct >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-destructive");
                            return (
                              <td key={k.key} className={`text-center py-1 px-2 font-mono ${color}`}>{pct}%</td>
                            );
                          })}
                          {items.length >= 2 && (
                            <td className="text-center py-1 px-2">
                              {prev ? (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {scoreKeys.map(k => {
                                    const delta = (Number(s[k.key]) || 0) - (Number(prev[k.key]) || 0);
                                    if (Math.abs(delta) < 0.01) return null;
                                    const sign = delta > 0 ? "+" : "";
                                    return `${k.label[0]}:${sign}${Math.round(delta * 100)}%`;
                                  }).filter(Boolean).join(" ")}
                                </span>
                              ) : "—"}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}