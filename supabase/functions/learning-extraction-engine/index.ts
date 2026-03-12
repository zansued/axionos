import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExtractionInput {
  organization_id: string;
  action:
    | "extract_candidates"
    | "list_candidates"
    | "candidate_summary";
  lookback_days?: number;
  status_filter?: string;
}

/* ------------------------------------------------------------------ */
/*  Pattern detection helpers                                         */
/* ------------------------------------------------------------------ */

interface RawSignal {
  candidate_type: string;
  pattern_signature: string;
  evidence_count: number;
  confidence_score: number;
  first_observed_at: string;
  last_observed_at: string;
  source_domains: string[];
  recommended_action: string;
  candidate_scope: string;
}

function confidence(evidenceCount: number, successRate: number): number {
  const sampleFactor = Math.min(evidenceCount / 20, 1);
  return Math.round(sampleFactor * successRate * 100) / 100;
}

async function extractFromValidationRuns(
  supabase: any,
  orgId: string,
  since: string
): Promise<RawSignal[]> {
  const { data: runs } = await supabase
    .from("execution_validation_runs")
    .select("*")
    .eq("organization_id", orgId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!runs?.length) return [];

  const signals: RawSignal[] = [];

  // Group by stack_id to find stable execution paths
  const byStack: Record<string, any[]> = {};
  for (const r of runs) {
    const key = r.stack_id || "default";
    (byStack[key] ||= []).push(r);
  }

  for (const [stackId, items] of Object.entries(byStack)) {
    const successCount = items.filter(
      (i: any) => i.overall_status === "passed" || i.overall_status === "success"
    ).length;
    const rate = successCount / items.length;

    if (items.length >= 5 && rate >= 0.8) {
      signals.push({
        candidate_type: "execution_pattern",
        pattern_signature: `stable_execution:stack:${stackId}`,
        evidence_count: items.length,
        confidence_score: confidence(items.length, rate),
        first_observed_at: items[items.length - 1].created_at,
        last_observed_at: items[0].created_at,
        source_domains: ["execution_validation_runs"],
        recommended_action: `Promote stack ${stackId} execution path as canonical pattern (${(rate * 100).toFixed(0)}% success rate)`,
        candidate_scope: "tenant_specific",
      });
    }

    if (items.length >= 5 && rate < 0.5) {
      signals.push({
        candidate_type: "regression_prevention",
        pattern_signature: `regression_zone:stack:${stackId}`,
        evidence_count: items.length,
        confidence_score: confidence(items.length, 1 - rate),
        first_observed_at: items[items.length - 1].created_at,
        last_observed_at: items[0].created_at,
        source_domains: ["execution_validation_runs"],
        recommended_action: `Investigate persistent failure zone in stack ${stackId} (${(rate * 100).toFixed(0)}% success rate)`,
        candidate_scope: "tenant_specific",
      });
    }
  }

  // Look for consistent validation success patterns
  const validationSuccessRate = runs.filter(
    (r: any) => r.validation_passed === true
  ).length / runs.length;

  if (runs.length >= 10 && validationSuccessRate >= 0.9) {
    signals.push({
      candidate_type: "validation_rule",
      pattern_signature: `high_validation_success:org:${orgId}`,
      evidence_count: runs.length,
      confidence_score: confidence(runs.length, validationSuccessRate),
      first_observed_at: runs[runs.length - 1].created_at,
      last_observed_at: runs[0].created_at,
      source_domains: ["execution_validation_runs"],
      recommended_action: `Validation pipeline consistently passing (${(validationSuccessRate * 100).toFixed(0)}%). Consider tightening thresholds.`,
      candidate_scope: "tenant_specific",
    });
  }

  return signals;
}

async function extractFromAutonomyTransitions(
  supabase: any,
  orgId: string,
  since: string
): Promise<RawSignal[]> {
  const { data: attempts } = await supabase
    .from("autonomy_transition_attempts")
    .select("*")
    .eq("organization_id", orgId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!attempts?.length) return [];
  const signals: RawSignal[] = [];

  const approved = attempts.filter((a: any) => a.outcome === "approved" || a.approved === true);
  const denied = attempts.filter((a: any) => a.outcome === "denied" || a.approved === false);

  if (approved.length >= 5) {
    signals.push({
      candidate_type: "execution_pattern",
      pattern_signature: `autonomy_upgrade_success:org:${orgId}`,
      evidence_count: approved.length,
      confidence_score: confidence(approved.length, approved.length / attempts.length),
      first_observed_at: approved[approved.length - 1].created_at,
      last_observed_at: approved[0].created_at,
      source_domains: ["autonomy_transition_attempts"],
      recommended_action: `Autonomy upgrades succeeding consistently (${approved.length}/${attempts.length}). Consider accelerating ladder progression.`,
      candidate_scope: "tenant_specific",
    });
  }

  if (denied.length >= 3) {
    signals.push({
      candidate_type: "regression_prevention",
      pattern_signature: `autonomy_upgrade_blocked:org:${orgId}`,
      evidence_count: denied.length,
      confidence_score: confidence(denied.length, denied.length / attempts.length),
      first_observed_at: denied[denied.length - 1].created_at,
      last_observed_at: denied[0].created_at,
      source_domains: ["autonomy_transition_attempts"],
      recommended_action: `Autonomy upgrades frequently denied (${denied.length}/${attempts.length}). Investigate blockers.`,
      candidate_scope: "tenant_specific",
    });
  }

  return signals;
}

async function extractFromRepairEvidence(
  supabase: any,
  orgId: string,
  since: string
): Promise<RawSignal[]> {
  const { data: repairs } = await supabase
    .from("repair_evidence")
    .select("*")
    .eq("organization_id", orgId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!repairs?.length) return [];
  const signals: RawSignal[] = [];

  // Group by strategy
  const byStrategy: Record<string, any[]> = {};
  for (const r of repairs) {
    const key = r.strategy_used || r.repair_strategy || "unknown";
    (byStrategy[key] ||= []).push(r);
  }

  for (const [strategy, items] of Object.entries(byStrategy)) {
    const successes = items.filter((i: any) => i.success === true || i.outcome === "success");
    const rate = successes.length / items.length;

    if (items.length >= 3 && rate >= 0.7) {
      signals.push({
        candidate_type: "repair_strategy",
        pattern_signature: `effective_repair:strategy:${strategy}`,
        evidence_count: items.length,
        confidence_score: confidence(items.length, rate),
        first_observed_at: items[items.length - 1].created_at,
        last_observed_at: items[0].created_at,
        source_domains: ["repair_evidence"],
        recommended_action: `Repair strategy "${strategy}" effective (${(rate * 100).toFixed(0)}% success). Promote as canonical repair path.`,
        candidate_scope: "tenant_specific",
      });
    }

    if (items.length >= 3 && rate < 0.3) {
      signals.push({
        candidate_type: "repair_strategy",
        pattern_signature: `ineffective_repair:strategy:${strategy}`,
        evidence_count: items.length,
        confidence_score: confidence(items.length, 1 - rate),
        first_observed_at: items[items.length - 1].created_at,
        last_observed_at: items[0].created_at,
        source_domains: ["repair_evidence"],
        recommended_action: `Repair strategy "${strategy}" underperforming (${(rate * 100).toFixed(0)}% success). Consider deprecation or redesign.`,
        candidate_scope: "tenant_specific",
      });
    }
  }

  return signals;
}

async function extractFromCompoundingMetrics(
  supabase: any,
  orgId: string,
  since: string
): Promise<RawSignal[]> {
  const { data: scores } = await supabase
    .from("compounding_advantage_scores")
    .select("*")
    .eq("organization_id", orgId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!scores?.length) return [];
  const signals: RawSignal[] = [];

  // Group by domain
  const byDomain: Record<string, any[]> = {};
  for (const s of scores) {
    const key = s.domain_id || s.moat_domain_id || "general";
    (byDomain[key] ||= []).push(s);
  }

  for (const [domain, items] of Object.entries(byDomain)) {
    const avgScore =
      items.reduce((sum: number, i: any) => sum + (i.composite_score || i.advantage_score || 0), 0) / items.length;

    if (items.length >= 3 && avgScore >= 0.7) {
      signals.push({
        candidate_type: "architecture_guideline",
        pattern_signature: `compounding_advantage:domain:${domain}`,
        evidence_count: items.length,
        confidence_score: confidence(items.length, avgScore),
        first_observed_at: items[items.length - 1].created_at,
        last_observed_at: items[0].created_at,
        source_domains: ["compounding_advantage_scores"],
        recommended_action: `Domain "${domain}" showing strong compounding advantage (avg ${(avgScore * 100).toFixed(0)}%). Protect and expand this capability moat.`,
        candidate_scope: "tenant_specific",
      });
    }
  }

  return signals;
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                      */
/* ------------------------------------------------------------------ */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth hardening — Sprint 196
    const { authenticateWithRateLimit } = await import("../_shared/auth.ts");
    const { logSecurityAudit, resolveAndValidateOrg } = await import("../_shared/security-audit.ts");

    const authResult = await authenticateWithRateLimit(req, "learning-extraction-engine");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const body: ExtractionInput = await req.json();
    const { organization_id: payloadOrgId, action, lookback_days = 30, status_filter } = body;

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organization_id) {
      return new Response(
        JSON.stringify({ error: orgError || "Organization access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await logSecurityAudit(supabase, {
      organization_id, actor_id: user.id,
      function_name: "learning-extraction-engine", action: action || "unknown",
    });

    switch (action) {
      /* ------------------------------------------------------------ */
      case "extract_candidates": {
        const since = new Date(
          Date.now() - lookback_days * 24 * 60 * 60 * 1000
        ).toISOString();

        // Run all extractors in parallel
        const [validationSignals, autonomySignals, repairSignals, compoundingSignals] =
          await Promise.all([
            extractFromValidationRuns(supabase, organization_id, since),
            extractFromAutonomyTransitions(supabase, organization_id, since),
            extractFromRepairEvidence(supabase, organization_id, since),
            extractFromCompoundingMetrics(supabase, organization_id, since),
          ]);

        const allSignals = [
          ...validationSignals,
          ...autonomySignals,
          ...repairSignals,
          ...compoundingSignals,
        ];

        // Upsert: update existing candidates with same pattern_signature, insert new ones
        let inserted = 0;
        let updated = 0;

        for (const signal of allSignals) {
          const { data: existing } = await supabase
            .from("learning_candidates")
            .select("id, evidence_count")
            .eq("organization_id", organization_id)
            .eq("pattern_signature", signal.pattern_signature)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("learning_candidates")
              .update({
                evidence_count: signal.evidence_count,
                confidence_score: signal.confidence_score,
                last_observed_at: signal.last_observed_at,
                source_domains: signal.source_domains,
                recommended_action: signal.recommended_action,
              })
              .eq("id", existing.id);
            updated++;
          } else {
            await supabase.from("learning_candidates").insert({
              organization_id,
              candidate_type: signal.candidate_type,
              candidate_scope: signal.candidate_scope,
              pattern_signature: signal.pattern_signature,
              evidence_count: signal.evidence_count,
              confidence_score: signal.confidence_score,
              first_observed_at: signal.first_observed_at,
              last_observed_at: signal.last_observed_at,
              source_domains: signal.source_domains,
              recommended_action: signal.recommended_action,
              status: "pending",
            });
            inserted++;
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            total_signals: allSignals.length,
            inserted,
            updated,
            by_source: {
              execution_validation: validationSignals.length,
              autonomy_transitions: autonomySignals.length,
              repair_evidence: repairSignals.length,
              compounding_metrics: compoundingSignals.length,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      /* ------------------------------------------------------------ */
      case "list_candidates": {
        let query = supabase
          .from("learning_candidates")
          .select("*")
          .eq("organization_id", organization_id)
          .order("confidence_score", { ascending: false })
          .limit(100);

        if (status_filter) {
          query = query.eq("status", status_filter);
        }

        const { data, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({ candidates: data || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      /* ------------------------------------------------------------ */
      case "candidate_summary": {
        const { data: candidates } = await supabase
          .from("learning_candidates")
          .select("*")
          .eq("organization_id", organization_id);

        const items = candidates || [];
        const typeDistribution: Record<string, number> = {};
        const scopeDistribution: Record<string, number> = {};
        const domainSignalCount: Record<string, number> = {};
        let highConfidenceCount = 0;

        for (const c of items) {
          typeDistribution[c.candidate_type] =
            (typeDistribution[c.candidate_type] || 0) + 1;
          scopeDistribution[c.candidate_scope] =
            (scopeDistribution[c.candidate_scope] || 0) + 1;

          if (c.confidence_score >= 0.7) highConfidenceCount++;

          const domains = (c.source_domains as string[]) || [];
          for (const d of domains) {
            domainSignalCount[d] = (domainSignalCount[d] || 0) + 1;
          }
        }

        return new Response(
          JSON.stringify({
            total_candidates: items.length,
            high_confidence_count: highConfidenceCount,
            by_type: typeDistribution,
            by_scope: scopeDistribution,
            by_status: items.reduce(
              (acc: Record<string, number>, c: any) => {
                acc[c.status] = (acc[c.status] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
            top_signal_domains: Object.entries(domainSignalCount)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([domain, count]) => ({ domain, count })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
