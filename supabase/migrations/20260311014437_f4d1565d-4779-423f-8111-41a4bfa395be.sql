
-- Sprint 145: Blue Team Detection, Response & Recovery

CREATE TABLE public.blue_team_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'anomaly',
  detection_category TEXT NOT NULL DEFAULT 'contract_anomaly',
  target_surface TEXT NOT NULL DEFAULT 'general',
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blue_team_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.blue_team_alerts FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.blue_team_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  incident_type TEXT NOT NULL DEFAULT 'anomaly',
  related_red_team_run UUID REFERENCES public.red_team_simulation_runs(id),
  related_alert_id UUID REFERENCES public.blue_team_alerts(id),
  target_surface TEXT NOT NULL DEFAULT 'general',
  severity TEXT NOT NULL DEFAULT 'medium',
  detection_source TEXT NOT NULL DEFAULT 'automated',
  anomaly_summary TEXT NOT NULL DEFAULT '',
  response_status TEXT NOT NULL DEFAULT 'open',
  containment_applied BOOLEAN NOT NULL DEFAULT false,
  rollback_recommended BOOLEAN NOT NULL DEFAULT false,
  recovery_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blue_team_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.blue_team_incidents FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.blue_team_response_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  incident_id UUID REFERENCES public.blue_team_incidents(id),
  action_type TEXT NOT NULL DEFAULT 'recommend_human_review',
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  executed_by TEXT,
  outcome_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blue_team_response_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.blue_team_response_actions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.blue_team_containment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  incident_id UUID REFERENCES public.blue_team_incidents(id),
  containment_type TEXT NOT NULL DEFAULT 'isolate_execution',
  scope TEXT NOT NULL DEFAULT 'bounded',
  description TEXT NOT NULL DEFAULT '',
  applied BOOLEAN NOT NULL DEFAULT false,
  rollback_available BOOLEAN NOT NULL DEFAULT true,
  applied_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blue_team_containment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.blue_team_containment_events FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.blue_team_recovery_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  incident_id UUID REFERENCES public.blue_team_incidents(id),
  recovery_type TEXT NOT NULL DEFAULT 'standard',
  target_surface TEXT NOT NULL DEFAULT 'general',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  recovery_status TEXT NOT NULL DEFAULT 'pending',
  rollback_executed BOOLEAN NOT NULL DEFAULT false,
  integrity_verified BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blue_team_recovery_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.blue_team_recovery_flows FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.blue_team_runbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  runbook_name TEXT NOT NULL DEFAULT 'Unnamed Runbook',
  detection_category TEXT NOT NULL DEFAULT 'contract_anomaly',
  severity_threshold TEXT NOT NULL DEFAULT 'medium',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  response_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalation_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blue_team_runbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.blue_team_runbooks FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.blue_team_outcome_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  incident_id UUID REFERENCES public.blue_team_incidents(id),
  outcome_type TEXT NOT NULL DEFAULT 'resolved',
  resolution_summary TEXT NOT NULL DEFAULT '',
  time_to_detect_ms INTEGER,
  time_to_contain_ms INTEGER,
  time_to_recover_ms INTEGER,
  lessons_learned TEXT NOT NULL DEFAULT '',
  purple_followup_created BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blue_team_outcome_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.blue_team_outcome_records FOR ALL USING (true) WITH CHECK (true);
