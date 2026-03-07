
-- Sprint 24: Agent Memory Layer Operationalization

-- 1. Agent Memory Profiles
CREATE TABLE public.agent_memory_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_type text NOT NULL,
  stage_key text,
  model_provider text,
  model_name text,
  memory_scope text NOT NULL DEFAULT 'global_agent',
  memory_summary text NOT NULL DEFAULT '',
  confidence numeric,
  support_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Agent Memory Records
CREATE TABLE public.agent_memory_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_type text NOT NULL,
  stage_key text,
  memory_type text NOT NULL DEFAULT 'execution_pattern',
  context_signature text NOT NULL DEFAULT '',
  memory_payload jsonb NOT NULL DEFAULT '{}',
  relevance_score numeric,
  source_refs jsonb,
  created_from_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_agent_memory_profile_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'watch', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid agent_memory_profiles status: %', NEW.status;
  END IF;
  IF NEW.memory_scope NOT IN ('global_agent', 'stage_scoped', 'model_scoped', 'execution_context') THEN
    RAISE EXCEPTION 'Invalid agent_memory_profiles memory_scope: %', NEW.memory_scope;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_agent_memory_profile
  BEFORE INSERT OR UPDATE ON public.agent_memory_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_memory_profile_status();

CREATE OR REPLACE FUNCTION public.validate_agent_memory_record_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.memory_type NOT IN ('execution_pattern', 'repair_pattern', 'validation_pattern', 'review_pattern', 'failure_pattern', 'success_pattern') THEN
    RAISE EXCEPTION 'Invalid agent_memory_records memory_type: %', NEW.memory_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_agent_memory_record
  BEFORE INSERT OR UPDATE ON public.agent_memory_records
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_memory_record_type();

-- Indexes
CREATE INDEX idx_agent_memory_profiles_org ON public.agent_memory_profiles(organization_id);
CREATE INDEX idx_agent_memory_profiles_agent_type ON public.agent_memory_profiles(organization_id, agent_type);
CREATE INDEX idx_agent_memory_profiles_stage ON public.agent_memory_profiles(organization_id, agent_type, stage_key);
CREATE INDEX idx_agent_memory_records_org ON public.agent_memory_records(organization_id);
CREATE INDEX idx_agent_memory_records_agent_type ON public.agent_memory_records(organization_id, agent_type);
CREATE INDEX idx_agent_memory_records_context ON public.agent_memory_records(organization_id, context_signature);

-- RLS
ALTER TABLE public.agent_memory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_agent_memory_profiles" ON public.agent_memory_profiles
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_insert_agent_memory_profiles" ON public.agent_memory_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_update_agent_memory_profiles" ON public.agent_memory_profiles
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "service_role_all_agent_memory_profiles" ON public.agent_memory_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "org_member_select_agent_memory_records" ON public.agent_memory_records
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_member_insert_agent_memory_records" ON public.agent_memory_records
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "service_role_all_agent_memory_records" ON public.agent_memory_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Updated_at trigger for profiles
CREATE TRIGGER trg_agent_memory_profiles_updated_at
  BEFORE UPDATE ON public.agent_memory_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
