import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Users, PackageCheck, AlertTriangle, XCircle, Eye, Clock, ShieldCheck } from "lucide-react";
import { useState } from "react";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("pilot-marketplace", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

function usePilotMarketplace() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const overview = useQuery({ queryKey: ["pilot-mp-overview", orgId], queryFn: () => invokeEngine(orgId!, "overview"), enabled: !!orgId, refetchInterval: 30000 });
  const participants = useQuery({ queryKey: ["pilot-mp-participants", orgId], queryFn: () => invokeEngine(orgId!, "list_participants"), enabled: !!orgId });
  const submissions = useQuery({ queryKey: ["pilot-mp-submissions", orgId], queryFn: () => invokeEngine(orgId!, "list_submissions"), enabled: !!orgId });
  const exposures = useQuery({ queryKey: ["pilot-mp-exposures", orgId], queryFn: () => invokeEngine(orgId!, "list_exposures"), enabled: !!orgId });
  return { overview, participants, submissions, exposures };
}

const statusColor = (s: string) => {
  switch (s) {
    case "active": case "approved": case "trusted": case "pilot_active": return "default";
    case "pending": case "pending_review": case "submitted": case "under_review": return "secondary";
    case "rejected": case "suspended": case "blocked": case "withdrawn": return "destructive";
    default: return "outline";
  }
};

export default function PilotMarketplace() {
  const { overview, participants, submissions, exposures } = usePilotMarketplace();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [drawerType, setDrawerType] = useState<string>("");
  const ov = overview.data as any;

  const kpis = [
    { label: "Active Partners", value: ov?.active_participants ?? "—", icon: Users, color: "text-emerald-400" },
    { label: "Submissions", value: ov?.total_submissions ?? "—", icon: PackageCheck, color: "text-blue-400" },
    { label: "Pending Review", value: ov?.pending_submissions ?? "—", icon: Clock, color: "text-amber-400" },
    { label: "Approved", value: ov?.approved_submissions ?? "—", icon: ShieldCheck, color: "text-emerald-400" },
    { label: "Rejected", value: ov?.rejected_submissions ?? "—", icon: XCircle, color: "text-red-400" },
    { label: "High-Risk", value: ov?.high_risk_submissions ?? "—", icon: AlertTriangle, color: "text-orange-400" },
    { label: "Live Pilots", value: ov?.active_exposures ?? "—", icon: Eye, color: "text-purple-400" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pilot Marketplace</h1>
            <p className="text-sm text-muted-foreground">Governed creator/partner pilot marketplace for curated capability submissions.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {kpis.map((k) => (
              <Card key={k.label} className="bg-card border-border">
                <CardContent className="pt-4 pb-3 px-4 flex flex-col items-center">
                  <k.icon className={`h-5 w-5 mb-1 ${k.color}`} />
                  <span className="text-xl font-bold text-foreground">{k.value}</span>
                  <span className="text-[11px] text-muted-foreground text-center">{k.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="submissions">
            <TabsList>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="exposures">Pilot Exposure</TabsTrigger>
            </TabsList>

            <TabsContent value="submissions">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-sm">Pilot Capability Submissions</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {(submissions.data as any[])?.length ? (submissions.data as any[]).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-border cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => { setSelectedItem(s); setDrawerType("submission"); }}>
                        <div>
                          <span className="text-sm font-medium text-foreground">{s.submission_name || s.id.slice(0, 8)}</span>
                          <p className="text-xs text-muted-foreground">By: {s.ecosystem_participants?.participant_name || "—"} · Risk: {s.risk_posture}</p>
                        </div>
                        <Badge variant={statusColor(s.submission_status)}>{s.submission_status}</Badge>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">No pilot submissions yet.</p>}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="participants">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-sm">Ecosystem Participants</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {(participants.data as any[])?.length ? (participants.data as any[]).map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-border cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => { setSelectedItem(p); setDrawerType("participant"); }}>
                        <div>
                          <span className="text-sm font-medium text-foreground">{p.participant_name || p.id.slice(0, 8)}</span>
                          <p className="text-xs text-muted-foreground">Type: {p.participant_type} · Trust: {p.trust_status}</p>
                        </div>
                        <Badge variant={statusColor(p.participation_status)}>{p.participation_status}</Badge>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">No participants registered.</p>}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="exposures">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-sm">Pilot Marketplace Exposure</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {(exposures.data as any[])?.length ? (exposures.data as any[]).map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between py-2 border-b border-border cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => { setSelectedItem(e); setDrawerType("exposure"); }}>
                        <div>
                          <span className="text-sm font-medium text-foreground">{e.pilot_capability_submissions?.submission_name || e.submission_id?.slice(0, 8)}</span>
                          <p className="text-xs text-muted-foreground">Scope: {e.exposure_scope}</p>
                        </div>
                        <Badge variant={statusColor(e.exposure_status)}>{e.exposure_status}</Badge>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">No pilot exposures yet.</p>}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
            <SheetContent className="w-[420px] bg-card">
              <SheetHeader>
                <SheetTitle className="text-foreground">
                  {drawerType === "submission" ? "Submission Detail" : drawerType === "participant" ? "Participant Detail" : "Exposure Detail"}
                </SheetTitle>
              </SheetHeader>
              {selectedItem && (
                <div className="mt-4 space-y-3 text-sm">
                  <div><span className="text-muted-foreground">ID:</span> <span className="text-foreground font-mono text-xs">{selectedItem.id}</span></div>
                  <Separator />
                  {drawerType === "submission" && (
                    <>
                      <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground">{selectedItem.submission_name}</span></div>
                      <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColor(selectedItem.submission_status)}>{selectedItem.submission_status}</Badge></div>
                      <div><span className="text-muted-foreground">Risk:</span> <span className="text-foreground">{selectedItem.risk_posture}</span></div>
                      <div><span className="text-muted-foreground">Compatibility:</span> <span className="text-foreground">{selectedItem.compatibility_posture}</span></div>
                      <div><span className="text-muted-foreground">Rollback Ready:</span> <span className="text-foreground">{selectedItem.rollback_ready ? "Yes" : "No"}</span></div>
                      <div><span className="text-muted-foreground">Description:</span> <span className="text-foreground">{selectedItem.submission_description || "—"}</span></div>
                    </>
                  )}
                  {drawerType === "participant" && (
                    <>
                      <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground">{selectedItem.participant_name}</span></div>
                      <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground">{selectedItem.participant_type}</span></div>
                      <div><span className="text-muted-foreground">Trust:</span> <Badge variant={statusColor(selectedItem.trust_status)}>{selectedItem.trust_status}</Badge></div>
                      <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColor(selectedItem.participation_status)}>{selectedItem.participation_status}</Badge></div>
                    </>
                  )}
                  {drawerType === "exposure" && (
                    <>
                      <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColor(selectedItem.exposure_status)}>{selectedItem.exposure_status}</Badge></div>
                      <div><span className="text-muted-foreground">Scope:</span> <span className="text-foreground">{selectedItem.exposure_scope}</span></div>
                      <div><span className="text-muted-foreground">Exposed At:</span> <span className="text-foreground">{selectedItem.exposed_at ? new Date(selectedItem.exposed_at).toLocaleString() : "—"}</span></div>
                    </>
                  )}
                  <Separator />
                  <div><span className="text-muted-foreground">Created:</span> <span className="text-foreground">{new Date(selectedItem.created_at).toLocaleString()}</span></div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </main>
      </div>
    </SidebarProvider>
  );
}
