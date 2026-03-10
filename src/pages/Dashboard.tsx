import React, { useState, useEffect } from "react";
import { BoltStyleChat } from "@/components/ui/BoltInteraction";

export default function Dashboard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handlePromptSubmit = (
    prompt: string,
    modelId: string,
    assets: File[]
  ) => {
    setIsGenerating(true);
    setLoadingProgress(0);
    console.log("Iniciando criação", { prompt, modelId });
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <BoltStyleChat 
        onSubmit={handlePromptSubmit} 
        isGenerating={isGenerating}
        progress={Math.round(loadingProgress)}
      />
    </div>
  );
}
