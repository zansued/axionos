CREATE OR REPLACE FUNCTION public.delete_initiative_cascade(p_initiative_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _user_role org_role;
BEGIN
  SELECT organization_id INTO _org_id FROM initiatives WHERE id = p_initiative_id;
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Initiative not found';
  END IF;

  _user_role := get_user_org_role(auth.uid(), _org_id);
  IF _user_role IS NULL OR _user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owners/admins can delete initiatives';
  END IF;

  -- Delete story children first, then stories
  DELETE FROM story_phases WHERE story_id IN (SELECT id FROM stories WHERE initiative_id = p_initiative_id);
  DELETE FROM story_subtasks WHERE story_id IN (SELECT id FROM stories WHERE initiative_id = p_initiative_id);
  DELETE FROM stories WHERE initiative_id = p_initiative_id;

  -- Delete brain data
  DELETE FROM project_brain_edges WHERE initiative_id = p_initiative_id;
  DELETE FROM project_brain_nodes WHERE initiative_id = p_initiative_id;
  DELETE FROM project_decisions WHERE initiative_id = p_initiative_id;
  DELETE FROM project_errors WHERE initiative_id = p_initiative_id;
  DELETE FROM project_prevention_rules WHERE initiative_id = p_initiative_id;

  -- Agent-related
  DELETE FROM agent_outputs WHERE initiative_id = p_initiative_id;
  DELETE FROM agent_memory WHERE initiative_id = p_initiative_id;
  DELETE FROM agent_messages WHERE initiative_id = p_initiative_id;

  -- Pipeline & jobs
  DELETE FROM pipeline_subjobs WHERE initiative_id = p_initiative_id;
  DELETE FROM initiative_jobs WHERE initiative_id = p_initiative_id;
  DELETE FROM distributed_jobs WHERE initiative_id = p_initiative_id;
  DELETE FROM orchestration_campaigns WHERE initiative_id = p_initiative_id;

  -- Observability & repair
  DELETE FROM initiative_observability WHERE initiative_id = p_initiative_id;
  DELETE FROM repair_evidence WHERE initiative_id = p_initiative_id;
  DELETE FROM prevention_events WHERE initiative_id = p_initiative_id;
  DELETE FROM repair_routing_log WHERE initiative_id = p_initiative_id;
  DELETE FROM learning_records WHERE initiative_id = p_initiative_id;
  DELETE FROM ai_prompt_cache WHERE initiative_id = p_initiative_id;
  DELETE FROM prompt_variant_executions WHERE initiative_id = p_initiative_id;

  -- Delivery & deploy
  DELETE FROM delivery_orchestration_instances WHERE initiative_id = p_initiative_id;
  DELETE FROM deploy_assurance_assessments WHERE initiative_id = p_initiative_id;
  DELETE FROM delivery_output_views WHERE initiative_id = p_initiative_id;
  DELETE FROM deploy_recovery_states WHERE initiative_id = p_initiative_id;
  DELETE FROM delivery_assurance_outcomes WHERE initiative_id = p_initiative_id;
  DELETE FROM delivery_outcome_records WHERE initiative_id = p_initiative_id;
  DELETE FROM post_deploy_feedback_signals WHERE initiative_id = p_initiative_id;
  DELETE FROM delivery_reliability_postures WHERE initiative_id = p_initiative_id;
  DELETE FROM outcome_assurance_postures WHERE initiative_id = p_initiative_id;

  -- Adoption & journey
  DELETE FROM user_journey_instances WHERE initiative_id = p_initiative_id;
  DELETE FROM onboarding_outcomes WHERE initiative_id = p_initiative_id;
  DELETE FROM customer_success_signals WHERE initiative_id = p_initiative_id;
  DELETE FROM adoption_journey_events WHERE initiative_id = p_initiative_id;
  DELETE FROM adoption_outcomes WHERE initiative_id = p_initiative_id;

  -- Improvement & governance
  DELETE FROM improvement_evidence WHERE initiative_id = p_initiative_id;
  DELETE FROM agent_routing_decisions WHERE initiative_id = p_initiative_id;
  DELETE FROM agent_debate_sessions WHERE initiative_id = p_initiative_id;
  DELETE FROM agent_working_memory_contexts WHERE initiative_id = p_initiative_id;
  DELETE FROM swarm_execution_campaigns WHERE initiative_id = p_initiative_id;

  -- Squads & knowledge
  DELETE FROM squads WHERE initiative_id = p_initiative_id;
  UPDATE org_knowledge_base SET source_initiative_id = NULL WHERE source_initiative_id = p_initiative_id;

  -- Finally delete the initiative
  DELETE FROM initiatives WHERE id = p_initiative_id;
END;
$$;