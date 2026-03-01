import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AiAnalysis {
  verdict: "approve" | "reject" | "request_changes";
  confidence: number;
  summary: string;
  strengths: string[];
  issues: string[];
  suggestions: string[];
  risk_level: "low" | "medium" | "high" | "critical";
}

export interface AnalysisResult {
  analysis: AiAnalysis;
  reasoning: string | null;
}

export function useArtifactAnalysis() {
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const { toast } = useToast();

  const analyze = useCallback(async (artifactId: string) => {
    setAnalyzing(artifactId);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-artifact", {
        body: { artifactId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result: AnalysisResult = {
        analysis: data.analysis as AiAnalysis,
        reasoning: data.reasoning || null,
      };
      setResults((prev) => ({ ...prev, [artifactId]: result }));
      toast({ title: "Análise IA concluída", description: result.analysis.summary });
      return result;
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erro na análise IA",
        description: e.message || "Erro desconhecido",
      });
      return null;
    } finally {
      setAnalyzing(null);
    }
  }, [toast]);

  return { analyze, analyzing, results };
}
