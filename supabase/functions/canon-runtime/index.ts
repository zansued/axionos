import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildRetrievalFilters, defaultRetrievalQuery } from "../_shared/canon-runtime/canon-runtime-retriever.ts";
import { buildCanonContext } from "../_shared/canon-runtime/canon-context-builder.ts";
import { rankEntries } from "../_shared/canon-runtime/canon-applicability-ranker.ts";
import { buildRetrievalFeedback } from "../_shared/canon-runtime/canon-retrieval-feedback.ts";
import { explainCanonRuntime, explainRetrievalSession } from "../_shared/canon-runtime/canon-runtime-explainer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { action, organization_id, payload } = await req.json();

    switch (action) {
      // ── Start Retrieval Session ──
      case "start_session": {
        const context = buildCanonContext(payload);
        const { data: session, error } = await supabase.from("canon_retrieval_sessions").insert({
          organization_id,
          agent_id: payload.agent_id || "",
          agent_type: payload.agent_type || "",
          task_type: payload.task_type || "",
          task_context: payload.task_context || {},
          retrieval_reason: payload.retrieval_reason || "",
          session_status: "active",
        }).select().single();
        if (error) throw error;

        // Store context
        await supabase.from("canon_retrieval_contexts").insert({
          organization_id,
          context_label: context.context_label,
          context_type: payload.task_type || "task",
          required_domains: context.required_domains,
          optional_domains: context.optional_domains,
          required_practice_types: context.required_practice_types,
          fallback_posture: context.fallback_posture,
          confidence_threshold: context.confidence_threshold,
          max_entries: context.max_entries,
        });

        return json({ session, context });
      }

      // ── Query Canon ──
      case "query": {
        const query = { ...defaultRetrievalQuery(), ...payload.query };
        const filters = buildRetrievalFilters(query);

        // Build Supabase query
        let dbQuery = supabase.from("canon_entries").select("id, title, practice_type, stack_scope, topic, confidence_score, anti_pattern_flag, applicability_scope, summary")
          .eq("organization_id", organization_id)
          .in("lifecycle_status", ["approved", "experimental"])
          .neq("lifecycle_status", "deprecated")
          .neq("lifecycle_status", "superseded");

        if (query.domain) dbQuery = dbQuery.eq("stack_scope", query.domain);
        if (query.stack) dbQuery = dbQuery.eq("stack_scope", query.stack);
        if (query.practice_type) dbQuery = dbQuery.eq("practice_type", query.practice_type);
        if (query.topic) dbQuery = dbQuery.eq("topic", query.topic);
        if (query.min_confidence) dbQuery = dbQuery.gte("confidence_score", query.min_confidence);

        const { data: entries, error } = await dbQuery.limit(query.max_results || 10);
        if (error) throw error;

        // Rank results
        const ranked = rankEntries(entries || [], {
          target_stack: query.stack || query.domain,
          target_topic: query.topic,
          target_practice_types: query.practice_type ? [query.practice_type] : undefined,
        });

        // Log query
        if (payload.session_id) {
          const { data: queryRecord } = await supabase.from("canon_retrieval_queries").insert({
            organization_id,
            session_id: payload.session_id,
            query_type: query.domain ? "domain" : query.practice_type ? "practice_type" : "general",
            query_params: query,
            domain_filter: query.domain,
            stack_filter: query.stack,
            practice_type_filter: query.practice_type,
            task_type_filter: query.task_type,
            results_count: ranked.length,
          }).select().single();

          // Log results
          if (queryRecord && ranked.length > 0) {
            const resultRows = ranked.map(r => ({
              organization_id,
              query_id: queryRecord.id,
              session_id: payload.session_id,
              entry_id: r.entry_id,
              relevance_score: r.relevance_score,
              applicability_score: r.applicability_score,
            }));
            await supabase.from("canon_retrieval_results").insert(resultRows);
          }

          // Update session
          await supabase.from("canon_retrieval_sessions").update({
            entries_retrieved: ranked.length,
          }).eq("id", payload.session_id);
        }

        return json({ entries: ranked, total: ranked.length });
      }

      // ── Record Application ──
      case "record_application": {
        const { error } = await supabase.from("canon_runtime_applications").insert({
          organization_id,
          session_id: payload.session_id,
          entry_id: payload.entry_id,
          agent_id: payload.agent_id || "",
          agent_type: payload.agent_type || "",
          application_type: payload.application_type || "guidance",
          application_context: payload.application_context || {},
          outcome_status: "applied",
          confidence_at_application: payload.confidence || 0,
        });
        if (error) throw error;

        // Update session applied count
        if (payload.session_id) {
          const { data: session } = await supabase.from("canon_retrieval_sessions").select("entries_applied").eq("id", payload.session_id).single();
          if (session) {
            await supabase.from("canon_retrieval_sessions").update({
              entries_applied: (session.entries_applied || 0) + 1,
            }).eq("id", payload.session_id);
          }
        }

        return json({ success: true });
      }

      // ── Complete Session ──
      case "complete_session": {
        const { error } = await supabase.from("canon_retrieval_sessions").update({
          session_status: "completed",
          completed_at: new Date().toISOString(),
          duration_ms: payload.duration_ms,
        }).eq("id", payload.session_id);
        if (error) throw error;
        return json({ success: true });
      }

      // ── Submit Feedback ──
      case "submit_feedback": {
        const result = buildRetrievalFeedback(payload);
        if (!result.valid) return json({ error: "Validation failed", errors: result.errors }, 400);
        const { error } = await supabase.from("canon_retrieval_feedback").insert({ organization_id, ...result.record });
        if (error) throw error;
        return json({ success: true });
      }

      // ── List Sessions ──
      case "list_sessions": {
        let query = supabase.from("canon_retrieval_sessions").select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false });
        if (payload?.agent_type) query = query.eq("agent_type", payload.agent_type);
        if (payload?.session_status) query = query.eq("session_status", payload.session_status);
        const { data, error } = await query.limit(50);
        if (error) throw error;
        return json(data);
      }

      // ── List Applications ──
      case "list_applications": {
        let query = supabase.from("canon_runtime_applications").select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false });
        if (payload?.agent_type) query = query.eq("agent_type", payload.agent_type);
        const { data, error } = await query.limit(100);
        if (error) throw error;
        return json(data);
      }

      // ── List Feedback ──
      case "list_feedback": {
        const { data, error } = await supabase.from("canon_retrieval_feedback").select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return json(data);
      }

      // ── Explain ──
      case "explain": {
        const info = explainCanonRuntime();
        if (payload?.session_id) {
          const { data: session } = await supabase.from("canon_retrieval_sessions").select("*").eq("id", payload.session_id).single();
          if (session) {
            const narrative = explainRetrievalSession(session.entries_retrieved, session.entries_applied, session.session_status);
            return json({ ...info, narrative });
          }
        }
        return json(info);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
