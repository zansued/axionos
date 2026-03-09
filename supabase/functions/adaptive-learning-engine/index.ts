import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const { user, serviceClient } = auth as AuthContext;

  try {
    const { initiativeId } = await req.json();
    if (!initiativeId) return errorResponse("initiativeId required", 400);

    // 1. Load initiative
    const { data: initiative, error: initErr } = await serviceClient
      .from("initiatives")
      .select("id, title, organization_id, execution_progress")
      .eq("id", initiativeId)
      .single();
    if (initErr || !initiative) return errorResponse("Initiative not found", 404);

    // 2. Update status
    await serviceClient
      .from("initiatives")
      .update({ stage_status: "learning_system" } as any)
      .eq("id", initiativeId);

    const orgId = initiative.organization_id;

    // 3. Collect learning inputs
    // 3a. Project errors
    const { data: errors } = await serviceClient
      .from("project_errors")
      .select("error_type, error_message, root_cause, prevention_rule, fixed, file_path")
      .eq("initiative_id", initiativeId)
      .limit(200);

    // 3b. Existing prevention rules
    const { data: existingRules } = await serviceClient
      .from("project_prevention_rules")
      .select("error_pattern, prevention_rule, confidence_score, times_triggered")
      .eq("initiative_id", initiativeId)
      .limit(100);

    // 3c. Initiative jobs (validation runs, build results)
    const { data: jobs } = await serviceClient
      .from("initiative_jobs")
      .select("stage, status, error, outputs, duration_ms")
      .eq("initiative_id", initiativeId)
      .in("stage", ["validation", "deep_validation", "runtime_validation", "build_repair", "execution"])
      .order("created_at", { ascending: false })
      .limit(50);

    // 3d. Brain nodes for patterns
    const { data: brainNodes } = await serviceClient
      .from("project_brain_nodes")
      .select("name, node_type, status, metadata")
      .eq("initiative_id", initiativeId)
      .in("node_type", ["domain_model", "data_model", "business_logic", "api_spec", "ui_structure"]);

    // 4. AI Analysis — detect patterns and generate new rules
    const prompt = `You are an Adaptive Learning Engine for an autonomous software engineering system.

Analyze the following project data to identify patterns, recurring failures, and generate improved engineering rules.

Project: ${initiative.title}

Errors (${errors?.length || 0}):
${JSON.stringify(errors?.slice(0, 50) || [], null, 2)}

Existing Prevention Rules (${existingRules?.length || 0}):
${JSON.stringify(existingRules || [], null, 2)}

Build/Validation Jobs (${jobs?.length || 0}):
${JSON.stringify(jobs?.slice(0, 20) || [], null, 2)}

Generate a JSON response:
{
  "new_prevention_rules": [
    {
      "error_pattern": "pattern description",
      "prevention_rule": "what to do to prevent this",
      "confidence_score": 0.0-1.0,
      "scope": "initiative|organization"
    }
  ],
  "dependency_constraints": [
    {
      "package": "package-name",
      "constraint": "avoid|pin_version|replace",
      "reason": "why",
      "alternative": "alternative-package or null"
    }
  ],
  "architectural_patterns": [
    {
      "pattern": "pattern name",
      "description": "what the pattern is",
      "applies_to": "frontend|backend|database|api",
      "learned_from": "what error/success taught this"
    }
  ],
  "metrics": {
    "errors_analyzed": 0,
    "patterns_detected": 0,
    "rules_generated": 0,
    "rules_updated": 0,
    "success_rate": 0.0
  }
}`;

    let learningResult: any;
    try {
      const aiResult = await callAI({
        model: "deepseek-chat",
        prompt,
        serviceClient,
        initiativeId,
        stage: "adaptive_learning",
        userId: user.id,
        expectJson: true,
      });
      learningResult = typeof aiResult === "string" ? JSON.parse(aiResult) : aiResult;
    } catch (aiErr) {
      console.error("AI learning analysis failed:", aiErr);
      learningResult = {
        new_prevention_rules: [],
        dependency_constraints: [],
        architectural_patterns: [],
        metrics: { errors_analyzed: errors?.length || 0, patterns_detected: 0, rules_generated: 0, rules_updated: 0, success_rate: 0 },
      };
    }

    // 5. Upsert new prevention rules
    let rulesCreated = 0;
    let rulesUpdated = 0;
    for (const rule of learningResult.new_prevention_rules || []) {
      // Check if similar rule exists
      const { data: existing } = await serviceClient
        .from("project_prevention_rules")
        .select("id, times_triggered, confidence_score")
        .eq("initiative_id", initiativeId)
        .eq("error_pattern", rule.error_pattern)
        .maybeSingle();

      if (existing) {
        // Update existing rule with higher confidence
        const newConfidence = Math.min(1.0, existing.confidence_score + 0.1);
        await serviceClient
          .from("project_prevention_rules")
          .update({
            confidence_score: newConfidence,
            times_triggered: existing.times_triggered + 1,
            last_triggered_at: new Date().toISOString(),
            prevention_rule: rule.prevention_rule,
            scope: rule.scope || "initiative",
          })
          .eq("id", existing.id);
        rulesUpdated++;
      } else {
        await serviceClient.from("project_prevention_rules").insert({
          initiative_id: initiativeId,
          organization_id: orgId,
          error_pattern: rule.error_pattern,
          prevention_rule: rule.prevention_rule,
          confidence_score: rule.confidence_score || 0.5,
          scope: rule.scope || "initiative",
        });
        rulesCreated++;
      }
    }

    // 6. Store engineering_patterns node
    await serviceClient.from("project_brain_nodes").upsert(
      {
        initiative_id: initiativeId,
        organization_id: orgId,
        name: "engineering_patterns",
        node_type: "engineering_patterns",
        file_path: "brain://engineering_patterns",
        status: "generated",
        metadata: {
          architectural_patterns: learningResult.architectural_patterns || [],
          dependency_constraints: learningResult.dependency_constraints || [],
          learned_at: new Date().toISOString(),
        },
      },
      { onConflict: "initiative_id,node_type,name" }
    );

    // 7. Store learning report
    const report = {
      errors_analyzed: errors?.length || 0,
      patterns_detected: learningResult.metrics?.patterns_detected || learningResult.architectural_patterns?.length || 0,
      rules_created: rulesCreated,
      rules_updated: rulesUpdated,
      dependency_constraints: learningResult.dependency_constraints?.length || 0,
      architectural_patterns: learningResult.architectural_patterns?.length || 0,
    };

    await serviceClient.from("project_brain_nodes").upsert(
      {
        initiative_id: initiativeId,
        organization_id: orgId,
        name: "learning_report",
        node_type: "report",
        file_path: "brain://learning_report",
        status: "generated",
        metadata: report,
      },
      { onConflict: "initiative_id,node_type,name" }
    );

    // 8. Store patterns in org knowledge base for cross-project learning
    for (const pattern of learningResult.architectural_patterns || []) {
      await serviceClient.from("org_knowledge_base").insert({
        organization_id: orgId,
        title: `Pattern: ${pattern.pattern}`,
        content: `${pattern.description}\n\nApplies to: ${pattern.applies_to}\nLearned from: ${pattern.learned_from}`,
        category: "architectural_decision",
        source_initiative_id: initiativeId,
        tags: ["auto-learned", pattern.applies_to],
      });
    }

    // 9. Update status
    await serviceClient
      .from("initiatives")
      .update({ stage_status: "system_learned" } as any)
      .eq("id", initiativeId);

    return jsonResponse({
      success: true,
      ...report,
    });
  } catch (err: any) {
    console.error("adaptive-learning-engine error:", err);
    return errorResponse(err.message || "Internal error", 500);
  }
});
