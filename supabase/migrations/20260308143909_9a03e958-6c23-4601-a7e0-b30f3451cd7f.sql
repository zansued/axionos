
-- Sprint 61: Capability Registry Governance Layer

-- 1. capability_registry_entries
CREATE TABLE public.capability_registry_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  capability_name text NOT NULL,
  capability_slug text NOT NULL DEFAULT '',
  capability_domain text NOT NULL DEFAULT 'unknown',
  capability_type text NOT NULL DEFAULT 'internal',
  registry_status text NOT NULL DEFAULT 'proposed',
  lifecycle_state text NOT NULL DEFAULT 'proposed',
  exposure_class text NOT NULL DEFAULT 'restricted',
  trust_tier_requirement text NOT NULL DEFAULT 'unknown',
  pilot_scope_type text NOT NULL DEFAULT 'none',
  governance_score numeric NOT NULL DEFAULT 0,
  registry_health_score numeric NOT NULL DEFAULT 0,
  restriction_level text NOT NULL DEFAULT 'standard',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.capability_registry_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_cap_registry" ON public.capability_registry_entries FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_cap_registry" ON public.capability_registry_entries FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_cap_registry" ON public.capability_registry_entries FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. capability_registry_versions
CREATE TABLE public.capability_registry_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  registry_entry_id uuid REFERENCES public.capability_registry_entries(id) ON DELETE CASCADE,
  version_label text NOT NULL DEFAULT '0.1.0',
  version_status text NOT NULL DEFAULT 'draft',
  compatibility_score numeric NOT NULL DEFAULT 0,
  deprecation_pressure_score numeric NOT NULL DEFAULT 0,
  version_validity_score numeric NOT NULL DEFAULT 0,
  change_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.capability_registry_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_cap_versions" ON public.capability_registry_versions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_cap_versions" ON public.capability_registry_versions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_cap_versions" ON public.capability_registry_versions FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. capability_registry_visibility_rules
CREATE TABLE public.capability_registry_visibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  registry_entry_id uuid REFERENCES public.capability_registry_entries(id) ON DELETE CASCADE,
  visibility_level text NOT NULL DEFAULT 'hidden',
  discoverability_score numeric NOT NULL DEFAULT 0,
  trust_tier_filter text NOT NULL DEFAULT 'unknown',
  actor_class_filter text NOT NULL DEFAULT 'internal',
  scope_filter text NOT NULL DEFAULT 'organization',
  rationale text NOT NULL DEFAULT '',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.capability_registry_visibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_cap_visibility" ON public.capability_registry_visibility_rules FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_cap_visibility" ON public.capability_registry_visibility_rules FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. capability_registry_policy_bindings
CREATE TABLE public.capability_registry_policy_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  registry_entry_id uuid REFERENCES public.capability_registry_entries(id) ON DELETE CASCADE,
  policy_set_name text NOT NULL DEFAULT '',
  policy_binding_score numeric NOT NULL DEFAULT 0,
  restriction_inherited text NOT NULL DEFAULT 'none',
  binding_status text NOT NULL DEFAULT 'active',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.capability_registry_policy_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_cap_policy_bindings" ON public.capability_registry_policy_bindings FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_cap_policy_bindings" ON public.capability_registry_policy_bindings FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 5. capability_registry_compatibility_rules
CREATE TABLE public.capability_registry_compatibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  registry_entry_id uuid REFERENCES public.capability_registry_entries(id) ON DELETE CASCADE,
  target_capability_name text NOT NULL DEFAULT '',
  compatibility_type text NOT NULL DEFAULT 'compatible',
  compatibility_score numeric NOT NULL DEFAULT 0,
  dependency_sensitivity_score numeric NOT NULL DEFAULT 0,
  sequencing_constraint text NOT NULL DEFAULT 'none',
  conflict_description text NOT NULL DEFAULT '',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.capability_registry_compatibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_cap_compat" ON public.capability_registry_compatibility_rules FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_cap_compat" ON public.capability_registry_compatibility_rules FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 6. capability_registry_governance_outcomes
CREATE TABLE public.capability_registry_governance_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  registry_entry_id uuid REFERENCES public.capability_registry_entries(id) ON DELETE CASCADE,
  outcome_type text NOT NULL DEFAULT 'unknown',
  registry_outcome_accuracy_score numeric NOT NULL DEFAULT 0,
  bounded_registry_integrity_score numeric NOT NULL DEFAULT 0,
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_status text NOT NULL DEFAULT 'pending',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.capability_registry_governance_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_cap_gov_outcomes" ON public.capability_registry_governance_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_cap_gov_outcomes" ON public.capability_registry_governance_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_cap_gov_outcomes" ON public.capability_registry_governance_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_capability_registry_entry()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lifecycle_state NOT IN ('proposed','registered','pilot_only','restricted','deprecated','hidden','future_candidate','archived') THEN
    RAISE EXCEPTION 'Invalid lifecycle_state: %', NEW.lifecycle_state;
  END IF;
  IF NEW.registry_status NOT IN ('proposed','active','under_review','suspended','archived') THEN
    RAISE EXCEPTION 'Invalid registry_status: %', NEW.registry_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_capability_registry_entry BEFORE INSERT OR UPDATE ON public.capability_registry_entries FOR EACH ROW EXECUTE FUNCTION public.validate_capability_registry_entry();

CREATE OR REPLACE FUNCTION public.validate_capability_registry_version()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.version_status NOT IN ('draft','valid','deprecated','restricted','retired') THEN
    RAISE EXCEPTION 'Invalid version_status: %', NEW.version_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_capability_registry_version BEFORE INSERT OR UPDATE ON public.capability_registry_versions FOR EACH ROW EXECUTE FUNCTION public.validate_capability_registry_version();

CREATE OR REPLACE FUNCTION public.validate_capability_registry_gov_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_capability_registry_gov_outcome BEFORE INSERT OR UPDATE ON public.capability_registry_governance_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_capability_registry_gov_outcome();
