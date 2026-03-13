import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

/**
 * Knowledge Lineage Engine — Sprint 181
 * Auth hardened — Sprint 200
 *
 * Actions:
 *   - build_lineage: construct lineage events and provenance links for canon entries
 *   - compute_confidence_breakdowns: explain confidence composition
 *   - check_integrity: detect lineage integrity issues
 *   - get_lineage: retrieve full lineage for a knowledge object
 *   - get_provenance_summary: aggregate provenance data for dashboard
 */

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticateWithRateLimit(req, "knowledge-lineage-engine");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const { action, organization_id: payloadOrgId, ...params } = await req.json();

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organization_id) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(supabase, {
      organization_id, actor_id: user.id,
      function_name: "knowledge-lineage-engine", action: action || "unknown",
    });

    switch (action) {
      // ═══════════════════════════════════════════════════
      // 1. BUILD LINEAGE — Create events & links for canon entries
      // ═══════════════════════════════════════════════════
      case "build_lineage": {
        const batchSize = params.batch_size || 30;

        // Get canon entries
        const { data: entries } = await supabase
          .from("canon_entries")
          .select("id, title, canon_type, confidence_score, source_reference, source_type, lifecycle_status, created_at, metadata")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(batchSize);

        if (!entries?.length) return jsonResponse({ built: 0 }, 200, req);

        // Get related data
        const [candidatesRes, trustRes, weightsRes, recalsRes] = await Promise.all([
          supabase.from("learning_candidates").select("id, title, source_type, source_domains, status, confidence_score, evidence_count, signal_count, pattern_signature, promoted_entry_id").eq("organization_id", organization_id),
          supabase.from("repo_trust_scores").select("id, source_id, source_name, trust_score, trust_tier, patterns_promoted").eq("organization_id", organization_id),
          supabase.from("pattern_weight_factors").select("*").eq("organization_id", organization_id),
          supabase.from("confidence_recalibration_log").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
        ]);

        const candidates = candidatesRes.data || [];
        const trustScores = trustRes.data || [];
        const weights = weightsRes.data || [];
        const recals = recalsRes.data || [];

        let eventsCreated = 0;
        let linksCreated = 0;

        for (const entry of entries) {
          // Find promoting candidates
          const promotingCandidates = candidates.filter(
            (c: any) => c.promoted_entry_id === entry.id || c.status === "promoted"
          );

          // Create "created" lineage event
          await supabase.from("knowledge_lineage_events").insert({
            organization_id,
            knowledge_object_type: "canon_entry",
            knowledge_object_id: entry.id,
            event_type: "created",
            summary: `Canon entry "${entry.title}" created via ${entry.source_type || "unknown"}`,
            payload: { canon_type: entry.canon_type, source: entry.source_reference },
            actor: "knowledge-lineage-engine",
          });
          eventsCreated++;

          // Link to promoting candidates
          for (const cand of promotingCandidates) {
            await supabase.from("knowledge_provenance_links").insert({
              organization_id,
              target_object_type: "canon_entry",
              target_object_id: entry.id,
              source_object_type: "learning_candidate",
              source_object_id: cand.id,
              link_type: "promoted_from",
              weight: cand.confidence_score || 0.5,
              confidence_contribution: (cand.confidence_score || 0.5) * 0.3,
              metadata: { candidate_title: cand.title, evidence_count: cand.evidence_count },
            });
            linksCreated++;

            // Event for promotion
            await supabase.from("knowledge_lineage_events").insert({
              organization_id,
              knowledge_object_type: "canon_entry",
              knowledge_object_id: entry.id,
              event_type: "promoted",
              source_type: "learning_candidate",
              source_id: cand.id,
              summary: `Promoted from candidate "${cand.title}" (confidence: ${cand.confidence_score})`,
              payload: { candidate_id: cand.id, evidence_count: cand.evidence_count },
              actor: "knowledge-lineage-engine",
            });
            eventsCreated++;
          }

          // Link to source repos via trust scores
          for (const trust of trustScores) {
            if (entry.source_reference && trust.source_name &&
                (entry.source_reference.includes(trust.source_name) || entry.source_type === trust.source_name)) {
              await supabase.from("knowledge_provenance_links").insert({
                organization_id,
                target_object_type: "canon_entry",
                target_object_id: entry.id,
                source_object_type: "repo_trust_score",
                source_object_id: trust.id,
                link_type: "sourced_from",
                weight: Number(trust.trust_score),
                confidence_contribution: Number(trust.trust_score) * 0.2,
                metadata: { repo_name: trust.source_name, trust_tier: trust.trust_tier },
              });
              linksCreated++;
            }
          }

          // Check for recalibrations
          const entryRecals = recals.filter((r: any) => r.target_id === entry.id);
          for (const recal of entryRecals) {
            await supabase.from("knowledge_lineage_events").insert({
              organization_id,
              knowledge_object_type: "canon_entry",
              knowledge_object_id: entry.id,
              event_type: "confidence_recalibrated",
              summary: `Confidence adjusted from ${Number(recal.previous_confidence).toFixed(3)} to ${Number(recal.new_confidence).toFixed(3)}`,
              payload: { previous: recal.previous_confidence, new: recal.new_confidence, factors: recal.factors },
              actor: recal.recalibrated_by || "system",
            });
            eventsCreated++;
          }
        }

        return jsonResponse({ built: entries.length, events_created: eventsCreated, links_created: linksCreated }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // 2. COMPUTE CONFIDENCE BREAKDOWNS
      // ═══════════════════════════════════════════════════
      case "compute_confidence_breakdowns": {
        const batchSize = params.batch_size || 30;

        const { data: entries } = await supabase
          .from("canon_entries")
          .select("id, title, confidence_score, source_type")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(batchSize);

        if (!entries?.length) return jsonResponse({ computed: 0 }, 200, req);

        const [linksRes, trustRes, weightsRes] = await Promise.all([
          supabase.from("knowledge_provenance_links").select("*").eq("organization_id", organization_id),
          supabase.from("repo_trust_scores").select("*").eq("organization_id", organization_id),
          supabase.from("pattern_weight_factors").select("*").eq("organization_id", organization_id),
        ]);

        const links = linksRes.data || [];
        const trustScores = trustRes.data || [];
        const weights = weightsRes.data || [];
        let computed = 0;

        for (const entry of entries) {
          const entryLinks = links.filter(
            (l: any) => l.target_object_id === entry.id && l.target_object_type === "canon_entry"
          );

          // Source repo trust
          const repoLinks = entryLinks.filter((l: any) => l.link_type === "sourced_from");
          const repoTrustContrib = repoLinks.length > 0
            ? repoLinks.reduce((s: number, l: any) => s + Number(l.confidence_contribution), 0) / repoLinks.length
            : 0;

          // Promotion support
          const promoLinks = entryLinks.filter((l: any) => l.link_type === "promoted_from");
          const mergeSupport = promoLinks.reduce((s: number, l: any) => s + Number(l.confidence_contribution), 0);

          // Pattern weight data
          const weightEntry = weights.find((w: any) => w.target_id === entry.id);
          const execReinforcement = weightEntry ? Number(weightEntry.execution_reinforcement) : 0;
          const recurrenceContrib = weightEntry ? Number(weightEntry.recurrence_bonus) : 0;
          const negativePenalty = weightEntry
            ? Number(weightEntry.weak_source_penalty) + Number(weightEntry.duplication_noise_penalty)
            : 0;

          const baseConf = entry.confidence_score || 0.5;
          const finalConf = Math.min(1.0, Math.max(0.0,
            baseConf * 0.4 + repoTrustContrib + mergeSupport + execReinforcement * 0.1 + recurrenceContrib * 0.05 - negativePenalty
          ));

          // Build explanation
          const explanationParts: string[] = [];
          explanationParts.push(`Base extraction confidence: ${Number(baseConf).toFixed(3)}`);
          if (repoLinks.length > 0) explanationParts.push(`Sourced from ${repoLinks.length} repo(s), trust contribution: +${repoTrustContrib.toFixed(3)}`);
          if (promoLinks.length > 0) explanationParts.push(`Promoted from ${promoLinks.length} candidate(s), merge support: +${mergeSupport.toFixed(3)}`);
          if (execReinforcement > 0) explanationParts.push(`Execution reinforcement: +${(execReinforcement * 0.1).toFixed(3)}`);
          if (recurrenceContrib > 0) explanationParts.push(`Recurrence across sources: +${(recurrenceContrib * 0.05).toFixed(3)}`);
          if (negativePenalty > 0) explanationParts.push(`Penalties (weak source/duplication): -${negativePenalty.toFixed(3)}`);

          await supabase.from("knowledge_confidence_breakdowns").upsert({
            organization_id,
            knowledge_object_type: "canon_entry",
            knowledge_object_id: entry.id,
            base_confidence: baseConf,
            repo_trust_contribution: repoTrustContrib,
            recurrence_contribution: recurrenceContrib * 0.05,
            execution_reinforcement: execReinforcement * 0.1,
            merge_support: mergeSupport,
            negative_signal_penalty: negativePenalty,
            final_confidence: finalConf,
            explanation: explanationParts.join(". "),
            factors: {
              repo_links: repoLinks.length,
              promo_links: promoLinks.length,
              has_weight_data: !!weightEntry,
            },
            computed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "knowledge_object_type,knowledge_object_id" });

          computed++;
        }

        return jsonResponse({ computed }, req);
      }

      // ═══════════════════════════════════════════════════
      // 3. CHECK INTEGRITY — Detect lineage issues
      // ═══════════════════════════════════════════════════
      case "check_integrity": {
        const { data: entries } = await supabase
          .from("canon_entries")
          .select("id, title, confidence_score, source_reference, lifecycle_status")
          .eq("organization_id", organization_id);

        const { data: links } = await supabase
          .from("knowledge_provenance_links")
          .select("*")
          .eq("organization_id", organization_id);

        const { data: breakdowns } = await supabase
          .from("knowledge_confidence_breakdowns")
          .select("*")
          .eq("organization_id", organization_id);

        const allLinks = links || [];
        const allBreakdowns = breakdowns || [];
        const alerts: any[] = [];

        for (const entry of (entries || [])) {
          const entryLinks = allLinks.filter(
            (l: any) => l.target_object_id === entry.id && l.target_object_type === "canon_entry"
          );
          const breakdown = allBreakdowns.find(
            (b: any) => b.knowledge_object_id === entry.id
          );

          // Weak provenance
          if (entryLinks.length === 0) {
            alerts.push({
              type: "weak_provenance",
              severity: "warning",
              target_id: entry.id,
              title: entry.title,
              message: "Canon entry has no provenance links — origin unknown",
            });
          }

          // High confidence with weak evidence
          if ((entry.confidence_score || 0) > 0.8 && entryLinks.length < 2) {
            alerts.push({
              type: "high_confidence_weak_evidence",
              severity: "warning",
              target_id: entry.id,
              title: entry.title,
              message: `Confidence ${entry.confidence_score} but only ${entryLinks.length} provenance link(s)`,
            });
          }

          // No confidence breakdown
          if (!breakdown) {
            alerts.push({
              type: "missing_breakdown",
              severity: "info",
              target_id: entry.id,
              title: entry.title,
              message: "No confidence breakdown computed yet",
            });
          }

          // Conflicting sources
          const repoLinks = entryLinks.filter((l: any) => l.link_type === "sourced_from");
          if (repoLinks.length > 1) {
            const trustValues = repoLinks.map((l: any) => Number(l.weight));
            const spread = Math.max(...trustValues) - Math.min(...trustValues);
            if (spread > 0.4) {
              alerts.push({
                type: "conflicting_sources",
                severity: "warning",
                target_id: entry.id,
                title: entry.title,
                message: `Sources have trust spread of ${spread.toFixed(2)} — potentially conflicting quality`,
              });
            }
          }
        }

        return jsonResponse({
          total_checked: entries?.length || 0,
          alerts_count: alerts.length,
          alerts: alerts.sort((a, b) => (a.severity === "warning" ? -1 : 1)),
        }, req);
      }

      // ═══════════════════════════════════════════════════
      // 4. GET LINEAGE — Full lineage for one object
      // ═══════════════════════════════════════════════════
      case "get_lineage": {
        const { object_type, object_id } = params;
        if (!object_type || !object_id) return errorResponse("object_type and object_id required", 400, req);

        const [eventsRes, incomingRes, outgoingRes, breakdownRes] = await Promise.all([
          supabase.from("knowledge_lineage_events")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("knowledge_object_type", object_type)
            .eq("knowledge_object_id", object_id)
            .order("created_at", { ascending: true }),
          supabase.from("knowledge_provenance_links")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("target_object_type", object_type)
            .eq("target_object_id", object_id),
          supabase.from("knowledge_provenance_links")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("source_object_type", object_type)
            .eq("source_object_id", object_id),
          supabase.from("knowledge_confidence_breakdowns")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("knowledge_object_type", object_type)
            .eq("knowledge_object_id", object_id)
            .limit(1)
            .maybeSingle(),
        ]);

        return jsonResponse({
          events: eventsRes.data || [],
          incoming_links: incomingRes.data || [],
          outgoing_links: outgoingRes.data || [],
          confidence_breakdown: breakdownRes.data,
        }, req);
      }

      // ═══════════════════════════════════════════════════
      // 5. GET PROVENANCE SUMMARY — Dashboard aggregates
      // ═══════════════════════════════════════════════════
      case "get_provenance_summary": {
        const [eventsRes, linksRes, breakdownsRes, trustRes] = await Promise.all([
          supabase.from("knowledge_lineage_events").select("id, event_type, knowledge_object_type, created_at").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
          supabase.from("knowledge_provenance_links").select("id, link_type, source_object_type, target_object_type, weight").eq("organization_id", organization_id),
          supabase.from("knowledge_confidence_breakdowns").select("*").eq("organization_id", organization_id).order("final_confidence", { ascending: false }),
          supabase.from("repo_trust_scores").select("id, source_name, trust_score, trust_tier, patterns_promoted").eq("organization_id", organization_id).order("trust_score", { ascending: false }),
        ]);

        const events = eventsRes.data || [];
        const links = linksRes.data || [];
        const breakdowns = breakdownsRes.data || [];

        // Event type distribution
        const eventTypeDist: Record<string, number> = {};
        events.forEach((e: any) => { eventTypeDist[e.event_type] = (eventTypeDist[e.event_type] || 0) + 1; });

        // Link type distribution
        const linkTypeDist: Record<string, number> = {};
        links.forEach((l: any) => { linkTypeDist[l.link_type] = (linkTypeDist[l.link_type] || 0) + 1; });

        return jsonResponse({
          total_events: events.length,
          total_links: links.length,
          total_breakdowns: breakdowns.length,
          event_type_distribution: eventTypeDist,
          link_type_distribution: linkTypeDist,
          top_knowledge_sources: (trustRes.data || []).slice(0, 10),
          recent_events: events.slice(0, 20),
          highest_confidence: breakdowns.slice(0, 5),
          lowest_confidence: breakdowns.slice(-5).reverse(),
        }, req);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (err: any) {
    console.error("knowledge-lineage-engine error:", err);
    return errorResponse(err.message || "Internal error", 500, req);
  }
});
