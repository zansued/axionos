
-- Sprint 31: Platform Self-Calibration tables

-- 1. Calibration Parameter Registry
CREATE TABLE public.platform_calibration_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_key text NOT NULL UNIQUE,
  parameter_scope text NOT NULL,
  parameter_family text NOT NULL,
  current_value jsonb NOT NULL DEFAULT '{}',
  default_value jsonb NOT NULL DEFAULT '{}',
  allowed_range jsonb NOT NULL DEFAULT '{}',
  calibration_mode text NOT NULL DEFAULT 'manual_only',
  organization_id uuid REFERENCES public.organizations(id),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Calibration Proposals
CREATE TABLE public.platform_calibration_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_key text NOT NULL,
  scope_ref jsonb,
  current_value jsonb NOT NULL DEFAULT '{}',
  proposed_value jsonb NOT NULL DEFAULT '{}',
  expected_impact jsonb,
  rationale_codes jsonb NOT NULL DEFAULT '[]',
  evidence_refs jsonb,
  confidence_score numeric DEFAULT 0,
  proposal_mode text NOT NULL DEFAULT 'advisory',
  organization_id uuid REFERENCES public.organizations(id),
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Calibration Applications
CREATE TABLE public.platform_calibration_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.platform_calibration_proposals(id),
  parameter_key text NOT NULL,
  scope_ref jsonb,
  previous_value jsonb NOT NULL DEFAULT '{}',
  applied_value jsonb NOT NULL DEFAULT '{}',
  applied_mode text NOT NULL DEFAULT 'manual',
  rollback_guard jsonb NOT NULL DEFAULT '{}',
  organization_id uuid REFERENCES public.organizations(id),
  outcome_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Calibration Rollbacks
CREATE TABLE public.platform_calibration_rollbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.platform_calibration_applications(id),
  parameter_key text NOT NULL,
  restored_value jsonb NOT NULL DEFAULT '{}',
  rollback_reason jsonb NOT NULL DEFAULT '{}',
  rollback_mode text NOT NULL DEFAULT 'manual',
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_calibration_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_calibration_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_calibration_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_calibration_rollbacks ENABLE ROW LEVEL SECURITY;

-- RLS policies for parameters
CREATE POLICY "Users can view calibration parameters for their org" ON public.platform_calibration_parameters
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role manages calibration parameters" ON public.platform_calibration_parameters
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS policies for proposals
CREATE POLICY "Users can view calibration proposals for their org" ON public.platform_calibration_proposals
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role manages calibration proposals" ON public.platform_calibration_proposals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS policies for applications
CREATE POLICY "Users can view calibration applications for their org" ON public.platform_calibration_applications
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role manages calibration applications" ON public.platform_calibration_applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS policies for rollbacks
CREATE POLICY "Users can view calibration rollbacks for their org" ON public.platform_calibration_rollbacks
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role manages calibration rollbacks" ON public.platform_calibration_rollbacks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_calibration_parameter()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.parameter_scope NOT IN ('global', 'organization', 'workspace', 'context_class') THEN
    RAISE EXCEPTION 'Invalid parameter_scope: %', NEW.parameter_scope;
  END IF;
  IF NEW.calibration_mode NOT IN ('manual_only', 'bounded_auto') THEN
    RAISE EXCEPTION 'Invalid calibration_mode: %', NEW.calibration_mode;
  END IF;
  IF NEW.status NOT IN ('active', 'watch', 'frozen', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid calibration parameter status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_calibration_parameter
  BEFORE INSERT OR UPDATE ON public.platform_calibration_parameters
  FOR EACH ROW EXECUTE FUNCTION public.validate_calibration_parameter();

CREATE OR REPLACE FUNCTION public.validate_calibration_proposal()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.proposal_mode NOT IN ('advisory', 'bounded_auto_candidate') THEN
    RAISE EXCEPTION 'Invalid proposal_mode: %', NEW.proposal_mode;
  END IF;
  IF NEW.status NOT IN ('open', 'reviewed', 'accepted', 'rejected', 'applied', 'rolled_back') THEN
    RAISE EXCEPTION 'Invalid calibration proposal status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_calibration_proposal
  BEFORE INSERT OR UPDATE ON public.platform_calibration_proposals
  FOR EACH ROW EXECUTE FUNCTION public.validate_calibration_proposal();

CREATE OR REPLACE FUNCTION public.validate_calibration_application()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.applied_mode NOT IN ('manual', 'bounded_auto') THEN
    RAISE EXCEPTION 'Invalid applied_mode: %', NEW.applied_mode;
  END IF;
  IF NEW.outcome_status NOT IN ('pending', 'helpful', 'neutral', 'harmful', 'inconclusive', 'rolled_back') THEN
    RAISE EXCEPTION 'Invalid calibration application outcome_status: %', NEW.outcome_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_calibration_application
  BEFORE INSERT OR UPDATE ON public.platform_calibration_applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_calibration_application();

CREATE OR REPLACE FUNCTION public.validate_calibration_rollback()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rollback_mode NOT IN ('manual', 'bounded_auto') THEN
    RAISE EXCEPTION 'Invalid rollback_mode: %', NEW.rollback_mode;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_calibration_rollback
  BEFORE INSERT OR UPDATE ON public.platform_calibration_rollbacks
  FOR EACH ROW EXECUTE FUNCTION public.validate_calibration_rollback();

-- Indices
CREATE INDEX idx_calibration_params_scope ON public.platform_calibration_parameters(parameter_scope);
CREATE INDEX idx_calibration_params_family ON public.platform_calibration_parameters(parameter_family);
CREATE INDEX idx_calibration_params_status ON public.platform_calibration_parameters(status);
CREATE INDEX idx_calibration_proposals_status ON public.platform_calibration_proposals(status);
CREATE INDEX idx_calibration_proposals_param ON public.platform_calibration_proposals(parameter_key);
CREATE INDEX idx_calibration_applications_outcome ON public.platform_calibration_applications(outcome_status);
CREATE INDEX idx_calibration_applications_param ON public.platform_calibration_applications(parameter_key);
CREATE INDEX idx_calibration_rollbacks_app ON public.platform_calibration_rollbacks(application_id);
