import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, organizationId } = await req.json();
    if (!organizationId) throw new Error("organizationId is required");

    let result: any;

    switch (action) {
      case "portfolio_overview":
        result = await getPortfolioOverview(supabase, organizationId);
        break;
      case "capability_details":
        result = await getCapabilityDetails(supabase, organizationId);
        break;
      case "gap_analysis":
        result = await getGapAnalysis(supabase, organizationId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Portfolio Overview ──────────────────────────────────────

async function getPortfolioOverview(sb: any, orgId: string) {
  const [skillsRes, bindingsRes, bundlesRes, reviewsRes] = await Promise.all([
    sb.from("engineering_skills").select("id, skill_name, domain, confidence, lifecycle_status, created_at, updated_at").eq("organization_id", orgId),
    sb.from("skill_capabilities").select("id, capability_key, capability_description, strength, engineering_skill_id, metadata").eq("organization_id", orgId),
    sb.from("skill_bundles").select("id, bundle_name, status, skill_count, domain, confidence_avg").eq("organization_id", orgId),
    sb.from("skill_reviews").select("id, engineering_skill_id, verdict, overall_score, specificity_score, applicability_score, reusability_score, confidence_assessment").eq("organization_id", orgId),
  ]);

  const skills = skillsRes.data || [];
  const bindings = bindingsRes.data || [];
  const bundles = bundlesRes.data || [];
  const reviews = reviewsRes.data || [];

  // Aggregate by capability_key
  const capMap: Record<string, { key: string; description: string; skills: any[]; avgStrength: number; bindings: any[] }> = {};
  for (const b of bindings) {
    if (!capMap[b.capability_key]) {
      capMap[b.capability_key] = { key: b.capability_key, description: b.capability_description || "", skills: [], avgStrength: 0, bindings: [] };
    }
    capMap[b.capability_key].bindings.push(b);
    const skill = skills.find((s: any) => s.id === b.engineering_skill_id);
    if (skill) capMap[b.capability_key].skills.push(skill);
  }

  // Compute maturity per capability
  const capabilities = Object.values(capMap).map((cap) => {
    const avgStrength = cap.bindings.length > 0
      ? cap.bindings.reduce((a: number, b: any) => a + (b.strength || 0), 0) / cap.bindings.length
      : 0;
    const avgConfidence = cap.skills.length > 0
      ? cap.skills.reduce((a: number, s: any) => a + (s.confidence || 0), 0) / cap.skills.length
      : 0;
    const approvedSkills = cap.skills.filter((s: any) => s.lifecycle_status === "approved").length;
    const totalSkills = cap.skills.length;
    const approvalRate = totalSkills > 0 ? approvedSkills / totalSkills : 0;

    // Maturity score: weighted average of strength, confidence, and approval rate
    const maturity = avgStrength * 0.4 + avgConfidence * 0.3 + approvalRate * 0.3;

    // Maturity level
    let level: string;
    if (maturity >= 0.8) level = "sovereign";
    else if (maturity >= 0.6) level = "established";
    else if (maturity >= 0.4) level = "developing";
    else if (maturity >= 0.2) level = "emerging";
    else level = "nascent";

    return {
      capability_key: cap.key,
      description: cap.description,
      skill_count: totalSkills,
      approved_count: approvedSkills,
      avg_strength: round(avgStrength),
      avg_confidence: round(avgConfidence),
      approval_rate: round(approvalRate),
      maturity_score: round(maturity),
      maturity_level: level,
    };
  });

  // Domain breakdown
  const domainMap: Record<string, { total: number; approved: number; avgConfidence: number; confidences: number[] }> = {};
  for (const s of skills) {
    const d = s.domain || "unknown";
    if (!domainMap[d]) domainMap[d] = { total: 0, approved: 0, avgConfidence: 0, confidences: [] };
    domainMap[d].total++;
    if (s.lifecycle_status === "approved") domainMap[d].approved++;
    if (s.confidence != null) domainMap[d].confidences.push(s.confidence);
  }
  const domains = Object.entries(domainMap).map(([name, d]) => ({
    domain: name,
    total_skills: d.total,
    approved_skills: d.approved,
    avg_confidence: d.confidences.length > 0 ? round(d.confidences.reduce((a, b) => a + b, 0) / d.confidences.length) : 0,
  }));

  // Summary metrics
  const totalSkills = skills.length;
  const approvedSkills = skills.filter((s: any) => s.lifecycle_status === "approved").length;
  const totalBindings = bindings.length;
  const uniqueCapabilities = new Set(bindings.map((b: any) => b.capability_key)).size;
  const sovereignCaps = capabilities.filter(c => c.maturity_level === "sovereign").length;
  const avgMaturity = capabilities.length > 0
    ? round(capabilities.reduce((a, c) => a + c.maturity_score, 0) / capabilities.length)
    : 0;

  // Skills without bindings (unbound)
  const boundSkillIds = new Set(bindings.map((b: any) => b.engineering_skill_id));
  const unboundSkills = skills.filter((s: any) => s.lifecycle_status === "approved" && !boundSkillIds.has(s.id)).length;

  return {
    summary: {
      total_skills: totalSkills,
      approved_skills: approvedSkills,
      total_bindings: totalBindings,
      unique_capabilities: uniqueCapabilities,
      sovereign_capabilities: sovereignCaps,
      avg_maturity: avgMaturity,
      unbound_approved_skills: unboundSkills,
      active_bundles: bundles.filter((b: any) => b.status === "active").length,
      total_bundles: bundles.length,
    },
    capabilities: capabilities.sort((a, b) => b.maturity_score - a.maturity_score),
    domains: domains.sort((a, b) => b.total_skills - a.total_skills),
    lifecycle_distribution: {
      approved: approvedSkills,
      pending_review: skills.filter((s: any) => s.lifecycle_status === "pending_review").length,
      extracted: skills.filter((s: any) => s.lifecycle_status === "extracted").length,
      rejected: skills.filter((s: any) => s.lifecycle_status === "rejected").length,
    },
  };
}

// ─── Capability Details ──────────────────────────────────────

async function getCapabilityDetails(sb: any, orgId: string) {
  const [bindingsRes, skillsRes] = await Promise.all([
    sb.from("skill_capabilities").select("*").eq("organization_id", orgId),
    sb.from("engineering_skills").select("id, skill_name, domain, confidence, lifecycle_status, description").eq("organization_id", orgId),
  ]);

  const bindings = bindingsRes.data || [];
  const skills = skillsRes.data || [];
  const skillMap = new Map(skills.map((s: any) => [s.id, s]));

  const capDetails: Record<string, any> = {};
  for (const b of bindings) {
    if (!capDetails[b.capability_key]) {
      capDetails[b.capability_key] = { capability_key: b.capability_key, description: b.capability_description, skills: [] };
    }
    const skill = skillMap.get(b.engineering_skill_id);
    if (skill) {
      capDetails[b.capability_key].skills.push({
        ...skill,
        binding_strength: b.strength,
      });
    }
  }

  return { capabilities: Object.values(capDetails) };
}

// ─── Gap Analysis ────────────────────────────────────────────

const EXPECTED_CAPABILITY_DOMAINS = [
  "code_generation", "code_review", "testing", "architecture",
  "documentation", "security", "deployment", "monitoring",
  "data_modeling", "api_design", "performance", "accessibility",
  "error_handling", "refactoring", "devops",
];

async function getGapAnalysis(sb: any, orgId: string) {
  const [bindingsRes, skillsRes] = await Promise.all([
    sb.from("skill_capabilities").select("capability_key, strength").eq("organization_id", orgId),
    sb.from("engineering_skills").select("id, domain, confidence, lifecycle_status, updated_at").eq("organization_id", orgId),
  ]);

  const bindings = bindingsRes.data || [];
  const skills = skillsRes.data || [];

  // Covered domains
  const coveredDomains = new Set(bindings.map((b: any) => {
    const parts = b.capability_key.split(".");
    return parts[0] || b.capability_key;
  }));

  const gaps = EXPECTED_CAPABILITY_DOMAINS
    .filter(d => !coveredDomains.has(d))
    .map(d => ({ domain: d, status: "missing", recommendation: `No skills bound to ${d} capabilities. Consider extracting or acquiring.` }));

  // Weak capabilities (avg strength < 0.4)
  const capStrengths: Record<string, number[]> = {};
  for (const b of bindings) {
    if (!capStrengths[b.capability_key]) capStrengths[b.capability_key] = [];
    capStrengths[b.capability_key].push(b.strength || 0);
  }
  const weakCaps = Object.entries(capStrengths)
    .map(([key, strengths]) => ({ key, avg: strengths.reduce((a, b) => a + b, 0) / strengths.length }))
    .filter(c => c.avg < 0.4)
    .map(c => ({ capability_key: c.key, avg_strength: round(c.avg), status: "weak", recommendation: `Capability "${c.key}" has low average strength (${(c.avg * 100).toFixed(0)}%). Needs reinforcement.` }));

  // Stale skills (not updated in 90+ days)
  const now = Date.now();
  const staleThreshold = 90 * 24 * 60 * 60 * 1000;
  const staleSkills = skills
    .filter((s: any) => s.lifecycle_status === "approved" && s.updated_at && (now - new Date(s.updated_at).getTime()) > staleThreshold)
    .map((s: any) => ({ skill_id: s.id, domain: s.domain, days_since_update: Math.floor((now - new Date(s.updated_at).getTime()) / (24 * 60 * 60 * 1000)) }));

  return {
    missing_domains: gaps,
    weak_capabilities: weakCaps,
    stale_skills: staleSkills,
    coverage_score: round(1 - gaps.length / EXPECTED_CAPABILITY_DOMAINS.length),
    health_score: round(1 - (weakCaps.length / Math.max(Object.keys(capStrengths).length, 1))),
  };
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
