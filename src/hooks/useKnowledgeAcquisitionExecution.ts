import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useKnowledgeAcquisitionExecution() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("knowledge-acquisition-orchestrator", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const KEYS = {
    overview: ["acq-exec-overview", currentOrg?.id],
    jobs: ["acq-exec-jobs", currentOrg?.id],
  };

  const invalidateAll = () => Object.values(KEYS).forEach((k) => qc.invalidateQueries({ queryKey: k }));

  const overviewQuery = useQuery({ queryKey: KEYS.overview, queryFn: () => invoke("overview"), enabled: !!currentOrg });
  const jobsQuery = useQuery({ queryKey: KEYS.jobs, queryFn: () => invoke("list_jobs"), enabled: !!currentOrg });

  const enqueuePlan = useMutation({
    mutationFn: (planId: string) => invoke("enqueue_plan", { planId }),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Jobs enqueued", description: `${d.jobs_created} jobs created` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const executeNext = useMutation({
    mutationFn: () => invoke("execute_next"),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Execution cycle", description: `${d.executed} jobs executed` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelJob = useMutation({
    mutationFn: (jobId: string) => invoke("cancel_job", { jobId }),
    onSuccess: () => { invalidateAll(); toast({ title: "Job cancelled" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const retryJob = useMutation({
    mutationFn: (jobId: string) => invoke("retry_job", { jobId }),
    onSuccess: () => { invalidateAll(); toast({ title: "Retry scheduled" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const pauseAll = useMutation({
    mutationFn: () => invoke("pause_all"),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Paused", description: `${d.paused} jobs paused` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resumeAll = useMutation({
    mutationFn: () => invoke("resume_all"),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Resumed", description: `${d.resumed} jobs resumed` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    overview: overviewQuery.data || {},
    jobs: jobsQuery.data?.jobs || [],
    loading: overviewQuery.isLoading,
    enqueuePlan,
    executeNext,
    cancelJob,
    retryJob,
    pauseAll,
    resumeAll,
  };
}
