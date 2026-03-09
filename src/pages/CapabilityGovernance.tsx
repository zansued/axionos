import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PageIntroCard } from "@/components/guidance";
import { usePageGuidance } from "@/hooks/usePageGuidance";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Clock, AlertTriangle, XCircle, Lock, CheckCircle } from "lucide-react";
import { useState } from "react";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("capability-governance", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

function useCapabilityGovernance() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({ queryKey: ["cap-gov-overview", orgId], queryFn: () => invokeEngine(orgId!, "overview"), enabled: !!orgId, refetchInterval: 30000 });
  const requests = useQuery({ queryKey: ["cap-gov-requests", orgId], queryFn: () => invokeEngine(orgId!, "list_requests"), enabled: !!orgId });
  const entitlements = useQuery({ queryKey: ["cap-gov-entitlements", orgId], queryFn: () => invokeEngine(orgId!, "list_entitlements"), enabled: !!orgId });
  const trustPostures = useQuery({ queryKey: ["cap-gov-trust", orgId], queryFn: () => invokeEngine(orgId!, "list_trust_postures"), enabled: !!orgId });

  return { overview, requests, entitlements, trustPostures };
}

const statusColor = (s: string) => {
  switch (s) {
    case "active": case "approved": case "internal_trusted": return "default";
    case "pending": case "operator_reviewed": return "secondary";
    case "rejected": case "revoked": case "suspended": return "destructive";
    default: return "outline";
  }
};

export default function CapabilityGovernance() {
  const { overview, requests, entitlements, trustPostures } = useCapabilityGovernance();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [drawerType, setDrawerType] = useState<string>("");
  const ov = overview.data as any;
  const { guidance, whyNow } = usePageGuidance("capability-governance");

  const kpis = [
    { label: "Active Entitlements", value: ov?.active_entitlements ?? "—", icon: CheckCircle, color: "text-emerald-400" },
    { label: "Pending Requests", value: ov?.pending_requests ?? "—", icon: Clock, color: "text-amber-400" },
    { label: "Rejected Requests", value: ov?.rejected_requests ?? "—", icon: XCircle, color: "text-red-400" },
    { label: "High-Risk Caps", value: ov?.high_risk_capabilities ?? "—", icon: AlertTriangle, color: "text-orange-400" },
    { label: "Suspended", value: ov?.suspended_capabilities ?? "—", icon: Lock, color: "text-red-500" },
    { label: "Revoked", value: ov?.revoked_entitlements ?? "—", icon: ShieldCheck, color: "text-muted-foreground" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Capability Governance</h1>
            <p className="text-sm text-muted-foreground">Trust postures, entitlements, and approval flows for governed capability access.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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

          <Tabs defaultValue="requests">
            <TabsList>
              <TabsTrigger value="requests">Access Requests</TabsTrigger>
              <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
              <TabsTrigger value="trust">Trust Postures</TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-sm">Capability Access Requests</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {(requests.data as any[])?.length ? (requests.data as any[]).map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between py-2 border-b border-border cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => { setSelectedItem(r); setDrawerType("request"); }}>
                        <div>
                          <span className="text-sm font-medium text-foreground">{r.capability_packages?.package_name || r.capability_package_id?.slice(0, 8)}</span>
                          <p className="text-xs text-muted-foreground">{r.request_reason?.slice(0, 60) || "No reason"}</p>
                        </div>
                        <Badge variant={statusColor(r.request_status)}>{r.request_status}</Badge>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">No access requests yet.</p>}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="entitlements">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-sm">Capability Entitlements</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {(entitlements.data as any[])?.length ? (entitlements.data as any[]).map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between py-2 border-b border-border cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => { setSelectedItem(e); setDrawerType("entitlement"); }}>
                        <div>
                          <span className="text-sm font-medium text-foreground">{e.capability_packages?.package_name || e.capability_package_id?.slice(0, 8)}</span>
                          <p className="text-xs text-muted-foreground">Access: {e.access_level} · Principal: {e.principal_type}</p>
                        </div>
                        <Badge variant={statusColor(e.entitlement_status)}>{e.entitlement_status}</Badge>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">No entitlements yet.</p>}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trust">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-sm">Capability Trust Postures</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {(trustPostures.data as any[])?.length ? (trustPostures.data as any[]).map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-border cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => { setSelectedItem(t); setDrawerType("trust"); }}>
                        <div>
                          <span className="text-sm font-medium text-foreground">{t.capability_packages?.package_name || t.capability_package_id?.slice(0, 8)}</span>
                          <p className="text-xs text-muted-foreground">Risk: {t.risk_posture}</p>
                        </div>
                        <Badge variant={statusColor(t.trust_level)}>{t.trust_level}</Badge>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">No trust postures configured.</p>}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
            <SheetContent className="w-[420px] bg-card">
              <SheetHeader>
                <SheetTitle className="text-foreground">
                  {drawerType === "request" ? "Access Request Detail" : drawerType === "entitlement" ? "Entitlement Detail" : "Trust Posture Detail"}
                </SheetTitle>
              </SheetHeader>
              {selectedItem && (
                <div className="mt-4 space-y-3 text-sm">
                  <div><span className="text-muted-foreground">ID:</span> <span className="text-foreground font-mono text-xs">{selectedItem.id}</span></div>
                  <Separator />
                  {drawerType === "request" && (
                    <>
                      <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColor(selectedItem.request_status)}>{selectedItem.request_status}</Badge></div>
                      <div><span className="text-muted-foreground">Requested Level:</span> <span className="text-foreground">{selectedItem.requested_access_level}</span></div>
                      <div><span className="text-muted-foreground">Reason:</span> <span className="text-foreground">{selectedItem.request_reason || "—"}</span></div>
                      <div><span className="text-muted-foreground">Resolution:</span> <span className="text-foreground">{selectedItem.resolution_notes || "—"}</span></div>
                    </>
                  )}
                  {drawerType === "entitlement" && (
                    <>
                      <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColor(selectedItem.entitlement_status)}>{selectedItem.entitlement_status}</Badge></div>
                      <div><span className="text-muted-foreground">Access Level:</span> <span className="text-foreground">{selectedItem.access_level}</span></div>
                      <div><span className="text-muted-foreground">Principal:</span> <span className="text-foreground">{selectedItem.principal_type}: {selectedItem.principal_id?.slice(0, 12) || "—"}</span></div>
                      <div><span className="text-muted-foreground">Granted By:</span> <span className="text-foreground">{selectedItem.granted_by?.slice(0, 12) || "—"}</span></div>
                    </>
                  )}
                  {drawerType === "trust" && (
                    <>
                      <div><span className="text-muted-foreground">Trust Level:</span> <Badge variant={statusColor(selectedItem.trust_level)}>{selectedItem.trust_level}</Badge></div>
                      <div><span className="text-muted-foreground">Risk Posture:</span> <span className="text-foreground">{selectedItem.risk_posture}</span></div>
                      <div><span className="text-muted-foreground">Review Notes:</span> <span className="text-foreground">{selectedItem.review_notes || "—"}</span></div>
                      <div><span className="text-muted-foreground">Reviewed By:</span> <span className="text-foreground">{selectedItem.reviewed_by?.slice(0, 12) || "—"}</span></div>
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
