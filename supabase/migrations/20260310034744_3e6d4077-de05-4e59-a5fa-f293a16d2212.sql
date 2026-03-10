
-- Sprint 119: Live Runtime Feedback Mesh

CREATE TABLE public.runtime_feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID,
  artifact_id UUID,
  execution_id UUID,
  deploy_id UUID,
  event_type TEXT NOT NULL DEFAULT 'observation',
  event_source TEXT NOT NULL DEFAULT 'system',
  severity TEXT NOT NULL DEFAULT 'info',
  affected_surface TEXT DEFAULT '',
  observed_behavior TEXT DEFAULT '',
  linked_validation_result UUID,
  linked_repair_result UUID,
  linked_canon_entry UUID,
  outcome_classification TEXT NOT NULL DEFAULT 'neutral',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_feedback_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage runtime feedback events" ON public.runtime_feedback_events FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.runtime_outcome_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  event_id UUID NOT NULL REFERENCES public.runtime_feedback_events(id),
  lineage_type TEXT NOT NULL DEFAULT 'deploy_to_runtime',
  source_type TEXT NOT NULL DEFAULT '',
  source_id UUID,
  target_type TEXT NOT NULL DEFAULT '',
  target_id UUID,
  correlation_score NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_outcome_lineage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage runtime outcome lineage" ON public.runtime_outcome_lineage FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.deploy_outcome_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  deploy_id UUID,
  initiative_id UUID,
  deploy_status TEXT NOT NULL DEFAULT 'unknown',
  deploy_environment TEXT NOT NULL DEFAULT 'production',
  deployed_at TIMESTAMPTZ,
  first_error_at TIMESTAMPTZ,
  rollback_at TIMESTAMPTZ,
  stability_window_hours INTEGER NOT NULL DEFAULT 24,
  stability_score NUMERIC NOT NULL DEFAULT 0,
  outcome_summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deploy_outcome_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage deploy outcome records" ON public.deploy_outcome_records FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.runtime_incident_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  event_id UUID REFERENCES public.runtime_feedback_events(id),
  incident_type TEXT NOT NULL DEFAULT 'error',
  severity TEXT NOT NULL DEFAULT 'medium',
  affected_component TEXT DEFAULT '',
  symptom_summary TEXT DEFAULT '',
  root_cause_hypothesis TEXT DEFAULT '',
  linked_deploy_id UUID,
  resolution_status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_incident_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage runtime incident signals" ON public.runtime_incident_signals FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.s119_rollback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  deploy_id UUID,
  initiative_id UUID,
  rollback_reason TEXT DEFAULT '',
  rollback_type TEXT NOT NULL DEFAULT 'manual',
  triggered_by TEXT DEFAULT '',
  rolled_back_to TEXT DEFAULT '',
  linked_incident_id UUID REFERENCES public.runtime_incident_signals(id),
  outcome_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.s119_rollback_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage s119 rollback events" ON public.s119_rollback_events FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.degraded_service_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  affected_surface TEXT DEFAULT '',
  degradation_type TEXT NOT NULL DEFAULT 'partial',
  severity TEXT NOT NULL DEFAULT 'medium',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  linked_deploy_id UUID,
  linked_incident_id UUID REFERENCES public.runtime_incident_signals(id),
  root_cause TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.degraded_service_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage degraded service windows" ON public.degraded_service_windows FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.usage_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  snapshot_period TEXT NOT NULL DEFAULT 'daily',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_events INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  incident_count INTEGER NOT NULL DEFAULT 0,
  rollback_count INTEGER NOT NULL DEFAULT 0,
  stability_score NUMERIC NOT NULL DEFAULT 0,
  health_classification TEXT NOT NULL DEFAULT 'healthy',
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.usage_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage usage health snapshots" ON public.usage_health_snapshots FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE public.delivery_outcome_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  initiative_id UUID,
  deploy_outcome_id UUID REFERENCES public.deploy_outcome_records(id),
  runtime_event_id UUID REFERENCES public.runtime_feedback_events(id),
  link_type TEXT NOT NULL DEFAULT 'causal',
  confidence NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_outcome_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage delivery outcome links" ON public.delivery_outcome_links FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE INDEX idx_rtfb_events_org ON public.runtime_feedback_events(organization_id);
CREATE INDEX idx_rtfb_events_type ON public.runtime_feedback_events(event_type);
CREATE INDEX idx_rtfb_events_occurred ON public.runtime_feedback_events(occurred_at);
CREATE INDEX idx_rt_outcome_lineage_event ON public.runtime_outcome_lineage(event_id);
CREATE INDEX idx_deploy_outcome_rec_org ON public.deploy_outcome_records(organization_id);
CREATE INDEX idx_rt_incident_signals_org ON public.runtime_incident_signals(organization_id);
CREATE INDEX idx_s119_rollback_org ON public.s119_rollback_events(organization_id);
CREATE INDEX idx_degraded_svc_win_org ON public.degraded_service_windows(organization_id);
CREATE INDEX idx_usage_health_snap_org ON public.usage_health_snapshots(organization_id);
CREATE INDEX idx_delivery_out_links_org ON public.delivery_outcome_links(organization_id);
