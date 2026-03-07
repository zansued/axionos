
-- Sprint 34: Platform Self-Stabilization tables

-- 1. platform_stability_signals
CREATE TABLE public.platform_stability_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_key text NOT NULL UNIQUE,
  signal_family text NOT NULL DEFAULT 'general',
  scope_type text NOT NULL DEFAULT 'global',
  current_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  baseline_value jsonb,
  warning_threshold jsonb NOT NULL DEFAULT '{}'::jsonb,
  critical_threshold jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'healthy',
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. platform_stabilization_actions
CREATE TABLE public.platform_stabilization_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  scope_ref jsonb,
  target_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  trigger_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  bounded_delta jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_impact jsonb,
  rollback_guard jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_mode text NOT NULL DEFAULT 'advisory',
  status text NOT NULL DEFAULT 'open',
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. platform_safe_mode_profiles
CREATE TABLE public.platform_safe_mode_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key text NOT NULL UNIQUE,
  profile_name text NOT NULL,
  profile_scope text NOT NULL DEFAULT 'global',
  stabilization_controls jsonb NOT NULL DEFAULT '{}'::jsonb,
  activation_mode text NOT NULL DEFAULT 'manual_only',
  status text NOT NULL DEFAULT 'active',
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. platform_stabilization_outcomes
CREATE TABLE public.platform_stabilization_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stabilization_action_id uuid NOT NULL REFERENCES public.platform_stabilization_actions(id),
  scope_ref jsonb,
  outcome_status text NOT NULL DEFAULT 'helpful',
  before_metrics jsonb,
  after_metrics jsonb,
  evidence_refs jsonb,
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. platform_stabilization_rollbacks
CREATE TABLE public.platform_stabilization_rollbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stabilization_action_id uuid NOT NULL REFERENCES public.platform_stabilization_actions(id),
  restored_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  rollback_reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  rollback_mode text NOT NULL DEFAULT 'manual',
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_stability_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stabilization_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_safe_mode_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stabilization_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stabilization_rollbacks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view stability signals" ON public.platform_stability_signals FOR SELECT TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage stability signals" ON public.platform_stability_signals FOR ALL TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view stabilization actions" ON public.platform_stabilization_actions FOR SELECT TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage stabilization actions" ON public.platform_stabilization_actions FOR ALL TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view safe mode profiles" ON public.platform_safe_mode_profiles FOR SELECT TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage safe mode profiles" ON public.platform_safe_mode_profiles FOR ALL TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view stabilization outcomes" ON public.platform_stabilization_outcomes FOR SELECT TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage stabilization outcomes" ON public.platform_stabilization_outcomes FOR ALL TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view stabilization rollbacks" ON public.platform_stabilization_rollbacks FOR SELECT TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage stabilization rollbacks" ON public.platform_stabilization_rollbacks FOR ALL TO authenticated USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_stability_signal()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.scope_type NOT IN ('global', 'organization', 'workspace', 'context_class') THEN
    RAISE EXCEPTION 'Invalid scope_type: %', NEW.scope_type;
  END IF;
  IF NEW.status NOT IN ('healthy', 'watch', 'unstable', 'critical') THEN
    RAISE EXCEPTION 'Invalid stability signal status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_stability_signal BEFORE INSERT OR UPDATE ON public.platform_stability_signals FOR EACH ROW EXECUTE FUNCTION public.validate_stability_signal();

CREATE OR REPLACE FUNCTION public.validate_stabilization_action()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.action_mode NOT IN ('advisory', 'manual_apply', 'bounded_auto') THEN
    RAISE EXCEPTION 'Invalid action_mode: %', NEW.action_mode;
  END IF;
  IF NEW.status NOT IN ('open', 'reviewed', 'applied', 'expired', 'rolled_back', 'rejected') THEN
    RAISE EXCEPTION 'Invalid stabilization action status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_stabilization_action BEFORE INSERT OR UPDATE ON public.platform_stabilization_actions FOR EACH ROW EXECUTE FUNCTION public.validate_stabilization_action();

CREATE OR REPLACE FUNCTION public.validate_safe_mode_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.profile_scope NOT IN ('global', 'organization', 'workspace', 'context_class') THEN
    RAISE EXCEPTION 'Invalid profile_scope: %', NEW.profile_scope;
  END IF;
  IF NEW.activation_mode NOT IN ('manual_only', 'bounded_auto') THEN
    RAISE EXCEPTION 'Invalid activation_mode: %', NEW.activation_mode;
  END IF;
  IF NEW.status NOT IN ('active', 'watch', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid safe mode profile status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_safe_mode_profile BEFORE INSERT OR UPDATE ON public.platform_safe_mode_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_safe_mode_profile();

CREATE OR REPLACE FUNCTION public.validate_stabilization_outcome()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('helpful', 'neutral', 'harmful', 'inconclusive') THEN
    RAISE EXCEPTION 'Invalid stabilization outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_stabilization_outcome BEFORE INSERT OR UPDATE ON public.platform_stabilization_outcomes FOR EACH ROW EXECUTE FUNCTION public.validate_stabilization_outcome();

CREATE OR REPLACE FUNCTION public.validate_stabilization_rollback()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rollback_mode NOT IN ('manual', 'bounded_auto') THEN
    RAISE EXCEPTION 'Invalid rollback_mode: %', NEW.rollback_mode;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_stabilization_rollback BEFORE INSERT OR UPDATE ON public.platform_stabilization_rollbacks FOR EACH ROW EXECUTE FUNCTION public.validate_stabilization_rollback();

-- Performance indexes
CREATE INDEX idx_stability_signals_status ON public.platform_stability_signals(status);
CREATE INDEX idx_stability_signals_family ON public.platform_stability_signals(signal_family);
CREATE INDEX idx_stabilization_actions_status ON public.platform_stabilization_actions(status);
CREATE INDEX idx_stabilization_actions_org ON public.platform_stabilization_actions(organization_id);
CREATE INDEX idx_stabilization_outcomes_action ON public.platform_stabilization_outcomes(stabilization_action_id);
CREATE INDEX idx_stabilization_rollbacks_action ON public.platform_stabilization_rollbacks(stabilization_action_id);
CREATE INDEX idx_safe_mode_profiles_status ON public.platform_safe_mode_profiles(status);
