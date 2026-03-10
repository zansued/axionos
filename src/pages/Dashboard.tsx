import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { BoltStyleChat } from "@/components/ui/BoltInteraction";
import ChatLoader from "@/components/ui/ChatLoader";
import { PageGuidanceShell } from "@/components/guidance";

export default function Dashboard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!isGenerating) return;
    
    // Simula o progresso da IA processando a requisição até 95%
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 600);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const handlePromptSubmit = (
    prompt: string,
    modelId: string,
    assets: File[]
  ) => {
    // Inicia feedback visual imediato
    setIsGenerating(true);
    setLoadingProgress(0);

    console.log("Iniciando criação (Mock)", { prompt, modelId, assets });
    
    // No futuro aqui se redireciona ou aguarda a criacao da initiative para ir a /builder/[id]
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full w-full">
        {!isGenerating && <PageGuidanceShell pageKey="dashboard" />}
        
        <div className="flex-1 overflow-y-auto w-full relative">
           {isGenerating ? (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <ChatLoader progress={loadingProgress} />
             </div>
           ) : (
             <BoltStyleChat onSubmit={handlePromptSubmit} />
           )}
        </div>
      </div>
    </AppLayout>
  );
}
