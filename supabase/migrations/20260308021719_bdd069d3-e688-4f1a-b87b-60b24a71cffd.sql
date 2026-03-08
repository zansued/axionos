
-- Sprint 47: Tenant-Aware Architecture Modes

-- 1. tenant_architecture_modes
CREATE TABLE public.tenant_architecture_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  mode_key text NOT NULL UNIQUE,
  mode_name text NOT NULL,
  mode_scope text NOT NULL,
  mode_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  allowed_envelope jsonb NOT NULL DEFAULT '{}'::jsonb,
  anti_fragmentation_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  activation_mode text NOT NULL DEFAULT 'manual_only',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tenant_architecture_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_tenant_arch_modes" ON public.tenant_architecture_modes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_insert_tenant_arch_modes" ON public.tenant_architecture_modes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_tenant_arch_modes" ON public.tenant_architecture_modes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_tenant_architecture_mode() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.mode_scope NOT IN ('global','organization','workspace','context_class') THEN RAISE EXCEPTION 'Invalid mode_scope: %', NEW.mode_scope; END IF;
  IF NEW.activation_mode NOT IN ('manual_only','bounded_auto_candidate') THEN RAISE EXCEPTION 'Invalid activation_mode: %', NEW.activation_mode; END IF;
  IF NEW.status NOT IN ('draft','active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_tenant_architecture_mode BEFORE INSERT OR UPDATE ON public.tenant_architecture_modes FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_architecture_mode();

-- 2. tenant_architecture_preference_profiles
CREATE TABLE public.tenant_architecture_preference_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid NULL REFERENCES public.workspaces(id),
  preference_scope text NOT NULL DEFAULT 'organization',
  preferred_mode_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  override_limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric NULL,
  support_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tenant_architecture_preference_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_tenant_arch_prefs" ON public.tenant_architecture_preference_profiles FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_insert_tenant_arch_prefs" ON public.tenant_architecture_preference_profiles FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_tenant_arch_prefs" ON public.tenant_architecture_preference_profiles FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_tenant_arch_preference_profile() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.preference_scope NOT IN ('organization','workspace','context_class') THEN RAISE EXCEPTION 'Invalid preference_scope: %', NEW.preference_scope; END IF;
  IF NEW.status NOT IN ('draft','active','watch','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_tenant_arch_preference_profile BEFORE INSERT OR UPDATE ON public.tenant_architecture_preference_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_arch_preference_profile();

-- 3. tenant_architecture_mode_outcomes
CREATE TABLE public.tenant_architecture_mode_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_id uuid NOT NULL REFERENCES public.tenant_architecture_modes(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  workspace_id uuid NULL REFERENCES public.workspaces(id),
  scope_ref jsonb NULL,
  baseline_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  mode_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  delta_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_status text NOT NULL DEFAULT 'inconclusive',
  evidence_refs jsonb NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tenant_architecture_mode_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_tenant_arch_outcomes" ON public.tenant_architecture_mode_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_insert_tenant_arch_outcomes" ON public.tenant_architecture_mode_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_tenant_arch_mode_outcome() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('helpful','neutral','harmful','inconclusive') THEN RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_tenant_arch_mode_outcome BEFORE INSERT OR UPDATE ON public.tenant_architecture_mode_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_arch_mode_outcome();

-- 4. tenant_architecture_recommendations
CREATE TABLE public.tenant_architecture_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  recommendation_type text NOT NULL DEFAULT 'consolidate',
  target_scope text NOT NULL DEFAULT 'organization',
  target_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation_reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric NULL,
  priority_score numeric NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tenant_architecture_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_tenant_arch_recs" ON public.tenant_architecture_recommendations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_insert_tenant_arch_recs" ON public.tenant_architecture_recommendations FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_tenant_arch_recs" ON public.tenant_architecture_recommendations FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_tenant_arch_recommendation() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','reviewed','accepted','rejected','dismissed') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_tenant_arch_recommendation BEFORE INSERT OR UPDATE ON public.tenant_architecture_recommendations FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_arch_recommendation();

-- 5. tenant_architecture_mode_reviews
CREATE TABLE public.tenant_architecture_mode_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  mode_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewer_ref jsonb NULL,
  review_status text NOT NULL DEFAULT 'reviewed',
  review_notes text NULL,
  review_reason_codes jsonb NULL,
  linked_changes jsonb NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tenant_architecture_mode_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_tenant_arch_reviews" ON public.tenant_architecture_mode_reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_insert_tenant_arch_reviews" ON public.tenant_architecture_mode_reviews FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_tenant_arch_mode_review() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed','accepted','rejected','deprecated','dismissed','archived') THEN RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_tenant_arch_mode_review BEFORE INSERT OR UPDATE ON public.tenant_architecture_mode_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_arch_mode_review();
