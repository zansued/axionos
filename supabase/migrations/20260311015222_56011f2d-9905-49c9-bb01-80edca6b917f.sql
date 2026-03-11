
-- Sprint 146: Purple Learning & Security Canonization

CREATE TABLE public.security_canon_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  domain TEXT NOT NULL DEFAULT 'general',
  stack TEXT,
  pattern_type TEXT NOT NULL DEFAULT 'secure_implementation_pattern',
  summary TEXT NOT NULL DEFAULT '',
  when_to_use TEXT NOT NULL DEFAULT '',
  when_not_to_use TEXT NOT NULL DEFAULT '',
  guidance TEXT NOT NULL DEFAULT '',
  example TEXT,
  source_incident_id UUID REFERENCES public.blue_team_incidents(id),
  source_red_team_run UUID REFERENCES public.red_team_simulation_runs(id),
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'candidate',
  superseded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_canon_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.security_canon_candidates FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.security_pattern_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  domain TEXT NOT NULL DEFAULT 'general',
  stack TEXT,
  pattern_type TEXT NOT NULL DEFAULT 'secure_architecture_pattern',
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  when_to_use TEXT NOT NULL DEFAULT '',
  when_not_to_use TEXT NOT NULL DEFAULT '',
  guidance TEXT NOT NULL DEFAULT '',
  example TEXT,
  agent_types TEXT[] NOT NULL DEFAULT '{}',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  superseded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_pattern_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.security_pattern_entries FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.security_anti_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  domain TEXT NOT NULL DEFAULT 'general',
  anti_pattern_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  why_dangerous TEXT NOT NULL DEFAULT '',
  alternative_guidance TEXT NOT NULL DEFAULT '',
  detection_hint TEXT NOT NULL DEFAULT '',
  source_incident_id UUID REFERENCES public.blue_team_incidents(id),
  severity TEXT NOT NULL DEFAULT 'medium',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_anti_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.security_anti_patterns FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.secure_development_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  checklist_name TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT 'general',
  target_agent_type TEXT NOT NULL DEFAULT 'BuildAgent',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity_if_skipped TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.secure_development_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.secure_development_checklists FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.security_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  rule_name TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT 'general',
  rule_type TEXT NOT NULL DEFAULT 'validation_rule',
  condition_description TEXT NOT NULL DEFAULT '',
  expected_outcome TEXT NOT NULL DEFAULT '',
  failure_action TEXT NOT NULL DEFAULT 'flag_for_review',
  target_agent_type TEXT NOT NULL DEFAULT 'ValidationAgent',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_validation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.security_validation_rules FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.purple_learning_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  candidate_id UUID REFERENCES public.security_canon_candidates(id),
  review_type TEXT NOT NULL DEFAULT 'canonization_review',
  reviewer_id TEXT,
  decision TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT NOT NULL DEFAULT '',
  promoted_to_pattern_id UUID REFERENCES public.security_pattern_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purple_learning_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.purple_learning_reviews FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.security_canon_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  pattern_id UUID REFERENCES public.security_pattern_entries(id),
  source_type TEXT NOT NULL DEFAULT 'red_team',
  source_ref TEXT NOT NULL DEFAULT '',
  lineage_description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_canon_lineage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.security_canon_lineage FOR ALL USING (true) WITH CHECK (true);
