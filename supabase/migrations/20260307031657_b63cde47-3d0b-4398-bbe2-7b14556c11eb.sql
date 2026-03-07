
-- Sprint 12: Learning Agents v1 tables

-- 1. Prompt Strategy Metrics
CREATE TABLE public.prompt_strategy_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  stage_name text NOT NULL DEFAULT '',
  prompt_signature text NOT NULL DEFAULT '',
  runs_count integer NOT NULL DEFAULT 0,
  success_rate numeric NOT NULL DEFAULT 0,
  average_quality_score numeric NOT NULL DEFAULT 0,
  average_cost numeric NOT NULL DEFAULT 0,
  retry_rate numeric NOT NULL DEFAULT 0,
  token_efficiency numeric NOT NULL DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_strategy_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view prompt metrics"
  ON public.prompt_strategy_metrics FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage prompt metrics"
  ON public.prompt_strategy_metrics FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

-- 2. Strategy Effectiveness Metrics
CREATE TABLE public.strategy_effectiveness_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  strategy_name text NOT NULL DEFAULT '',
  error_type text NOT NULL DEFAULT '',
  runs_count integer NOT NULL DEFAULT 0,
  success_rate numeric NOT NULL DEFAULT 0,
  avg_resolution_time numeric NOT NULL DEFAULT 0,
  avg_cost numeric NOT NULL DEFAULT 0,
  error_recurrence_rate numeric NOT NULL DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_effectiveness_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view strategy metrics"
  ON public.strategy_effectiveness_metrics FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage strategy metrics"
  ON public.strategy_effectiveness_metrics FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

-- 3. Predictive Error Patterns
CREATE TABLE public.predictive_error_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  stage_name text NOT NULL DEFAULT '',
  error_signature text NOT NULL DEFAULT '',
  probability_score numeric NOT NULL DEFAULT 0,
  observations_count integer NOT NULL DEFAULT 0,
  recommended_prevention_rule text,
  contributing_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.predictive_error_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view predictive patterns"
  ON public.predictive_error_patterns FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage predictive patterns"
  ON public.predictive_error_patterns FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

-- 4. Repair Strategy Weights
CREATE TABLE public.repair_strategy_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  strategy_name text NOT NULL DEFAULT '',
  stage_name text NOT NULL DEFAULT '*',
  current_weight numeric NOT NULL DEFAULT 1.0,
  previous_weight numeric NOT NULL DEFAULT 1.0,
  adjustment_reason text NOT NULL DEFAULT '',
  evidence_ids uuid[] NOT NULL DEFAULT '{}',
  adjusted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_strategy_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view strategy weights"
  ON public.repair_strategy_weights FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage strategy weights"
  ON public.repair_strategy_weights FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));

-- 5. Learning Recommendations
CREATE TABLE public.learning_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  recommendation_type text NOT NULL DEFAULT 'PIPELINE_CONFIGURATION_HINT',
  target_component text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  confidence_score numeric NOT NULL DEFAULT 0,
  supporting_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_improvement text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view learning recommendations"
  ON public.learning_recommendations FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can manage learning recommendations"
  ON public.learning_recommendations FOR ALL
  USING (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role, 'admin'::org_role, 'editor'::org_role]));
