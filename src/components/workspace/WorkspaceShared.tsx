import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <Icon className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground text-sm">{text}</p>
      </CardContent>
    </Card>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  deployed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_review: "Em Revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
  deployed: "Deployed",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`text-[10px] ${STATUS_STYLES[status] || ""}`}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}

export function getOutputText(raw: any): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw) && "text" in raw) {
    return String(raw.text);
  }
  return JSON.stringify(raw, null, 2);
}
