
-- Sprint 114: Kernel Integrity & Anti-Corrosion Guard

-- Enums
CREATE TYPE public.kernel_review_status AS ENUM ('pending', 'under_review', 'reviewed', 'escalated', 'resolved');
CREATE TYPE public.corrosion_severity AS ENUM ('low', 'moderate', 'high', 'critical');
CREATE TYPE public.kernel_action_type AS ENUM ('freeze', 'simplify', 'deprecate', 'consolidate', 'extraordinary_review', 'monitor', 'no_action');

-- 1. kernel_integrity_snapshots
CREATE TABLE public.kernel_integrity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kernel_identity_version TEXT NOT NULL DEFAULT '1.0',
  protected_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  legibility_score NUMERIC NOT NULL DEFAULT 0,
  governance_integrity_score NUMERIC NOT NULL DEFAULT 0,
  architectural_coherence_score NUMERIC NOT NULL DEFAULT 0,
  bloat_score NUMERIC NOT NULL DEFAULT 0,
  corrosion_score NUMERIC NOT NULL DEFAULT 0,
  existential_drift_score NUMERIC NOT NULL DEFAULT 0,
  mutation_pressure_score NUMERIC NOT NULL DEFAULT 0,
  overall_health_score NUMERIC NOT NULL DEFAULT 0,
  snapshot_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kernel_integrity_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_kernel_snapshots" ON public.kernel_integrity_snapshots FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_kernel_snapshots" ON public.kernel_integrity_snapshots FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_kernel_snapshots_org ON public.kernel_integrity_snapshots(organization_id, created_at DESC);

-- 2. kernel_boundary_rules
CREATE TABLE public.kernel_boundary_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  domain_description TEXT NOT NULL DEFAULT '',
  protection_level TEXT NOT NULL DEFAULT 'protected',
  mutation_allowed BOOLEAN NOT NULL DEFAULT false,
  extraordinary_review_required BOOLEAN NOT NULL DEFAULT true,
  invariants JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kernel_boundary_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_kernel_rules" ON public.kernel_boundary_rules FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_kernel_rules" ON public.kernel_boundary_rules FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_kernel_rules" ON public.kernel_boundary_rules FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 3. corrosion_signals
CREATE TABLE public.corrosion_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL DEFAULT 'unknown',
  severity corrosion_severity NOT NULL DEFAULT 'low',
  affected_domain TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  corrosion_score NUMERIC NOT NULL DEFAULT 0,
  recurrence_count INT NOT NULL DEFAULT 0,
  remediation_hint TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.corrosion_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_corrosion" ON public.corrosion_signals FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_corrosion" ON public.corrosion_signals FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_corrosion" ON public.corrosion_signals FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_corrosion_org ON public.corrosion_signals(organization_id, created_at DESC);

-- 4. architectural_bloat_indicators
CREATE TABLE public.architectural_bloat_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indicator_type TEXT NOT NULL DEFAULT 'unknown',
  affected_layer TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  bloat_score NUMERIC NOT NULL DEFAULT 0,
  complexity_delta NUMERIC NOT NULL DEFAULT 0,
  capability_delta NUMERIC NOT NULL DEFAULT 0,
  net_value_score NUMERIC NOT NULL DEFAULT 0,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.architectural_bloat_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_bloat" ON public.architectural_bloat_indicators FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_bloat" ON public.architectural_bloat_indicators FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_bloat_org ON public.architectural_bloat_indicators(organization_id, created_at DESC);

-- 5. existential_drift_cases
CREATE TABLE public.existential_drift_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  drift_type TEXT NOT NULL DEFAULT 'unknown',
  violated_principle TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  drift_score NUMERIC NOT NULL DEFAULT 0,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity corrosion_severity NOT NULL DEFAULT 'low',
  remediation_path TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.existential_drift_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_drift_cases" ON public.existential_drift_cases FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_drift_cases" ON public.existential_drift_cases FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_drift_cases" ON public.existential_drift_cases FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_drift_cases_org ON public.existential_drift_cases(organization_id, created_at DESC);

-- 6. kernel_protection_reviews
CREATE TABLE public.kernel_protection_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.kernel_integrity_snapshots(id),
  reviewer_id TEXT,
  review_type TEXT NOT NULL DEFAULT 'routine',
  review_scope TEXT NOT NULL DEFAULT 'full',
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_posture TEXT NOT NULL DEFAULT 'healthy',
  status kernel_review_status NOT NULL DEFAULT 'pending',
  review_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kernel_protection_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_kernel_reviews" ON public.kernel_protection_reviews FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_kernel_reviews" ON public.kernel_protection_reviews FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_kernel_reviews" ON public.kernel_protection_reviews FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 7. kernel_integrity_actions
CREATE TABLE public.kernel_integrity_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.kernel_protection_reviews(id),
  action_type kernel_action_type NOT NULL DEFAULT 'no_action',
  target_domain TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  urgency_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'proposed',
  operator_decision TEXT,
  operator_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kernel_integrity_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_kernel_actions" ON public.kernel_integrity_actions FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_kernel_actions" ON public.kernel_integrity_actions FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_kernel_actions" ON public.kernel_integrity_actions FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_kernel_actions_org ON public.kernel_integrity_actions(organization_id, created_at DESC);
