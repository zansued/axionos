
-- Sprint 92: Simulated Evolution Campaigns
-- Tables: architecture_simulation_campaigns, architecture_simulation_results, architecture_simulation_metrics, architecture_simulation_campaign_reviews

-- 1. Campaigns
CREATE TABLE public.architecture_simulation_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  hypothesis_id uuid REFERENCES public.architecture_hypotheses(id),
  campaign_name text NOT NULL DEFAULT 'Untitled Campaign',
  research_scope text NOT NULL DEFAULT 'local',
  scenario_type text NOT NULL DEFAULT 'hypothesis_evaluation',
  baseline_reference jsonb NOT NULL DEFAULT '{}'::jsonb,
  simulated_change_model jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluation_status text NOT NULL DEFAULT 'draft',
  result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  gain_indicators jsonb NOT NULL DEFAULT '[]'::jsonb,
  regression_indicators jsonb NOT NULL DEFAULT '[]'::jsonb,
  uncertainty_posture text NOT NULL DEFAULT 'high',
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_simulation_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage simulation campaigns" ON public.architecture_simulation_campaigns FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_simulation_campaign_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.evaluation_status NOT IN ('draft','ready','running','completed','inconclusive','failed','archived') THEN
    RAISE EXCEPTION 'Invalid evaluation_status: %', NEW.evaluation_status;
  END IF;
  IF NEW.uncertainty_posture NOT IN ('low','moderate','high','very_high') THEN
    RAISE EXCEPTION 'Invalid uncertainty_posture: %', NEW.uncertainty_posture;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_simulation_campaign BEFORE INSERT OR UPDATE ON public.architecture_simulation_campaigns FOR EACH ROW EXECUTE FUNCTION public.validate_simulation_campaign_status();

-- 2. Results
CREATE TABLE public.architecture_simulation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  campaign_id uuid NOT NULL REFERENCES public.architecture_simulation_campaigns(id),
  result_type text NOT NULL DEFAULT 'comparison',
  baseline_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  simulated_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  delta_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  gains jsonb NOT NULL DEFAULT '[]'::jsonb,
  regressions jsonb NOT NULL DEFAULT '[]'::jsonb,
  inconclusive_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score numeric NOT NULL DEFAULT 0,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_simulation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage simulation results" ON public.architecture_simulation_results FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 3. Metrics
CREATE TABLE public.architecture_simulation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  campaign_id uuid NOT NULL REFERENCES public.architecture_simulation_campaigns(id),
  metric_name text NOT NULL DEFAULT 'unknown',
  metric_domain text NOT NULL DEFAULT 'general',
  baseline_value numeric NOT NULL DEFAULT 0,
  simulated_value numeric NOT NULL DEFAULT 0,
  delta numeric NOT NULL DEFAULT 0,
  delta_direction text NOT NULL DEFAULT 'neutral',
  significance text NOT NULL DEFAULT 'low',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_simulation_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage simulation metrics" ON public.architecture_simulation_metrics FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_simulation_metric()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.delta_direction NOT IN ('gain','regression','neutral') THEN
    RAISE EXCEPTION 'Invalid delta_direction: %', NEW.delta_direction;
  END IF;
  IF NEW.significance NOT IN ('low','moderate','high','critical') THEN
    RAISE EXCEPTION 'Invalid significance: %', NEW.significance;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_simulation_metric BEFORE INSERT OR UPDATE ON public.architecture_simulation_metrics FOR EACH ROW EXECUTE FUNCTION public.validate_simulation_metric();

-- 4. Reviews
CREATE TABLE public.architecture_simulation_campaign_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  campaign_id uuid NOT NULL REFERENCES public.architecture_simulation_campaigns(id),
  review_status text NOT NULL DEFAULT 'reviewed',
  review_notes text,
  review_reason_codes jsonb DEFAULT '[]'::jsonb,
  reviewer_ref jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_simulation_campaign_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage simulation campaign reviews" ON public.architecture_simulation_campaign_reviews FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_simulation_campaign_review()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed','accepted','rejected','inconclusive','archived') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_simulation_campaign_review BEFORE INSERT OR UPDATE ON public.architecture_simulation_campaign_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_simulation_campaign_review();
