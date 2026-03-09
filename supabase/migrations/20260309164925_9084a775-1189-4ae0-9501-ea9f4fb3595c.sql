
-- Sprint 109 — Mission Integrity & Drift Prevention

-- mission_constitutions
CREATE TABLE public.mission_constitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_code text NOT NULL DEFAULT '',
  constitution_name text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'organization',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','superseded','deprecated')),
  mission_statement text NOT NULL DEFAULT '',
  identity_principles text NOT NULL DEFAULT '',
  protected_commitments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mission_constitutions_org ON public.mission_constitutions(organization_id);
ALTER TABLE public.mission_constitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view mission_constitutions" ON public.mission_constitutions FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert mission_constitutions" ON public.mission_constitutions FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update mission_constitutions" ON public.mission_constitutions FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- mission_integrity_subjects
CREATE TABLE public.mission_integrity_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_code text NOT NULL DEFAULT '',
  subject_type text NOT NULL DEFAULT 'initiative' CHECK (subject_type IN ('decision','initiative','workflow','portfolio','policy','evolution_change')),
  subject_ref text NOT NULL DEFAULT '',
  domain text NOT NULL DEFAULT 'general',
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mission_integrity_subjects_org ON public.mission_integrity_subjects(organization_id);
ALTER TABLE public.mission_integrity_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view mission_integrity_subjects" ON public.mission_integrity_subjects FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert mission_integrity_subjects" ON public.mission_integrity_subjects FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- mission_alignment_evaluations
CREATE TABLE public.mission_alignment_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_id uuid NOT NULL REFERENCES public.mission_constitutions(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.mission_integrity_subjects(id) ON DELETE CASCADE,
  alignment_score numeric NOT NULL DEFAULT 0,
  drift_risk_score numeric NOT NULL DEFAULT 0,
  erosion_score numeric NOT NULL DEFAULT 0,
  adaptation_score numeric NOT NULL DEFAULT 0,
  evaluation_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mission_alignment_evals_org ON public.mission_alignment_evaluations(organization_id);
ALTER TABLE public.mission_alignment_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view mission_alignment_evaluations" ON public.mission_alignment_evaluations FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert mission_alignment_evaluations" ON public.mission_alignment_evaluations FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- mission_drift_events
CREATE TABLE public.mission_drift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.mission_integrity_subjects(id) ON DELETE CASCADE,
  drift_type text NOT NULL DEFAULT 'operational' CHECK (drift_type IN ('operational','strategic','identity','normative','incentive')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  event_summary text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_mission_drift_events_org ON public.mission_drift_events(organization_id);
ALTER TABLE public.mission_drift_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view mission_drift_events" ON public.mission_drift_events FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert mission_drift_events" ON public.mission_drift_events FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- mission_correction_recommendations
CREATE TABLE public.mission_correction_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.mission_integrity_subjects(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL DEFAULT 'realign',
  recommendation_summary text NOT NULL DEFAULT '',
  correction_priority text NOT NULL DEFAULT 'medium',
  rationale text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mission_correction_recs_org ON public.mission_correction_recommendations(organization_id);
ALTER TABLE public.mission_correction_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view mission_correction_recommendations" ON public.mission_correction_recommendations FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert mission_correction_recommendations" ON public.mission_correction_recommendations FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- mission_integrity_snapshots
CREATE TABLE public.mission_integrity_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  constitution_id uuid NOT NULL REFERENCES public.mission_constitutions(id) ON DELETE CASCADE,
  snapshot_scope text NOT NULL DEFAULT 'organization',
  mission_health_score numeric NOT NULL DEFAULT 0,
  drift_density_score numeric NOT NULL DEFAULT 0,
  correction_readiness_score numeric NOT NULL DEFAULT 0,
  snapshot_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mission_integrity_snapshots_org ON public.mission_integrity_snapshots(organization_id);
ALTER TABLE public.mission_integrity_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view mission_integrity_snapshots" ON public.mission_integrity_snapshots FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert mission_integrity_snapshots" ON public.mission_integrity_snapshots FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
