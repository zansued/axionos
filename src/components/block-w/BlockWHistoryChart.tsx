/**
 * Block W — Historical Trend Visualization
 * Compact history chart + trend indicators for Block W metrics over time.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
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

function computeTrend(data: TrendPoint[], key: string): "up" | "down" | "stable" {
  if (data.length < 2) return "stable";
  const recent = data.slice(-3);
  const older = data.slice(0, Math.min(3, data.length - 1));
  const avgRecent = recent.reduce((s, d) => s + (Number(d[key]) || 0), 0) / recent.length;
  const avgOlder = older.reduce((s, d) => s + (Number(d[key]) || 0), 0) / older.length;
  const diff = avgRecent - avgOlder;
  if (Math.abs(diff) < 0.02) return "stable";
  return diff > 0 ? "up" : "down";
}

function TrendIndicator({ trend, dangerous }: { trend: "up" | "down" | "stable"; dangerous?: boolean }) {
  if (trend === "stable") return <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5"><Minus className="h-2.5 w-2.5" />Stable</Badge>;
  if (trend === "up") return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-0.5 ${dangerous ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"}`}>
      <TrendingUp className="h-2.5 w-2.5" />{dangerous ? "Rising" : "Improving"}
    </Badge>
  );
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-0.5 ${dangerous ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
      <TrendingDown className="h-2.5 w-2.5" />{dangerous ? "Declining" : "Degrading"}
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

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {title}
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {/* Trend Indicators */}
            <div className="flex flex-wrap gap-2">
              {metrics.map(m => {
                const trend = computeTrend(data, m.key);
                const latest = data[data.length - 1];
                const value = Number(latest[m.key]) || 0;
                return (
                  <div key={m.key} className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{m.label}:</span>
                    <span className="text-xs font-mono font-medium">{Math.round(value * 100)}%</span>
                    <TrendIndicator trend={trend} dangerous={m.dangerous} />
                  </div>
                );
              })}
            </div>

            {/* Chart */}
            {data.length >= 2 && (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(value: number) => [`${Math.round(value * 100)}%`]}
                    />
                    {metrics.map(m => (
                      <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={1.5} dot={{ r: 2 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Summary text for minimal data */}
            {data.length === 1 && (
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

  // Group snapshots by the groupByKey if provided
  const groups = new Map<string, any[]>();
  for (const s of snapshots) {
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
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 10).map((s: any, i: number) => (
                      <tr key={s.id || i} className="border-b border-border/30">
                        <td className="py-1 px-2 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
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
                      </tr>
                    ))}
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
