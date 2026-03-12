import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Zap, Send, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function AxionPromptDrawer() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { currentOrg } = useOrg();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("action-engine", {
        body: {
          prompt,
          orgId: currentOrg?.id,
          stage: "execution"
        }
      });

      if (error) throw error;

      toast.success(`Axion Action Engine: ${data.actions_count} actions formalized in the pipeline.`);
      setPrompt("");
      setOpen(false);
    } catch (err) {
      console.error("Axion Action Error:", err);
      toast.error("Failed to formalize actions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 transition-all"
        >
          <Zap className="h-4 w-4 text-primary animate-pulse" />
          <span className="hidden sm:inline">Axion Action</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[40vh] sm:h-[30vh] bg-background/95 backdrop-blur-xl border-t-primary/20">
        <div className="max-w-4xl mx-auto h-full flex flex-col pt-4">
          <SheetHeader className="mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <SheetTitle className="text-xl font-display">Axion Action Engine</SheetTitle>
            </div>
            <p className="text-sm text-muted-foreground">Describe what you want to build or modify in the system.</p>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="relative flex-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Create a new billing dashboard component with Stripe charts..."
              className="w-full h-full min-h-[100px] p-4 rounded-xl bg-card border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none resize-none text-base transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            
            <div className="absolute bottom-3 right-3 flex items-center gap-3">
              <p className="text-[10px] text-muted-foreground hidden sm:block">Ctrl + Enter to send</p>
              <Button 
                type="submit" 
                disabled={!prompt.trim() || loading}
                className="gap-2 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {loading ? "Formalizing..." : "Execute"}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

