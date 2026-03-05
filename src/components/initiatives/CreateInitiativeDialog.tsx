import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Globe, ArrowLeft, LayoutTemplate, Target, DollarSign, Users, Layers } from "lucide-react";
import { INITIATIVE_TEMPLATES, type InitiativeTemplate } from "./initiative-templates";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  onSubmit: (title: string, description: string, referenceUrl?: string, template?: InitiativeTemplate) => void;
  isPending: boolean;
}

const PRODUCT_TYPES = [
  { value: "saas", label: "SaaS", icon: "☁️" },
  { value: "marketplace", label: "Marketplace", icon: "🏪" },
  { value: "mobile_app", label: "Mobile App", icon: "📱" },
  { value: "api_service", label: "API / Service", icon: "🔌" },
  { value: "dashboard", label: "Dashboard / Analytics", icon: "📊" },
  { value: "ecommerce", label: "E-commerce", icon: "🛒" },
  { value: "social", label: "Social / Community", icon: "👥" },
  { value: "automation", label: "Automation Tool", icon: "⚙️" },
  { value: "other", label: "Outro", icon: "📦" },
];

const TARGET_MARKETS = [
  { value: "b2b", label: "B2B" },
  { value: "b2c", label: "B2C" },
  { value: "b2b2c", label: "B2B2C" },
  { value: "internal", label: "Internal Tool" },
  { value: "government", label: "Government" },
];

export function CreateInitiativeDialog({ onSubmit, isPending }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"picker" | "form">("picker");
  const [selectedTemplate, setSelectedTemplate] = useState<InitiativeTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [productType, setProductType] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [problemStatement, setProblemStatement] = useState("");

  const resetForm = () => {
    setTitle("");
    setDesc("");
    setReferenceUrl("");
    setProductType("");
    setTargetMarket("");
    setProblemStatement("");
    setSelectedTemplate(null);
    setView("picker");
  };

  const handleSelectTemplate = (tpl: InitiativeTemplate) => {
    setSelectedTemplate(tpl);
    setTitle(tpl.name);
    setDesc(tpl.ideaRaw);
    setView("form");
  };

  const handleBlank = () => {
    setSelectedTemplate(null);
    setTitle("");
    setDesc("");
    setView("form");
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    // Enrich description with v3 context
    let enrichedDesc = desc.trim();
    const contextParts: string[] = [];
    if (productType) {
      const pt = PRODUCT_TYPES.find(p => p.value === productType);
      contextParts.push(`Product Type: ${pt?.label || productType}`);
    }
    if (targetMarket) {
      const tm = TARGET_MARKETS.find(m => m.value === targetMarket);
      contextParts.push(`Target Market: ${tm?.label || targetMarket}`);
    }
    if (problemStatement.trim()) {
      contextParts.push(`Problem Statement: ${problemStatement.trim()}`);
    }
    if (contextParts.length > 0) {
      enrichedDesc = `${enrichedDesc}\n\n---\n${contextParts.join("\n")}`;
    }
    onSubmit(title.trim(), enrichedDesc, referenceUrl.trim() || undefined, selectedTemplate || undefined);
    resetForm();
    setOpen(false);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Iniciativa</Button>
      </DialogTrigger>
      <DialogContent className={view === "picker" ? "sm:max-w-2xl" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            {view === "form" && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView("picker")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {view === "picker" ? "Escolha um template ou comece do zero" : "Nova Iniciativa"}
          </DialogTitle>
        </DialogHeader>

        {view === "picker" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {INITIATIVE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className="group relative flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left transition-all hover:border-primary hover:shadow-md hover:bg-accent/50"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-2xl">{tpl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tpl.name}</p>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">{tpl.category}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{tpl.discoveryHints.complexity === "low" ? "Simples" : tpl.discoveryHints.complexity === "medium" ? "Médio" : "Complexo"}</Badge>
                    <Badge variant="outline" className="text-[10px]">{tpl.discoveryHints.riskLevel === "low" ? "Risco baixo" : "Risco médio"}</Badge>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs before:flex-1 before:h-px before:bg-border after:flex-1 after:h-px after:bg-border">ou</div>
            <Button variant="outline" className="w-full gap-2" onClick={handleBlank}>
              <LayoutTemplate className="h-4 w-4" /> Criar do zero
            </Button>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {selectedTemplate && (
              <div className="flex items-center gap-2 rounded-md bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
                <span className="text-lg">{selectedTemplate.icon}</span>
                Template: <span className="font-medium text-foreground">{selectedTemplate.name}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto">{selectedTemplate.category}</Badge>
              </div>
            )}

            {/* Core fields */}
            <div className="space-y-2">
              <Label>O que você quer construir?</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: SaaS de gestão de clínicas" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descreva o contexto, público-alvo e objetivos..." className="min-h-[80px] text-sm" />
            </div>

            {/* v3 Venture Intelligence fields */}
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Venture Intelligence (v3)
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Tipo de Produto
                  </Label>
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map(pt => (
                        <SelectItem key={pt.value} value={pt.value} className="text-xs">
                          {pt.icon} {pt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Users className="h-3 w-3" /> Mercado Alvo
                  </Label>
                  <Select value={targetMarket} onValueChange={setTargetMarket}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_MARKETS.map(tm => (
                        <SelectItem key={tm.value} value={tm.value} className="text-xs">
                          {tm.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Problema a Resolver
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  placeholder="Qual dor ou problema específico este produto resolve?"
                  className="min-h-[60px] text-xs"
                />
              </div>
            </div>

            {/* Reference URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                URL de Referência <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="https://roadmap.sh ou qualquer site de inspiração"
                type="url"
              />
              <p className="text-[10px] text-muted-foreground">
                A IA irá analisar este site e usar como referência no Opportunity Discovery e Planning.
              </p>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={!title.trim() || isPending}>
              Criar Iniciativa
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
