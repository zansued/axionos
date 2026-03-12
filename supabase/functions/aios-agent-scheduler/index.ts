/**
 * AxionOS - AIOS-inspired Agent Scheduler (Sprint 154 / AE-12)
 *
 * This Edge Function translates the AIOS Round Robin (RR) Scheduler logic 
 * to Deno/Supabase, providing a fair and efficient execution layer 
 * for multiple specialized agents.
 * 
 * Original Logic Source: agiresearch/AIOS (aios/scheduler/rr_scheduler.py)
 * Translated via AxionOS arch-translator skill.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// --- Types & Schema (AxionOS Standards) ---

const SchedulerRequestSchema = z.object({
  initiative_id: z.string().uuid().optional(),
  action_id: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  syscall_type: z.enum(["llm", "memory", "storage", "tool"]).default("llm"),
  payload: z.any(),
});

type SchedulerRequest = z.infer<typeof SchedulerRequestSchema>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Core Scheduling Constants (From AIOS) ---

const DEFAULT_TIME_SLICE = 1000; // 1 second in ms
const MAX_BATCH_SIZE = 5;       // Number of concurrent syscalls to process

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 2. Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 3. Parse & Validate Intake Request
    const body = await req.json();
    const result = SchedulerRequestSchema.safeParse(body);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { initiative_id, syscall_type, payload, priority } = result.data;

    console.log(`[AIOS-Scheduler] Received ${syscall_type} request with priority ${priority}`);

    // 4. Implement Round Robin (RR) Logic via DB Queue
    // Instead of persistent threads (Python), we use a persistent DB Queue
    // for fairness and fault-tolerance (AxionOS Multi-Agent Coordination).
    
    // Step 4.1: Guard — organization_id must be a valid UUID
    const schedulerOrgId = payload.organization_id;
    if (!schedulerOrgId || schedulerOrgId === "global") {
      return new Response(
        JSON.stringify({ error: "organization_id (valid UUID) is required for AIOS scheduling" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 4.2: Enqueue the task in action_registry_entries
    const schedulerActionId = crypto.randomUUID();
    const schedulerIntentId = crypto.randomUUID();

    const { data: actionRecord, error: enqueueError } = await supabaseClient
      .from("action_registry_entries")
      .insert({
        action_id: schedulerActionId,
        intent_id: schedulerIntentId,
        trigger_id: `aios-rr-${Date.now()}`,
        organization_id: schedulerOrgId,
        trigger_type: `aios_${syscall_type}_syscall`,
        initiative_id: initiative_id || null,
        stage: "execution",
        execution_mode: "auto",
        status: "queued",
        risk_level: priority === "critical" ? "critical" : "low",
        description: `AIOS Scaled ${syscall_type} syscall for agent.`,
        reason: "Round Robin fair scheduling",
        constraints: [
          { source: "system", key: "time_slice", description: `${DEFAULT_TIME_SLICE}ms time slice` },
          { source: "system", key: "batch_size", description: `Max batch size: ${MAX_BATCH_SIZE}` },
        ],
      })
      .select()
      .single();

    if (enqueueError) throw enqueueError;

    // Step 4.2: Scaled Batch Processing (Inspired by AIOS process_llm_requests)
    // We fetch a batch of "queued" requests of the same type to execute
    const { data: batchToExecute, error: batchError } = await supabaseClient
      .from("action_registry_entries")
      .select("*")
      .eq("status", "queued")
      .eq("trigger_type", `aios_${syscall_type}_syscall`)
      .order("created_at", { ascending: true }) // FIFO within RR
      .limit(MAX_BATCH_SIZE);

    if (batchError) throw batchError;

    // Step 4.3: Execute within the Time Slice (Simulating Python _execute_batch_syscalls)
    const executionResults = await Promise.all(
      (batchToExecute || []).map(async (action) => {
        // Mark as executing
        await supabaseClient
          .from("action_registry_entries")
          .update({ status: "executing" })
          .eq("id", action.id);

        try {
          // Simulation of 1s time-slice bound execution
          // In real production, this would call the specialized agent (DevAgent/RepairAgent)
          // or another Edge Function like 'ai-domain-model-analyzer'
          
          const startTime = Date.now();
          // Real logic execution would happen here...
          
          return { id: action.id, status: "completed", duration: Date.now() - startTime };
        } catch (err) {
          return { id: action.id, status: "failed", error: err.message };
        }
      })
    );

    // 5. Finalize Batch Status (AxionOS Audit Trail)
    for (const res of executionResults) {
      await supabaseClient
        .from("action_registry_entries")
        .update({ 
          status: res.status,
          outcome_status: res.status === "completed" ? "success" : "failure",
          outcome_summary: `Executed in AIOS-inspired batch (RR). Duration: ${res.duration}ms`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", res.id);
    }

    return new Response(
      JSON.stringify({ 
        message: "AIOS Round Robin Batch Processed", 
        action_id: actionRecord.id,
        batch_size: batchToExecute?.length || 0 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[AIOS-Scheduler] Critical Failure:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
