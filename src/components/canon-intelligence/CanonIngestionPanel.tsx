import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, RefreshCw, Zap, Globe, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

interface CanonIngestionPanelProps {
  sources: any[];
  syncRuns: any[];
  onRefresh: () => void;
}

const SYNC_STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  completed_empty: <Clock className="h-3.5 w-3.5 text-amber-400" />,
  in_progress: <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

export function CanonIngestionPanel({ sources, syncRuns, onRefresh }: CanonIngestionPanelProps) {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [ingestingAll, setIngestingAll] = useState(false);

  const seedSources = async () => {
    if (!currentOrg?.id) return;
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("canon-ingestion-agent", {
        body: { action: "seed_sources", organization_id: currentOrg.id },
      });
      if (error) throw error;
      toast({ title: "Sources Seeded", description: `${data.sources_created} knowledge sources added.` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const ingestSource = async (sourceId: string, sourceName: string) => {
    if (!currentOrg?.id) return;
    setIngesting(sourceId);
    try {
      const { data, error } = await supabase.functions.invoke("canon-ingestion-agent", {
        body: { action: "ingest_source", organization_id: currentOrg.id, source_id: sourceId },
      });
      if (error) throw error;
      toast({
        title: "Ingestion Complete",
        description: `${sourceName}: ${data.candidates_created || 0} new patterns extracted.`,
      });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Ingestion Failed", description: err.message, variant: "destructive" });
    } finally {
      setIngesting(null);
    }
  };

  const ingestAll = async () => {
    if (!currentOrg?.id) return;
    setIngestingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("canon-ingestion-agent", {
        body: { action: "ingest_all", organization_id: currentOrg.id },
      });
      if (error) throw error;
      const total = (data.results || []).reduce((sum: number, r: any) => sum + (r.candidates_created || 0), 0);
      toast({
        title: "Batch Ingestion Complete",
        description: `${total} new pattern candidates extracted from ${data.results?.length || 0} sources.`,
      });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Batch Ingestion Failed", description: err.message, variant: "destructive" });
    } finally {
      setIngestingAll(false);
    }
  };

  const activeSources = sources.filter((s: any) => s.status === "active");
  const recentSyncs = syncRuns.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={seedSources} disabled={seeding}>
          {seeding ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Globe className="h-3.5 w-3.5 mr-1.5" />}
          Seed Default Sources
        </Button>
        <Button size="sm" onClick={ingestAll} disabled={ingestingAll || activeSources.length === 0}>
          {ingestingAll ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
          Ingest All Sources
        </Button>
        <Button size="sm" variant="ghost" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source Registry */}
        <Card className="border-border/30 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Source Registry</CardTitle>
            <CardDescription className="text-xs">{activeSources.length} active sources configured</CardDescription>
          </CardHeader>
          <CardContent>
            {activeSources.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No sources registered. Click "Seed Default Sources" to add example knowledge sources.
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {activeSources.map((src: any) => (
                    <div key={src.id} className="p-3 rounded-lg border border-border/20 bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{src.source_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{src.source_url}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-[9px]">{src.source_type}</Badge>
                            <Badge variant="outline" className="text-[9px]">{src.domain_scope}</Badge>
                            {src.last_synced_at && (
                              <span className="text-[9px] text-muted-foreground/60">
                                Last: {new Date(src.last_synced_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => ingestSource(src.id, src.source_name)}
                          disabled={ingesting === src.id}
                        >
                          {ingesting === src.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Sync Runs */}
        <Card className="border-border/30 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Sync Runs</CardTitle>
            <CardDescription className="text-xs">{recentSyncs.length} recent ingestion runs</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSyncs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No sync runs yet.</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {recentSyncs.map((run: any) => (
                    <div key={run.id} className="p-3 rounded-lg border border-border/20 bg-muted/10">
                      <div className="flex items-center gap-2">
                        {SYNC_STATUS_ICON[run.sync_status] || <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="text-xs font-medium">{run.sync_status}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(run.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span>Found: {run.candidates_found}</span>
                        <span>Accepted: {run.candidates_accepted}</span>
                        <span>Rejected: {run.candidates_rejected}</span>
                      </div>
                      {run.sync_notes && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">{run.sync_notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
