import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DistillationSignal {
  pattern_signature: string;
  tenant_occurrence_count: number;
  stack_occurrence_count: number;
  global_occurrence_count: number;
  generalization_score: number;
  recommended_scope: string;
}

function computeGeneralizationScore(
  tenantCount: number,
  stackCount: number,
  globalCount: number,
  avgConfidence: number
): number {
  // Weighted scoring: multi-tenant presence matters most
  const tenantFactor = Math.min(tenantCount / 3, 1) * 0.4;
  const stackFactor = Math.min(stackCount / 3, 1) * 0.25;
  const volumeFactor = Math.min(globalCount / 10, 1) * 0.15;
  const confidenceFactor = avgConfidence * 0.2;
  return Math.round((tenantFactor + stackFactor + volumeFactor + confidenceFactor) * 10000) / 10000;
}

function classifyScope(tenantCount: number, stackCount: number, score: number): string {
  if (tenantCount >= 3 && score >= 0.6) return "platform_wide";
  if (stackCount >= 2 || tenantCount >= 2) return "stack_specific";
  return "tenant_specific";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, organization_id: orgId } = body;

    if (!orgId) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── scan_learning_candidates ─── */
    if (action === "scan_learning_candidates") {
      // Fetch all active learning candidates across the org
      const { data: candidates, error: cErr } = await supabase
        .from("learning_candidates")
        .select("pattern_signature, candidate_scope, confidence_score, source_domains, evidence_count")
        .eq("organization_id", orgId)
        .eq("status", "active");

      if (cErr) throw cErr;
      if (!candidates || candidates.length === 0) {
        return new Response(JSON.stringify({ message: "No active candidates to distill", patterns: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Group by pattern_signature
      const groups: Record<string, {
        signatures: Set<string>;
        stacks: Set<string>;
        totalCount: number;
        confidenceSum: number;
        candidateCount: number;
      }> = {};

      for (const c of candidates) {
        const sig = c.pattern_signature || "unknown";
        if (!groups[sig]) {
          groups[sig] = { signatures: new Set(), stacks: new Set(), totalCount: 0, confidenceSum: 0, candidateCount: 0 };
        }
        const g = groups[sig];
        g.totalCount += c.evidence_count || 1;
        g.confidenceSum += c.confidence_score || 0;
        g.candidateCount++;

        // Extract tenant/stack info from source_domains
        const domains = Array.isArray(c.source_domains) ? c.source_domains : [];
        for (const d of domains) {
          if (typeof d === "string") {
            g.signatures.add(d);
            // Use scope as stack proxy
            if (c.candidate_scope) g.stacks.add(c.candidate_scope);
          }
        }
      }

      const signals: DistillationSignal[] = [];

      for (const [sig, g] of Object.entries(groups)) {
        const tenantCount = Math.max(g.signatures.size, 1);
        const stackCount = Math.max(g.stacks.size, 1);
        const avgConf = g.candidateCount > 0 ? g.confidenceSum / g.candidateCount : 0;
        const gScore = computeGeneralizationScore(tenantCount, stackCount, g.totalCount, avgConf);
        const scope = classifyScope(tenantCount, stackCount, gScore);

        signals.push({
          pattern_signature: sig,
          tenant_occurrence_count: tenantCount,
          stack_occurrence_count: stackCount,
          global_occurrence_count: g.totalCount,
          generalization_score: gScore,
          recommended_scope: scope,
        });
      }

      // Upsert into pattern_distillation_records
      let inserted = 0;
      for (const s of signals) {
        // Check existing
        const { data: existing } = await supabase
          .from("pattern_distillation_records")
          .select("id")
          .eq("organization_id", orgId)
          .eq("pattern_signature", s.pattern_signature)
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase
            .from("pattern_distillation_records")
            .update({
              tenant_occurrence_count: s.tenant_occurrence_count,
              stack_occurrence_count: s.stack_occurrence_count,
              global_occurrence_count: s.global_occurrence_count,
              generalization_score: s.generalization_score,
              recommended_scope: s.recommended_scope,
            })
            .eq("id", existing[0].id);
        } else {
          await supabase
            .from("pattern_distillation_records")
            .insert({ organization_id: orgId, ...s });
          inserted++;
        }
      }

      return new Response(JSON.stringify({
        message: `Distillation complete. ${signals.length} patterns analyzed, ${inserted} new records.`,
        patterns: signals,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── compute_generalization (single pattern) ─── */
    if (action === "compute_generalization") {
      const { pattern_signature } = body;
      if (!pattern_signature) {
        return new Response(JSON.stringify({ error: "pattern_signature required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: candidates } = await supabase
        .from("learning_candidates")
        .select("candidate_scope, confidence_score, source_domains, evidence_count")
        .eq("organization_id", orgId)
        .eq("pattern_signature", pattern_signature)
        .eq("status", "active");

      const tenants = new Set<string>();
      const stacks = new Set<string>();
      let total = 0, confSum = 0;

      for (const c of (candidates || [])) {
        total += c.evidence_count || 1;
        confSum += c.confidence_score || 0;
        if (c.candidate_scope) stacks.add(c.candidate_scope);
        for (const d of (Array.isArray(c.source_domains) ? c.source_domains : [])) {
          if (typeof d === "string") tenants.add(d);
        }
      }

      const avgConf = candidates && candidates.length > 0 ? confSum / candidates.length : 0;
      const tCount = Math.max(tenants.size, 1);
      const sCount = Math.max(stacks.size, 1);
      const gScore = computeGeneralizationScore(tCount, sCount, total, avgConf);

      return new Response(JSON.stringify({
        pattern_signature,
        tenant_occurrence_count: tCount,
        stack_occurrence_count: sCount,
        global_occurrence_count: total,
        generalization_score: gScore,
        recommended_scope: classifyScope(tCount, sCount, gScore),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── list_patterns ─── */
    if (action === "list_patterns") {
      const { scope_filter } = body;
      let query = supabase
        .from("pattern_distillation_records")
        .select("*")
        .eq("organization_id", orgId)
        .order("generalization_score", { ascending: false });

      if (scope_filter) query = query.eq("recommended_scope", scope_filter);

      const { data, error } = await query.limit(200);
      if (error) throw error;

      return new Response(JSON.stringify({ patterns: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── pattern_summary ─── */
    if (action === "pattern_summary") {
      const { data: records, error } = await supabase
        .from("pattern_distillation_records")
        .select("recommended_scope, generalization_score")
        .eq("organization_id", orgId);

      if (error) throw error;

      const byScope: Record<string, number> = {};
      let highGen = 0;

      for (const r of (records || [])) {
        byScope[r.recommended_scope] = (byScope[r.recommended_scope] || 0) + 1;
        if (r.generalization_score >= 0.6) highGen++;
      }

      return new Response(JSON.stringify({
        total: (records || []).length,
        by_scope: byScope,
        high_generalization_count: highGen,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
