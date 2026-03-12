
-- Sprint 195: Automated Security Monitoring & Alerting

-- Security monitoring alerts
CREATE TABLE public.security_monitoring_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'unknown',
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  source_category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  evidence_snapshot JSONB NOT NULL DEFAULT '{}',
  related_objects JSONB NOT NULL DEFAULT '[]',
  triggering_signals JSONB NOT NULL DEFAULT '[]',
  actor_id TEXT,
  source_ref TEXT,
  correlation_group TEXT,
  recommended_action TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view security monitoring alerts"
  ON public.security_monitoring_alerts
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_sec_mon_alerts_org ON public.security_monitoring_alerts(organization_id);
CREATE INDEX idx_sec_mon_alerts_status ON public.security_monitoring_alerts(status);
CREATE INDEX idx_sec_mon_alerts_type ON public.security_monitoring_alerts(alert_type);
CREATE INDEX idx_sec_mon_alerts_severity ON public.security_monitoring_alerts(severity);
CREATE INDEX idx_sec_mon_alerts_created ON public.security_monitoring_alerts(created_at DESC);

-- Security monitoring signals (raw ingested signals before alert generation)
CREATE TABLE public.security_monitoring_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL DEFAULT 'unknown',
  signal_category TEXT NOT NULL DEFAULT 'general',
  severity TEXT NOT NULL DEFAULT 'low',
  source_function TEXT,
  actor_id TEXT,
  source_ref TEXT,
  description TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '{}',
  alert_id UUID REFERENCES public.security_monitoring_alerts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_monitoring_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view security monitoring signals"
  ON public.security_monitoring_signals
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_sec_mon_signals_org ON public.security_monitoring_signals(organization_id);
CREATE INDEX idx_sec_mon_signals_type ON public.security_monitoring_signals(signal_type);
CREATE INDEX idx_sec_mon_signals_category ON public.security_monitoring_signals(signal_category);
CREATE INDEX idx_sec_mon_signals_created ON public.security_monitoring_signals(created_at DESC);
