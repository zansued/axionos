import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, getPreventionRulesV2, recordDecision, upsertNode } from "../_shared/brain-helpers.ts";

/**
 * Preventive Architecture Validator — AxionOS
 *
 * Runs BEFORE code generation to validate the planned architecture
 * against known error patterns and structural requirements.
 *
 * This stage prevents build failures by ensuring:
 *   1. Valid entrypoints exist in the plan
 *   2. Required config files are planned
 *   3. Dependencies are compatible
 *   4. Known error patterns are avoided
 *   5. Architecture follows prevention rules from Error Intelligence
 *
 * If issues are found, the validator auto-corrects the architecture plan.
 */

interface ValidationIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  fix_applied: string | null;
}

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-preventive-validation");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, apiKey } = result;

  const jobId = await createJob(ctx, "preventive_validation", {
    title: initiative.title,
    stage_status: initiative.stage_status,
  });

  await updateInitiative(ctx, { stage_status: "validating_architecture" });
  await pipelineLog(ctx, "preventive_validation_start", "🛡️ Preventive Architecture Validation started");

  try {
    const dp = initiative.discovery_payload || {};
    const systemArch = dp.system_architecture || {};
    const dataArch = dp.data_architecture || {};
    const depGraph = dp.dependency_graph || {};
    const issues: ValidationIssue[] = [];

    // ── STEP 1: Structural Completeness Checks (deterministic) ──
    await pipelineLog(ctx, "pv_structural_check", "📋 Checking structural completeness...");

    const stack = systemArch.stack || {};
    const isReact = /react/i.test(JSON.stringify(stack));
    const isVite = /vite/i.test(JSON.stringify(stack));

    // Check for required files in dependency graph
    const plannedFiles = new Set<string>();
    const genOrder = depGraph.generation_order || [];
    for (const phase of genOrder) {
      for (const f of (phase.files || [])) {
        plannedFiles.add(f);
      }
    }
    const graphNodes = depGraph.dependency_graph?.nodes || [];
    for (const n of graphNodes) {
      if (n.id) plannedFiles.add(n.id);
    }

    // React/Vite required files
    if (isReact || isVite) {
      const requiredFiles: Array<{ path: string; type: string; description: string }> = [
        { path: "src/main.tsx", type: "page", description: "Vite entrypoint — bootstraps React app" },
        { path: "src/App.tsx", type: "component", description: "Root React component" },
        { path: "vite.config.ts", type: "config", description: "Vite build configuration" },
        { path: "tsconfig.json", type: "config", description: "TypeScript configuration" },
        { path: "package.json", type: "config", description: "NPM package manifest" },
        { path: "index.html", type: "config", description: "HTML entrypoint referencing src/main.tsx" },
      ];

      for (const rf of requiredFiles) {
        const found = [...plannedFiles].some(f =>
          f === rf.path || f.endsWith(`/${rf.path}`) || f.includes(rf.path)
        );
        if (!found) {
          issues.push({
            severity: "critical",
            category: "missing_file",
            message: `Required file '${rf.path}' is not in the generation plan`,
            fix_applied: `Added '${rf.path}' to generation plan`,
          });

          // Auto-fix: add to dependency graph
          graphNodes.push({ id: rf.path, type: rf.type, layer: "infra", description: rf.description });
          plannedFiles.add(rf.path);

          // Register in Project Brain
          await upsertNode(ctx, {
            node_type: rf.type as any,
            name: rf.path.split("/").pop() || rf.path,
            file_path: rf.path,
            metadata: { source: "preventive_validation", auto_added: true, description: rf.description },
            status: "planned",
          });
        }
      }
    }

    // Check package.json scripts
    const npmDeps = depGraph.npm_dependencies || [];
    const hasViteDep = npmDeps.some((d: any) => d.package === "vite");
    if ((isReact || isVite) && !hasViteDep) {
      issues.push({
        severity: "warning",
        category: "missing_dependency",
        message: "Vite is not in npm_dependencies but project uses Vite",
        fix_applied: "Added vite to dependencies",
      });
      npmDeps.push({ package: "vite", version: "latest", dev: true, justification: "Build tool" });
    }

    const hasReactDep = npmDeps.some((d: any) => d.package === "react");
    if (isReact && !hasReactDep) {
      issues.push({
        severity: "warning",
        category: "missing_dependency",
        message: "React is not in npm_dependencies",
        fix_applied: "Added react and react-dom",
      });
      npmDeps.push(
        { package: "react", version: "^18.3.1", dev: false, justification: "UI framework" },
        { package: "react-dom", version: "^18.3.1", dev: false, justification: "React DOM renderer" }
      );
    }

    // ── STEP 2: Prevention Rules Check ──
    await pipelineLog(ctx, "pv_rules_check", "⚠️ Checking against prevention rules...");
    const preventionRules = await getPreventionRulesV2(ctx);

    // Also fetch org-wide rules
    const { data: orgRules } = await serviceClient
      .from("project_prevention_rules")
      .select("error_pattern, prevention_rule, confidence_score, scope")
      .eq("organization_id", ctx.organizationId)
      .eq("scope", "organization")
      .gte("confidence_score", 0.6)
      .order("confidence_score", { ascending: false })
      .limit(20);

    const allRules = [...preventionRules, ...(orgRules || [])];

    if (allRules.length > 0) {
      issues.push({
        severity: "info",
        category: "prevention_rules",
        message: `${allRules.length} prevention rules will be injected into agent prompts`,
        fix_applied: null,
      });
    }

    // ── STEP 2b: Active Prevention Rules Evaluation (Sprint 8) ──
    const { data: activeRules } = await serviceClient
      .from("active_prevention_rules")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .eq("enabled", true)
      .order("confidence_score", { ascending: false })
      .limit(50);

    const triggeredRules: Array<{ rule_id: string; action_type: string; description: string }> = [];

    if (activeRules && activeRules.length > 0) {
      const pipelineContext = {
        stage: "architecture",
        error_categories: issues.map(i => i.category),
        file_types: [...plannedFiles].map(f => f.split(".").pop() || ""),
        dependencies: npmDeps.map((d: any) => d.package),
      };

      for (const rule of activeRules) {
        const rawConditions = rule.trigger_conditions;
        const conditions: any[] = Array.isArray(rawConditions) ? rawConditions : [];
        let matched = conditions.length > 0;
        for (const cond of conditions) {
          const ctxVal = pipelineContext[cond.field as keyof typeof pipelineContext];
          if (!ctxVal) { matched = false; break; }
          const valStr = String(cond.value);
          if (cond.operator === "contains") {
            const arr = Array.isArray(ctxVal) ? ctxVal : [ctxVal];
            if (!arr.some((v: string) => String(v).includes(valStr))) { matched = false; break; }
          } else if (cond.operator === "equals") {
            if (String(ctxVal) !== valStr) { matched = false; break; }
          }
        }

        if (matched) {
          triggeredRules.push({
            rule_id: rule.id,
            action_type: rule.action_type,
            description: rule.description,
          });

          // Record prevention event
          await serviceClient.from("prevention_events").insert({
            rule_id: rule.id,
            initiative_id: ctx.initiativeId,
            organization_id: ctx.organizationId,
            pipeline_stage: "architecture",
            action_taken: rule.action_type,
            context: { matched_conditions: conditions },
            prevented: rule.action_type === "block",
          });

          // Increment trigger count
          await serviceClient.from("active_prevention_rules")
            .update({
              times_triggered: (rule.times_triggered || 0) + 1,
              times_prevented: rule.action_type === "block" ? (rule.times_prevented || 0) + 1 : rule.times_prevented,
              updated_at: new Date().toISOString(),
            })
            .eq("id", rule.id);

          const severity = rule.action_type === "block" ? "critical" : "warning";
          issues.push({
            severity,
            category: `prevention_${rule.action_type}`,
            message: `Prevention rule triggered: ${rule.description}`,
            fix_applied: rule.action_type === "block" ? null : "Warning acknowledged",
          });
        }
      }

      if (triggeredRules.length > 0) {
        await pipelineLog(ctx, "pv_active_rules", `🛡️ ${triggeredRules.length} active prevention rules triggered`, {
          triggered: triggeredRules,
        });
      }
    }

    // ── STEP 3: AI-powered architecture review ──
    const criticalIssues = issues.filter(i => i.severity === "critical");

    if (criticalIssues.length > 0 || allRules.length > 5) {
      await pipelineLog(ctx, "pv_ai_review", "🤖 AI reviewing architecture against known patterns...");

      const brainContext = await generateBrainContext(ctx);

      try {
        const aiResult = await callAI(apiKey,
          `You are the AxionOS Preventive Architecture Validator.
Review the planned architecture and identify potential build failures BEFORE code generation.
Return ONLY valid JSON.`,
          `## Architecture Plan
Stack: ${JSON.stringify(stack, null, 2)}
Generation Order: ${genOrder.length} phases, ${plannedFiles.size} files planned
Dependencies: ${npmDeps.length} packages

## Known Prevention Rules (from past failures)
${allRules.slice(0, 15).map((r: any) =>
  `- [${((r.confidence_score || 0.5) * 100).toFixed(0)}%] ${r.error_pattern || r.prevention_rule}`
).join("\n")}

## Current Issues Found
${issues.map(i => `- [${i.severity}] ${i.message}`).join("\n")}

## Project Brain Context
${brainContext.slice(0, 2000)}

Review and return:
{
  "additional_issues": [
    {"severity": "critical|warning", "category": "string", "message": "string", "recommended_fix": "string"}
  ],
  "architecture_adjustments": [
    {"target": "file or config name", "adjustment": "what to change", "reason": "why"}
  ],
  "risk_score": 0 to 100 (0=safe, 100=will definitely fail),
  "recommendation": "proceed|fix_first"
}`,
          true
        );

        const parsed = JSON.parse(aiResult.content);

        for (const issue of (parsed.additional_issues || [])) {
          issues.push({
            severity: issue.severity || "warning",
            category: issue.category || "ai_review",
            message: issue.message,
            fix_applied: issue.recommended_fix || null,
          });
        }

        // Record AI recommendations as decisions
        for (const adj of (parsed.architecture_adjustments || []).slice(0, 5)) {
          await recordDecision(ctx,
            `Preventive fix: ${adj.adjustment}`,
            adj.reason || "Identified by Preventive Architecture Validator",
            "Prevents potential build failure",
            "preventive_validation"
          );
        }

      } catch (e) {
        console.error("AI preventive review error:", e);
      }
    }

    // ── STEP 4: Apply fixes to discovery_payload ──
    const updatedDp = {
      ...dp,
      dependency_graph: {
        ...depGraph,
        dependency_graph: { ...(depGraph.dependency_graph || {}), nodes: graphNodes },
        npm_dependencies: npmDeps,
      },
      preventive_validation: {
        validated_at: new Date().toISOString(),
        issues_found: issues.length,
        critical_issues: issues.filter(i => i.severity === "critical").length,
        warnings: issues.filter(i => i.severity === "warning").length,
        fixes_applied: issues.filter(i => i.fix_applied).length,
        prevention_rules_active: allRules.length,
      },
    };

    await updateInitiative(ctx, {
      stage_status: "architecture_validated",
      discovery_payload: updatedDp,
    });

    const summary = `Preventive Validation: ${issues.length} issues (${
      issues.filter(i => i.severity === "critical").length} critical, ${
      issues.filter(i => i.severity === "warning").length} warnings). ${
      issues.filter(i => i.fix_applied).length} auto-fixed. ${allRules.length} prevention rules active.`;

    await pipelineLog(ctx, "preventive_validation_complete", `🛡️ ${summary}`, {
      issues: issues.slice(0, 30),
    });

    if (jobId) await completeJob(ctx, jobId, {
      issues,
      prevention_rules_active: allRules.length,
    }, { costUsd: 0, durationMs: 0 });

    return jsonResponse({
      success: true,
      issues,
      prevention_rules_active: allRules.length,
      fixes_applied: issues.filter(i => i.fix_applied).length,
      recommendation: issues.some(i => i.severity === "critical" && !i.fix_applied) ? "fix_first" : "proceed",
    });

  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "architected" });
    await pipelineLog(ctx, "preventive_validation_error", `❌ Preventive Validation failed: ${e}`);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
