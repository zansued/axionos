
CREATE TABLE public.security_audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'success',
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view security audit events"
  ON public.security_audit_events
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_security_audit_events_org ON public.security_audit_events(organization_id);
CREATE INDEX idx_security_audit_events_actor ON public.security_audit_events(actor_id);
CREATE INDEX idx_security_audit_events_function ON public.security_audit_events(function_name);
