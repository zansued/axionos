
-- Sprint 62: Multi-Party Policy & Revenue Governance Layer

-- 1. ecosystem_party_roles
CREATE TABLE public.ecosystem_party_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  role_name text NOT NULL,
  role_slug text NOT NULL DEFAULT '',
  role_type text NOT NULL DEFAULT 'internal',
  description text NOT NULL DEFAULT '',
  rights_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  obligations_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  restriction_level text NOT NULL DEFAULT 'standard',
  trust_tier_requirement text NOT NULL DEFAULT 'unknown',
  status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecosystem_party_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_party_roles" ON public.ecosystem_party_roles FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_party_roles" ON public.ecosystem_party_roles FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_party_roles" ON public.ecosystem_party_roles FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. multi_party_policy_frames
CREATE TABLE public.multi_party_policy_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  policy_frame_name text NOT NULL,
  party_role_a text NOT NULL DEFAULT 'provider',
  party_role_b text NOT NULL DEFAULT 'consumer',
  interaction_type text NOT NULL DEFAULT 'capability_access',
  policy_alignment_score numeric NOT NULL DEFAULT 0,
  fairness_score numeric NOT NULL DEFAULT 0,
  enforceability_score numeric NOT NULL DEFAULT 0,
  restriction_level text NOT NULL DEFAULT 'standard',
  access_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale text NOT NULL DEFAULT '',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.multi_party_policy_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_mp_frames" ON public.multi_party_policy_frames FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_mp_frames" ON public.multi_party_policy_frames FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_mp_frames" ON public.multi_party_policy_frames FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. multi_party_entitlements
CREATE TABLE public.multi_party_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_frame_id uuid REFERENCES public.multi_party_policy_frames(id) ON DELETE CASCADE,
  entitlement_scope text NOT NULL DEFAULT 'capability_access',
  obligation_level text NOT NULL DEFAULT 'standard',
  restriction_level text NOT NULL DEFAULT 'standard',
  access_limit_score numeric NOT NULL DEFAULT 0,
  entitlement_integrity_score numeric NOT NULL DEFAULT 0,
  rights_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  obligations_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  unsafe_combinations jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.multi_party_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_mp_entitlements" ON public.multi_party_entitlements FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_mp_entitlements" ON public.multi_party_entitlements FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. ecosystem_value_flow_rules
CREATE TABLE public.ecosystem_value_flow_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_frame_id uuid REFERENCES public.multi_party_policy_frames(id) ON DELETE CASCADE,
  value_flow_type text NOT NULL DEFAULT 'usage_based',
  revenue_rule_type text NOT NULL DEFAULT 'bounded_pilot',
  revenue_bound_score numeric NOT NULL DEFAULT 0,
  settlement_readiness_score numeric NOT NULL DEFAULT 0,
  value_flow_governance_score numeric NOT NULL DEFAULT 0,
  allocation_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_posture jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecosystem_value_flow_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_vf_rules" ON public.ecosystem_value_flow_rules FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_vf_rules" ON public.ecosystem_value_flow_rules FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_vf_rules" ON public.ecosystem_value_flow_rules FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 5. multi_party_policy_conflicts
CREATE TABLE public.multi_party_policy_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_frame_id uuid REFERENCES public.multi_party_policy_frames(id) ON DELETE CASCADE,
  conflict_type text NOT NULL DEFAULT 'restriction_collision',
  conflict_score numeric NOT NULL DEFAULT 0,
  fairness_impact text NOT NULL DEFAULT 'neutral',
  description text NOT NULL DEFAULT '',
  resolution_status text NOT NULL DEFAULT 'open',
  resolution_recommendation text NOT NULL DEFAULT '',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.multi_party_policy_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_mp_conflicts" ON public.multi_party_policy_conflicts FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_mp_conflicts" ON public.multi_party_policy_conflicts FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_mp_conflicts" ON public.multi_party_policy_conflicts FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 6. multi_party_governance_outcomes
CREATE TABLE public.multi_party_governance_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_frame_id uuid REFERENCES public.multi_party_policy_frames(id) ON DELETE CASCADE,
  outcome_type text NOT NULL DEFAULT 'unknown',
  governance_outcome_accuracy_score numeric NOT NULL DEFAULT 0,
  bounded_commercial_integrity_score numeric NOT NULL DEFAULT 0,
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_status text NOT NULL DEFAULT 'pending',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.multi_party_governance_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_mp_gov_outcomes" ON public.multi_party_governance_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_mp_gov_outcomes" ON public.multi_party_governance_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_mp_gov_outcomes" ON public.multi_party_governance_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_multi_party_policy_frame()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','active','under_review','suspended','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_mp_policy_frame BEFORE INSERT OR UPDATE ON public.multi_party_policy_frames FOR EACH ROW EXECUTE FUNCTION public.validate_multi_party_policy_frame();

CREATE OR REPLACE FUNCTION public.validate_mp_governance_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_mp_governance_outcome BEFORE INSERT OR UPDATE ON public.multi_party_governance_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_mp_governance_outcome();

CREATE OR REPLACE FUNCTION public.validate_mp_conflict_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.resolution_status NOT IN ('open','reviewing','resolved','dismissed','escalated') THEN
    RAISE EXCEPTION 'Invalid resolution_status: %', NEW.resolution_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_mp_conflict_status BEFORE INSERT OR UPDATE ON public.multi_party_policy_conflicts FOR EACH ROW EXECUTE FUNCTION public.validate_mp_conflict_status();
