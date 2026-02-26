
-- Create audit_logs table for tracking system events
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  severity TEXT NOT NULL DEFAULT 'info',
  entity_type TEXT,
  entity_id UUID,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view own audit logs"
ON public.audit_logs FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own logs
CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_audit_logs_user_created ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_category ON public.audit_logs (category);
CREATE INDEX idx_audit_logs_severity ON public.audit_logs (severity);

-- Create a function to auto-log agent/story changes
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, category, entity_type, entity_id, message, severity)
  VALUES (
    COALESCE(NEW.user_id, auth.uid()),
    TG_ARGV[0],
    TG_ARGV[1],
    TG_TABLE_NAME,
    NEW.id,
    TG_ARGV[0] || ' on ' || TG_TABLE_NAME || ': ' || COALESCE(NEW.title, NEW.name, NEW.id::text),
    'info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for auto-logging
CREATE TRIGGER audit_agent_insert AFTER INSERT ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event('created', 'agents');

CREATE TRIGGER audit_agent_update AFTER UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event('updated', 'agents');

CREATE TRIGGER audit_story_insert AFTER INSERT ON public.stories
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event('created', 'stories');

CREATE TRIGGER audit_story_update AFTER UPDATE ON public.stories
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event('updated', 'stories');
