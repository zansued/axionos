import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface Props {
  onSubmit: (title: string, description: string) => void;
  isPending: boolean;
}

export function CreateInitiativeDialog({ onSubmit, isPending }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit(title.trim(), desc.trim());
    setTitle("");
    setDesc("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Iniciativa</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Nova Iniciativa</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>O que você quer construir?</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: SaaS de gestão de clínicas" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descreva o contexto, público-alvo e objetivos..." className="min-h-[100px] text-sm" />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!title.trim() || isPending}>
            Criar Iniciativa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
