
CREATE TABLE public.initiative_observability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  pipeline_success_rate numeric NOT NULL DEFAULT 0,
  build_success_rate numeric NOT NULL DEFAULT 0,
  deploy_success_rate numeric NOT NULL DEFAULT 0,
  time_idea_to_repo_seconds integer,
  time_idea_to_deploy_seconds integer,
  cost_per_initiative_usd numeric NOT NULL DEFAULT 0,
  tokens_total integer NOT NULL DEFAULT 0,
  average_retries integer NOT NULL DEFAULT 0,
  automatic_repair_success_rate numeric NOT NULL DEFAULT 0,
  initiative_outcome_status text NOT NULL DEFAULT 'in_progress',
  stage_failure_distribution jsonb DEFAULT '{}'::jsonb,
  stage_durations jsonb DEFAULT '{}'::jsonb,
  stage_costs jsonb DEFAULT '{}'::jsonb,
  models_used text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(initiative_id)
);

ALTER TABLE public.initiative_observability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view initiative observability"
  ON public.initiative_observability FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role manages initiative observability"
  ON public.initiative_observability FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
