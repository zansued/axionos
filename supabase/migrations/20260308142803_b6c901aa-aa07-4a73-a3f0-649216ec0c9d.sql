
-- Sprint 60: Limited Marketplace Pilot Layer

-- 1. marketplace_pilot_programs
CREATE TABLE public.marketplace_pilot_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  pilot_program_name text NOT NULL,
  pilot_scope_type text NOT NULL DEFAULT 'bounded',
  pilot_objectives jsonb NOT NULL DEFAULT '{}'::jsonb,
  pilot_activation_status text NOT NULL DEFAULT 'draft',
  max_participants int NOT NULL DEFAULT 5,
  max_capabilities int NOT NULL DEFAULT 5,
  rollback_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  governance_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_pilot_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pilot_programs" ON public.marketplace_pilot_programs FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pilot_programs" ON public.marketplace_pilot_programs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_pilot_programs" ON public.marketplace_pilot_programs FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 2. marketplace_pilot_capabilities
CREATE TABLE public.marketplace_pilot_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pilot_program_id uuid REFERENCES public.marketplace_pilot_programs(id) ON DELETE SET NULL,
  capability_name text NOT NULL,
  capability_domain text NOT NULL DEFAULT 'unknown',
  exposure_class text NOT NULL DEFAULT 'restricted',
  pilot_capability_status text NOT NULL DEFAULT 'proposed',
  pilot_capability_eligibility_score numeric NOT NULL DEFAULT 0,
  policy_compliance_score numeric NOT NULL DEFAULT 0,
  trust_requirement_score numeric NOT NULL DEFAULT 0,
  restrictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_pilot_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pilot_capabilities" ON public.marketplace_pilot_capabilities FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pilot_capabilities" ON public.marketplace_pilot_capabilities FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_pilot_capabilities" ON public.marketplace_pilot_capabilities FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 3. marketplace_pilot_participants
CREATE TABLE public.marketplace_pilot_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pilot_program_id uuid REFERENCES public.marketplace_pilot_programs(id) ON DELETE SET NULL,
  external_actor_id uuid REFERENCES public.external_actor_registry(id) ON DELETE SET NULL,
  participant_name text NOT NULL,
  participant_type text NOT NULL DEFAULT 'unknown',
  participant_status text NOT NULL DEFAULT 'proposed',
  trust_tier text NOT NULL DEFAULT 'unknown',
  pilot_participant_eligibility_score numeric NOT NULL DEFAULT 0,
  trust_stability_score numeric NOT NULL DEFAULT 0,
  violation_count int NOT NULL DEFAULT 0,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_pilot_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pilot_participants" ON public.marketplace_pilot_participants FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pilot_participants" ON public.marketplace_pilot_participants FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_pilot_participants" ON public.marketplace_pilot_participants FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 4. marketplace_pilot_interactions
CREATE TABLE public.marketplace_pilot_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pilot_program_id uuid REFERENCES public.marketplace_pilot_programs(id) ON DELETE SET NULL,
  capability_id uuid REFERENCES public.marketplace_pilot_capabilities(id) ON DELETE SET NULL,
  participant_id uuid REFERENCES public.marketplace_pilot_participants(id) ON DELETE SET NULL,
  interaction_type text NOT NULL DEFAULT 'request',
  interaction_status text NOT NULL DEFAULT 'recorded',
  policy_compliance_score numeric NOT NULL DEFAULT 0,
  trust_stability_score numeric NOT NULL DEFAULT 0,
  anomaly_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  interaction_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_pilot_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pilot_interactions" ON public.marketplace_pilot_interactions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pilot_interactions" ON public.marketplace_pilot_interactions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 5. marketplace_pilot_policy_events
CREATE TABLE public.marketplace_pilot_policy_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pilot_program_id uuid REFERENCES public.marketplace_pilot_programs(id) ON DELETE SET NULL,
  capability_id uuid REFERENCES public.marketplace_pilot_capabilities(id) ON DELETE SET NULL,
  participant_id uuid REFERENCES public.marketplace_pilot_participants(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'policy_check',
  severity text NOT NULL DEFAULT 'info',
  policy_result text NOT NULL DEFAULT 'pass',
  description text NOT NULL DEFAULT '',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_pilot_policy_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pilot_policy_events" ON public.marketplace_pilot_policy_events FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pilot_policy_events" ON public.marketplace_pilot_policy_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 6. marketplace_pilot_outcomes
CREATE TABLE public.marketplace_pilot_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pilot_program_id uuid REFERENCES public.marketplace_pilot_programs(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL DEFAULT 'unknown',
  pilot_value_signal_score numeric NOT NULL DEFAULT 0,
  pilot_risk_score numeric NOT NULL DEFAULT 0,
  rollback_trigger_score numeric NOT NULL DEFAULT 0,
  pilot_learning_score numeric NOT NULL DEFAULT 0,
  pilot_outcome_accuracy_score numeric NOT NULL DEFAULT 0,
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  realized_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_status text NOT NULL DEFAULT 'pending',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_pilot_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_pilot_outcomes" ON public.marketplace_pilot_outcomes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_insert_pilot_outcomes" ON public.marketplace_pilot_outcomes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_member_update_pilot_outcomes" ON public.marketplace_pilot_outcomes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_marketplace_pilot_program()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.pilot_activation_status NOT IN ('draft','approved','active','paused','completed','rolled_back','archived') THEN
    RAISE EXCEPTION 'Invalid pilot_activation_status: %', NEW.pilot_activation_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_marketplace_pilot_program BEFORE INSERT OR UPDATE ON public.marketplace_pilot_programs FOR EACH ROW EXECUTE FUNCTION public.validate_marketplace_pilot_program();

CREATE OR REPLACE FUNCTION public.validate_marketplace_pilot_capability()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.pilot_capability_status NOT IN ('proposed','eligible','approved','active','restricted','rolled_back','archived') THEN
    RAISE EXCEPTION 'Invalid pilot_capability_status: %', NEW.pilot_capability_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_marketplace_pilot_capability BEFORE INSERT OR UPDATE ON public.marketplace_pilot_capabilities FOR EACH ROW EXECUTE FUNCTION public.validate_marketplace_pilot_capability();

CREATE OR REPLACE FUNCTION public.validate_marketplace_pilot_participant()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.participant_status NOT IN ('proposed','eligible','approved','active','restricted','suspended','rolled_back','archived') THEN
    RAISE EXCEPTION 'Invalid participant_status: %', NEW.participant_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_marketplace_pilot_participant BEFORE INSERT OR UPDATE ON public.marketplace_pilot_participants FOR EACH ROW EXECUTE FUNCTION public.validate_marketplace_pilot_participant();

CREATE OR REPLACE FUNCTION public.validate_marketplace_pilot_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('pending','helpful','neutral','harmful','inconclusive') THEN
    RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_marketplace_pilot_outcome BEFORE INSERT OR UPDATE ON public.marketplace_pilot_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_marketplace_pilot_outcome();
