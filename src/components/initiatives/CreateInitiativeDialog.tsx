import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Globe, ArrowLeft, LayoutTemplate } from "lucide-react";
import { INITIATIVE_TEMPLATES, type InitiativeTemplate } from "./initiative-templates";
import { Badge } from "@/components/ui/badge";

interface Props {
  onSubmit: (title: string, description: string, referenceUrl?: string, template?: InitiativeTemplate) => void;
  isPending: boolean;
}

export function CreateInitiativeDialog({ onSubmit, isPending }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"picker" | "form">("picker");
  const [selectedTemplate, setSelectedTemplate] = useState<InitiativeTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");

  const resetForm = () => {
    setTitle("");
    setDesc("");
    setReferenceUrl("");
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
    onSubmit(title.trim(), desc.trim(), referenceUrl.trim() || undefined, selectedTemplate || undefined);
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
      <DialogContent className={view === "picker" ? "sm:max-w-2xl" : ""}>
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
          <div className="space-y-4">
            {selectedTemplate && (
              <div className="flex items-center gap-2 rounded-md bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
                <span className="text-lg">{selectedTemplate.icon}</span>
                Template: <span className="font-medium text-foreground">{selectedTemplate.name}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto">{selectedTemplate.category}</Badge>
              </div>
            )}
            <div className="space-y-2">
              <Label>O que você quer construir?</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: SaaS de gestão de clínicas" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descreva o contexto, público-alvo e objetivos..." className="min-h-[100px] text-sm" />
            </div>
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
                A IA irá analisar este site e usar como referência no Discovery e Planning.
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
