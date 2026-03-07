
-- Platform Intelligence tables (Sprint 30)

-- Platform Insights
CREATE TABLE public.platform_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  insight_type text NOT NULL DEFAULT 'general',
  affected_scope text NOT NULL DEFAULT 'platform',
  severity text NOT NULL DEFAULT 'info',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  supporting_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendation jsonb NULL,
  confidence_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Platform Recommendations
CREATE TABLE public.platform_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  recommendation_type text NOT NULL DEFAULT 'general',
  target_scope text NOT NULL DEFAULT 'platform',
  target_entity jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendation_reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric NOT NULL DEFAULT 0,
  priority_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_platform_insight_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('new', 'reviewed', 'resolved') THEN
    RAISE EXCEPTION 'Invalid platform_insights status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_platform_insight
  BEFORE INSERT OR UPDATE ON public.platform_insights
  FOR EACH ROW EXECUTE FUNCTION public.validate_platform_insight_status();

CREATE OR REPLACE FUNCTION public.validate_platform_recommendation_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'reviewed', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid platform_recommendations status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_platform_recommendation
  BEFORE INSERT OR UPDATE ON public.platform_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.validate_platform_recommendation_status();

-- RLS
ALTER TABLE public.platform_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_platform_insights" ON public.platform_insights
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_insert_platform_insights" ON public.platform_insights
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_update_platform_insights" ON public.platform_insights
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "service_role_all_platform_insights" ON public.platform_insights
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "org_member_select_platform_recommendations" ON public.platform_recommendations
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_insert_platform_recommendations" ON public.platform_recommendations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_update_platform_recommendations" ON public.platform_recommendations
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "service_role_all_platform_recommendations" ON public.platform_recommendations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_platform_insights_org ON public.platform_insights(organization_id);
CREATE INDEX idx_platform_insights_status ON public.platform_insights(status);
CREATE INDEX idx_platform_insights_type ON public.platform_insights(insight_type);
CREATE INDEX idx_platform_recommendations_org ON public.platform_recommendations(organization_id);
CREATE INDEX idx_platform_recommendations_status ON public.platform_recommendations(status);
CREATE INDEX idx_platform_recommendations_type ON public.platform_recommendations(recommendation_type);
