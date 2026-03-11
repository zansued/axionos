import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { synthesizeLearning } from "../_shared/purple-learning/purple-learning-synthesizer.ts";
import { buildPattern } from "../_shared/purple-learning/security-pattern-builder.ts";
import { detectAntiPatterns } from "../_shared/purple-learning/security-anti-pattern-detector.ts";
import { generateSecureDevFeedback } from "../_shared/purple-learning/secure-dev-feedback-engine.ts";
import { explainSecurityCanon } from "../_shared/purple-learning/security-canon-explainer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { action, ...params } = await req.json();
    const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    switch (action) {
      case "overview": {
        const [candidates, patterns, antiPatterns, checklists, rules, reviews] = await Promise.all([
          supabase.from("security_canon_candidates").select("*", { count: "exact", head: true }),
          supabase.from("security_pattern_entries").select("*", { count: "exact", head: true }),
          supabase.from("security_anti_patterns").select("*", { count: "exact", head: true }),
          supabase.from("secure_development_checklists").select("*", { count: "exact", head: true }),
          supabase.from("security_validation_rules").select("*", { count: "exact", head: true }),
          supabase.from("purple_learning_reviews").select("*", { count: "exact", head: true }).eq("decision", "pending"),
        ]);
        return json({
          total_candidates: candidates.count ?? 0,
          total_patterns: patterns.count ?? 0,
          total_anti_patterns: antiPatterns.count ?? 0,
          total_checklists: checklists.count ?? 0,
          total_rules: rules.count ?? 0,
          pending_reviews: reviews.count ?? 0,
        });
      }

      case "list_candidates": {
        const { data, error } = await supabase.from("security_canon_candidates").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ candidates: data });
      }

      case "list_patterns": {
        const { data, error } = await supabase.from("security_pattern_entries").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ patterns: data });
      }

      case "list_anti_patterns": {
        const { data, error } = await supabase.from("security_anti_patterns").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ anti_patterns: data });
      }

      case "list_checklists": {
        const { data, error } = await supabase.from("secure_development_checklists").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ checklists: data });
      }

      case "list_rules": {
        const { data, error } = await supabase.from("security_validation_rules").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ rules: data });
      }

      case "list_reviews": {
        const { data, error } = await supabase.from("purple_learning_reviews").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ reviews: data });
      }

      case "synthesize": {
        const candidates = synthesizeLearning({
          incident_type: params.incident_type ?? "contract_anomaly",
          severity: params.severity ?? "medium",
          target_surface: params.target_surface ?? "general",
          what_resisted: params.what_resisted ?? [],
          what_failed: params.what_failed ?? [],
          what_was_fragile: params.what_was_fragile ?? [],
          response_actions: params.response_actions ?? [],
          threat_domain: params.threat_domain ?? "unknown",
        });
        const patterns = candidates.map(c => buildPattern(c));
        const antiPatterns = detectAntiPatterns({
          failed_items: params.what_failed ?? [],
          fragile_items: params.what_was_fragile ?? [],
          incident_type: params.incident_type ?? "contract_anomaly",
          severity: params.severity ?? "medium",
        });
        return json({ candidates, patterns, anti_patterns: antiPatterns });
      }

      case "get_secure_dev_feedback": {
        const feedback = generateSecureDevFeedback({
          agent_type: params.agent_type ?? "BuildAgent",
          task_domain: params.task_domain ?? "general",
          stack: params.stack,
        });
        return json({ feedback });
      }

      case "explain_pattern": {
        const explanation = explainSecurityCanon({
          pattern_type: params.pattern_type ?? "secure_implementation_pattern",
          title: params.title ?? "",
          summary: params.summary ?? "",
          agent_types: params.agent_types ?? [],
          confidence_score: params.confidence_score ?? 0,
          status: params.status ?? "active",
        });
        return json({ explanation });
      }

      default:
        return json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
