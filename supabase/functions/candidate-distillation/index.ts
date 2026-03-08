import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, organization_id } = body;
    if (!organization_id) throw new Error("organization_id required");

    // Verify membership
    const { data: isMember } = await supabase.rpc("is_org_member", { _user_id: user.id, _org_id: organization_id });
    if (!isMember) throw new Error("Not a member of this organization");

    const json = (d: unknown) => new Response(JSON.stringify(d), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ── GENERATE CANDIDATES ──
    if (action === "generate_candidates") {
      // Fetch unprocessed relevant evidence
      const { data: evidence } = await supabase
        .from("improvement_evidence")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("review_status", "relevant")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!evidence || evidence.length === 0) {
        return json({ candidates_created: 0, message: "No relevant evidence to distill" });
      }

      // Cluster by source_type + affected_stage
      const clusters = new Map<string, typeof evidence>();
      for (const ev of evidence) {
        const key = `${ev.source_type}::${ev.affected_stage || "general"}`;
        if (!clusters.has(key)) clusters.set(key, []);
        clusters.get(key)!.push(ev);
      }

      const CANDIDATE_TYPE_MAP: Record<string, string> = {
        validation_failure: "validation_rule_candidate",
        repair_attempt: "repair_strategy_candidate",
        rollback_event: "repair_strategy_candidate",
        extension_compatibility_failure: "compatibility_rule_candidate",
        extension_approval_outcome: "extension_governance_candidate",
        deployment_blocker: "process_guideline_candidate",
        operator_note: "operator_playbook_candidate",
        execution_anomaly: "process_guideline_candidate",
        adoption_friction: "evidence_only_observation",
        delivery_friction: "evidence_only_observation",
      };

      let created = 0;

      for (const [key, items] of clusters) {
        if (items.length < 1) continue;
        const [sourceType, stage] = key.split("::");
        const candidateType = CANDIDATE_TYPE_MAP[sourceType] || "evidence_only_observation";
        const highSev = items.filter(e => e.severity === "high" || e.severity === "critical").length;
        const severity = highSev > items.length / 2 ? "high" : items.length >= 5 ? "moderate" : "low";
        const confidence = Math.min(0.95, 0.3 + items.length * 0.08 + highSev * 0.05);
        const priority = Math.min(0.95, 0.2 + items.length * 0.06 + highSev * 0.1);

        // Check if a similar candidate already exists
        const { data: existing } = await supabase
          .from("improvement_candidates")
          .select("id, recurrence_count, evidence_count")
          .eq("organization_id", organization_id)
          .eq("source_pattern", key)
          .in("review_status", ["new", "reviewing", "triaged"])
          .limit(1);

        if (existing && existing.length > 0) {
          // Update recurrence
          const ex = existing[0];
          await supabase.from("improvement_candidates").update({
            recurrence_count: ex.recurrence_count + items.length,
            evidence_count: ex.evidence_count + items.length,
            confidence_score: confidence,
            priority_score: priority,
            updated_at: new Date().toISOString(),
          }).eq("id", ex.id);

          // Link new evidence
          for (const ev of items) {
            await supabase.from("improvement_candidate_evidence").upsert({
              candidate_id: ex.id,
              evidence_id: ev.id,
              relevance_score: 0.7,
              contribution_summary: `Recurring ${sourceType.replace(/_/g, " ")} in ${stage}`,
            }, { onConflict: "candidate_id,evidence_id" });
          }
          created++;
          continue;
        }

        const summaries = items.slice(0, 5).map((e: any) => e.summary).join("; ");
        const title = `${candidateType.replace(/_/g, " ")}: ${sourceType.replace(/_/g, " ")} in ${stage}`;
        const summary = `${items.length} evidence items detected for ${sourceType.replace(/_/g, " ")} affecting ${stage}. ${highSev > 0 ? `${highSev} high/critical severity.` : ""}`;
        const explanation = `Pattern detected: recurring ${sourceType.replace(/_/g, " ")} events at stage "${stage}". Evidence summaries: ${summaries.slice(0, 500)}. This candidate is advisory-only and requires human review before any action.`;

        const { data: candidate, error: insErr } = await supabase
          .from("improvement_candidates")
          .insert({
            organization_id,
            candidate_type: candidateType,
            title,
            summary,
            explanation,
            source_pattern: key,
            affected_stages: stage !== "general" ? [stage] : [],
            severity,
            priority_score: priority,
            confidence_score: confidence,
            recurrence_count: items.length,
            expected_benefit: `Reduce ${sourceType.replace(/_/g, " ")} rate at ${stage}`,
            risk_posture: highSev > items.length / 2 ? "moderate" : "low",
            evidence_count: items.length,
          })
          .select("id")
          .single();

        if (insErr) { console.error("insert error", insErr); continue; }

        // Link evidence to candidate
        for (const ev of items) {
          await supabase.from("improvement_candidate_evidence").insert({
            candidate_id: candidate.id,
            evidence_id: ev.id,
            relevance_score: 0.7,
            contribution_summary: ev.summary?.slice(0, 200) || "",
          });
        }

        // Record pattern
        await supabase.from("improvement_candidate_patterns").insert({
          organization_id,
          pattern_key: key,
          pattern_description: `Recurring ${sourceType.replace(/_/g, " ")} at ${stage}`,
          occurrence_count: items.length,
          source_types: [sourceType],
          affected_stages: stage !== "general" ? [stage] : [],
          severity,
          last_seen_at: items[0].created_at,
          linked_candidate_id: candidate.id,
        });

        created++;
      }

      return json({ candidates_created: created, evidence_processed: evidence.length });
    }

    // ── LIST CANDIDATES ──
    if (action === "list_candidates") {
      let query = supabase
        .from("improvement_candidates")
        .select("*")
        .eq("organization_id", organization_id)
        .order("priority_score", { ascending: false })
        .limit(body.limit || 100);

      if (body.candidate_type && body.candidate_type !== "all") query = query.eq("candidate_type", body.candidate_type);
      if (body.severity && body.severity !== "all") query = query.eq("severity", body.severity);
      if (body.review_status && body.review_status !== "all") query = query.eq("review_status", body.review_status);

      const { data: candidates, error } = await query;
      if (error) throw error;

      // KPIs
      const { count: total } = await supabase.from("improvement_candidates").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
      const { count: highConf } = await supabase.from("improvement_candidates").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).gte("confidence_score", 0.7);
      const { count: backlog } = await supabase.from("improvement_candidates").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).in("review_status", ["new", "reviewing"]);
      const { count: recurring } = await supabase.from("improvement_candidates").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).gte("recurrence_count", 3);
      const { count: benchReady } = await supabase.from("improvement_candidates").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).eq("review_status", "ready_for_benchmark");

      return json({
        candidates: candidates || [],
        kpis: {
          total: total || 0,
          high_confidence: highConf || 0,
          review_backlog: backlog || 0,
          recurring_patterns: recurring || 0,
          benchmark_ready: benchReady || 0,
        },
      });
    }

    // ── CANDIDATE DETAIL ──
    if (action === "candidate_detail") {
      const { candidate_id } = body;
      if (!candidate_id) throw new Error("candidate_id required");

      const { data: candidate } = await supabase.from("improvement_candidates").select("*").eq("id", candidate_id).single();
      if (!candidate) throw new Error("Candidate not found");

      const { data: evidenceLinks } = await supabase.from("improvement_candidate_evidence")
        .select("*, improvement_evidence(*)")
        .eq("candidate_id", candidate_id)
        .order("relevance_score", { ascending: false });

      const { data: reviews } = await supabase.from("improvement_candidate_reviews")
        .select("*").eq("candidate_id", candidate_id).order("created_at", { ascending: false });

      const { data: patterns } = await supabase.from("improvement_candidate_patterns")
        .select("*").eq("linked_candidate_id", candidate_id);

      return json({ candidate, evidence_links: evidenceLinks || [], reviews: reviews || [], patterns: patterns || [] });
    }

    // ── EXPLAIN CANDIDATE ──
    if (action === "explain_candidate") {
      const { candidate_id } = body;
      if (!candidate_id) throw new Error("candidate_id required");

      const { data: candidate } = await supabase.from("improvement_candidates").select("*").eq("id", candidate_id).single();
      if (!candidate) throw new Error("Candidate not found");

      const { data: evidenceLinks } = await supabase.from("improvement_candidate_evidence")
        .select("contribution_summary, relevance_score, improvement_evidence(summary, source_type, severity)")
        .eq("candidate_id", candidate_id)
        .order("relevance_score", { ascending: false })
        .limit(10);

      const evidenceSummaries = (evidenceLinks || []).map((l: any) => ({
        summary: l.improvement_evidence?.summary,
        source: l.improvement_evidence?.source_type,
        severity: l.improvement_evidence?.severity,
        relevance: l.relevance_score,
      }));

      return json({
        candidate_id,
        title: candidate.title,
        why_it_exists: candidate.explanation,
        pattern_detected: candidate.source_pattern,
        where_it_applies: candidate.affected_stages,
        what_it_might_improve: candidate.expected_benefit,
        why_still_candidate: "This recommendation is advisory-only. Human review and governance approval are required before any action. No autonomous mutation is permitted.",
        contributing_evidence: evidenceSummaries,
        confidence: candidate.confidence_score,
        recurrence: candidate.recurrence_count,
      });
    }

    // ── TRIAGE CANDIDATE ──
    if (action === "triage_candidate") {
      const { candidate_id, new_status, notes } = body;
      if (!candidate_id || !new_status) throw new Error("candidate_id and new_status required");
      const allowed = ["new", "reviewing", "triaged", "accepted", "rejected", "deferred", "archived", "ready_for_benchmark"];
      if (!allowed.includes(new_status)) throw new Error(`Invalid status. Allowed: ${allowed.join(", ")}`);

      const { data: candidate } = await supabase.from("improvement_candidates").select("review_status").eq("id", candidate_id).single();
      if (!candidate) throw new Error("Candidate not found");

      await supabase.from("improvement_candidates").update({ review_status: new_status, updated_at: new Date().toISOString() }).eq("id", candidate_id);
      await supabase.from("improvement_candidate_reviews").insert({
        candidate_id,
        reviewer_id: user.id,
        action: "triage",
        previous_status: candidate.review_status,
        new_status,
        notes: notes || null,
      });

      return json({ success: true });
    }

    // ── ARCHIVE CANDIDATE ──
    if (action === "archive_candidate") {
      const { candidate_id } = body;
      if (!candidate_id) throw new Error("candidate_id required");

      const { data: candidate } = await supabase.from("improvement_candidates").select("review_status").eq("id", candidate_id).single();
      if (!candidate) throw new Error("Candidate not found");

      await supabase.from("improvement_candidates").update({ review_status: "archived", updated_at: new Date().toISOString() }).eq("id", candidate_id);
      await supabase.from("improvement_candidate_reviews").insert({
        candidate_id,
        reviewer_id: user.id,
        action: "archive",
        previous_status: candidate.review_status,
        new_status: "archived",
      });

      return json({ success: true });
    }

    // ── MARK READY FOR BENCHMARK ──
    if (action === "mark_ready_for_benchmark") {
      const { candidate_id, notes } = body;
      if (!candidate_id) throw new Error("candidate_id required");

      const { data: candidate } = await supabase.from("improvement_candidates").select("review_status").eq("id", candidate_id).single();
      if (!candidate) throw new Error("Candidate not found");

      await supabase.from("improvement_candidates").update({ review_status: "ready_for_benchmark", updated_at: new Date().toISOString() }).eq("id", candidate_id);
      await supabase.from("improvement_candidate_reviews").insert({
        candidate_id,
        reviewer_id: user.id,
        action: "mark_ready_for_benchmark",
        previous_status: candidate.review_status,
        new_status: "ready_for_benchmark",
        notes: notes || null,
      });

      return json({ success: true });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
