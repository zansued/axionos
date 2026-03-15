import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, errorResponse } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

const READ_ACTIONS = new Set([
  "extraction_status", "list_reviewable", "review_history",
  "list_bindings", "skill_context_for_agent",
]);
const WRITE_ACTIONS = new Set([
  "extract_skills", "review_skill", "batch_review",
  "ai_review_batch", "bind_capability", "auto_bind",
]);

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
      case "ai_review_batch":
        return await aiReviewBatch(sc, orgId, user.id, params);
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
    .eq("lifecycle_status", "approved")
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

  // Sprint 205: Emit operational learning signal
  await sc.from("operational_learning_signals").insert({
    organization_id: orgId,
    signal_type: "skills_extracted",
    outcome: `Extracted ${skillsCreated.length} skills into ${bundlesCreated.length} bundles from ${eligible.length} canon entries`,
    outcome_success: skillsCreated.length > 0,
    payload: {
      extracted: skillsCreated.length,
      bundles_created: bundlesCreated.length,
      eligible: eligible.length,
      errors_count: errors.length,
    },
  });

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
    sc.from("canon_entries").select("id").eq("organization_id", orgId).eq("approval_status", "approved").eq("lifecycle_status", "approved"),
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
  const includeReviewed = p.include_reviewed === true;
  const status = p.status;
  const limit = Math.min(p.limit || 200, 500);

  let query = sc
    .from("engineering_skills")
    .select("id, skill_name, description, domain, confidence, lifecycle_status, extraction_method, bundle_id, canon_entry_id, metadata, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!includeReviewed && !status) {
    // Default: only pending review statuses
    query = query.in("lifecycle_status", ["extracted", "pending_review"]);
  } else if (status && status !== "all") {
    query = query.eq("lifecycle_status", status);
  }
  // If include_reviewed=true and no specific status, return all

  const { data: skills, error } = await query;

  if (error) return json({ error: error.message }, 400);

  return json({
    skills: skills || [],
    count: skills?.length || 0,
    include_reviewed: includeReviewed,
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

  return json({ reviews: data || [], count: data?.length || 0, total_reviews: data?.length || 0 });
}

// ══════════════════════════════════════════════════
// AI-ASSISTED BATCH REVIEW
// ══════════════════════════════════════════════════
//
// Uses Lovable AI to evaluate each skill across 4 dimensions,
// produce a verdict (approved/rejected/needs_refinement) and rationale.
// Results are advisory-first: AI scores + verdict are applied via
// the existing reviewSkill function, preserving full audit trail.

async function aiReviewBatch(sc: any, orgId: string, reviewerId: string, p: any) {
  const limit = Math.min(p.limit || 20, 50);
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

  // Fetch skills pending review
  const { data: skills, error: fetchErr } = await sc
    .from("engineering_skills")
    .select("id, skill_name, description, domain, confidence, lifecycle_status, extraction_method, metadata")
    .eq("organization_id", orgId)
    .in("lifecycle_status", ["extracted", "pending_review"])
    .order("confidence", { ascending: false })
    .limit(limit);

  if (fetchErr) return json({ error: fetchErr.message }, 400);
  if (!skills?.length) return json({ reviewed: 0, message: "No skills pending review" });

  const results: any[] = [];
  const errors: any[] = [];

  // Process in batches of 5 for efficiency
  const batches = [];
  for (let i = 0; i < skills.length; i += 5) {
    batches.push(skills.slice(i, i + 5));
  }

  for (const batch of batches) {
    const skillsPrompt = batch.map((s: any, i: number) => 
      `[Skill ${i + 1}]\nID: ${s.id}\nName: ${s.skill_name}\nDomain: ${s.domain}\nConfidence: ${s.confidence}\nDescription: ${s.description}\nSource: ${s.extraction_method}\nCanon Type: ${s.metadata?.source_canon_type || "unknown"}\nPractice Type: ${s.metadata?.source_practice_type || "unknown"}\nTopic: ${s.metadata?.source_topic || "unknown"}`
    ).join("\n\n");

    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert engineering skill reviewer for AxionOS, a governed autonomous software factory.

Evaluate each skill on 4 dimensions (0.0 to 1.0):
- specificity: How precise and actionable is this skill? (vague=0.2, specific=0.8+)
- applicability: How broadly useful within its domain? (niche=0.3, universal=0.9)
- reusability: Can agents reuse this without modification? (one-off=0.2, reusable=0.8+)
- confidence_assessment: Is the inherited confidence score reasonable? (inflated=0.3, accurate=0.8+)

Then assign a verdict:
- "approved" — skill is specific, applicable, reusable, confidence is fair (overall >= 0.6)
- "needs_refinement" — skill has potential but is too vague or overlaps with others (overall 0.4-0.6)
- "rejected" — skill is too generic, redundant, or low value (overall < 0.4)

Respond ONLY with a JSON array. No markdown, no explanation outside the JSON.`
            },
            {
              role: "user",
              content: `Review these ${batch.length} skills:\n\n${skillsPrompt}`
            }
          ],
          tools: [{
            type: "function",
            function: {
              name: "submit_reviews",
              description: "Submit skill review results",
              parameters: {
                type: "object",
                properties: {
                  reviews: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill_id: { type: "string" },
                        verdict: { type: "string", enum: ["approved", "rejected", "needs_refinement"] },
                        specificity: { type: "number" },
                        applicability: { type: "number" },
                        reusability: { type: "number" },
                        confidence_assessment: { type: "number" },
                        rationale: { type: "string" }
                      },
                      required: ["skill_id", "verdict", "specificity", "applicability", "reusability", "confidence_assessment", "rationale"]
                    }
                  }
                },
                required: ["reviews"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "submit_reviews" } },
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        errors.push({ batch_index: batches.indexOf(batch), error: `AI gateway ${aiRes.status}: ${errText.slice(0, 200)}` });
        continue;
      }

      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        errors.push({ batch_index: batches.indexOf(batch), error: "No tool call in AI response" });
        continue;
      }

      let reviews: any[];
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        reviews = parsed.reviews || parsed;
      } catch {
        errors.push({ batch_index: batches.indexOf(batch), error: "Failed to parse AI response" });
        continue;
      }

      // Apply each AI review through the existing governance function
      for (const review of reviews) {
        if (!review.skill_id || !review.verdict) continue;
        const res = await reviewSkill(sc, orgId, reviewerId, {
          skill_id: review.skill_id,
          verdict: review.verdict,
          specificity: Math.max(0, Math.min(1, review.specificity || 0.5)),
          applicability: Math.max(0, Math.min(1, review.applicability || 0.5)),
          reusability: Math.max(0, Math.min(1, review.reusability || 0.5)),
          confidence_assessment: Math.max(0, Math.min(1, review.confidence_assessment || 0.5)),
          notes: `[AI Review] ${review.rationale || "No rationale provided"}`,
        });
        const body = JSON.parse(await (res as Response).text());
        if (body.error) {
          errors.push({ skill_id: review.skill_id, error: body.error });
        } else {
          results.push({ ...body, ai_rationale: review.rationale });
        }
      }
    } catch (e: any) {
      errors.push({ batch_index: batches.indexOf(batch), error: e.message });
    }
  }

  // Summary stats
  const verdictCounts: Record<string, number> = {};
  for (const r of results) {
    const v = r.verdict || "unknown";
    verdictCounts[v] = (verdictCounts[v] || 0) + 1;
  }

  return json({
    reviewed: results.length,
    total_pending: skills.length,
    verdict_distribution: verdictCounts,
    avg_overall_score: results.length > 0
      ? +(results.reduce((a: number, r: any) => a + (r.overall_score || 0), 0) / results.length).toFixed(3)
      : 0,
    results: results.slice(0, 20),
    errors: errors.length > 0 ? errors : undefined,
    review_method: "ai_assisted_lovable_gateway",
    model: "google/gemini-2.5-flash",
  });
}

// ══════════════════════════════════════════════════
// SKILL-CAPABILITY BINDING — SF-4
// ══════════════════════════════════════════════════
//
// Binding model:
//   - Only approved skills (lifecycle_status = 'approved') can be bound
//   - capability_key maps to Agent OS capability declarations
//   - strength (0-1) = skill confidence * review overall_score
//   - Bindings are stored in skill_capabilities table (created SF-1)
//
// Binding strategy (first pass — deterministic):
//   Domain/practice_type → capability_key mapping using DOMAIN_CAPABILITY_MAP
//   This is explainable and auditable. AI-driven mapping deferred.
//
// Runtime integration path: execute-subtask
//   When an agent executes a subtask, skill_capabilities matching
//   the agent's role are queried and injected as context enrichment.

const DOMAIN_CAPABILITY_MAP: Record<string, string[]> = {
  // stack/domain → capability keys
  "react": ["code_generation", "frontend_development"],
  "typescript": ["code_generation", "type_system_design"],
  "node": ["code_generation", "backend_development"],
  "api": ["api_design", "backend_development"],
  "database": ["data_modeling", "migration_authoring"],
  "sql": ["data_modeling", "migration_authoring"],
  "testing": ["test_generation", "validation"],
  "architecture": ["architecture_analysis", "system_design"],
  "security": ["security_analysis", "validation"],
  "devops": ["deployment", "infrastructure"],
  "ci": ["deployment", "infrastructure"],
  "css": ["frontend_development", "code_generation"],
  "design": ["frontend_development", "system_design"],
  "performance": ["optimization", "validation"],
  "monitoring": ["observability", "validation"],
  "general": ["general_analysis"],
};

const PRACTICE_TYPE_CAPABILITY_MAP: Record<string, string[]> = {
  "architecture_pattern": ["architecture_analysis", "system_design"],
  "best_practice": ["general_analysis", "validation"],
  "implementation_pattern": ["code_generation"],
  "template": ["code_generation", "scaffolding"],
  "checklist": ["validation", "review"],
  "anti_pattern": ["validation", "security_analysis"],
  "validation_rule": ["validation", "test_generation"],
  "migration_note": ["migration_authoring"],
  "methodology_guideline": ["general_analysis", "system_design"],
};

function deriveCapabilityKeys(domain: string, metadata: any): string[] {
  const keys = new Set<string>();

  // Match by domain
  const domainLower = (domain || "general").toLowerCase();
  for (const [pattern, caps] of Object.entries(DOMAIN_CAPABILITY_MAP)) {
    if (domainLower.includes(pattern)) {
      caps.forEach(c => keys.add(c));
    }
  }

  // Match by practice_type from metadata
  const practiceType = metadata?.source_practice_type || "";
  const ptCaps = PRACTICE_TYPE_CAPABILITY_MAP[practiceType];
  if (ptCaps) ptCaps.forEach(c => keys.add(c));

  // Fallback
  if (keys.size === 0) keys.add("general_analysis");

  return [...keys];
}

async function bindCapability(sc: any, orgId: string, userId: string, p: any) {
  const { skill_id, capability_key, capability_description, strength_override } = p;

  if (!skill_id || !capability_key) return json({ error: "skill_id and capability_key required" }, 400);

  // Verify skill is approved
  const { data: skill, error: skillErr } = await sc
    .from("engineering_skills")
    .select("id, lifecycle_status, confidence, skill_name, domain, metadata")
    .eq("id", skill_id)
    .eq("organization_id", orgId)
    .single();

  if (skillErr || !skill) return json({ error: "Skill not found" }, 404);
  if (skill.lifecycle_status !== "approved") {
    return json({ error: `Only approved skills can be bound. Current status: ${skill.lifecycle_status}` }, 400);
  }

  // Calculate strength from confidence + latest review score
  const { data: latestReview } = await sc
    .from("skill_reviews")
    .select("overall_score")
    .eq("engineering_skill_id", skill_id)
    .eq("organization_id", orgId)
    .eq("verdict", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const reviewScore = latestReview?.overall_score || 0.5;
  const strength = strength_override ?? +((skill.confidence || 0.5) * reviewScore).toFixed(3);

  // Check for existing binding
  const { data: existing } = await sc
    .from("skill_capabilities")
    .select("id")
    .eq("engineering_skill_id", skill_id)
    .eq("capability_key", capability_key)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (existing) {
    // Update existing binding
    const { error: updateErr } = await sc
      .from("skill_capabilities")
      .update({
        strength,
        capability_description: capability_description || null,
        metadata: { updated_by: userId, updated_at: new Date().toISOString(), basis: "manual_bind_sf4" },
      })
      .eq("id", existing.id);

    if (updateErr) return json({ error: updateErr.message }, 400);
    return json({ binding_id: existing.id, action: "updated", skill_id, capability_key, strength });
  }

  // Create new binding
  const { data: binding, error: bindErr } = await sc
    .from("skill_capabilities")
    .insert({
      organization_id: orgId,
      engineering_skill_id: skill_id,
      capability_key,
      capability_description: capability_description || `Skill-derived: ${skill.skill_name}`,
      strength,
      metadata: { bound_by: userId, bound_at: new Date().toISOString(), basis: "manual_bind_sf4", source_domain: skill.domain },
    })
    .select("id")
    .single();

  if (bindErr) return json({ error: bindErr.message }, 400);

  return json({ binding_id: binding.id, action: "created", skill_id, capability_key, strength });
}

async function autoBind(sc: any, orgId: string, userId: string, p: any) {
  const limit = Math.min(p.limit || 50, 200);
  const minConfidence = p.min_confidence || 0.4;

  // Fetch approved skills not yet bound
  const { data: approvedSkills, error: skillErr } = await sc
    .from("engineering_skills")
    .select("id, skill_name, domain, confidence, metadata")
    .eq("organization_id", orgId)
    .eq("lifecycle_status", "approved")
    .gte("confidence", minConfidence)
    .order("confidence", { ascending: false })
    .limit(limit);

  if (skillErr) return json({ error: skillErr.message }, 400);
  if (!approvedSkills?.length) return json({ bound: 0, message: "No approved skills eligible for binding" });

  // Fetch existing bindings to avoid duplicates
  const skillIds = approvedSkills.map((s: any) => s.id);
  const { data: existingBindings } = await sc
    .from("skill_capabilities")
    .select("engineering_skill_id, capability_key")
    .eq("organization_id", orgId)
    .in("engineering_skill_id", skillIds);

  const existingSet = new Set((existingBindings || []).map((b: any) => `${b.engineering_skill_id}::${b.capability_key}`));

  const inserts: any[] = [];
  const bindingMap: Record<string, string[]> = {};

  for (const skill of approvedSkills) {
    const capKeys = deriveCapabilityKeys(skill.domain, skill.metadata);
    bindingMap[skill.id] = [];

    for (const capKey of capKeys) {
      const dedupeKey = `${skill.id}::${capKey}`;
      if (existingSet.has(dedupeKey)) continue;

      const strength = +((skill.confidence || 0.5) * 0.8).toFixed(3); // conservative auto-bind discount

      inserts.push({
        organization_id: orgId,
        engineering_skill_id: skill.id,
        capability_key: capKey,
        capability_description: `Auto-derived from ${skill.skill_name}`,
        strength,
        metadata: {
          bound_by: userId,
          bound_at: new Date().toISOString(),
          basis: "auto_bind_sf4",
          source_domain: skill.domain,
          derivation: "domain_practice_type_map",
        },
      });
      bindingMap[skill.id].push(capKey);
      existingSet.add(dedupeKey);
    }
  }

  if (!inserts.length) return json({ bound: 0, message: "All eligible skills already bound" });

  // Batch insert (chunks of 50)
  let totalBound = 0;
  const errors: string[] = [];
  for (let i = 0; i < inserts.length; i += 50) {
    const chunk = inserts.slice(i, i + 50);
    const { error: insertErr } = await sc.from("skill_capabilities").insert(chunk);
    if (insertErr) {
      errors.push(insertErr.message);
    } else {
      totalBound += chunk.length;
    }
  }

  return json({
    bound: totalBound,
    skills_processed: approvedSkills.length,
    skipped_existing: existingBindings?.length || 0,
    errors: errors.length > 0 ? errors : undefined,
    binding_strategy: {
      method: "domain_practice_type_deterministic_map",
      confidence_discount: 0.8,
      min_confidence_filter: minConfidence,
      governed_only: true,
    },
    sample_bindings: Object.entries(bindingMap).slice(0, 5).map(([sid, caps]) => ({ skill_id: sid, capability_keys: caps })),
  });
}

async function listBindings(sc: any, orgId: string, p: any) {
  const limit = Math.min(p.limit || 100, 500);

  let query = sc
    .from("skill_capabilities")
    .select("id, engineering_skill_id, capability_key, capability_description, strength, metadata, created_at")
    .eq("organization_id", orgId)
    .order("strength", { ascending: false })
    .limit(limit);

  if (p.capability_key) query = query.eq("capability_key", p.capability_key);
  if (p.skill_id) query = query.eq("engineering_skill_id", p.skill_id);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 400);

  // Group by capability_key for summary
  const byCapability: Record<string, number> = {};
  for (const b of (data || [])) {
    byCapability[b.capability_key] = (byCapability[b.capability_key] || 0) + 1;
  }

  return json({
    bindings: data || [],
    count: data?.length || 0,
    by_capability: byCapability,
  });
}

// ══════════════════════════════════════════════════
// RUNTIME CONTEXT — Skill context for agent use
// ══════════════════════════════════════════════════
//
// This is the query endpoint that runtime paths (e.g. execute-subtask)
// call to retrieve skill-backed capability context for an agent.
// Only approved skills with active bindings are returned.

async function skillContextForAgent(sc: any, orgId: string, p: any) {
  const { agent_role, capability_keys, domain, limit: queryLimit } = p;
  const limit = Math.min(queryLimit || 20, 50);

  if (!agent_role && !capability_keys?.length && !domain) {
    return json({ error: "At least one of agent_role, capability_keys, or domain required" }, 400);
  }

  // Build query for skill_capabilities joined with engineering_skills
  let query = sc
    .from("skill_capabilities")
    .select("id, capability_key, strength, capability_description, engineering_skill_id, metadata, engineering_skills(id, skill_name, description, domain, confidence, lifecycle_status, metadata)")
    .eq("organization_id", orgId)
    .order("strength", { ascending: false })
    .limit(limit);

  if (capability_keys?.length) {
    query = query.in("capability_key", capability_keys);
  }

  const { data: bindings, error } = await query;
  if (error) return json({ error: error.message }, 400);

  // Filter to only approved skills
  const approved = (bindings || []).filter((b: any) =>
    b.engineering_skills?.lifecycle_status === "approved"
  );

  // Optionally filter by domain
  const filtered = domain
    ? approved.filter((b: any) => (b.engineering_skills?.domain || "").toLowerCase().includes(domain.toLowerCase()))
    : approved;

  // Map agent_role to capability_keys for convenience
  const ROLE_CAPABILITY_MAP: Record<string, string[]> = {
    architect: ["architecture_analysis", "system_design", "api_design"],
    dev: ["code_generation", "frontend_development", "backend_development", "migration_authoring"],
    devops: ["deployment", "infrastructure", "observability"],
    analyst: ["general_analysis", "data_modeling"],
    po: ["general_analysis", "system_design"],
    qa: ["test_generation", "validation", "security_analysis"],
    reviewer: ["validation", "review", "security_analysis"],
  };

  let roleFiltered = filtered;
  if (agent_role && ROLE_CAPABILITY_MAP[agent_role]) {
    const roleCaps = new Set(ROLE_CAPABILITY_MAP[agent_role]);
    roleFiltered = filtered.filter((b: any) => roleCaps.has(b.capability_key));
  }

  return json({
    skills: roleFiltered.map((b: any) => ({
      binding_id: b.id,
      capability_key: b.capability_key,
      strength: b.strength,
      skill_id: b.engineering_skill_id,
      skill_name: b.engineering_skills?.skill_name,
      skill_description: b.engineering_skills?.description,
      domain: b.engineering_skills?.domain,
      confidence: b.engineering_skills?.confidence,
    })),
    count: roleFiltered.length,
    filter: { agent_role, capability_keys, domain },
    governed: true,
  });
}
