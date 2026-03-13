import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

/**
 * Skill Extraction Engine — SF-2
 *
 * First operational pipeline stage that transforms promoted canon entries
 * into skill_bundles and engineering_skills records.
 *
 * Input path: promoted canon entries (approval_status = 'approved', lifecycle_status = 'active')
 * This is the safest first input because these entries have already been:
 *   - extracted from trusted sources
 *   - reviewed by canon governance
 *   - promoted with confidence scores
 *
 * Actions:
 *   extract_skills — batch extraction from eligible canon entries
 *   extraction_status — view extraction run summary
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticateWithRateLimit(req, "skill-extraction-engine");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: sc } = authResult;

    const body = await req.json();
    const { action, organization_id: payloadOrgId, ...params } = body;

    const { orgId, error: orgError } = await resolveAndValidateOrg(sc, user.id, payloadOrgId);
    if (orgError || !orgId) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(sc, {
      organization_id: orgId,
      actor_id: user.id,
      function_name: "skill-extraction-engine",
      action: action || "unknown",
    });

    switch (action) {
      case "extract_skills":
        return await extractSkills(sc, orgId, params);
      case "extraction_status":
        return await extractionStatus(sc, orgId, params);
      case "review_skill":
        return await reviewSkill(sc, orgId, user.id, params);
      case "batch_review":
        return await batchReview(sc, orgId, user.id, params);
      case "list_reviewable":
        return await listReviewable(sc, orgId, params);
      case "review_history":
        return await reviewHistory(sc, orgId, params);
      // SF-4: Skill-Capability Binding
      case "bind_capability":
        return await bindCapability(sc, orgId, user.id, params);
      case "auto_bind":
        return await autoBind(sc, orgId, user.id, params);
      case "list_bindings":
        return await listBindings(sc, orgId, params);
      case "skill_context_for_agent":
        return await skillContextForAgent(sc, orgId, params);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ══════════════════════════════════════════════════
// EXTRACTION CONTRACT
// ══════════════════════════════════════════════════
//
// An extractable skill meets ALL of:
//   1. Source is a promoted canon entry (approved + active)
//   2. Has a meaningful title + summary/body
//   3. Has a confidence_score >= 0.5
//   4. Has not already been extracted (no existing engineering_skill with same canon_entry_id)
//
// Extracted skill record contains:
//   - skill_name: derived from canon title
//   - description: from canon summary
//   - domain: from canon stack_scope or topic
//   - confidence: inherited from canon confidence_score, discounted by 0.9x
//   - lifecycle_status: "extracted" (not yet reviewed/active)
//   - extraction_method: "canon_promotion_sf2"
//   - canon_entry_id: FK back to source
//   - metadata: provenance details
//
// Skill bundles group by domain + skill_type:
//   - One bundle per unique (domain, practice_type) pair in the batch
//   - source_type: "canon_extraction"

// ══════════════════════════════════════════════════
// EXTRACT SKILLS
// ══════════════════════════════════════════════════

interface CanonEntry {
  id: string;
  title: string;
  summary: string;
  body: string;
  practice_type: string;
  canon_type: string;
  stack_scope: string;
  layer_scope: string;
  topic: string;
  subtopic: string;
  confidence_score: number;
  source_reference: string;
  tags: unknown;
  created_at: string;
}

async function extractSkills(sc: any, orgId: string, params: any) {
  const limit = Math.min(params.limit || 50, 200);
  const minConfidence = params.min_confidence || 0.5;

  // 1. Fetch eligible promoted canon entries
  const { data: canonEntries, error: canonErr } = await sc
    .from("canon_entries")
    .select("id, title, summary, body, practice_type, canon_type, stack_scope, layer_scope, topic, subtopic, confidence_score, source_reference, tags, created_at")
    .eq("organization_id", orgId)
    .eq("approval_status", "approved")
    .in("lifecycle_status", ["active", "approved"])
    .gte("confidence_score", minConfidence)
    .order("confidence_score", { ascending: false })
    .limit(limit);

  if (canonErr) return json({ error: canonErr.message }, 400);
  if (!canonEntries?.length) return json({ extracted: 0, message: "No eligible canon entries found" });

  // 2. Filter out already-extracted entries
  const canonIds = canonEntries.map((c: CanonEntry) => c.id);
  const { data: existingSkills } = await sc
    .from("engineering_skills")
    .select("canon_entry_id")
    .eq("organization_id", orgId)
    .in("canon_entry_id", canonIds);

  const alreadyExtracted = new Set((existingSkills || []).map((s: any) => s.canon_entry_id));
  const eligible = canonEntries.filter((c: CanonEntry) => !alreadyExtracted.has(c.id));

  if (!eligible.length) return json({ extracted: 0, skipped: alreadyExtracted.size, message: "All eligible entries already extracted" });

  // 3. Group by domain + practice_type for bundle creation
  const bundleGroups = new Map<string, CanonEntry[]>();
  for (const entry of eligible) {
    const domain = entry.stack_scope || entry.topic || "general";
    const skillType = entry.practice_type || entry.canon_type || "pattern";
    const key = `${domain}::${skillType}`;
    if (!bundleGroups.has(key)) bundleGroups.set(key, []);
    bundleGroups.get(key)!.push(entry);
  }

  // 4. Create bundles and skills
  const bundlesCreated: string[] = [];
  const skillsCreated: string[] = [];
  const errors: string[] = [];

  for (const [key, entries] of bundleGroups) {
    const [domain, skillType] = key.split("::");

    // Create or reuse bundle
    const { data: existingBundle } = await sc
      .from("skill_bundles")
      .select("id")
      .eq("organization_id", orgId)
      .eq("domain", domain)
      .eq("skill_type", skillType)
      .eq("source_type", "canon_extraction")
      .maybeSingle();

    let bundleId: string;

    if (existingBundle) {
      bundleId = existingBundle.id;
    } else {
      const { data: newBundle, error: bundleErr } = await sc
        .from("skill_bundles")
        .insert({
          organization_id: orgId,
          bundle_name: `${domain} — ${skillType}`,
          description: `Auto-extracted from ${entries.length} promoted canon entries`,
          skill_type: skillType,
          domain,
          source_type: "canon_extraction",
          confidence: Math.max(...entries.map(e => e.confidence_score)) * 0.9,
          status: "draft",
          metadata: {
            extraction_method: "canon_promotion_sf2",
            extraction_date: new Date().toISOString(),
            source_count: entries.length,
          },
        })
        .select("id")
        .single();

      if (bundleErr) {
        errors.push(`Bundle ${key}: ${bundleErr.message}`);
        continue;
      }
      bundleId = newBundle.id;
      bundlesCreated.push(bundleId);
    }

    // Create engineering_skills for each canon entry
    const skillInserts = entries.map((entry: CanonEntry) => ({
      organization_id: orgId,
      bundle_id: bundleId,
      canon_entry_id: entry.id,
      skill_name: entry.title.slice(0, 200),
      description: (entry.summary || entry.body?.slice(0, 500) || "").slice(0, 1000),
      domain,
      confidence: entry.confidence_score * 0.9,
      lifecycle_status: "extracted",
      extraction_method: "canon_promotion_sf2",
      metadata: {
        source_canon_type: entry.canon_type,
        source_practice_type: entry.practice_type,
        source_layer: entry.layer_scope,
        source_topic: entry.topic,
        source_subtopic: entry.subtopic,
        source_reference: entry.source_reference,
        source_tags: entry.tags,
        source_created_at: entry.created_at,
        extraction_date: new Date().toISOString(),
      },
    }));

    const { data: inserted, error: skillErr } = await sc
      .from("engineering_skills")
      .insert(skillInserts)
      .select("id");

    if (skillErr) {
      errors.push(`Skills for ${key}: ${skillErr.message}`);
    } else {
      skillsCreated.push(...(inserted || []).map((s: any) => s.id));
    }
  }

  return json({
    extracted: skillsCreated.length,
    bundles_created: bundlesCreated.length,
    bundles_reused: bundleGroups.size - bundlesCreated.length,
    skipped_already_extracted: alreadyExtracted.size,
    eligible_canon_entries: eligible.length,
    total_canon_scanned: canonEntries.length,
    skill_ids: skillsCreated.slice(0, 20),
    bundle_ids: bundlesCreated.slice(0, 10),
    errors: errors.length > 0 ? errors : undefined,
    extraction_contract: {
      method: "canon_promotion_sf2",
      input: "promoted canon entries (approved + active, confidence >= " + minConfidence + ")",
      confidence_strategy: "canon_score * 0.9 discount",
      lifecycle: "extracted (pending review)",
      provenance: "canon_entry_id FK + metadata.source_*",
    },
  });
}

// ══════════════════════════════════════════════════
// EXTRACTION STATUS
// ══════════════════════════════════════════════════

async function extractionStatus(sc: any, orgId: string, _params: any) {
  const [bundleRes, skillRes, canonRes] = await Promise.all([
    sc.from("skill_bundles").select("id, status, domain, skill_type, confidence, source_type, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
    sc.from("engineering_skills").select("id, lifecycle_status, confidence, extraction_method, domain, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(200),
    sc.from("canon_entries").select("id").eq("organization_id", orgId).eq("approval_status", "approved").in("lifecycle_status", ["active", "approved"]),
  ]);

  const bundles = bundleRes.data || [];
  const skills = skillRes.data || [];
  const eligibleCanon = canonRes.data || [];

  const byStatus: Record<string, number> = {};
  for (const s of skills) {
    byStatus[s.lifecycle_status] = (byStatus[s.lifecycle_status] || 0) + 1;
  }

  const byMethod: Record<string, number> = {};
  for (const s of skills) {
    byMethod[s.extraction_method] = (byMethod[s.extraction_method] || 0) + 1;
  }

  return json({
    total_bundles: bundles.length,
    total_skills: skills.length,
    eligible_canon_entries: eligibleCanon.length,
    skills_by_status: byStatus,
    skills_by_method: byMethod,
    avg_confidence: skills.length > 0
      ? +(skills.reduce((a: number, s: any) => a + (s.confidence || 0), 0) / skills.length).toFixed(3)
      : 0,
    recent_bundles: bundles.slice(0, 5),
  });
}

// ══════════════════════════════════════════════════
// SKILL GOVERNANCE — SF-3
// ══════════════════════════════════════════════════
//
// Lifecycle model:
//   engineering_skills: extracted → pending_review → approved | rejected | archived
//   skill_bundles:      draft → active | archived
//
// Review dimensions (0-1 each):
//   specificity      — how precise and actionable is the skill?
//   applicability    — how broadly useful within the domain?
//   reusability      — can agents/pipelines reuse this without modification?
//   confidence_assessment — is the inherited confidence reasonable?
//
// overall_score = average of the 4 dimensions

const VALID_VERDICTS = ["approved", "rejected", "needs_refinement"];

async function reviewSkill(sc: any, orgId: string, reviewerId: string, p: any) {
  const { skill_id, verdict, specificity, applicability, reusability, confidence_assessment, notes } = p;

  if (!skill_id) return json({ error: "skill_id required" }, 400);
  if (!VALID_VERDICTS.includes(verdict)) return json({ error: `verdict must be one of: ${VALID_VERDICTS.join(", ")}` }, 400);

  // Verify skill belongs to org
  const { data: skill, error: skillErr } = await sc
    .from("engineering_skills")
    .select("id, organization_id, lifecycle_status, bundle_id")
    .eq("id", skill_id)
    .eq("organization_id", orgId)
    .single();

  if (skillErr || !skill) return json({ error: "Skill not found or access denied" }, 404);

  const scores = {
    specificity: Math.max(0, Math.min(1, specificity || 0)),
    applicability: Math.max(0, Math.min(1, applicability || 0)),
    reusability: Math.max(0, Math.min(1, reusability || 0)),
    confidence_assessment: Math.max(0, Math.min(1, confidence_assessment || 0)),
  };
  const overall = +((scores.specificity + scores.applicability + scores.reusability + scores.confidence_assessment) / 4).toFixed(3);

  // Create review record
  const { data: review, error: reviewErr } = await sc
    .from("skill_reviews")
    .insert({
      organization_id: orgId,
      engineering_skill_id: skill_id,
      bundle_id: skill.bundle_id || null,
      reviewer_id: reviewerId,
      verdict,
      specificity_score: scores.specificity,
      applicability_score: scores.applicability,
      reusability_score: scores.reusability,
      confidence_assessment: scores.confidence_assessment,
      overall_score: overall,
      notes: notes || "",
      review_type: "manual",
    })
    .select("id")
    .single();

  if (reviewErr) return json({ error: reviewErr.message }, 400);

  // Update skill lifecycle based on verdict
  const statusMap: Record<string, string> = {
    approved: "approved",
    rejected: "rejected",
    needs_refinement: "pending_review",
  };

  const newStatus = statusMap[verdict];
  const skillUpdate: any = {
    lifecycle_status: newStatus,
    updated_at: new Date().toISOString(),
  };

  // If approved, optionally boost confidence; if rejected, reduce it
  if (verdict === "approved" && overall > 0.7) {
    skillUpdate.confidence = Math.min(1, (skill.confidence || 0.5) * 1.05);
  } else if (verdict === "rejected") {
    skillUpdate.confidence = Math.max(0.1, (skill.confidence || 0.5) * 0.5);
  }

  await sc.from("engineering_skills").update(skillUpdate).eq("id", skill_id);

  // If all skills in a bundle are approved, promote the bundle
  if (verdict === "approved" && skill.bundle_id) {
    const { data: bundleSkills } = await sc
      .from("engineering_skills")
      .select("lifecycle_status")
      .eq("bundle_id", skill.bundle_id)
      .eq("organization_id", orgId);

    const allApproved = bundleSkills?.every((s: any) => s.lifecycle_status === "approved");
    if (allApproved) {
      await sc.from("skill_bundles").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", skill.bundle_id);
    }
  }

  return json({
    review_id: review.id,
    skill_id,
    verdict,
    overall_score: overall,
    new_lifecycle_status: newStatus,
    scores,
  });
}

async function batchReview(sc: any, orgId: string, reviewerId: string, p: any) {
  const { skill_ids, verdict, specificity, applicability, reusability, confidence_assessment, notes } = p;

  if (!skill_ids?.length) return json({ error: "skill_ids array required" }, 400);
  if (!VALID_VERDICTS.includes(verdict)) return json({ error: `verdict must be one of: ${VALID_VERDICTS.join(", ")}` }, 400);

  const results = [];
  const errors = [];

  for (const sid of skill_ids.slice(0, 50)) {
    const res = await reviewSkill(sc, orgId, reviewerId, {
      skill_id: sid,
      verdict,
      specificity: specificity || 0.5,
      applicability: applicability || 0.5,
      reusability: reusability || 0.5,
      confidence_assessment: confidence_assessment || 0.5,
      notes: notes || `Batch ${verdict}`,
    });
    const body = JSON.parse(await (res as Response).text());
    if (body.error) {
      errors.push({ skill_id: sid, error: body.error });
    } else {
      results.push(body);
    }
  }

  return json({
    reviewed: results.length,
    errors: errors.length > 0 ? errors : undefined,
    verdict,
    results: results.slice(0, 10),
  });
}

async function listReviewable(sc: any, orgId: string, p: any) {
  const status = p.status || "extracted";
  const limit = Math.min(p.limit || 50, 200);

  const { data: skills, error } = await sc
    .from("engineering_skills")
    .select("id, skill_name, description, domain, confidence, lifecycle_status, extraction_method, bundle_id, canon_entry_id, created_at")
    .eq("organization_id", orgId)
    .eq("lifecycle_status", status)
    .order("confidence", { ascending: false })
    .limit(limit);

  if (error) return json({ error: error.message }, 400);

  return json({
    skills: skills || [],
    count: skills?.length || 0,
    filter_status: status,
  });
}

async function reviewHistory(sc: any, orgId: string, p: any) {
  let query = sc
    .from("skill_reviews")
    .select("id, engineering_skill_id, bundle_id, reviewer_id, verdict, overall_score, specificity_score, applicability_score, reusability_score, confidence_assessment, notes, review_type, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(Math.min(p.limit || 50, 200));

  if (p.skill_id) query = query.eq("engineering_skill_id", p.skill_id);
  if (p.verdict) query = query.eq("verdict", p.verdict);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 400);

  return json({ reviews: data || [], count: data?.length || 0 });
}
