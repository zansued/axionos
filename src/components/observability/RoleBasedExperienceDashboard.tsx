import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Eye, Shield, AlertTriangle, CheckCircle2, BarChart3, Layers } from "lucide-react";

interface RoleOverview {
  role: string;
  nav_items: number;
  metrics: Record<string, number>;
}

export function RoleBasedExperienceDashboard() {
  const { currentOrg } = useOrg();

  const { data: overview } = useQuery({
    queryKey: ["role-experience-overview", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("role-based-experience-engine", {
        body: { action: "overview", organization_id: currentOrg!.id },
      });
      return (data?.overview ?? []) as RoleOverview[];
    },
  });

  const { data: explanations } = useQuery({
    queryKey: ["role-experience-explain", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("role-based-experience-engine", {
        body: { action: "explain", organization_id: currentOrg!.id },
      });
      return data?.explanations ?? [];
    },
  });

  const roleColors: Record<string, string> = {
    default_user: "bg-primary/20 text-primary",
    operator: "bg-yellow-500/20 text-yellow-400",
    admin: "bg-destructive/20 text-destructive",
  };

  const roleLabels: Record<string, string> = {
    default_user: "Default User",
    operator: "Operator",
    admin: "Admin / System",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Role-Based Experience Layer
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Diagnostic view of role surface separation, navigation mapping, and complexity leakage.
        </p>
      </div>

      {/* Role Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {(overview ?? []).map((role) => (
          <Card key={role.role} className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{roleLabels[role.role] ?? role.role}</span>
                <Badge className={roleColors[role.role] ?? "bg-muted text-muted-foreground"}>
                  {role.nav_items} nav items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <MetricRow label="Quality" value={role.metrics.role_experience_quality_score} />
              <MetricRow label="Nav Clarity" value={role.metrics.navigation_clarity_score} />
              <MetricRow label="Leakage" value={role.metrics.internal_complexity_leakage_score} invert />
              <MetricRow label="Friction" value={role.metrics.role_friction_score} invert />
              <MetricRow label="Separation" value={role.metrics.role_surface_separation_score} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="navigation">
        <TabsList>
          <TabsTrigger value="navigation" className="text-xs gap-1"><Eye className="h-3 w-3" /> Navigation</TabsTrigger>
          <TabsTrigger value="permissions" className="text-xs gap-1"><Shield className="h-3 w-3" /> Permissions</TabsTrigger>
          <TabsTrigger value="leakage" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Leakage</TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs gap-1"><BarChart3 className="h-3 w-3" /> Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="navigation" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {(explanations ?? []).map((exp: any) => (
              <Card key={exp.role_name} className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{roleLabels[exp.role_name] ?? exp.role_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">{exp.description}</p>
                  <p className="text-xs mb-1">
                    <strong>Main:</strong> {exp.navigation_summary?.main_count ?? 0} items |{" "}
                    <strong>Bottom:</strong> {exp.navigation_summary?.bottom_count ?? 0} items
                  </p>
                  <p className="text-xs text-muted-foreground">{exp.observability_access}</p>
                  <ScrollArea className="h-24 mt-2">
                    <div className="flex flex-wrap gap-1">
                      {(exp.navigation_summary?.surfaces ?? []).map((s: string) => (
                        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-3">
                {(explanations ?? []).map((exp: any) => (
                  <div key={exp.role_name}>
                    <h4 className="text-sm font-medium mb-2">{roleLabels[exp.role_name]}</h4>
                    <p className="text-xs text-muted-foreground mb-1">
                      Info visible: {exp.information_visibility?.visible ?? 0} |
                      Summarized: {exp.information_visibility?.summarized ?? 0} |
                      Hidden: {exp.information_visibility?.hidden ?? 0}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(exp.permissions_summary ?? []).map((p: string) => (
                        <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leakage" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <div className="space-y-3">
                {(overview ?? []).map((role) => {
                  const leakage = role.metrics.internal_complexity_leakage_score ?? 0;
                  return (
                    <div key={role.role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={roleColors[role.role]}>{roleLabels[role.role]}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {leakage === 0 ? "No leakage detected" : `Leakage score: ${(leakage * 100).toFixed(0)}%`}
                        </span>
                      </div>
                      {leakage === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {(overview ?? []).map((role) => (
              <Card key={role.role} className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{roleLabels[role.role]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-1.5">
                      {Object.entries(role.metrics).map(([key, val]) => (
                        <MetricRow key={key} label={key.replace(/_/g, " ")} value={val} invert={key.includes("leakage") || key.includes("friction")} />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricRow({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = invert
    ? pct > 30 ? "text-destructive" : pct > 10 ? "text-yellow-400" : "text-green-400"
    : pct > 70 ? "text-green-400" : pct > 40 ? "text-yellow-400" : "text-destructive";

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground capitalize truncate">{label}</span>
      <span className={`font-mono font-medium ${color}`}>{pct}%</span>
    </div>
  );
}
