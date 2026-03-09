
-- Sprint 100: Institutional Conflict Resolution Engine

-- Enums
CREATE TYPE public.conflict_type AS ENUM ('doctrine', 'priority', 'policy', 'jurisdiction', 'resource', 'sequencing', 'compliance', 'interpretation');
CREATE TYPE public.conflict_status AS ENUM ('detected', 'triaged', 'under_review', 'resolved', 'escalated', 'archived');
CREATE TYPE public.resolution_path_type AS ENUM ('mediation', 'override', 'exception', 'deferment', 'split_scope', 'escalation', 'rollback');

-- Institutional Conflicts
CREATE TABLE public.institutional_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_code TEXT NOT NULL DEFAULT '',
  conflict_type public.conflict_type NOT NULL DEFAULT 'policy',
  conflict_title TEXT NOT NULL DEFAULT '',
  conflict_summary TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  urgency TEXT NOT NULL DEFAULT 'normal',
  blast_radius TEXT NOT NULL DEFAULT 'local',
  involved_domains JSONB NOT NULL DEFAULT '[]',
  involved_subjects JSONB NOT NULL DEFAULT '[]',
  detected_by TEXT NOT NULL DEFAULT 'system',
  status public.conflict_status NOT NULL DEFAULT 'detected',
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conflict Evidence Records
CREATE TABLE public.conflict_evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL REFERENCES public.institutional_conflicts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  evidence_type TEXT NOT NULL DEFAULT '',
  evidence_source TEXT NOT NULL DEFAULT '',
  evidence_payload JSONB NOT NULL DEFAULT '{}',
  reliability_score NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conflict Resolution Paths
CREATE TABLE public.conflict_resolution_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL REFERENCES public.institutional_conflicts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  path_type public.resolution_path_type NOT NULL DEFAULT 'mediation',
  path_summary TEXT NOT NULL DEFAULT '',
  advisory_score NUMERIC NOT NULL DEFAULT 0,
  precedent_alignment_score NUMERIC NOT NULL DEFAULT 0,
  risk_tradeoff_score NUMERIC NOT NULL DEFAULT 0,
  recommended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conflict Resolution Events
CREATE TABLE public.conflict_resolution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL REFERENCES public.institutional_conflicts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  event_type TEXT NOT NULL DEFAULT '',
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT NOT NULL DEFAULT '',
  event_summary TEXT NOT NULL DEFAULT '',
  event_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conflict Precedents
CREATE TABLE public.conflict_precedents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  precedent_code TEXT NOT NULL DEFAULT '',
  conflict_type public.conflict_type NOT NULL DEFAULT 'policy',
  precedent_summary TEXT NOT NULL DEFAULT '',
  resolution_pattern TEXT NOT NULL DEFAULT '',
  outcome_quality_score NUMERIC NOT NULL DEFAULT 0,
  reusability_score NUMERIC NOT NULL DEFAULT 0,
  institutional_scope TEXT NOT NULL DEFAULT 'local',
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_institutional_conflicts_org ON public.institutional_conflicts(organization_id);
CREATE INDEX idx_institutional_conflicts_status ON public.institutional_conflicts(status);
CREATE INDEX idx_institutional_conflicts_type ON public.institutional_conflicts(conflict_type);
CREATE INDEX idx_conflict_evidence_conflict ON public.conflict_evidence_records(conflict_id);
CREATE INDEX idx_conflict_resolution_paths_conflict ON public.conflict_resolution_paths(conflict_id);
CREATE INDEX idx_conflict_resolution_events_conflict ON public.conflict_resolution_events(conflict_id);
CREATE INDEX idx_conflict_precedents_org ON public.conflict_precedents(organization_id);
CREATE INDEX idx_conflict_precedents_type ON public.conflict_precedents(conflict_type);

-- RLS
ALTER TABLE public.institutional_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflict_evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflict_resolution_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflict_resolution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflict_precedents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org institutional conflicts" ON public.institutional_conflicts FOR SELECT TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can insert own org institutional conflicts" ON public.institutional_conflicts FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can update own org institutional conflicts" ON public.institutional_conflicts FOR UPDATE TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));

CREATE POLICY "Users can view own org conflict evidence" ON public.conflict_evidence_records FOR SELECT TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can insert own org conflict evidence" ON public.conflict_evidence_records FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));

CREATE POLICY "Users can view own org conflict resolution paths" ON public.conflict_resolution_paths FOR SELECT TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can insert own org conflict resolution paths" ON public.conflict_resolution_paths FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));

CREATE POLICY "Users can view own org conflict resolution events" ON public.conflict_resolution_events FOR SELECT TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can insert own org conflict resolution events" ON public.conflict_resolution_events FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));

CREATE POLICY "Users can view own org conflict precedents" ON public.conflict_precedents FOR SELECT TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can insert own org conflict precedents" ON public.conflict_precedents FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
CREATE POLICY "Users can update own org conflict precedents" ON public.conflict_precedents FOR UPDATE TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE id = organization_id));
