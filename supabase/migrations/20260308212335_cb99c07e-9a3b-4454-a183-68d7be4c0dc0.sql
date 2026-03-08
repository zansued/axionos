
-- Sprint 76: Multi-Agent Debate & Resolution Layer

-- Debate sessions
CREATE TABLE public.agent_debate_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  initiative_id UUID REFERENCES public.initiatives(id),
  topic TEXT NOT NULL DEFAULT '',
  debate_context JSONB NOT NULL DEFAULT '{}',
  participating_agent_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',
  max_rounds INT NOT NULL DEFAULT 5,
  current_round INT NOT NULL DEFAULT 0,
  resolution_outcome TEXT,
  resolution_confidence NUMERIC DEFAULT 0,
  escalated BOOLEAN NOT NULL DEFAULT false,
  escalation_reason TEXT,
  risk_posture TEXT NOT NULL DEFAULT 'low',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Positions within a debate
CREATE TABLE public.agent_debate_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.agent_debate_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  agent_id TEXT NOT NULL DEFAULT '',
  position_label TEXT NOT NULL DEFAULT '',
  reasoning TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  round_number INT NOT NULL DEFAULT 1,
  position_type TEXT NOT NULL DEFAULT 'proposal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Arguments (challenges, defenses, comparisons)
CREATE TABLE public.agent_debate_arguments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.agent_debate_sessions(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.agent_debate_positions(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  agent_id TEXT NOT NULL DEFAULT '',
  argument_type TEXT NOT NULL DEFAULT 'challenge',
  content TEXT NOT NULL DEFAULT '',
  target_position_id UUID REFERENCES public.agent_debate_positions(id) ON DELETE SET NULL,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  strength NUMERIC NOT NULL DEFAULT 0.5,
  round_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resolutions
CREATE TABLE public.agent_debate_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.agent_debate_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  winning_position_id UUID REFERENCES public.agent_debate_positions(id) ON DELETE SET NULL,
  resolution_type TEXT NOT NULL DEFAULT 'winner_selected',
  resolution_summary TEXT NOT NULL DEFAULT '',
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  dissenting_views JSONB NOT NULL DEFAULT '[]',
  requires_human_review BOOLEAN NOT NULL DEFAULT false,
  human_review_status TEXT DEFAULT 'pending',
  human_review_notes TEXT,
  reviewer_id UUID,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_debate_session_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','active','resolved','escalated','closed','abandoned') THEN
    RAISE EXCEPTION 'Invalid debate session status: %', NEW.status;
  END IF;
  IF NEW.risk_posture NOT IN ('low','moderate','high','critical') THEN
    RAISE EXCEPTION 'Invalid risk_posture: %', NEW.risk_posture;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_debate_session
BEFORE INSERT OR UPDATE ON public.agent_debate_sessions
FOR EACH ROW EXECUTE FUNCTION public.validate_debate_session_status();

CREATE OR REPLACE FUNCTION public.validate_debate_argument_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.argument_type NOT IN ('challenge','defense','comparison','rebuttal','concession','synthesis') THEN
    RAISE EXCEPTION 'Invalid argument_type: %', NEW.argument_type;
  END IF;
  IF NEW.position_type IS NOT NULL AND NEW.position_type NOT IN ('proposal','counter_proposal','amendment','withdrawal') THEN
    RAISE EXCEPTION 'Invalid position_type: %', NEW.position_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_debate_position
BEFORE INSERT OR UPDATE ON public.agent_debate_positions
FOR EACH ROW EXECUTE FUNCTION public.validate_debate_argument_type();

CREATE TRIGGER trg_validate_debate_argument
BEFORE INSERT OR UPDATE ON public.agent_debate_arguments
FOR EACH ROW EXECUTE FUNCTION public.validate_debate_argument_type();

CREATE OR REPLACE FUNCTION public.validate_debate_resolution()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.resolution_type NOT IN ('winner_selected','consensus','unresolved','escalated','withdrawn') THEN
    RAISE EXCEPTION 'Invalid resolution_type: %', NEW.resolution_type;
  END IF;
  IF NEW.human_review_status IS NOT NULL AND NEW.human_review_status NOT IN ('pending','approved','rejected','deferred') THEN
    RAISE EXCEPTION 'Invalid human_review_status: %', NEW.human_review_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_debate_resolution
BEFORE INSERT OR UPDATE ON public.agent_debate_resolutions
FOR EACH ROW EXECUTE FUNCTION public.validate_debate_resolution();

-- RLS
ALTER TABLE public.agent_debate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_debate_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_debate_arguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_debate_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage debate sessions" ON public.agent_debate_sessions FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage debate positions" ON public.agent_debate_positions FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage debate arguments" ON public.agent_debate_arguments FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage debate resolutions" ON public.agent_debate_resolutions FOR ALL USING (public.is_org_member(auth.uid(), organization_id));

-- Indexes
CREATE INDEX idx_debate_sessions_org ON public.agent_debate_sessions(organization_id);
CREATE INDEX idx_debate_sessions_status ON public.agent_debate_sessions(status);
CREATE INDEX idx_debate_positions_session ON public.agent_debate_positions(session_id);
CREATE INDEX idx_debate_arguments_session ON public.agent_debate_arguments(session_id);
CREATE INDEX idx_debate_resolutions_session ON public.agent_debate_resolutions(session_id);
