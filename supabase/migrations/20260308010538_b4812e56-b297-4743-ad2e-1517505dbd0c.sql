
-- Sprint 46: Platform Self-Stabilization v2

-- 1. platform_stability_v2_signals
CREATE TABLE public.platform_stability_v2_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_key text NOT NULL,
  signal_family text NOT NULL,
  source_layers jsonb NOT NULL DEFAULT '[]',
  scope_ref jsonb NULL,
  signal_payload jsonb NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'low',
  confidence_score numeric NULL,
  evidence_refs jsonb NULL,
  status text NOT NULL DEFAULT 'healthy',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_stability_v2_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view platform_stability_v2_signals" ON public.platform_stability_v2_signals
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert platform_stability_v2_signals" ON public.platform_stability_v2_signals
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_stability_v2_signal()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.severity NOT IN ('low','moderate','high','critical') THEN RAISE EXCEPTION 'Invalid severity: %', NEW.severity; END IF;
  IF NEW.status NOT IN ('healthy','watch','unstable','critical','suppressed') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_stability_v2_signal
  BEFORE INSERT OR UPDATE ON public.platform_stability_v2_signals
  FOR EACH ROW EXECUTE FUNCTION public.validate_stability_v2_signal();

-- 2. platform_stabilization_envelopes
CREATE TABLE public.platform_stabilization_envelopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  envelope_key text NOT NULL,
  envelope_name text NOT NULL,
  target_scope text NOT NULL,
  stabilization_controls jsonb NOT NULL DEFAULT '{}',
  activation_mode text NOT NULL DEFAULT 'advisory',
  expiry_policy jsonb NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, envelope_key)
);

ALTER TABLE public.platform_stabilization_envelopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view platform_stabilization_envelopes" ON public.platform_stabilization_envelopes
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert platform_stabilization_envelopes" ON public.platform_stabilization_envelopes
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can update platform_stabilization_envelopes" ON public.platform_stabilization_envelopes
  FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_stabilization_envelope()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.activation_mode NOT IN ('advisory','manual_apply','bounded_auto') THEN RAISE EXCEPTION 'Invalid activation_mode: %', NEW.activation_mode; END IF;
  IF NEW.status NOT IN ('draft','active','watch','expired','deprecated') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_stabilization_envelope
  BEFORE INSERT OR UPDATE ON public.platform_stabilization_envelopes
  FOR EACH ROW EXECUTE FUNCTION public.validate_stabilization_envelope();

-- 3. platform_stabilization_v2_outcomes
CREATE TABLE public.platform_stabilization_v2_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope_ref jsonb NULL,
  stabilization_envelope_id uuid NULL REFERENCES public.platform_stabilization_envelopes(id),
  outcome_status text NOT NULL DEFAULT 'inconclusive',
  before_metrics jsonb NULL,
  after_metrics jsonb NULL,
  evidence_refs jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_stabilization_v2_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view platform_stabilization_v2_outcomes" ON public.platform_stabilization_v2_outcomes
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert platform_stabilization_v2_outcomes" ON public.platform_stabilization_v2_outcomes
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_stabilization_v2_outcome()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.outcome_status NOT IN ('helpful','neutral','harmful','inconclusive') THEN RAISE EXCEPTION 'Invalid outcome_status: %', NEW.outcome_status; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_stabilization_v2_outcome
  BEFORE INSERT OR UPDATE ON public.platform_stabilization_v2_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.validate_stabilization_v2_outcome();

-- 4. platform_stabilization_v2_rollbacks
CREATE TABLE public.platform_stabilization_v2_rollbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  envelope_id uuid NOT NULL REFERENCES public.platform_stabilization_envelopes(id),
  rollback_scope text NOT NULL DEFAULT 'full',
  restored_state jsonb NOT NULL DEFAULT '{}',
  rollback_reason jsonb NOT NULL DEFAULT '{}',
  rollback_mode text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_stabilization_v2_rollbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view platform_stabilization_v2_rollbacks" ON public.platform_stabilization_v2_rollbacks
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert platform_stabilization_v2_rollbacks" ON public.platform_stabilization_v2_rollbacks
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_stabilization_v2_rollback()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rollback_scope NOT IN ('partial','full','release') THEN RAISE EXCEPTION 'Invalid rollback_scope: %', NEW.rollback_scope; END IF;
  IF NEW.rollback_mode NOT IN ('manual','bounded_auto') THEN RAISE EXCEPTION 'Invalid rollback_mode: %', NEW.rollback_mode; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_stabilization_v2_rollback
  BEFORE INSERT OR UPDATE ON public.platform_stabilization_v2_rollbacks
  FOR EACH ROW EXECUTE FUNCTION public.validate_stabilization_v2_rollback();
