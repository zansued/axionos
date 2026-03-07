
-- Repair Routing Log table — Sprint 9
CREATE TABLE public.repair_routing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  error_category text NOT NULL DEFAULT '',
  error_signature text NOT NULL DEFAULT '',
  pipeline_stage text NOT NULL DEFAULT '',
  selected_strategy text NOT NULL DEFAULT '',
  strategy_rankings jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score numeric NOT NULL DEFAULT 0,
  decision_source text NOT NULL DEFAULT 'static_map',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_repair_routing_log_org ON public.repair_routing_log(organization_id);
CREATE INDEX idx_repair_routing_log_initiative ON public.repair_routing_log(initiative_id);
CREATE INDEX idx_repair_routing_log_category ON public.repair_routing_log(error_category);
CREATE INDEX idx_repair_routing_log_created ON public.repair_routing_log(created_at DESC);

ALTER TABLE public.repair_routing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors+ can manage routing log"
  ON public.repair_routing_log FOR ALL TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Org members can view routing log"
  ON public.repair_routing_log FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
