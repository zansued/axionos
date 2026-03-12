import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeEvidenceScore } from "../_shared/outcome-autonomy/autonomy-evidence-scorer.ts";
import { evaluateLadderPosition } from "../_shared/outcome-autonomy/autonomy-ladder-manager.ts";
import { evaluateAutoApproval } from "../_shared/outcome-autonomy/bounded-autoapproval-engine.ts";
import { detectRegression } from "../_shared/outcome-autonomy/autonomy-regression-detector.ts";
import { computeDowngrade } from "../_shared/outcome-autonomy/autonomy-downgrade-controller.ts";
import { classifyBreach } from "../_shared/outcome-autonomy/guardrail-breach-handler.ts";
import { explainPosture } from "../_shared/outcome-autonomy/autonomy-explainer.ts";
import { evaluateTransition, type TransitionRule } from "../_shared/outcome-autonomy/autonomy-transition-stabilizer.ts";
import { detectAdaptiveRegression, DEFAULT_PROFILES, type TenantRegressionProfile } from "../_shared/outcome-autonomy/tenant-adaptive-regression.ts";
import { handleCors, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // Auth hardening — Sprint 197
    const authResult = await authenticateWithRateLimit(req, "outcome-based-autonomy");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const { action, organizationId: payloadOrgId, ...params } = await req.json();

    const { orgId: organizationId, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organizationId) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(supabase, {
      organization_id: organizationId, actor_id: user.id,
      function_name: "outcome-based-autonomy", action: action || "unknown",
    });

    let result: unknown;

    // ── Helper: load transition rules (tenant-specific or defaults) ──
    async function loadTransitionRules(): Promise<TransitionRule[]> {
      const { data } = await supabase
        .from("autonomy_transition_rules")
        .select("*")
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .order("level_from", { ascending: true });

      if (!data || data.length === 0) {
        // Import defaults from the stabilizer module
        const { DEFAULT_TRANSITION_RULES } = await import("../_shared/outcome-autonomy/autonomy-transition-stabilizer.ts");
        return DEFAULT_TRANSITION_RULES;
      }

      // Prefer org-specific rules; fallback to defaults (org_id = null)
      const orgRules = data.filter((r: any) => r.organization_id === organizationId);
      const defaultRules = data.filter((r: any) => !r.organization_id);

      const merged: TransitionRule[] = [];
      const seen = new Set<string>();

      for (const r of orgRules) {
        const key = `${r.level_from}-${r.level_to}`;
        seen.add(key);
        merged.push({
          id: r.id,
          level_from: r.level_from,
          level_to: r.level_to,
          minimum_time_at_level_hours: r.minimum_time_at_level_hours,
          minimum_execution_count: r.minimum_execution_count,
          confidence_threshold: Number(r.confidence_threshold),
          tenant_override_allowed: r.tenant_override_allowed,
        });
      }

      for (const r of defaultRules) {
        const key = `${r.level_from}-${r.level_to}`;
        if (!seen.has(key)) {
          merged.push({
            id: r.id,
            level_from: r.level_from,
            level_to: r.level_to,
            minimum_time_at_level_hours: r.minimum_time_at_level_hours,
            minimum_execution_count: r.minimum_execution_count,
            confidence_threshold: Number(r.confidence_threshold),
            tenant_override_allowed: r.tenant_override_allowed,
          });
        }
      }

      return merged;
    }

    // ── Helper: record a transition attempt ──
    async function recordAttempt(attempt: {
      domain_id?: string;
      level_from: number;
      level_to: number;
      direction: string;
      approved: boolean;
      rejection_reason?: string;
      time_at_current_level_hours?: number;
      execution_count_at_level?: number;
      confidence_score?: number;
      rule_applied?: string;
    }) {
      await supabase.from("autonomy_transition_attempts").insert({
        organization_id: organizationId,
        domain_id: attempt.domain_id || null,
        level_from: attempt.level_from,
        level_to: attempt.level_to,
        direction: attempt.direction,
        approved: attempt.approved,
        rejection_reason: attempt.rejection_reason || null,
        time_at_current_level_hours: attempt.time_at_current_level_hours ?? null,
        execution_count_at_level: attempt.execution_count_at_level ?? null,
        confidence_score: attempt.confidence_score ?? null,
        rule_applied: attempt.rule_applied || null,
      });
    }

    switch (action) {
      case "score_autonomy": {
        const evidence = computeEvidenceScore({
          validation_success_rate: params.validation_success_rate ?? 0.8,
          rollback_count: params.rollback_count ?? 0,
          incident_count: params.incident_count ?? 0,
          total_executions: params.total_executions ?? 10,
          doctrine_alignment: params.doctrine_alignment ?? 0.7,
          deploy_success_rate: params.deploy_success_rate ?? 0.9,
        });

        await supabase.from("autonomy_evidence_scores").insert({
          organization_id: organizationId,
          domain_id: params.domain_id || null,
          score_type: "composite",
          score_value: evidence.composite,
          evidence_refs: [evidence],
          computation_details: evidence,
        });

        result = { evidence };
        break;
      }

      case "adjust_level": {
        const { data: domain } = await supabase
          .from("autonomy_domains")
          .select("*")
          .eq("id", params.domain_id)
          .eq("organization_id", organizationId)
          .single();

        if (!domain) throw new Error("Domain not found");

        const evaluation = evaluateLadderPosition(
          domain.current_autonomy_level,
          params.evidence_score ?? domain.evidence_score,
          params.incident_rate ?? 0,
        );

        if (evaluation.direction === "stable") {
          result = { evaluation, transition: { allowed: false, direction: "stable", rejection_reasons: ["No change needed."] } };
          break;
        }

        // ── Sprint 124: Enforce transition stabilization for upgrades ──
        if (evaluation.direction === "upgrade") {
          const rules = await loadTransitionRules();

          // Count executions since entering current level
          const { count: execCount } = await supabase
            .from("autonomy_adjustment_events")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("domain_id", params.domain_id);

          // Determine when current level was entered
          const { data: lastAdjustment } = await supabase
            .from("autonomy_adjustment_events")
            .select("created_at")
            .eq("organization_id", organizationId)
            .eq("domain_id", params.domain_id)
            .order("created_at", { ascending: false })
            .limit(1);

          const levelEnteredAt = lastAdjustment?.[0]?.created_at || domain.created_at;

          const transition = evaluateTransition(
            {
              current_level: domain.current_autonomy_level,
              proposed_level: evaluation.recommended_level,
              level_entered_at: levelEnteredAt,
              executions_at_current_level: execCount ?? 0,
              current_confidence: params.evidence_score ?? Number(domain.evidence_score),
              is_critical_breach: false,
            },
            rules,
          );

          // Record the attempt
          await recordAttempt({
            domain_id: params.domain_id,
            level_from: domain.current_autonomy_level,
            level_to: evaluation.recommended_level,
            direction: "upgrade",
            approved: transition.allowed,
            rejection_reason: transition.rejection_reasons.join(" | ") || undefined,
            time_at_current_level_hours: transition.time_at_level_hours,
            execution_count_at_level: execCount ?? 0,
            confidence_score: params.evidence_score ?? Number(domain.evidence_score),
            rule_applied: transition.rule_applied?.id,
          });

          if (!transition.allowed) {
            result = { evaluation, transition, blocked: true };
            break;
          }
        }

        // ── Proceed with the level change ──
        await supabase.from("autonomy_adjustment_events").insert({
          organization_id: organizationId,
          domain_id: params.domain_id,
          previous_level: domain.current_autonomy_level,
          new_level: evaluation.recommended_level,
          adjustment_reason: evaluation.reason,
          adjustment_type: evaluation.direction,
          adjusted_by: params.adjusted_by ?? "system",
        });

        await supabase
          .from("autonomy_domains")
          .update({
            current_autonomy_level: evaluation.recommended_level,
            allowed_action_classes: evaluation.eligible_actions,
            blocked_action_classes: evaluation.blocked_actions,
            updated_at: new Date().toISOString(),
          })
          .eq("id", params.domain_id);

        // Record approved attempt for downgrades too
        if (evaluation.direction === "downgrade") {
          await recordAttempt({
            domain_id: params.domain_id,
            level_from: domain.current_autonomy_level,
            level_to: evaluation.recommended_level,
            direction: "downgrade",
            approved: true,
          });
        }

        result = { evaluation, transition: { allowed: true, direction: evaluation.direction } };
        break;
      }

      case "check_transition_eligibility": {
        const { data: domain } = await supabase
          .from("autonomy_domains")
          .select("*")
          .eq("id", params.domain_id)
          .eq("organization_id", organizationId)
          .single();

        if (!domain) throw new Error("Domain not found");

        const rules = await loadTransitionRules();

        const { count: execCount } = await supabase
          .from("autonomy_adjustment_events")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("domain_id", params.domain_id);

        const { data: lastAdj } = await supabase
          .from("autonomy_adjustment_events")
          .select("created_at")
          .eq("organization_id", organizationId)
          .eq("domain_id", params.domain_id)
          .order("created_at", { ascending: false })
          .limit(1);

        const levelEnteredAt = lastAdj?.[0]?.created_at || domain.created_at;
        const proposedLevel = params.proposed_level ?? domain.current_autonomy_level + 1;

        const transition = evaluateTransition(
          {
            current_level: domain.current_autonomy_level,
            proposed_level: proposedLevel,
            level_entered_at: levelEnteredAt,
            executions_at_current_level: execCount ?? 0,
            current_confidence: Number(domain.evidence_score),
            is_critical_breach: false,
          },
          rules,
        );

        result = { transition, domain_level: domain.current_autonomy_level, proposed_level: proposedLevel };
        break;
      }

      case "list_transition_rules": {
        const rules = await loadTransitionRules();
        result = { rules };
        break;
      }

      case "list_transition_attempts": {
        const { data } = await supabase
          .from("autonomy_transition_attempts")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(params.limit ?? 50);
        result = { attempts: data || [] };
        break;
      }

      case "transition_metrics": {
        const { data: attempts } = await supabase
          .from("autonomy_transition_attempts")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(200);

        const all = attempts || [];
        const upgrades = all.filter((a: any) => a.direction === "upgrade");
        const approved = upgrades.filter((a: any) => a.approved);
        const rejected = upgrades.filter((a: any) => !a.approved);
        const downgrades = all.filter((a: any) => a.direction === "downgrade");

        result = {
          total_attempts: all.length,
          upgrade_attempts: upgrades.length,
          upgrades_approved: approved.length,
          upgrades_rejected: rejected.length,
          upgrade_approval_rate: upgrades.length > 0 ? approved.length / upgrades.length : 0,
          downgrades: downgrades.length,
          common_rejection_reasons: rejected
            .map((a: any) => a.rejection_reason)
            .filter(Boolean)
            .slice(0, 10),
          recent_attempts: all.slice(0, 20),
        };
        break;
      }

      case "list_allowed_actions": {
        const { data: domain } = await supabase
          .from("autonomy_domains")
          .select("*")
          .eq("id", params.domain_id)
          .eq("organization_id", organizationId)
          .single();

        if (!domain) throw new Error("Domain not found");

        const evaluation = evaluateLadderPosition(
          domain.current_autonomy_level,
          Number(domain.evidence_score),
          0,
        );

        result = {
          allowed: evaluation.eligible_actions,
          blocked: evaluation.blocked_actions,
          level: domain.current_autonomy_level,
        };
        break;
      }

      case "register_guardrail_breach": {
        const breach = classifyBreach({
          action_attempted: params.action_attempted ?? "",
          domain_name: params.domain_name ?? "",
          autonomy_level: params.autonomy_level ?? 0,
        });

        await supabase.from("autonomy_guardrail_breaches").insert({
          organization_id: organizationId,
          domain_id: params.domain_id || null,
          breach_type: breach.breach_type,
          severity: breach.severity,
          description: breach.description,
          action_attempted: params.action_attempted ?? "",
          blocked: breach.blocked,
        });

        if (breach.requires_immediate_downgrade && params.domain_id) {
          const downgrade = computeDowngrade({
            current_level: params.autonomy_level ?? 0,
            regression_severity: "critical",
            has_active_review: false,
          });

          if (downgrade.should_downgrade) {
            await supabase
              .from("autonomy_domains")
              .update({ current_autonomy_level: downgrade.new_level, updated_at: new Date().toISOString() })
              .eq("id", params.domain_id);

            await supabase.from("autonomy_adjustment_events").insert({
              organization_id: organizationId,
              domain_id: params.domain_id,
              previous_level: params.autonomy_level ?? 0,
              new_level: downgrade.new_level,
              adjustment_reason: breach.description,
              adjustment_type: "downgrade",
              adjusted_by: "guardrail_breach_handler",
            });

            // Record immediate downgrade attempt
            await recordAttempt({
              domain_id: params.domain_id,
              level_from: params.autonomy_level ?? 0,
              level_to: downgrade.new_level,
              direction: "downgrade",
              approved: true,
              rejection_reason: `Critical breach: ${breach.description}`,
            });
          }
        }

        result = { breach };
        break;
      }

      case "downgrade_autonomy": {
        // Sprint 125: Load tenant-adaptive regression profile
        const { data: tenantProfile } = await supabase
          .from("tenant_regression_profiles")
          .select("*")
          .eq("organization_id", organizationId)
          .single();

        const profile: TenantRegressionProfile = tenantProfile
          ? {
              profile_type: tenantProfile.profile_type as any,
              validation_failure_threshold: Number(tenantProfile.validation_failure_threshold),
              rollback_rate_threshold: tenantProfile.rollback_rate_threshold,
              guardrail_breach_threshold: tenantProfile.guardrail_breach_threshold,
              incident_threshold: tenantProfile.incident_threshold,
              evidence_trend_threshold: Number(tenantProfile.evidence_trend_threshold),
              autonomy_upgrade_modifier: Number(tenantProfile.autonomy_upgrade_modifier),
            }
          : DEFAULT_PROFILES.balanced;

        const regression = detectAdaptiveRegression(
          {
            recent_incident_count: params.recent_incident_count ?? 0,
            recent_rollback_count: params.recent_rollback_count ?? 0,
            validation_failure_rate: params.validation_failure_rate ?? 0,
            evidence_score_trend: params.evidence_score_trend ?? 0,
            guardrail_breach_count: params.guardrail_breach_count ?? 0,
            window_days: params.window_days ?? 7,
          },
          profile,
        );

        let downgrade = null;
        if (regression.regression_detected) {
          downgrade = computeDowngrade({
            current_level: params.current_level ?? 0,
            regression_severity: regression.severity,
            has_active_review: params.has_active_review ?? false,
          });

          if (downgrade.should_downgrade && params.domain_id) {
            await supabase.from("autonomy_regression_cases").insert({
              organization_id: organizationId,
              domain_id: params.domain_id,
              regression_type: regression.severity,
              severity: regression.severity,
              trigger_event: regression.triggers.join("; "),
            });

            await recordAttempt({
              domain_id: params.domain_id,
              level_from: params.current_level ?? 0,
              level_to: downgrade.new_level,
              direction: "downgrade",
              approved: true,
              rejection_reason: regression.triggers.join("; "),
            });
          }
        }

        result = { regression, downgrade, profile_applied: profile.profile_type };
        break;
      }

      case "explain_autonomy_posture": {
        const { data: domain } = await supabase
          .from("autonomy_domains")
          .select("*")
          .eq("id", params.domain_id)
          .eq("organization_id", organizationId)
          .single();

        if (!domain) throw new Error("Domain not found");

        const explanation = explainPosture({
          domain_name: domain.domain_name,
          current_level: domain.current_autonomy_level,
          max_level: domain.max_autonomy_level,
          evidence_score: Number(domain.evidence_score),
          rollback_dependence: Number(domain.rollback_dependence_score),
          incident_penalty: Number(domain.incident_penalty_score),
          validation_rate: Number(domain.validation_success_rate),
          doctrine_alignment: Number(domain.doctrine_alignment_score),
          allowed_actions: (domain.allowed_action_classes as string[]) || [],
          blocked_actions: (domain.blocked_action_classes as string[]) || [],
        });

        result = { explanation };
        break;
      }

      case "list_domains": {
        const { data } = await supabase
          .from("autonomy_domains")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });
        result = { domains: data || [] };
        break;
      }

      case "list_adjustments": {
        const { data } = await supabase
          .from("autonomy_adjustment_events")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(50);
        result = { adjustments: data || [] };
        break;
      }

      case "list_breaches": {
        const { data } = await supabase
          .from("autonomy_guardrail_breaches")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(50);
        result = { breaches: data || [] };
        break;
      }

      case "list_regressions": {
        const { data } = await supabase
          .from("autonomy_regression_cases")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(50);
        result = { regressions: data || [] };
        break;
      }

      // ── Sprint 125: Tenant Regression Profile management ──
      case "get_regression_profile": {
        const { data: prof } = await supabase
          .from("tenant_regression_profiles")
          .select("*")
          .eq("organization_id", organizationId)
          .single();

        result = {
          profile: prof || null,
          defaults: DEFAULT_PROFILES,
          active_type: prof?.profile_type || "balanced",
        };
        break;
      }

      case "set_regression_profile": {
        const profileType = params.profile_type || "balanced";
        const defaults = DEFAULT_PROFILES[profileType] || DEFAULT_PROFILES.balanced;

        const row = {
          organization_id: organizationId,
          profile_type: profileType,
          validation_failure_threshold: params.validation_failure_threshold ?? defaults.validation_failure_threshold,
          rollback_rate_threshold: params.rollback_rate_threshold ?? defaults.rollback_rate_threshold,
          guardrail_breach_threshold: params.guardrail_breach_threshold ?? defaults.guardrail_breach_threshold,
          incident_threshold: params.incident_threshold ?? defaults.incident_threshold,
          evidence_trend_threshold: params.evidence_trend_threshold ?? defaults.evidence_trend_threshold,
          autonomy_upgrade_modifier: params.autonomy_upgrade_modifier ?? defaults.autonomy_upgrade_modifier,
          description: params.description || `${profileType} profile`,
          updated_at: new Date().toISOString(),
        };

        const { data: existing } = await supabase
          .from("tenant_regression_profiles")
          .select("id")
          .eq("organization_id", organizationId)
          .single();

        if (existing) {
          await supabase.from("tenant_regression_profiles").update(row).eq("id", existing.id);
        } else {
          await supabase.from("tenant_regression_profiles").insert(row);
        }

        result = { profile: row };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
