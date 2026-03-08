
-- Sprint 78: Bounded Swarm Execution for Complex Initiatives

-- 1. Swarm Execution Campaigns
CREATE TABLE public.swarm_execution_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  initiative_id UUID REFERENCES public.initiatives(id),
  campaign_name TEXT NOT NULL DEFAULT '',
  campaign_description TEXT NOT NULL DEFAULT '',
  participating_agent_ids TEXT[] NOT NULL DEFAULT '{}',
  execution_plan JSONB NOT NULL DEFAULT '{}',
  bounded_scope JSONB NOT NULL DEFAULT '{}',
  checkpoint_schedule JSONB NOT NULL DEFAULT '{}',
  escalation_triggers JSONB NOT NULL DEFAULT '{}',
  abort_posture JSONB NOT NULL DEFAULT '{}',
  rollback_posture JSONB NOT NULL DEFAULT '{}',
  risk_posture TEXT NOT NULL DEFAULT 'low',
  max_branches INTEGER NOT NULL DEFAULT 10,
  max_retries INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'draft',
  escalated BOOLEAN NOT NULL DEFAULT false,
  escalation_reason TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Swarm Execution Agents (participating agents per campaign)
CREATE TABLE public.swarm_execution_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.swarm_execution_campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  agent_id TEXT NOT NULL DEFAULT '',
  agent_role TEXT NOT NULL DEFAULT 'worker',
  assigned_branch_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'idle',
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Swarm Execution Branches (parallel task branches)
CREATE TABLE public.swarm_execution_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.swarm_execution_campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  branch_label TEXT NOT NULL DEFAULT '',
  branch_type TEXT NOT NULL DEFAULT 'parallel',
  parent_branch_id UUID REFERENCES public.swarm_execution_branches(id),
  assigned_agent_id TEXT,
  branch_plan JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  result_summary TEXT,
  result_artifacts JSONB NOT NULL DEFAULT '[]',
  retries_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Swarm Execution Checkpoints
CREATE TABLE public.swarm_execution_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.swarm_execution_campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  checkpoint_label TEXT NOT NULL DEFAULT '',
  checkpoint_type TEXT NOT NULL DEFAULT 'synchronization',
  snapshot JSONB NOT NULL DEFAULT '{}',
  branches_required TEXT[] NOT NULL DEFAULT '{}',
  branches_completed TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Swarm Execution Events (audit trail)
CREATE TABLE public.swarm_execution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.swarm_execution_campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  event_type TEXT NOT NULL DEFAULT '',
  agent_id TEXT,
  branch_id UUID REFERENCES public.swarm_execution_branches(id),
  event_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.swarm_execution_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_execution_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_execution_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_execution_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_execution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage swarm campaigns" ON public.swarm_execution_campaigns FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage swarm agents" ON public.swarm_execution_agents FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage swarm branches" ON public.swarm_execution_branches FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage swarm checkpoints" ON public.swarm_execution_checkpoints FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage swarm events" ON public.swarm_execution_events FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Validation trigger for campaign status
CREATE OR REPLACE FUNCTION public.validate_swarm_campaign_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','planned','launching','active','paused','completing','completed','aborting','aborted','rolled_back','failed','escalated') THEN
    RAISE EXCEPTION 'Invalid swarm campaign status: %', NEW.status;
  END IF;
  IF NEW.risk_posture NOT IN ('low','moderate','high','critical') THEN
    RAISE EXCEPTION 'Invalid risk_posture: %', NEW.risk_posture;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_swarm_campaign_status BEFORE INSERT OR UPDATE ON public.swarm_execution_campaigns FOR EACH ROW EXECUTE FUNCTION public.validate_swarm_campaign_status();

-- Validation trigger for branch status
CREATE OR REPLACE FUNCTION public.validate_swarm_branch_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending','running','completed','failed','blocked','retrying','aborted','rolled_back') THEN
    RAISE EXCEPTION 'Invalid swarm branch status: %', NEW.status;
  END IF;
  IF NEW.branch_type NOT IN ('parallel','sequential','synchronization','conditional') THEN
    RAISE EXCEPTION 'Invalid branch_type: %', NEW.branch_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_swarm_branch_status BEFORE INSERT OR UPDATE ON public.swarm_execution_branches FOR EACH ROW EXECUTE FUNCTION public.validate_swarm_branch_status();
