import { Badge } from "@/components/ui/badge";
import { PRODUCT_TYPES, GENERATION_DEPTHS, INTEGRATION_OPTIONS } from "./types";
import type { InitiativeBrief } from "./types";
import { FileText, Code, Rocket, LayoutDashboard, Database } from "lucide-react";

interface Props {
  brief: InitiativeBrief;
}

function getComplexity(brief: InitiativeBrief): string {
  const featureCount = brief.core_features.length;
  const integrationCount = brief.integrations.length;
  const score = featureCount + integrationCount;
  if (score <= 3) return "Low";
  if (score <= 6) return "Medium";
  return "High";
}

function getExpectedOutputs(depth: string) {
  const base = [{ icon: FileText, label: "Product Discovery" }];
  if (depth === "discovery") return base;
  base.push({ icon: LayoutDashboard, label: "PRD" }, { icon: Database, label: "Architecture" });
  if (depth === "prd_architecture") return base;
  base.push({ icon: FileText, label: "Stories & Subtasks" });
  if (depth === "prd_arch_stories") return base;
  base.push({ icon: Code, label: "Code Scaffold" }, { icon: Rocket, label: "Deployment" });
  return base;
}

export function StepSummary({ brief }: Props) {
  const productType = PRODUCT_TYPES.find((p) => p.value === brief.product_type);
  const depth = GENERATION_DEPTHS.find((d) => d.value === brief.generation_depth);
  const complexity = getComplexity(brief);
  const outputs = getExpectedOutputs(brief.generation_depth);
  const integrationLabels = brief.integrations.map((v) => INTEGRATION_OPTIONS.find((o) => o.value === v)?.label || v);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Initiative Summary</h3>
        <p className="text-sm text-muted-foreground mt-1">Review before starting the pipeline.</p>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border text-sm">
        <Row label="Project" value={brief.name} />
        <Row label="Description" value={brief.description} />
        <Row label="Problem" value={brief.problem_statement} />
        <Row label="Audience" value={brief.target_audience} />
        <Row label="Product Type" value={`${productType?.icon || ""} ${productType?.label || brief.product_type}`} />
        <Row label="Features" value={brief.core_features.join(", ") || "None"} />
        <Row label="Integrations" value={integrationLabels.join(", ") || "None"} />
        <Row label="Pipeline Depth" value={`${depth?.label || brief.generation_depth} (${depth?.stages || ""})`} />
        <Row label="Deploy" value={brief.deployment_target} />
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-muted-foreground">Complexity</span>
          <Badge variant={complexity === "High" ? "destructive" : "secondary"} className="text-xs">{complexity}</Badge>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Expected Outputs</p>
        <div className="flex flex-wrap gap-2">
          {outputs.map((o) => (
            <div key={o.label} className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs">
              <o.icon className="h-3.5 w-3.5 text-muted-foreground" />
              {o.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{value || <span className="text-muted-foreground/50">—</span>}</span>
    </div>
  );
}
