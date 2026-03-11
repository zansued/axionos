
-- Sprint 144: Red Team Simulation Framework

-- 1. red_team_exercises
CREATE TABLE public.red_team_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  exercise_name TEXT NOT NULL DEFAULT 'Unnamed Exercise',
  target_surface TEXT NOT NULL DEFAULT 'general',
  threat_domain TEXT NOT NULL DEFAULT 'unknown',
  scenario_type TEXT NOT NULL DEFAULT 'general',
  sandbox_mode BOOLEAN NOT NULL DEFAULT true,
  simulation_scope TEXT NOT NULL DEFAULT 'bounded',
  fragility_score NUMERIC NOT NULL DEFAULT 0,
  finding_count INTEGER NOT NULL DEFAULT 0,
  breach_detected BOOLEAN NOT NULL DEFAULT false,
  severity_summary TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'draft',
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.red_team_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.red_team_exercises FOR ALL USING (true) WITH CHECK (true);

-- 2. red_team_scenarios
CREATE TABLE public.red_team_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  exercise_id UUID REFERENCES public.red_team_exercises(id),
  scenario_name TEXT NOT NULL DEFAULT 'Unnamed Scenario',
  scenario_type TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT '',
  target_surface TEXT NOT NULL DEFAULT 'general',
  threat_domain TEXT NOT NULL DEFAULT 'unknown',
  severity TEXT NOT NULL DEFAULT 'low',
  preconditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_outcome TEXT NOT NULL DEFAULT '',
  sandbox_only BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.red_team_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.red_team_scenarios FOR ALL USING (true) WITH CHECK (true);

-- 3. red_team_simulation_runs
CREATE TABLE public.red_team_simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  exercise_id UUID REFERENCES public.red_team_exercises(id),
  scenario_id UUID REFERENCES public.red_team_scenarios(id),
  run_label TEXT NOT NULL DEFAULT 'Run',
  sandbox_mode BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  result_summary TEXT NOT NULL DEFAULT '',
  resisted_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  fragile_count INTEGER NOT NULL DEFAULT 0,
  breach_detected BOOLEAN NOT NULL DEFAULT false,
  run_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.red_team_simulation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.red_team_simulation_runs FOR ALL USING (true) WITH CHECK (true);

-- 4. red_team_fragility_signals
CREATE TABLE public.red_team_fragility_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  run_id UUID REFERENCES public.red_team_simulation_runs(id),
  signal_type TEXT NOT NULL DEFAULT 'fragility',
  target_surface TEXT NOT NULL DEFAULT 'unknown',
  fragility_score NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_action TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.red_team_fragility_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.red_team_fragility_signals FOR ALL USING (true) WITH CHECK (true);

-- 5. red_team_boundary_breaches
CREATE TABLE public.red_team_boundary_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  run_id UUID REFERENCES public.red_team_simulation_runs(id),
  breach_type TEXT NOT NULL DEFAULT 'boundary_violation',
  target_boundary TEXT NOT NULL DEFAULT 'unknown',
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  remediation_hint TEXT NOT NULL DEFAULT '',
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.red_team_boundary_breaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.red_team_boundary_breaches FOR ALL USING (true) WITH CHECK (true);

-- 6. red_team_findings
CREATE TABLE public.red_team_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  exercise_id UUID REFERENCES public.red_team_exercises(id),
  run_id UUID REFERENCES public.red_team_simulation_runs(id),
  finding_type TEXT NOT NULL DEFAULT 'vulnerability',
  title TEXT NOT NULL DEFAULT 'Unnamed Finding',
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  affected_surface TEXT NOT NULL DEFAULT 'unknown',
  threat_domain TEXT NOT NULL DEFAULT 'unknown',
  what_resisted TEXT NOT NULL DEFAULT '',
  what_failed TEXT NOT NULL DEFAULT '',
  what_was_fragile TEXT NOT NULL DEFAULT '',
  recommended_followup TEXT NOT NULL DEFAULT '',
  blue_team_action TEXT NOT NULL DEFAULT '',
  purple_team_action TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.red_team_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.red_team_findings FOR ALL USING (true) WITH CHECK (true);

-- 7. red_team_review_queue
CREATE TABLE public.red_team_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  finding_id UUID REFERENCES public.red_team_findings(id),
  exercise_id UUID REFERENCES public.red_team_exercises(id),
  review_type TEXT NOT NULL DEFAULT 'finding_review',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT,
  review_notes TEXT NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.red_team_review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.red_team_review_queue FOR ALL USING (true) WITH CHECK (true);
