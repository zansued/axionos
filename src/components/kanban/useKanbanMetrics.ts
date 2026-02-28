import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StoryMetrics, Story } from "./types";

export function useKanbanMetrics(stories: Story[]) {
  // Fetch all story_phases + subtasks for these stories
  const storyIds = useMemo(() => stories.map((s) => s.id), [stories]);

  const { data: phasesData = [] } = useQuery({
    queryKey: ["kanban-phases", storyIds],
    enabled: storyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_phases")
        .select("*, story_subtasks(*)")
        .in("story_id", storyIds);
      if (error) throw error;
      return data;
    },
  });

  // Fetch outputs linked to subtasks of these stories
  const subtaskIds = useMemo(() => {
    const ids: string[] = [];
    phasesData.forEach((p: any) => {
      (p.story_subtasks || []).forEach((st: any) => ids.push(st.id));
    });
    return ids;
  }, [phasesData]);

  const { data: outputs = [] } = useQuery({
    queryKey: ["kanban-outputs", subtaskIds],
    enabled: subtaskIds.length > 0,
    queryFn: async () => {
      // Fetch in batches if needed
      const { data, error } = await supabase
        .from("agent_outputs")
        .select("id, subtask_id, cost_estimate, tokens_used, created_at, status")
        .in("subtask_id", subtaskIds.slice(0, 500));
      if (error) throw error;
      return data;
    },
  });

  // Fetch validation runs for these outputs
  const outputIds = useMemo(() => outputs.map((o: any) => o.id), [outputs]);

  const { data: validations = [] } = useQuery({
    queryKey: ["kanban-validations", outputIds],
    enabled: outputIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_runs")
        .select("artifact_id, result, duration")
        .in("artifact_id", outputIds.slice(0, 500));
      if (error) throw error;
      return data;
    },
  });

  // Build metrics map: storyId -> StoryMetrics
  const metricsMap = useMemo(() => {
    const map: Record<string, StoryMetrics> = {};

    // Build subtaskId -> storyId lookup
    const subtaskToStory: Record<string, string> = {};
    const storySubtaskStats: Record<string, { total: number; completed: number; failed: number }> = {};

    phasesData.forEach((p: any) => {
      const sid = p.story_id;
      if (!storySubtaskStats[sid]) storySubtaskStats[sid] = { total: 0, completed: 0, failed: 0 };
      (p.story_subtasks || []).forEach((st: any) => {
        subtaskToStory[st.id] = sid;
        storySubtaskStats[sid].total++;
        if (st.status === "completed") storySubtaskStats[sid].completed++;
        if (st.status === "failed") storySubtaskStats[sid].failed++;
      });
    });

    // Aggregate output metrics per story
    const storyCost: Record<string, number> = {};
    const storyTokens: Record<string, number> = {};
    const storyExecCount: Record<string, number> = {};
    const outputToStory: Record<string, string> = {};

    outputs.forEach((o: any) => {
      const sid = subtaskToStory[o.subtask_id];
      if (!sid) return;
      outputToStory[o.id] = sid;
      storyCost[sid] = (storyCost[sid] || 0) + (Number(o.cost_estimate) || 0);
      storyTokens[sid] = (storyTokens[sid] || 0) + (o.tokens_used || 0);
      storyExecCount[sid] = (storyExecCount[sid] || 0) + 1;
    });

    // Aggregate validation results per story
    const storyValResults: Record<string, string[]> = {};
    const storyDurations: Record<string, number[]> = {};

    validations.forEach((v: any) => {
      const sid = outputToStory[v.artifact_id];
      if (!sid) return;
      if (!storyValResults[sid]) storyValResults[sid] = [];
      storyValResults[sid].push(v.result);
      if (v.duration) {
        if (!storyDurations[sid]) storyDurations[sid] = [];
        storyDurations[sid].push(v.duration);
      }
    });

    stories.forEach((s) => {
      const stats = storySubtaskStats[s.id] || { total: 0, completed: 0, failed: 0 };
      const valResults = storyValResults[s.id] || [];
      const durations = storyDurations[s.id] || [];
      const failRate = stats.total > 0 ? stats.failed / stats.total : 0;

      let validationStatus: StoryMetrics["validationStatus"] = "none";
      if (valResults.length > 0) {
        const passes = valResults.filter((r) => r === "pass").length;
        const fails = valResults.filter((r) => r === "fail").length;
        if (fails > 0 && passes === 0) validationStatus = "fail";
        else if (passes > 0 && fails === 0) validationStatus = "pass";
        else if (passes > 0 && fails > 0) validationStatus = "mixed";
        else validationStatus = "pending";
      }

      let riskLevel: StoryMetrics["riskLevel"] = "low";
      if (failRate >= 0.5 || validationStatus === "fail") riskLevel = "critical";
      else if (failRate >= 0.25 || validationStatus === "mixed") riskLevel = "high";
      else if (failRate > 0 || stats.total === 0) riskLevel = "medium";

      map[s.id] = {
        cost: storyCost[s.id] || 0,
        tokens: storyTokens[s.id] || 0,
        avgTime: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        totalExecutions: storyExecCount[s.id] || 0,
        validationStatus,
        riskLevel,
        failedSubtasks: stats.failed,
        totalSubtasks: stats.total,
        completedSubtasks: stats.completed,
      };
    });

    return map;
  }, [stories, phasesData, outputs, validations]);

  return metricsMap;
}
