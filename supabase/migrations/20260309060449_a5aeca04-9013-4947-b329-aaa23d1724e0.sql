
-- Sprint 104: Sovereign Decision Rights Orchestration

-- Enums
CREATE TYPE public.decision_authority_level AS ENUM ('formal','delegated','temporary','emergency','advisory','prohibited');
CREATE TYPE public.decision_evaluation_result AS ENUM ('allowed','delegated','denied','escalated','contested');
CREATE TYPE public.constitution_status AS ENUM ('draft','active','superseded','deprecated');

-- 1) decision_rights_constitutions
CREATE TABLE public.decision_rights_constitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_code text NOT NULL DEFAULT '',
  constitution_name text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'organization',
  status public.constitution_status NOT NULL DEFAULT 'draft',
  authority_principles text NOT NULL DEFAULT '',
  escalation_defaults jsonb NOT NULL DEFAULT '{}',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.decision_rights_constitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_drc" ON public.decision_rights_constitutions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_drc" ON public.decision_rights_constitutions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_drc" ON public.decision_rights_constitutions FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 2) decision_authority_domains
CREATE TABLE public.decision_authority_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_code text NOT NULL DEFAULT '',
  domain_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  sensitivity_level text NOT NULL DEFAULT 'standard',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.decision_authority_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_dad" ON public.decision_authority_domains FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_dad" ON public.decision_authority_domains FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 3) decision_rights
CREATE TABLE public.decision_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_code text NOT NULL DEFAULT '',
  constitution_id uuid REFERENCES public.decision_rights_constitutions(id),
  domain_id uuid REFERENCES public.decision_authority_domains(id),
  decision_type text NOT NULL DEFAULT '',
  authority_level public.decision_authority_level NOT NULL DEFAULT 'formal',
  subject_type text NOT NULL DEFAULT '',
  subject_ref text NOT NULL DEFAULT '',
  scope_type text NOT NULL DEFAULT '',
  scope_ref text NOT NULL DEFAULT '',
  decision_rule_text text NOT NULL DEFAULT '',
  precedence_rank integer NOT NULL DEFAULT 0,
  review_required boolean NOT NULL DEFAULT false,
  revocable boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.decision_rights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_dr" ON public.decision_rights FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_dr" ON public.decision_rights FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_dr" ON public.decision_rights FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 4) authority_delegations
CREATE TABLE public.authority_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_right_id uuid REFERENCES public.decision_rights(id),
  delegated_from_type text NOT NULL DEFAULT '',
  delegated_from_ref text NOT NULL DEFAULT '',
  delegated_to_type text NOT NULL DEFAULT '',
  delegated_to_ref text NOT NULL DEFAULT '',
  delegation_type text NOT NULL DEFAULT 'standard',
  delegation_reason text NOT NULL DEFAULT '',
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  revocation_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.authority_delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_ad" ON public.authority_delegations FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_ad" ON public.authority_delegations FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_ad" ON public.authority_delegations FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 5) decision_authority_evaluations
CREATE TABLE public.decision_authority_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_id uuid REFERENCES public.decision_authority_domains(id),
  decision_type text NOT NULL DEFAULT '',
  actor_type text NOT NULL DEFAULT '',
  actor_ref text NOT NULL DEFAULT '',
  context_payload jsonb NOT NULL DEFAULT '{}',
  evaluation_result public.decision_evaluation_result NOT NULL DEFAULT 'denied',
  authority_basis jsonb NOT NULL DEFAULT '{}',
  overlap_risk_score numeric NOT NULL DEFAULT 0,
  legitimacy_score numeric NOT NULL DEFAULT 0,
  explanation_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.decision_authority_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_dae" ON public.decision_authority_evaluations FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_dae" ON public.decision_authority_evaluations FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 6) authority_conflict_events
CREATE TABLE public.authority_conflict_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_id uuid REFERENCES public.decision_authority_domains(id),
  conflict_type text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',
  event_summary text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.authority_conflict_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_ace" ON public.authority_conflict_events FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_ace" ON public.authority_conflict_events FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_drc_org ON public.decision_rights_constitutions(organization_id);
CREATE INDEX idx_dad_org ON public.decision_authority_domains(organization_id);
CREATE INDEX idx_dr_org ON public.decision_rights(organization_id);
CREATE INDEX idx_dr_domain ON public.decision_rights(domain_id);
CREATE INDEX idx_ad_org ON public.authority_delegations(organization_id);
CREATE INDEX idx_dae_org ON public.decision_authority_evaluations(organization_id);
CREATE INDEX idx_ace_org ON public.authority_conflict_events(organization_id);
