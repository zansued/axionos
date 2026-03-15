-- NS-06: Governed Action Execution & Learning Feedback

-- 1. autonomic_actions table
CREATE TABLE public.autonomic_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  surfaced_item_id uuid NOT NULL,
  decision_id uuid NOT NULL,
  event_id uuid NOT NULL,
  signal_group_id uuid,
  action_type text NOT NULL,
  execution_mode text NOT NULL DEFAULT 'manual',
  execution_status text NOT NULL DEFAULT 'pending',
  action_payload jsonb NOT NULL DEFAULT '{}',
  expected_outcome jsonb NOT NULL DEFAULT '{}',
  execution_result jsonb NOT NULL DEFAULT '{}',
  execution_error jsonb NOT NULL DEFAULT '{}',
  policy_snapshot jsonb NOT NULL DEFAULT '{}',
  approved_by text,
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  action_metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_autonomic_actions_org_status_created ON public.autonomic_actions(organization_id, execution_status, created_at DESC);
CREATE INDEX idx_autonomic_actions_org_type_status ON public.autonomic_actions(organization_id, action_type, execution_status);
CREATE INDEX idx_autonomic_actions_decision_id ON public.autonomic_actions(decision_id);
CREATE UNIQUE INDEX idx_autonomic_actions_surfaced_item ON public.autonomic_actions(surfaced_item_id);

ALTER TABLE public.autonomic_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read autonomic_actions"
ON public.autonomic_actions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = autonomic_actions.organization_id
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can insert autonomic_actions"
ON public.autonomic_actions FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update autonomic_actions"
ON public.autonomic_actions FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- 2. nervous_system_learning_feedback table
CREATE TABLE public.nervous_system_learning_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  action_id uuid NOT NULL,
  surfaced_item_id uuid NOT NULL,
  decision_id uuid NOT NULL,
  event_id uuid NOT NULL,
  signal_group_id uuid,
  feedback_type text NOT NULL,
  feedback_score numeric,
  was_successful boolean,
  expected_outcome_met boolean,
  operator_signal text,
  feedback_reason text,
  measured_metrics jsonb NOT NULL DEFAULT '{}',
  feedback_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ns_learning_feedback_org_type_created ON public.nervous_system_learning_feedback(organization_id, feedback_type, created_at DESC);
CREATE INDEX idx_ns_learning_feedback_action_id ON public.nervous_system_learning_feedback(action_id);
CREATE INDEX idx_ns_learning_feedback_decision_id ON public.nervous_system_learning_feedback(decision_id);
CREATE INDEX idx_ns_learning_feedback_event_id ON public.nervous_system_learning_feedback(event_id);

ALTER TABLE public.nervous_system_learning_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read learning_feedback"
ON public.nervous_system_learning_feedback FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = nervous_system_learning_feedback.organization_id
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can insert learning_feedback"
ON public.nervous_system_learning_feedback FOR INSERT TO service_role
WITH CHECK (true);

-- 3. Extend nervous_system_surfaced_items
ALTER TABLE public.nervous_system_surfaced_items
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS execution_status text,
  ADD COLUMN IF NOT EXISTS action_id uuid;

-- 4. Extend nervous_system_decisions
ALTER TABLE public.nervous_system_decisions
  ADD COLUMN IF NOT EXISTS execution_status text;