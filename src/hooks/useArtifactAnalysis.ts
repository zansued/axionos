import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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

export interface ReworkResult {
  success: boolean;
  iteration: number;
  max_iterations: number;
  tokens_used: number;
  auto_mode: boolean;
  reanalysis: AiAnalysis | null;
  new_status: string;
  escalated?: boolean;
  message?: string;
}

export function useArtifactAnalysis() {
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [reworking, setReworking] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["agent-outputs"] });
    queryClient.invalidateQueries({ queryKey: ["artifact-reviews"] });
    queryClient.invalidateQueries({ queryKey: ["workspace-outputs"] });
  }, [queryClient]);

  const analyze = useCallback(async (artifactId: string, autoDecide = false) => {
    setAnalyzing(artifactId);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-artifact", {
        body: { artifactId, autoDecide },
      });
      if (error) {
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === "function") {
          const errJson = await ctx.json().catch(() => null);
          if (errJson?.error) throw new Error(errJson.error);
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      const result: AnalysisResult = {
        analysis: data.analysis as AiAnalysis,
        reasoning: data.reasoning || null,
      };
      setResults((prev) => ({ ...prev, [artifactId]: result }));

      if (data.autoDecision) {
        const actionLabels: Record<string, string> = {
          auto_approved: "✅ Aprovado automaticamente pela IA",
          auto_rejected: "❌ Rejeitado automaticamente pela IA",
          request_changes: "🔄 IA solicitou alterações",
        };
        toast({ title: actionLabels[data.autoDecision.action] || "Análise concluída", description: result.analysis.summary });
      } else {
        toast({ title: "Análise IA concluída", description: result.analysis.summary });
      }
      invalidate();
      return result;
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na análise IA", description: e.message });
      return null;
    } finally {
      setAnalyzing(null);
    }
  }, [toast, invalidate]);

  const rework = useCallback(async (artifactId: string, feedback?: string, autoMode = false): Promise<ReworkResult | null> => {
    setReworking(artifactId);
    try {
      const { data, error } = await supabase.functions.invoke("rework-artifact", {
        body: { artifactId, feedback, autoMode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result = data as ReworkResult;

      if (result.escalated) {
        toast({
          title: "⚠️ Escalado para revisão humana",
          description: result.message,
        });
      } else if (result.reanalysis?.verdict === "approve") {
        toast({
          title: "✅ Artefato aprovado automaticamente",
          description: `Aprovado pela IA após retrabalho (iteração ${result.iteration}). Confiança: ${result.reanalysis.confidence}%`,
        });
        // Update local analysis result
        setResults((prev) => ({
          ...prev,
          [artifactId]: { analysis: result.reanalysis!, reasoning: null },
        }));
      } else {
        toast({
          title: `🔄 Retrabalho concluído (${result.iteration}/${result.max_iterations})`,
          description: result.reanalysis
            ? `Nova análise: ${result.reanalysis.verdict === "request_changes" ? "ainda precisa de ajustes" : result.reanalysis.verdict}`
            : "Artefato atualizado. Envie para revisão.",
        });
        if (result.reanalysis) {
          setResults((prev) => ({
            ...prev,
            [artifactId]: { analysis: result.reanalysis!, reasoning: null },
          }));
        }
      }

      invalidate();
      return result;
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no retrabalho", description: e.message });
      return null;
    } finally {
      setReworking(null);
    }
  }, [toast, invalidate]);

  const analyzeAndAutoRework = useCallback(async (artifactId: string) => {
    // Step 1: Analyze with auto-decide enabled
    const analysisResult = await analyze(artifactId, true);
    if (!analysisResult) return null;

    // Step 2: If needs changes, auto-rework
    if (analysisResult.analysis.verdict === "request_changes" || analysisResult.analysis.verdict === "reject") {
      const feedback = [
        ...analysisResult.analysis.issues.map(i => `Problema: ${i}`),
        ...analysisResult.analysis.suggestions.map(s => `Sugestão: ${s}`),
      ].join("\n");

      return await rework(artifactId, feedback, true);
    }

    return analysisResult;
  }, [analyze, rework]);

  return { analyze, analyzing, results, rework, reworking, analyzeAndAutoRework };
}
