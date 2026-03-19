import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Layers, AlertTriangle, BarChart3, Loader2 } from "lucide-react";
import { useSovereignCapabilities } from "@/hooks/useSovereignCapabilities";
import { CapabilitySummaryCards } from "@/components/sovereign-capabilities/CapabilitySummaryCards";
import { CapabilityMaturityTable } from "@/components/sovereign-capabilities/CapabilityMaturityTable";
import { DomainBreakdown } from "@/components/sovereign-capabilities/DomainBreakdown";
import { GapAnalysisPanel } from "@/components/sovereign-capabilities/GapAnalysisPanel";
import { LifecycleDistribution } from "@/components/sovereign-capabilities/LifecycleDistribution";

export default function SovereignCapabilitiesDashboard() {
  const { overview, gaps, loading, gapsLoading } = useSovereignCapabilities();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
            <Shield className="h-6 w-6 text-primary" />
            Capacidades Soberanas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Portfólio de capacidades organizacionais — maturidade, cobertura e lacunas
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <CapabilitySummaryCards summary={overview?.summary} />

            <Tabs defaultValue="maturity" className="space-y-4">
              <TabsList className="bg-muted/20 border border-border/20 flex-wrap h-auto gap-0.5 p-1">
                <TabsTrigger value="maturity" className="text-xs gap-1.5">
                  <Shield className="h-3.5 w-3.5" />Maturidade
                </TabsTrigger>
                <TabsTrigger value="domains" className="text-xs gap-1.5">
                  <Layers className="h-3.5 w-3.5" />Domínios
                </TabsTrigger>
                <TabsTrigger value="gaps" className="text-xs gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />Análise de Lacunas
                </TabsTrigger>
                <TabsTrigger value="lifecycle" className="text-xs gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />Ciclo de Vida
                </TabsTrigger>
              </TabsList>

              <TabsContent value="maturity">
                <CapabilityMaturityTable capabilities={overview?.capabilities} />
              </TabsContent>

              <TabsContent value="domains">
                <DomainBreakdown domains={overview?.domains} />
              </TabsContent>

              <TabsContent value="gaps">
                <GapAnalysisPanel gaps={gaps} loading={gapsLoading} />
              </TabsContent>

              <TabsContent value="lifecycle">
                <LifecycleDistribution distribution={overview?.lifecycle_distribution} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppShell>
  );
}
