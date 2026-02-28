import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Map } from "lucide-react";
import { EmptyState } from "./WorkspaceShared";

export function WorkspacePlan({ planning }: { planning: any[] }) {
  if (planning.length === 0) {
    return <EmptyState icon={Map} text="Nenhuma sessão de planejamento. Acesse a página de Planejamento para criar." />;
  }

  return (
    <div className="space-y-4">
      {planning.map((p: any) => (
        <Card key={p.id} className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">{p.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{p.description}</p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{p.status}</Badge>
              {p.prd_content && <Badge variant="secondary" className="text-[10px]">PRD ✓</Badge>}
              {p.architecture_content && <Badge variant="secondary" className="text-[10px]">Arquitetura ✓</Badge>}
            </div>
            {p.prd_content && (
              <ScrollArea className="mt-3 max-h-[200px] rounded border border-border/30 bg-muted/20 p-3">
                <pre className="text-xs whitespace-pre-wrap">{p.prd_content.slice(0, 2000)}</pre>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
