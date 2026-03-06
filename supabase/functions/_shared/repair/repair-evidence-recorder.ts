// Repair Evidence Recorder — AxionOS Sprint 6
// Wraps existing repair flows with structured evidence persistence.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeErrorSignature,
  type ErrorCategory,
  type RepairResult,
  type RevalidationStatus,
} from "../contracts/repair-evidence.schema.ts";
import { classifyToTaxonomy } from "../contracts/error-taxonomy.ts";
import { getPrimaryStrategy } from "./repair-strategy-map.ts";

interface RecordRepairParams {
  serviceClient: ReturnType<typeof createClient>;
  initiativeId: string;
  organizationId: string;
  stageName: string;
  jobId: string | null;
  rawCategory: string;
  errorMessage: string;
  attemptNumber: number;
  patchSummary: string;
  filesTouched: string[];
  repairResult: RepairResult;
  revalidationStatus: RevalidationStatus;
  validationBefore?: Record<string, unknown>;
  validationAfter?: Record<string, unknown>;
  failureContext?: Record<string, unknown>;
  durationMs: number;
}

/**
 * Record a structured repair evidence entry.
 * Call this after each repair attempt completes (success or failure).
 */
export async function recordRepairEvidence(params: RecordRepairParams): Promise<string | null> {
  try {
    const { category, code } = classifyToTaxonomy(params.rawCategory, params.errorMessage);
    const strategy = getPrimaryStrategy(category);
    const signature = computeErrorSignature(category, code, params.errorMessage);

    const { data, error } = await params.serviceClient
      .from("repair_evidence")
      .insert({
        initiative_id: params.initiativeId,
        organization_id: params.organizationId,
        stage_name: params.stageName,
        job_id: params.jobId,
        error_category: category,
        error_code: code,
        error_message: params.errorMessage.slice(0, 500),
        error_signature: signature,
        failure_context: params.failureContext || {},
        repair_strategy: strategy.id,
        attempt_number: params.attemptNumber,
        patch_summary: params.patchSummary.slice(0, 1000),
        files_touched: params.filesTouched,
        validation_before: params.validationBefore || {},
        validation_after: params.validationAfter || {},
        repair_result: params.repairResult,
        revalidation_status: params.revalidationStatus,
        duration_ms: params.durationMs,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to record repair evidence:", error.message);
      return null;
    }
    return data?.id || null;
  } catch (e) {
    console.error("recordRepairEvidence error:", e);
    return null;
  }
}
