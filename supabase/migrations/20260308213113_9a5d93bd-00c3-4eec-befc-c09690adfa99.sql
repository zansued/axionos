
-- Sprint 77: Shared Working Memory & Task-State Negotiation

-- Working memory contexts
CREATE TABLE public.agent_working_memory_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  initiative_id UUID REFERENCES public.initiatives(id),
  context_label TEXT NOT NULL DEFAULT '',
  participating_agent_ids TEXT[] NOT NULL DEFAULT '{}',
  current_task_state TEXT NOT NULL DEFAULT 'proposed',
  agreed_assumptions JSONB NOT NULL DEFAULT '[]',
  open_issues JSONB NOT NULL DEFAULT '[]',
  blocked_reasons JSONB NOT NULL DEFAULT '[]',
  escalation_reason TEXT,
  risk_posture TEXT NOT NULL DEFAULT 'low',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Working memory entries (shared knowledge items)
CREATE TABLE public.agent_working_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID NOT NULL REFERENCES public.agent_working_memory_contexts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  agent_id TEXT NOT NULL DEFAULT '',
  entry_type TEXT NOT NULL DEFAULT 'observation',
  key TEXT NOT NULL DEFAULT '',
  value JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  superseded_by UUID REFERENCES public.agent_working_memory_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task-state transitions (negotiated)
CREATE TABLE public.agent_task_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID NOT NULL REFERENCES public.agent_working_memory_contexts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  from_state TEXT NOT NULL DEFAULT '',
  to_state TEXT NOT NULL DEFAULT '',
  proposed_by TEXT NOT NULL DEFAULT '',
  proposal_reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'proposed',
  resolved_by TEXT,
  resolution_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Coordination checkpoints
CREATE TABLE public.agent_coordination_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID NOT NULL REFERENCES public.agent_working_memory_contexts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  checkpoint_label TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL DEFAULT '{}',
  agent_id TEXT NOT NULL DEFAULT '',
  checkpoint_type TEXT NOT NULL DEFAULT 'progress',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_working_memory_context_state()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.current_task_state NOT IN ('proposed','accepted','in_progress','blocked','contested','escalated','resolved','ready_for_next_stage') THEN
    RAISE EXCEPTION 'Invalid current_task_state: %', NEW.current_task_state;
  END IF;
  IF NEW.risk_posture NOT IN ('low','moderate','high','critical') THEN
    RAISE EXCEPTION 'Invalid risk_posture: %', NEW.risk_posture;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_wm_context
BEFORE INSERT OR UPDATE ON public.agent_working_memory_contexts
FOR EACH ROW EXECUTE FUNCTION public.validate_working_memory_context_state();

CREATE OR REPLACE FUNCTION public.validate_working_memory_entry_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.entry_type NOT IN ('observation','assumption','decision','constraint','artifact_ref','issue','resolution') THEN
    RAISE EXCEPTION 'Invalid entry_type: %', NEW.entry_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_wm_entry
BEFORE INSERT OR UPDATE ON public.agent_working_memory_entries
FOR EACH ROW EXECUTE FUNCTION public.validate_working_memory_entry_type();

CREATE OR REPLACE FUNCTION public.validate_task_state_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('proposed','accepted','rejected','contested','escalated') THEN
    RAISE EXCEPTION 'Invalid transition status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_task_transition
BEFORE INSERT OR UPDATE ON public.agent_task_state_transitions
FOR EACH ROW EXECUTE FUNCTION public.validate_task_state_transition();

CREATE OR REPLACE FUNCTION public.validate_coordination_checkpoint_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.checkpoint_type NOT IN ('progress','milestone','rollback_point','agreement','escalation') THEN
    RAISE EXCEPTION 'Invalid checkpoint_type: %', NEW.checkpoint_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_coord_checkpoint
BEFORE INSERT OR UPDATE ON public.agent_coordination_checkpoints
FOR EACH ROW EXECUTE FUNCTION public.validate_coordination_checkpoint_type();

-- RLS
ALTER TABLE public.agent_working_memory_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_working_memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_task_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_coordination_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage working memory contexts" ON public.agent_working_memory_contexts FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members manage working memory entries" ON public.agent_working_memory_entries FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members manage task state transitions" ON public.agent_task_state_transitions FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members manage coordination checkpoints" ON public.agent_coordination_checkpoints FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- Indexes
CREATE INDEX idx_wm_contexts_org ON public.agent_working_memory_contexts(organization_id);
CREATE INDEX idx_wm_contexts_state ON public.agent_working_memory_contexts(current_task_state);
CREATE INDEX idx_wm_entries_context ON public.agent_working_memory_entries(context_id);
CREATE INDEX idx_task_transitions_context ON public.agent_task_state_transitions(context_id);
CREATE INDEX idx_coord_checkpoints_context ON public.agent_coordination_checkpoints(context_id);
