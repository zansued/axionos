import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import {
  PackageCheck, Box, Shield, AlertTriangle, CheckCircle2, Archive, Tag, Layers,
} from "lucide-react";

interface CapabilityPackage {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  source_type: string;
  affected_surfaces: string[];
  required_scopes: string[];
  rollback_ready: boolean;
  risk_posture: string;
  lifecycle_status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  registered: "bg-primary/20 text-primary",
  active: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-accent/20 text-accent-foreground",
  deprecated: "bg-orange-500/20 text-orange-400",
  archived: "bg-muted text-muted-foreground",
};

const CATEGORY_ICONS: Record<string, typeof Box> = {
  agent: Layers,
  pipeline: Tag,
  governance: Shield,
  general: Box,
  intelligence: PackageCheck,
  integration: PackageCheck,
  validation: CheckCircle2,
  delivery: Archive,
};

export default function CapabilityRegistry() {
  const { currentOrg } = useOrg();
  const [capabilities, setCapabilities] = useState<CapabilityPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CapabilityPackage | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (!currentOrg) return;
    setLoading(true);
    supabase
      .from("capability_packages" as any)
      .select("*")
      .eq("organization_id", currentOrg.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCapabilities((data as any) || []);
        setLoading(false);
      });
  }, [currentOrg]);

  const openDetail = async (c: CapabilityPackage) => {
    setSelected(c);
    const [verRes, evtRes] = await Promise.all([
      supabase.from("capability_package_versions" as any).select("*").eq("package_id", c.id).order("created_at", { ascending: false }),
      supabase.from("capability_package_events" as any).select("*").eq("package_id", c.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setVersions((verRes.data as any) || []);
    setEvents((evtRes.data as any) || []);
  };

  const filtered = capabilities.filter((c) => {
    if (tab === "active") return c.lifecycle_status === "active";
    if (tab === "registered") return c.lifecycle_status === "registered";
    if (tab === "deprecated") return ["deprecated", "archived", "paused"].includes(c.lifecycle_status);
    return true;
  });

  const kpis = {
    total: capabilities.length,
    active: capabilities.filter((c) => c.lifecycle_status === "active").length,
    deprecated: capabilities.filter((c) => ["deprecated", "archived"].includes(c.lifecycle_status)).length,
    highRisk: capabilities.filter((c) => ["high", "critical"].includes(c.risk_posture)).length,
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Capability Registry</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Packaged capabilities with lifecycle governance, versioning, and explainability.
            </p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
              <PackageCheck className="h-5 w-5 text-primary" />
              <div><p className="text-2xl font-bold text-foreground">{kpis.total}</p><p className="text-xs text-muted-foreground">Registered</p></div>
            </CardContent></Card>
            <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <div><p className="text-2xl font-bold text-foreground">{kpis.active}</p><p className="text-xs text-muted-foreground">Active</p></div>
            </CardContent></Card>
            <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
              <Archive className="h-5 w-5 text-orange-400" />
              <div><p className="text-2xl font-bold text-foreground">{kpis.deprecated}</p><p className="text-xs text-muted-foreground">Deprecated</p></div>
            </CardContent></Card>
            <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div><p className="text-2xl font-bold text-foreground">{kpis.highRisk}</p><p className="text-xs text-muted-foreground">High Risk</p></div>
            </CardContent></Card>
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="registered">Registered</TabsTrigger>
              <TabsTrigger value="deprecated">Deprecated</TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              {loading ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
              ) : filtered.length === 0 ? (
                <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">No capabilities in this view.</CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {filtered.map((c) => {
                    const Icon = CATEGORY_ICONS[c.category] || Box;
                    return (
                      <Card key={c.id} className="border-border bg-card hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => openDetail(c)}>
                        <CardContent className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className="h-4 w-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{c.name || "Unnamed"}</p>
                              <p className="text-xs text-muted-foreground truncate">{c.category} · {c.source_type} · {c.affected_surfaces.length} surfaces</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={STATUS_COLORS[c.lifecycle_status] || "bg-muted text-muted-foreground"}>{c.lifecycle_status}</Badge>
                            {c.rollback_ready && <Badge variant="outline" className="text-xs">rollback ✓</Badge>}
                            <Badge variant="outline" className="text-xs">{c.risk_posture}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Detail Drawer */}
          <Sheet open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); } }}>
            <SheetContent className="w-full sm:max-w-xl bg-card border-border overflow-y-auto">
              {selected && (
                <>
                  <SheetHeader>
                    <SheetTitle className="text-foreground">{selected.name || "Capability Detail"}</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 mt-4">
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={STATUS_COLORS[selected.lifecycle_status] || ""}>{selected.lifecycle_status}</Badge>
                      <Badge variant="outline">{selected.category}</Badge>
                      <Badge variant="outline">{selected.source_type}</Badge>
                      <Badge variant="outline">{selected.risk_posture} risk</Badge>
                      {selected.rollback_ready && <Badge variant="outline">rollback ready</Badge>}
                    </div>
                    {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}

                    {selected.affected_surfaces.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1">Affected Surfaces</h4>
                        <div className="flex gap-1 flex-wrap">{selected.affected_surfaces.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div>
                      </div>
                    )}
                    {selected.required_scopes.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1">Required Scopes</h4>
                        <div className="flex gap-1 flex-wrap">{selected.required_scopes.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div>
                      </div>
                    )}

                    <Separator className="bg-border" />

                    {/* Versions */}
                    <div>
                      <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Tag className="h-4 w-4" /> Versions ({versions.length})</h4>
                      {versions.length ? (
                        <ScrollArea className="max-h-40">
                          <div className="space-y-1">
                            {versions.map((v: any) => (
                              <div key={v.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                                <span className="text-sm font-mono text-foreground">{v.version_label}</span>
                                <div className="flex gap-1 items-center">
                                  <Badge variant="outline" className="text-xs">{v.status}</Badge>
                                  <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : <p className="text-xs text-muted-foreground">No versions yet.</p>}
                    </div>

                    <Separator className="bg-border" />

                    {/* Events */}
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Package Events</h4>
                      {events.length ? (
                        <ScrollArea className="max-h-40">
                          <div className="space-y-1">
                            {events.map((e: any) => (
                              <div key={e.id} className="p-2 rounded bg-muted/30 text-xs">
                                <span className="font-mono text-primary">{e.event_type}</span>
                                <span className="text-muted-foreground ml-2">{new Date(e.created_at).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : <p className="text-xs text-muted-foreground">No events.</p>}
                    </div>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </main>
      </div>
    </SidebarProvider>
  );
}
