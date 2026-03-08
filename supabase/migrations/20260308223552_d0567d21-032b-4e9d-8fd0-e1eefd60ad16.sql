
-- Sprint 84: Post-Deploy Learning & Feedback Assimilation

-- 1. post_deploy_feedback_signals
CREATE TABLE public.post_deploy_feedback_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL DEFAULT 'operational',
  severity TEXT NOT NULL DEFAULT 'low',
  impact_area TEXT NOT NULL DEFAULT 'reliability',
  signal_summary TEXT NOT NULL DEFAULT '',
  signal_payload JSONB NOT NULL DEFAULT '{}',
  reliability_relevance NUMERIC NOT NULL DEFAULT 0.5,
  adoption_relevance NUMERIC NOT NULL DEFAULT 0.0,
  linked_capability_id UUID NULL,
  assimilation_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_deploy_feedback_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage post_deploy_feedback_signals" ON public.post_deploy_feedback_signals
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_post_deploy_feedback_signal() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.signal_type NOT IN ('operational','reliability','adoption','regression','compatibility','rollback','performance','security') THEN RAISE EXCEPTION 'Invalid signal_type: %', NEW.signal_type; END IF;
  IF NEW.severity NOT IN ('low','moderate','high','critical') THEN RAISE EXCEPTION 'Invalid severity: %', NEW.severity; END IF;
  IF NEW.impact_area NOT IN ('reliability','adoption','compatibility','performance','security','governance') THEN RAISE EXCEPTION 'Invalid impact_area: %', NEW.impact_area; END IF;
  IF NEW.assimilation_status NOT IN ('pending','classified','linked','clustered','reviewed','dismissed') THEN RAISE EXCEPTION 'Invalid assimilation_status: %', NEW.assimilation_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_post_deploy_feedback_signal BEFORE INSERT OR UPDATE ON public.post_deploy_feedback_signals FOR EACH ROW EXECUTE FUNCTION public.validate_post_deploy_feedback_signal();

-- 2. post_deploy_feedback_links
CREATE TABLE public.post_deploy_feedback_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.post_deploy_feedback_signals(id) ON DELETE CASCADE,
  link_target_type TEXT NOT NULL DEFAULT 'initiative',
  link_target_id UUID NOT NULL,
  link_context JSONB NOT NULL DEFAULT '{}',
  relevance_score NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_deploy_feedback_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage post_deploy_feedback_links" ON public.post_deploy_feedback_links
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_post_deploy_feedback_link() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.link_target_type NOT IN ('initiative','capability','deployment','validation','rollback','execution_context') THEN RAISE EXCEPTION 'Invalid link_target_type: %', NEW.link_target_type; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_post_deploy_feedback_link BEFORE INSERT OR UPDATE ON public.post_deploy_feedback_links FOR EACH ROW EXECUTE FUNCTION public.validate_post_deploy_feedback_link();

-- 3. post_deploy_feedback_clusters
CREATE TABLE public.post_deploy_feedback_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cluster_label TEXT NOT NULL DEFAULT '',
  cluster_type TEXT NOT NULL DEFAULT 'repeated_friction',
  signal_count INTEGER NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'low',
  impact_summary TEXT NOT NULL DEFAULT '',
  signal_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_deploy_feedback_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage post_deploy_feedback_clusters" ON public.post_deploy_feedback_clusters
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_post_deploy_feedback_cluster() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.cluster_type NOT IN ('repeated_friction','regression_pattern','capability_issue','reliability_cluster','adoption_blocker') THEN RAISE EXCEPTION 'Invalid cluster_type: %', NEW.cluster_type; END IF;
  IF NEW.severity NOT IN ('low','moderate','high','critical') THEN RAISE EXCEPTION 'Invalid severity: %', NEW.severity; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_post_deploy_feedback_cluster BEFORE INSERT OR UPDATE ON public.post_deploy_feedback_clusters FOR EACH ROW EXECUTE FUNCTION public.validate_post_deploy_feedback_cluster();

-- 4. post_deploy_feedback_reviews
CREATE TABLE public.post_deploy_feedback_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.post_deploy_feedback_signals(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  review_action TEXT NOT NULL DEFAULT 'reviewed',
  review_notes TEXT NOT NULL DEFAULT '',
  previous_status TEXT NOT NULL DEFAULT '',
  new_status TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_deploy_feedback_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage post_deploy_feedback_reviews" ON public.post_deploy_feedback_reviews
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_post_deploy_feedback_review() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_action NOT IN ('reviewed','classify','link','dismiss','escalate','cluster') THEN RAISE EXCEPTION 'Invalid review_action: %', NEW.review_action; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_post_deploy_feedback_review BEFORE INSERT OR UPDATE ON public.post_deploy_feedback_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_post_deploy_feedback_review();
