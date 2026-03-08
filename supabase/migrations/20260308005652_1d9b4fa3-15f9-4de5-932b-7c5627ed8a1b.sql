
-- Sprint 45: Autonomous Change Advisory Orchestrator

-- 1. change_advisory_signals
CREATE TABLE public.change_advisory_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_source text NOT NULL,
  signal_type text NOT NULL,
  target_scope text NOT NULL,
  target_entities jsonb NOT NULL DEFAULT '{}',
  signal_payload jsonb NOT NULL DEFAULT '{}',
  confidence_score numeric NULL,
  priority_hint numeric NULL,
  evidence_refs jsonb NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.change_advisory_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view change_advisory_signals" ON public.change_advisory_signals
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert change_advisory_signals" ON public.change_advisory_signals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_change_advisory_signal_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','watch','suppressed','stale') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_change_advisory_signal
  BEFORE INSERT OR UPDATE ON public.change_advisory_signals
  FOR EACH ROW EXECUTE FUNCTION public.validate_change_advisory_signal_status();

-- 2. architecture_change_agendas
CREATE TABLE public.architecture_change_agendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agenda_name text NOT NULL,
  agenda_scope text NOT NULL,
  agenda_payload jsonb NOT NULL DEFAULT '{}',
  sequencing_graph jsonb NULL,
  deferred_items jsonb NULL,
  suppressed_items jsonb NULL,
  bundled_items jsonb NULL,
  agenda_health_score numeric NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_change_agendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view architecture_change_agendas" ON public.architecture_change_agendas
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert architecture_change_agendas" ON public.architecture_change_agendas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can update architecture_change_agendas" ON public.architecture_change_agendas
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_change_agenda_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','reviewed','accepted','rejected','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_change_agenda
  BEFORE INSERT OR UPDATE ON public.architecture_change_agendas
  FOR EACH ROW EXECUTE FUNCTION public.validate_change_agenda_status();

-- 3. architecture_change_agenda_reviews
CREATE TABLE public.architecture_change_agenda_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agenda_id uuid NOT NULL REFERENCES public.architecture_change_agendas(id) ON DELETE CASCADE,
  reviewer_ref jsonb NULL,
  review_status text NOT NULL DEFAULT 'reviewed',
  review_notes text NULL,
  review_reason_codes jsonb NULL,
  linked_changes jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_change_agenda_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view architecture_change_agenda_reviews" ON public.architecture_change_agenda_reviews
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can insert architecture_change_agenda_reviews" ON public.architecture_change_agenda_reviews
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_change_agenda_review_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status NOT IN ('reviewed','accepted','rejected','archived') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_change_agenda_review
  BEFORE INSERT OR UPDATE ON public.architecture_change_agenda_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_change_agenda_review_status();
