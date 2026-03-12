/**
 * Sprint 96 — Doctrine & Playbook Synthesis (Auth hardened Sprint 197)
 * Block T: Governed Intelligence OS
 *
 * Actions: list, detail, explain, synthesize, review, archive, mark_active, stats
 *
 * Invariants: advisory-first, tenant isolation, no autonomous mutation, auditable
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

interface RequestBody {
  action: string;
  organization_id: string;
  workspace_id?: string;
  doctrine_id?: string;
  filters?: {
    doctrine_type?: string;
    lifecycle_status?: string;
    recommendation_strength?: string;
    min_confidence?: number;
    limit?: number;
    offset?: number;
  };
  synthesis_input?: {
    memory_ids: string[];
    doctrine_type: string;
    doctrine_title: string;
    doctrine_description: string;
    target_role?: string;
    target_surface?: string;
    applicability_summary?: string;
    exceptions_caveats?: string;
  };
  review_input?: {
    review_action: string;
    review_notes: string;
    confidence_adjustment?: number;
    strength_recommendation?: string;
  };
}

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // Auth hardening — Sprint 197
    const authResult = await authenticateWithRateLimit(req, "doctrine-synthesis");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const body: RequestBody = await req.json();
    const { action, organization_id: payloadOrgId } = body;

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organization_id) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(supabase, {
      organization_id, actor_id: user.id,
      function_name: "doctrine-synthesis", action: action || "unknown",
    });

    // ─── LIST ─────────────────────────────────────────────────────────
    if (action === "list") {
      const f = body.filters || {};
      let query = supabase
        .from("institutional_doctrines")
        .select("*")
        .eq("organization_id", organization_id)
        .order("updated_at", { ascending: false })
        .limit(f.limit || 50);

      if (f.doctrine_type) query = query.eq("doctrine_type", f.doctrine_type);
      if (f.lifecycle_status) query = query.eq("lifecycle_status", f.lifecycle_status);
      if (f.recommendation_strength) query = query.eq("recommendation_strength", f.recommendation_strength);
      if (f.min_confidence) query = query.gte("confidence_score", f.min_confidence);
      if (f.offset) query = query.range(f.offset, f.offset + (f.limit || 50) - 1);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ doctrines: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DETAIL ───────────────────────────────────────────────────────
    if (action === "detail") {
      const { doctrine_id } = body;
      if (!doctrine_id) throw new Error("doctrine_id required");

      const [docRes, linksRes, rulesRes, reviewsRes] = await Promise.all([
        supabase
          .from("institutional_doctrines")
          .select("*")
          .eq("id", doctrine_id)
          .eq("organization_id", organization_id)
          .single(),
        supabase
          .from("doctrine_memory_links")
          .select("*, institutional_memories(id, memory_title, memory_type, confidence_score)")
          .eq("doctrine_id", doctrine_id)
          .eq("organization_id", organization_id)
          .order("contribution_weight", { ascending: false }),
        supabase
          .from("doctrine_applicability_rules")
          .select("*")
          .eq("doctrine_id", doctrine_id)
          .eq("organization_id", organization_id)
          .order("priority", { ascending: false }),
        supabase
          .from("doctrine_reviews")
          .select("*")
          .eq("doctrine_id", doctrine_id)
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (docRes.error) throw docRes.error;

      return new Response(
        JSON.stringify({
          doctrine: docRes.data,
          memory_links: linksRes.data || [],
          applicability_rules: rulesRes.data || [],
          reviews: reviewsRes.data || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── EXPLAIN ──────────────────────────────────────────────────────
    if (action === "explain") {
      const { doctrine_id } = body;
      if (!doctrine_id) throw new Error("doctrine_id required");

      const { data: doctrine } = await supabase
        .from("institutional_doctrines")
        .select("*")
        .eq("id", doctrine_id)
        .eq("organization_id", organization_id)
        .single();

      if (!doctrine) throw new Error("Doctrine not found");

      const { data: links } = await supabase
        .from("doctrine_memory_links")
        .select("*, institutional_memories(memory_title, memory_type, confidence_score, recurrence_count)")
        .eq("doctrine_id", doctrine_id)
        .eq("organization_id", organization_id);

      const memoryDetails = (links || []).map((l: any) => ({
        title: l.institutional_memories?.memory_title || "Unknown",
        type: l.institutional_memories?.memory_type || "unknown",
        confidence: l.institutional_memories?.confidence_score || 0,
        recurrence: l.institutional_memories?.recurrence_count || 0,
        contribution: l.contribution_type,
        weight: l.contribution_weight,
      }));

      const strengthLabel: Record<string, string> = {
        weak_suggestion: "Weak suggestion — limited evidence",
        moderate_recommendation: "Moderate recommendation — reasonable evidence",
        strong_recommendation: "Strong recommendation — significant evidence",
        canonical_doctrine: "Canonical doctrine — well-established pattern",
      };

      const explanation = {
        summary: `${doctrine.doctrine_title}: ${doctrine.doctrine_description}`,
        why_exists: `This doctrine was synthesized from ${doctrine.contributing_memory_count} institutional memories that showed a recurring pattern in the ${doctrine.doctrine_type.replace(/_/g, " ")} domain.`,
        supporting_memories: memoryDetails,
        where_applies: doctrine.applicability_summary || "General applicability within scope.",
        strength: strengthLabel[doctrine.recommendation_strength] || doctrine.recommendation_strength,
        confidence: {
          score: doctrine.confidence_score,
          interpretation: doctrine.confidence_score >= 0.8 ? "High confidence" : doctrine.confidence_score >= 0.5 ? "Moderate confidence" : "Low confidence — needs more evidence",
        },
        caveats: doctrine.exceptions_caveats || "No explicit caveats documented.",
        scope: doctrine.doctrine_scope,
        target_role: doctrine.target_role,
        target_surface: doctrine.target_surface,
      };

      return new Response(JSON.stringify({ explanation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SYNTHESIZE ───────────────────────────────────────────────────
    if (action === "synthesize") {
      const input = body.synthesis_input;
      if (!input || !input.memory_ids?.length) throw new Error("synthesis_input with memory_ids required");

      // Fetch contributing memories
      const { data: memories } = await supabase
        .from("institutional_memories")
        .select("id, memory_title, memory_type, confidence_score, recurrence_count, reuse_potential")
        .in("id", input.memory_ids)
        .eq("organization_id", organization_id);

      if (!memories || memories.length === 0) throw new Error("No valid memories found");

      // Calculate aggregate confidence
      const avgConfidence = memories.reduce((s: number, m: any) => s + (m.confidence_score || 0), 0) / memories.length;
      const avgRecurrence = memories.reduce((s: number, m: any) => s + (m.recurrence_count || 0), 0) / memories.length;

      // Determine recommendation strength
      let strength = "weak_suggestion";
      if (avgConfidence >= 0.8 && avgRecurrence >= 5) strength = "canonical_doctrine";
      else if (avgConfidence >= 0.65 && avgRecurrence >= 3) strength = "strong_recommendation";
      else if (avgConfidence >= 0.45) strength = "moderate_recommendation";

      const doctrineKey = `doctrine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const { data: doctrine, error: insertErr } = await supabase
        .from("institutional_doctrines")
        .insert({
          organization_id,
          workspace_id: body.workspace_id || null,
          doctrine_key: doctrineKey,
          doctrine_title: input.doctrine_title,
          doctrine_description: input.doctrine_description,
          doctrine_type: input.doctrine_type,
          doctrine_scope: "workspace",
          target_role: input.target_role || "operator",
          target_surface: input.target_surface || "workspace_governance",
          recommendation_strength: strength,
          confidence_score: avgConfidence,
          contributing_memory_count: memories.length,
          applicability_summary: input.applicability_summary || "",
          exceptions_caveats: input.exceptions_caveats || null,
          lifecycle_status: "candidate",
          review_status: "pending",
          synthesis_metadata: {
            source_memory_ids: input.memory_ids,
            avg_recurrence: avgRecurrence,
            synthesized_at: new Date().toISOString(),
          },
          audit_metadata: { created_by: "doctrine-synthesis-engine", version: "96.0" },
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Create memory links
      const links = memories.map((m: any) => ({
        organization_id,
        doctrine_id: doctrine.id,
        memory_id: m.id,
        contribution_type: "supporting",
        contribution_weight: m.confidence_score || 0.5,
      }));

      await supabase.from("doctrine_memory_links").insert(links);

      return new Response(JSON.stringify({ doctrine, links_created: links.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── REVIEW ───────────────────────────────────────────────────────
    if (action === "review") {
      const { doctrine_id } = body;
      const input = body.review_input;
      if (!doctrine_id || !input) throw new Error("doctrine_id and review_input required");

      const authHeader = req.headers.get("Authorization");
      let reviewerId = null;
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        reviewerId = user?.id || null;
      }

      const { error: reviewErr } = await supabase.from("doctrine_reviews").insert({
        organization_id,
        doctrine_id,
        reviewer_id: reviewerId,
        review_action: input.review_action,
        review_notes: input.review_notes,
        confidence_adjustment: input.confidence_adjustment || null,
        strength_recommendation: input.strength_recommendation || null,
      });

      if (reviewErr) throw reviewErr;

      // Update doctrine review status
      const updates: any = { review_status: input.review_action === "approve" ? "approved" : input.review_action === "reject" ? "rejected" : "reviewed", updated_at: new Date().toISOString() };
      if (input.review_action === "approve") updates.lifecycle_status = "active";
      if (input.confidence_adjustment) updates.confidence_score = input.confidence_adjustment;

      await supabase.from("institutional_doctrines").update(updates).eq("id", doctrine_id).eq("organization_id", organization_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ARCHIVE ──────────────────────────────────────────────────────
    if (action === "archive") {
      const { doctrine_id } = body;
      if (!doctrine_id) throw new Error("doctrine_id required");

      await supabase
        .from("institutional_doctrines")
        .update({ lifecycle_status: "archived", updated_at: new Date().toISOString() })
        .eq("id", doctrine_id)
        .eq("organization_id", organization_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MARK ACTIVE ──────────────────────────────────────────────────
    if (action === "mark_active") {
      const { doctrine_id } = body;
      if (!doctrine_id) throw new Error("doctrine_id required");

      await supabase
        .from("institutional_doctrines")
        .update({ lifecycle_status: "active", review_status: "approved", updated_at: new Date().toISOString() })
        .eq("id", doctrine_id)
        .eq("organization_id", organization_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── STATS ────────────────────────────────────────────────────────
    if (action === "stats") {
      const { data: all } = await supabase
        .from("institutional_doctrines")
        .select("id, doctrine_type, lifecycle_status, recommendation_strength, confidence_score, review_status")
        .eq("organization_id", organization_id);

      const doctrines = all || [];
      const byType: Record<string, number> = {};
      const byLifecycle: Record<string, number> = {};
      const byStrength: Record<string, number> = {};

      for (const d of doctrines) {
        byType[d.doctrine_type] = (byType[d.doctrine_type] || 0) + 1;
        byLifecycle[d.lifecycle_status] = (byLifecycle[d.lifecycle_status] || 0) + 1;
        byStrength[d.recommendation_strength] = (byStrength[d.recommendation_strength] || 0) + 1;
      }

      const stats = {
        total: doctrines.length,
        active: doctrines.filter((d: any) => d.lifecycle_status === "active").length,
        high_confidence: doctrines.filter((d: any) => d.confidence_score >= 0.75).length,
        canonical: doctrines.filter((d: any) => d.recommendation_strength === "canonical_doctrine").length,
        pending_review: doctrines.filter((d: any) => d.review_status === "pending").length,
        by_type: byType,
        by_lifecycle: byLifecycle,
        by_strength: byStrength,
      };

      return new Response(JSON.stringify({ stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("doctrine-synthesis error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
