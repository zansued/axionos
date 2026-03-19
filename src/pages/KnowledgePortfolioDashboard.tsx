import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Layers, AlertTriangle, Scale, ListChecks, Sparkles } from "lucide-react";
import { useKnowledgePortfolio } from "@/hooks/useKnowledgePortfolio";
import { PortfolioOverviewCards } from "@/components/knowledge-portfolio/PortfolioOverviewCards";
import { RedundancyHotspots } from "@/components/knowledge-portfolio/RedundancyHotspots";
import { CoverageGaps } from "@/components/knowledge-portfolio/CoverageGaps";
import { KnowledgeFamilyBalance } from "@/components/knowledge-portfolio/KnowledgeFamilyBalance";
import { OptimizationQueue } from "@/components/knowledge-portfolio/OptimizationQueue";
import { Button } from "@/components/ui/button";

export default function KnowledgePortfolioDashboard() {
  const portfolio = useKnowledgePortfolio();

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
              <BarChart3 className="h-6 w-6 text-primary" />
              Portfólio de Conhecimento
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Analise redundância, lacunas de cobertura e equilíbrio do conhecimento institucional
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => portfolio.generateProposals.mutate()}
              disabled={portfolio.generateProposals.isPending}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {portfolio.generateProposals.isPending ? "Gerando…" : "Gerar Propostas"}
            </Button>
            <Button
              size="sm"
              onClick={() => portfolio.analyzePortfolio.mutate()}
              disabled={portfolio.analyzePortfolio.isPending}
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              {portfolio.analyzePortfolio.isPending ? "Analisando…" : "Analisar Portfólio"}
            </Button>
          </div>
        </div>

        <PortfolioOverviewCards snapshot={portfolio.latestSnapshot} />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-muted/20 border border-border/20 flex-wrap h-auto gap-0.5 p-1">
            <TabsTrigger value="overview" className="text-xs gap-1.5"><Layers className="h-3.5 w-3.5" />Visão Geral</TabsTrigger>
            <TabsTrigger value="redundancy" className="text-xs gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Redundância</TabsTrigger>
            <TabsTrigger value="coverage" className="text-xs gap-1.5"><Layers className="h-3.5 w-3.5" />Cobertura</TabsTrigger>
            <TabsTrigger value="balance" className="text-xs gap-1.5"><Scale className="h-3.5 w-3.5" />Equilíbrio</TabsTrigger>
            <TabsTrigger value="proposals" className="text-xs gap-1.5"><ListChecks className="h-3.5 w-3.5" />Propostas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <KnowledgeFamilyBalance segments={portfolio.segments} snapshot={portfolio.latestSnapshot} />
              <RedundancyHotspots segments={portfolio.segments} />
            </div>
          </TabsContent>

          <TabsContent value="redundancy">
            <RedundancyHotspots segments={portfolio.segments} />
          </TabsContent>

          <TabsContent value="coverage">
            <CoverageGaps segments={portfolio.segments} />
          </TabsContent>

          <TabsContent value="balance">
            <KnowledgeFamilyBalance segments={portfolio.segments} snapshot={portfolio.latestSnapshot} />
          </TabsContent>

          <TabsContent value="proposals">
            <OptimizationQueue
              proposals={portfolio.proposals}
              onDecide={(proposalId, decision, notes) => portfolio.decideProposal.mutate({ proposalId, decision, notes })}
              deciding={portfolio.decideProposal.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
