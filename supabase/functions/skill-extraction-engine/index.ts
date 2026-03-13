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
    .eq("lifecycle_status", "active")
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
    sc.from("canon_entries").select("id").eq("organization_id", orgId).eq("approval_status", "approved").eq("lifecycle_status", "active"),
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
