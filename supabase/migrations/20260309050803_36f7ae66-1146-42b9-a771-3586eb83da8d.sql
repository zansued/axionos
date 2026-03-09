
-- Sprint 97: Bounded Autonomous Operations
-- Block T: Governed Intelligence OS

-- ─── Enums ────────────────────────────────────────────────────────────
CREATE TYPE public.autonomy_level AS ENUM (
  'recommend_only',
  'auto_execute_notify',
  'auto_execute_bounded',
  'requires_approval'
);

CREATE TYPE public.operation_status AS ENUM (
  'pending',
  'evaluating',
  'approved',
  'executing',
  'completed',
  'blocked',
  'rolled_back',
  'failed'
);

CREATE TYPE public.rollback_posture AS ENUM (
  'not_applicable',
  'manual_rollback',
  'auto_rollback_available',
  'auto_rolled_back'
);

-- ─── autonomous_operations ────────────────────────────────────────────
CREATE TABLE public.autonomous_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  operation_key TEXT NOT NULL DEFAULT '',
  operation_title TEXT NOT NULL DEFAULT '',
  operation_description TEXT NOT NULL DEFAULT '',
  operation_type TEXT NOT NULL DEFAULT 'low_risk_triage',
  execution_scope TEXT NOT NULL DEFAULT 'workspace',
  trigger_condition JSONB NOT NULL DEFAULT '{}',
  governing_doctrine_id UUID REFERENCES public.institutional_doctrines(id) ON DELETE SET NULL,
  governing_rule_id UUID,
  autonomy_level public.autonomy_level NOT NULL DEFAULT 'recommend_only',
  approval_posture TEXT NOT NULL DEFAULT 'advisory',
  rollback_posture public.rollback_posture NOT NULL DEFAULT 'not_applicable',
  status public.operation_status NOT NULL DEFAULT 'pending',
  execution_result JSONB,
  rollback_data JSONB,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  risk_score NUMERIC NOT NULL DEFAULT 0.1,
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ
);

ALTER TABLE public.autonomous_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view autonomous operations"
  ON public.autonomous_operations FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can manage autonomous operations"
  ON public.autonomous_operations FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- ─── autonomous_operation_rules ───────────────────────────────────────
CREATE TABLE public.autonomous_operation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL DEFAULT '',
  rule_title TEXT NOT NULL DEFAULT '',
  rule_description TEXT NOT NULL DEFAULT '',
  operation_type TEXT NOT NULL DEFAULT 'low_risk_triage',
  autonomy_level public.autonomy_level NOT NULL DEFAULT 'recommend_only',
  max_risk_score NUMERIC NOT NULL DEFAULT 0.3,
  required_confidence NUMERIC NOT NULL DEFAULT 0.6,
  governing_doctrine_id UUID REFERENCES public.institutional_doctrines(id) ON DELETE SET NULL,
  condition_payload JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  times_triggered INTEGER NOT NULL DEFAULT 0,
  times_blocked INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.autonomous_operation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view operation rules"
  ON public.autonomous_operation_rules FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can manage operation rules"
  ON public.autonomous_operation_rules FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- ─── autonomous_operation_executions ──────────────────────────────────
CREATE TABLE public.autonomous_operation_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES public.autonomous_operations(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.autonomous_operation_rules(id) ON DELETE SET NULL,
  execution_type TEXT NOT NULL DEFAULT 'auto',
  execution_input JSONB NOT NULL DEFAULT '{}',
  execution_output JSONB,
  success BOOLEAN,
  duration_ms INTEGER,
  rollback_available BOOLEAN NOT NULL DEFAULT false,
  rollback_executed BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.autonomous_operation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view operation executions"
  ON public.autonomous_operation_executions FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can manage operation executions"
  ON public.autonomous_operation_executions FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- ─── autonomous_operation_reviews ─────────────────────────────────────
CREATE TABLE public.autonomous_operation_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES public.autonomous_operations(id) ON DELETE CASCADE,
  reviewer_id UUID,
  review_action TEXT NOT NULL DEFAULT 'comment',
  review_notes TEXT NOT NULL DEFAULT '',
  approved BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.autonomous_operation_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view operation reviews"
  ON public.autonomous_operation_reviews FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can manage operation reviews"
  ON public.autonomous_operation_reviews FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Indexes
CREATE INDEX idx_autonomous_ops_org ON public.autonomous_operations(organization_id);
CREATE INDEX idx_autonomous_ops_status ON public.autonomous_operations(status);
CREATE INDEX idx_autonomous_ops_type ON public.autonomous_operations(operation_type);
CREATE INDEX idx_autonomous_ops_autonomy ON public.autonomous_operations(autonomy_level);
CREATE INDEX idx_autonomous_op_rules_org ON public.autonomous_operation_rules(organization_id);
CREATE INDEX idx_autonomous_op_execs_op ON public.autonomous_operation_executions(operation_id);
CREATE INDEX idx_autonomous_op_reviews_op ON public.autonomous_operation_reviews(operation_id);
