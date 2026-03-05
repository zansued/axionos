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
  -- Check ownership / admin role
  SELECT organization_id INTO _org_id FROM initiatives WHERE id = p_initiative_id;
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Initiative not found';
  END IF;

  _user_role := get_user_org_role(auth.uid(), _org_id);
  IF _user_role IS NULL OR _user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owners/admins can delete initiatives';
  END IF;

  -- Delete stories and their children (phases cascade to subtasks)
  DELETE FROM story_phases WHERE story_id IN (
    SELECT id FROM stories WHERE initiative_id = p_initiative_id
  );
  DELETE FROM stories WHERE initiative_id = p_initiative_id;

  -- Delete agent_outputs and their cascade children (code_artifacts, content_documents, adrs, validation_runs, artifact_reviews)
  DELETE FROM agent_outputs WHERE initiative_id = p_initiative_id;

  -- Delete agent_memory linked to initiative
  DELETE FROM agent_memory WHERE initiative_id = p_initiative_id;

  -- Delete knowledge base entries linked to initiative  
  UPDATE org_knowledge_base SET source_initiative_id = NULL WHERE source_initiative_id = p_initiative_id;

  -- initiative_jobs, agent_messages, squads (+ squad_members) cascade automatically
  -- Finally delete the initiative itself
  DELETE FROM initiatives WHERE id = p_initiative_id;
END;
$$;