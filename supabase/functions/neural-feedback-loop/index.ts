import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { signalType, outcome, payload, orgId, initiativeId } = await req.json();

    console.log(`[NeuralFeedback] Processing signal: ${signalType} for org: ${orgId}`);

    // 1. Instant Intelligence Extraction (AI-powered)
    // We analyze the outcome TO LEARN immediately
    const learningPrompt = `
    Analyze this execution outcome and distill a canonical engineering rule.
    Outcome: ${outcome}
    Payload: ${JSON.stringify(payload)}
    
    Return JSON:
    {
      "pattern_name": "Short name",
      "rule_description": "Precise rule",
      "confidence_boost": 0.3, 
      "canon_category": "architectural_decision|implementation_pattern|anti_pattern"
    }
    `;

    const aiLearning = await callAI(
      Deno.env.get("OPENAI_API_KEY") || "",
      "You are the AxionOS Canon Intelligence Distiller.",
      learningPrompt,
      true // jsonMode
    );

    const learned = JSON.parse(aiLearning.content);

    // 2. Reinforcement: Update or Create Learning Candidate
    // We look for existing candidates to reinforce
    const { data: existing } = await supabaseClient
      .from("learning_candidates")
      .select("id, confidence_score, signal_count")
      .eq("organization_id", orgId)
      .eq("title", learned.pattern_name)
      .maybeSingle();

    if (existing) {
      const newConfidence = Math.min(100, existing.confidence_score + (learned.confidence_boost * 100));
      await supabaseClient
        .from("learning_candidates")
        .update({
          confidence_score: newConfidence,
          signal_count: existing.signal_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      await supabaseClient.from("learning_candidates").insert({
        organization_id: orgId,
        initiative_id: initiativeId,
        title: learned.pattern_name,
        summary: learned.rule_description,
        proposed_practice_type: learned.canon_category,
        confidence_score: 50, // Initial boost for successful outcomes
        signal_count: 1,
        source_type: "neural_feedback",
        review_status: "pending"
      });
    }

    // 3. Emit Learning Signal for UI
    await supabaseClient.from("operational_learning_signals").insert({
      organization_id: orgId,
      initiative_id: initiativeId,
      signal_type: signalType,
      outcome: outcome,
      outcome_success: true,
      payload: payload
    });

    return jsonResponse({
      message: "Neural Feedback processed and learning reinforced.",
      learned_pattern: learned.pattern_name,
      confidence_boost: learned.confidence_boost
    }, 200, req);

  } catch (error) {
    console.error("[NeuralFeedback] Error:", error);
    return errorResponse(error.message, 500, req);
  }
});
