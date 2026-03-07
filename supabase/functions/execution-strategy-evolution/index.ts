import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return errorResponse("Unauthorized", 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  const { action, organizationId } = body;

  if (!organizationId) return errorResponse("organizationId required", 400);

  try {
    switch (action) {
      case "overview": {
        const [familiesRes, variantsRes, experimentsRes, outcomesRes] = await Promise.all([
          supabase.from("execution_strategy_families").select("*").eq("organization_id", organizationId),
          supabase.from("execution_strategy_variants").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(50),
          supabase.from("execution_strategy_experiments").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(30),
          supabase.from("execution_strategy_outcomes").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100),
        ]);
        return jsonResponse({
          families: familiesRes.data || [],
          variants: variantsRes.data || [],
          experiments: experimentsRes.data || [],
          outcomes: outcomesRes.data || [],
          summary: {
            total_families: (familiesRes.data || []).length,
            active_families: (familiesRes.data || []).filter((f: any) => f.status === "active").length,
            total_variants: (variantsRes.data || []).length,
            active_experiments: (experimentsRes.data || []).filter((e: any) => e.status === "active").length,
            total_outcomes: (outcomesRes.data || []).length,
          },
        });
      }

      case "families": {
        const { data } = await supabase.from("execution_strategy_families").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
        return jsonResponse({ families: data || [] });
      }

      case "variants": {
        const { data } = await supabase.from("execution_strategy_variants").select("*, execution_strategy_families(strategy_family_key, strategy_family_name)").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(50);
        return jsonResponse({ variants: data || [] });
      }

      case "experiments": {
        const { data } = await supabase.from("execution_strategy_experiments").select("*, execution_strategy_variants(hypothesis, confidence_score)").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(30);
        return jsonResponse({ experiments: data || [] });
      }

      case "outcomes": {
        const { experimentId } = body;
        let q = supabase.from("execution_strategy_outcomes").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100);
        if (experimentId) q = q.eq("experiment_id", experimentId);
        const { data } = await q;
        return jsonResponse({ outcomes: data || [] });
      }

      case "explain": {
        const { variantId } = body;
        if (!variantId) return errorResponse("variantId required", 400);
        const { data: variant } = await supabase.from("execution_strategy_variants").select("*, execution_strategy_families(*)").eq("id", variantId).single();
        if (!variant) return errorResponse("Variant not found", 404);
        const { data: experiments } = await supabase.from("execution_strategy_experiments").select("*").eq("strategy_variant_id", variantId);
        const expIds = (experiments || []).map((e: any) => e.id);
        let outcomes: any[] = [];
        if (expIds.length > 0) {
          const { data } = await supabase.from("execution_strategy_outcomes").select("*").in("experiment_id", expIds);
          outcomes = data || [];
        }
        return jsonResponse({
          variant,
          experiments: experiments || [],
          outcomes,
          explainability: {
            what_changed: variant.mutation_delta,
            why_proposed: variant.hypothesis,
            baseline: variant.baseline_definition,
            variant_def: variant.variant_definition,
            confidence: variant.confidence_score,
            advisory_first: true,
          },
        });
      }

      case "review_variant": {
        const { variantId, decision } = body;
        if (!variantId || !decision) return errorResponse("variantId and decision required", 400);
        const newStatus = decision === "approve" ? "approved" : "rejected";
        await supabase.from("execution_strategy_variants").update({ status: newStatus }).eq("id", variantId);
        return jsonResponse({ success: true, status: newStatus });
      }

      case "start_experiment": {
        const { variantId } = body;
        if (!variantId) return errorResponse("variantId required", 400);
        const { data: variant } = await supabase.from("execution_strategy_variants").select("*, execution_strategy_families(*)").eq("id", variantId).single();
        if (!variant) return errorResponse("Variant not found", 404);
        if (variant.status !== "approved") return errorResponse("Variant must be approved first", 400);
        const family = (variant as any).execution_strategy_families;
        const { data: exp } = await supabase.from("execution_strategy_experiments").insert({
          organization_id: organizationId,
          strategy_variant_id: variantId,
          strategy_family_id: variant.strategy_family_id,
          baseline_definition: variant.baseline_definition,
          variant_definition: variant.variant_definition,
          experiment_cap: { max_executions: 50 },
          assignment_mode: family?.rollout_mode === "bounded_experiment" ? "bounded_experiment" : "manual",
          status: "active",
        }).select().single();
        await supabase.from("execution_strategy_variants").update({ status: "active_experiment" }).eq("id", variantId);
        return jsonResponse({ success: true, experiment: exp });
      }

      case "stop_experiment": {
        const { experimentId } = body;
        if (!experimentId) return errorResponse("experimentId required", 400);
        await supabase.from("execution_strategy_experiments").update({ status: "completed" }).eq("id", experimentId);
        return jsonResponse({ success: true });
      }

      case "rollback_variant": {
        const { variantId } = body;
        if (!variantId) return errorResponse("variantId required", 400);
        await supabase.from("execution_strategy_variants").update({ status: "rolled_back" }).eq("id", variantId);
        const { data: exps } = await supabase.from("execution_strategy_experiments").select("id").eq("strategy_variant_id", variantId).in("status", ["active", "paused"]);
        for (const exp of (exps || [])) {
          await supabase.from("execution_strategy_experiments").update({ status: "rolled_back" }).eq("id", exp.id);
        }
        return jsonResponse({ success: true });
      }

      case "recompute": {
        // Placeholder: in production, this would trigger signal interpretation + variant synthesis
        return jsonResponse({ success: true, message: "Recomputation triggered" });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (e: any) {
    console.error("Execution Strategy Evolution error:", e);
    return errorResponse(e.message, 500);
  }
});
