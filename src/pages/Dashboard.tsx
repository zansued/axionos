import React, { useState, useEffect } from "react";
import { BoltStyleChat } from "@/components/ui/BoltInteraction";
import ChatLoader from "@/components/ui/ChatLoader";

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
    setIsGenerating(true);
    setLoadingProgress(0);
    console.log("Iniciando criação (Mock)", { prompt, modelId, assets });
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      {isGenerating ? (
        <div className="h-full w-full flex items-center justify-center bg-background">
          <ChatLoader progress={loadingProgress} />
        </div>
      ) : (
        <BoltStyleChat onSubmit={handlePromptSubmit} />
      )}
    </div>
  );
}
