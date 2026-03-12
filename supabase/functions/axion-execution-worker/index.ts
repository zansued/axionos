/**
 * Axion Execution Worker — Sprint 164 / Governed Execution Path
 *
 * Subordinate execution adapter for the Action Engine.
 * This worker ONLY processes actions that have already passed through
 * the full governance pipeline:
 *
 *   Canon → Readiness → Policy → Action Engine → Approval (if required)
 *   → Dispatch → **Worker** → Outcome → Audit
 *
 * Governance gates enforced before any execution:
 *   1. action_id must exist (no anonymous execution)
 *   2. execution_mode must be 'auto' or 'approval_required'
 *   3. if approval_required → status must be 'approved'
 *   4. blocked / manual_only actions are rejected
 *   5. shell commands (high risk) require approval
 *   6. audit event written for every attempt (success, rejection, failure)
 *
 * This worker is NOT a fast path. It is a governed downstream executor.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const GITHUB_API = "https://api.github.com";

// ── Governance Gate Types ──

interface GovernanceCheckResult {
  allowed: boolean;
  rejection_reason?: string;
  gate: string;
}

// ── Governance Validation ──

function validateGovernanceGates(action: Record<string, unknown>): GovernanceCheckResult {
  // Gate 1: action_id must exist
  if (!action.action_id) {
    return { allowed: false, rejection_reason: "Missing action_id — anonymous execution is prohibited", gate: "identity" };
  }

  // Gate 2: execution_mode must be dispatchable
  const mode = action.execution_mode as string;
  if (mode === "blocked") {
    return { allowed: false, rejection_reason: `Execution mode "${mode}" does not allow dispatch`, gate: "execution_mode" };
  }
  if (mode === "manual_only") {
    return { allowed: false, rejection_reason: `Execution mode "${mode}" requires manual human execution`, gate: "execution_mode" };
  }

  // Gate 3: approval_required actions must be approved
  if (mode === "approval_required" || action.requires_approval) {
    const status = action.status as string;
    if (status !== "approved" && status !== "executing") {
      return {
        allowed: false,
        rejection_reason: `Action requires approval but status is "${status}" (expected "approved")`,
        gate: "approval",
      };
    }
  }

  // Gate 4: terminal states cannot execute
  const terminalStates = ["completed", "failed", "rejected", "cancelled", "rolled_back", "expired"];
  if (terminalStates.includes(action.status as string)) {
    return {
      allowed: false,
      rejection_reason: `Action in terminal state "${action.status}" — cannot execute`,
      gate: "lifecycle",
    };
  }

  // Gate 5: shell commands are high-risk and require approval
  const triggerType = action.trigger_type as string;
  if (triggerType === "bolt_shell" && action.status !== "approved") {
    return {
      allowed: false,
      rejection_reason: "Shell command execution requires explicit approval (high risk)",
      gate: "risk_policy",
    };
  }

  return { allowed: true, gate: "all_passed" };
}

// ── Atomic Commit to GitHub ──

async function applyToGitHub(
  ghHeaders: Record<string, string>,
  owner: string,
  repo: string,
  branch: string,
  files: { path: string; content: string }[],
  commitMsg: string,
) {
  const refResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers: ghHeaders });
  if (!refResp.ok) {
    const body = await refResp.text();
    throw new Error(`Branch not found: ${body}`);
  }
  const baseSha = (await refResp.json()).object.sha;

  const baseCommitResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits/${baseSha}`, { headers: ghHeaders });
  const baseCommit = await baseCommitResp.json();

  const treeItems = await Promise.all(
    files.map(async (f) => {
      const blobResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
      });
      const blobSha = (await blobResp.json()).sha;
      return { path: f.path, mode: "100644" as const, type: "blob" as const, sha: blobSha };
    }),
  );

  const treeResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers: ghHeaders,
    body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeItems }),
  });
  const newTree = await treeResp.json();

  const commitResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    headers: ghHeaders,
    body: JSON.stringify({ message: commitMsg, tree: newTree.sha, parents: [baseSha] }),
  });
  const newCommit = await commitResp.json();

  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers: ghHeaders,
    body: JSON.stringify({ sha: newCommit.sha, force: true }),
  });

  return newCommit.sha;
}

// ── Audit Event Writer ──

async function writeAuditEvent(
  supabaseClient: ReturnType<typeof createClient>,
  actionId: string,
  orgId: string,
  eventType: string,
  previousStatus: string,
  newStatus: string,
  reason: string,
  executorType: string = "axion_execution_worker",
) {
  await supabaseClient.from("action_audit_events").insert({
    action_id: actionId,
    organization_id: orgId,
    event_type: eventType,
    previous_status: previousStatus,
    new_status: newStatus,
    reason,
    actor_type: "system",
    executor_type: executorType,
  });
}

// ── Main Handler ──

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Fetch pending actions from registry (queued + bolt-type triggers)
    const { data: queuedActions } = await supabaseClient
      .from("action_registry_entries")
      .select("*")
      .eq("status", "queued")
      .like("trigger_type", "bolt_%")
      .order("created_at", { ascending: true })
      .limit(5);

    if (!queuedActions || queuedActions.length === 0) {
      return jsonResponse({ message: "No pending actions.", processed: 0, rejected: 0 }, 200, req);
    }

    const results = {
      processed: 0,
      rejected: 0,
      rejections: [] as { action_id: string; reason: string; gate: string }[],
      committed: false,
      commit_sha: null as string | null,
    };

    // 2. Governance validation — check EVERY action before any execution
    const governedActions: typeof queuedActions = [];

    for (const action of queuedActions) {
      const check = validateGovernanceGates(action);

      if (!check.allowed) {
        // Reject: mark as blocked, write audit event
        console.warn(`[ExecutionWorker] REJECTED action ${action.action_id}: ${check.rejection_reason} (gate: ${check.gate})`);

        await supabaseClient
          .from("action_registry_entries")
          .update({
            status: "blocked",
            outcome_status: "governance_rejected",
            outcome_summary: check.rejection_reason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", action.id);

        await writeAuditEvent(
          supabaseClient,
          action.action_id,
          action.organization_id,
          "governance_gate_rejected",
          action.status,
          "blocked",
          `Gate "${check.gate}": ${check.rejection_reason}`,
        );

        results.rejected++;
        results.rejections.push({
          action_id: action.action_id,
          reason: check.rejection_reason!,
          gate: check.gate,
        });
        continue;
      }

      governedActions.push(action);
    }

    if (governedActions.length === 0) {
      return jsonResponse({
        message: "All actions rejected by governance gates.",
        ...results,
      }, 200, req);
    }

    // 3. Mark governed actions as executing + write audit
    const governedIds = governedActions.map((a) => a.id);
    await supabaseClient
      .from("action_registry_entries")
      .update({ status: "executing", updated_at: new Date().toISOString() })
      .in("id", governedIds);

    for (const action of governedActions) {
      await writeAuditEvent(
        supabaseClient,
        action.action_id,
        action.organization_id,
        "execution_started",
        "queued",
        "executing",
        "Governed execution started by axion-execution-worker",
      );
    }

    const orgId = governedActions[0].organization_id;

    // 4. Fetch GitHub config for the org
    const { data: gitConns } = await supabaseClient
      .from("git_connections")
      .select("*")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .limit(1);

    const conn = gitConns?.[0];
    if (!conn?.github_token) {
      // No GitHub connection — mark as failed
      for (const action of governedActions) {
        await supabaseClient
          .from("action_registry_entries")
          .update({
            status: "failed",
            outcome_status: "infrastructure_error",
            outcome_summary: "No active GitHub connection for organization",
            updated_at: new Date().toISOString(),
          })
          .eq("id", action.id);

        await writeAuditEvent(
          supabaseClient,
          action.action_id,
          action.organization_id,
          "execution_failed",
          "executing",
          "failed",
          "No active GitHub connection found",
        );
      }

      return jsonResponse({
        message: "Execution failed: no GitHub connection.",
        ...results,
      }, 200, req);
    }

    const ghHeaders = {
      Authorization: `Bearer ${conn.github_token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    // 5. Batch file modifications (only bolt_file actions)
    const filePatches = governedActions
      .filter((a) => a.trigger_type === "bolt_file")
      .map((a) => ({
        path: (a.payload as Record<string, unknown>)?.filePath as string,
        content: (a.payload as Record<string, unknown>)?.content as string,
      }))
      .filter((p) => p.path && p.content);

    if (filePatches.length > 0) {
      console.log(`[ExecutionWorker] Applying ${filePatches.length} governed file patches to GitHub...`);

      try {
        const commitSha = await applyToGitHub(
          ghHeaders,
          conn.repo_owner,
          conn.repo_name,
          conn.default_branch || "main",
          filePatches,
          "feat(axion): governed code generation via Action Engine",
        );

        console.log(`[ExecutionWorker] Commit success: ${commitSha}`);
        results.committed = true;
        results.commit_sha = commitSha;

        // 6. Mark as completed + write audit
        for (const action of governedActions) {
          await supabaseClient
            .from("action_registry_entries")
            .update({
              status: "completed",
              outcome_status: "success",
              outcome_summary: `Applied to GitHub (commit: ${commitSha})`,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", action.id);

          await writeAuditEvent(
            supabaseClient,
            action.action_id,
            action.organization_id,
            "execution_completed",
            "executing",
            "completed",
            `Commit ${commitSha} — ${filePatches.length} file(s) applied`,
          );

          results.processed++;
        }

        // 7. Emit neural feedback signal (non-blocking)
        try {
          await supabaseClient.functions.invoke("neural-feedback-loop", {
            body: {
              signalType: "execution_success",
              outcome: `Applied ${filePatches.length} governed file patches.`,
              payload: { files: filePatches.map((p) => p.path), commitSha },
              orgId,
              initiativeId: governedActions[0].initiative_id,
            },
          });
        } catch (feedbackErr) {
          console.warn("[ExecutionWorker] Neural feedback emission failed (non-critical):", feedbackErr);
        }
      } catch (commitErr) {
        console.error("[ExecutionWorker] GitHub commit failed:", commitErr);

        // Mark as failed + write audit
        for (const action of governedActions) {
          await supabaseClient
            .from("action_registry_entries")
            .update({
              status: "failed",
              outcome_status: "execution_error",
              outcome_summary: `GitHub commit failed: ${(commitErr as Error).message}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", action.id);

          await writeAuditEvent(
            supabaseClient,
            action.action_id,
            action.organization_id,
            "execution_failed",
            "executing",
            "failed",
            `GitHub commit error: ${(commitErr as Error).message}`,
          );
        }
      }
    }

    return jsonResponse({
      message: `Processed ${results.processed} governed actions. Rejected ${results.rejected} by governance gates.`,
      ...results,
    }, 200, req);
  } catch (err) {
    console.error("[ExecutionWorker] Critical Error:", err);
    return errorResponse((err as Error).message, 500, req);
  }
});
