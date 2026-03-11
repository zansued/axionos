
-- Sprint 139: Canon Intake & Source Governance

-- 1. Canon Source Categories
CREATE TABLE public.canon_source_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  category_key TEXT NOT NULL DEFAULT '',
  category_label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_source_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_canon_source_categories" ON public.canon_source_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_members_insert_canon_source_categories" ON public.canon_source_categories FOR INSERT TO authenticated WITH CHECK (organization_id IS NOT NULL);
CREATE POLICY "org_members_update_canon_source_categories" ON public.canon_source_categories FOR UPDATE TO authenticated USING (organization_id IS NOT NULL);

-- 2. Canon Source Domains
CREATE TABLE public.canon_source_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  domain_key TEXT NOT NULL DEFAULT '',
  domain_label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_source_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_canon_source_domains" ON public.canon_source_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_members_insert_canon_source_domains" ON public.canon_source_domains FOR INSERT TO authenticated WITH CHECK (organization_id IS NOT NULL);

-- 3. Canon Sources
CREATE TABLE public.canon_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  source_name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'external_documentation',
  source_url TEXT NOT NULL DEFAULT '',
  domain_scope TEXT NOT NULL DEFAULT 'general',
  trust_level TEXT NOT NULL DEFAULT 'unknown',
  ingestion_status TEXT NOT NULL DEFAULT 'pending',
  sync_policy TEXT NOT NULL DEFAULT 'manual',
  approved_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_synced_at TIMESTAMPTZ,
  source_notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  domain_id UUID REFERENCES public.canon_source_domains(id),
  category_id UUID REFERENCES public.canon_source_categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_canon_sources" ON public.canon_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_members_insert_canon_sources" ON public.canon_sources FOR INSERT TO authenticated WITH CHECK (organization_id IS NOT NULL);
CREATE POLICY "org_members_update_canon_sources" ON public.canon_sources FOR UPDATE TO authenticated USING (organization_id IS NOT NULL);

-- 4. Canon Source Policies
CREATE TABLE public.canon_source_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  source_id UUID REFERENCES public.canon_sources(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL DEFAULT 'ingestion',
  policy_rule JSONB NOT NULL DEFAULT '{}'::jsonb,
  enforcement_level TEXT NOT NULL DEFAULT 'advisory',
  description TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_source_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_canon_source_policies" ON public.canon_source_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_members_insert_canon_source_policies" ON public.canon_source_policies FOR INSERT TO authenticated WITH CHECK (organization_id IS NOT NULL);

-- 5. Canon Source Trust Profiles
CREATE TABLE public.canon_source_trust_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  source_id UUID REFERENCES public.canon_sources(id) ON DELETE CASCADE,
  trust_tier TEXT NOT NULL DEFAULT 'unknown',
  trust_score NUMERIC NOT NULL DEFAULT 0,
  allowed_ingestion_scope TEXT NOT NULL DEFAULT 'candidate_only',
  review_posture TEXT NOT NULL DEFAULT 'manual_review',
  promotable BOOLEAN NOT NULL DEFAULT false,
  evaluation_notes TEXT NOT NULL DEFAULT '',
  last_evaluated_at TIMESTAMPTZ,
  evaluated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_source_trust_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_canon_source_trust_profiles" ON public.canon_source_trust_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_members_insert_canon_source_trust_profiles" ON public.canon_source_trust_profiles FOR INSERT TO authenticated WITH CHECK (organization_id IS NOT NULL);
CREATE POLICY "org_members_update_canon_source_trust_profiles" ON public.canon_source_trust_profiles FOR UPDATE TO authenticated USING (organization_id IS NOT NULL);

-- 6. Canon Candidate Entries
CREATE TABLE public.canon_candidate_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  source_id UUID REFERENCES public.canon_sources(id),
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  knowledge_type TEXT NOT NULL DEFAULT 'pattern',
  domain_scope TEXT NOT NULL DEFAULT 'general',
  source_type TEXT NOT NULL DEFAULT 'external_documentation',
  source_reference TEXT NOT NULL DEFAULT '',
  source_reliability_score NUMERIC NOT NULL DEFAULT 0,
  novelty_score NUMERIC NOT NULL DEFAULT 0,
  conflict_with_existing_canon BOOLEAN NOT NULL DEFAULT false,
  internal_validation_status TEXT NOT NULL DEFAULT 'pending',
  trial_status TEXT NOT NULL DEFAULT 'none',
  promotion_status TEXT NOT NULL DEFAULT 'pending',
  promotion_decision_reason TEXT NOT NULL DEFAULT '',
  submitted_by TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_candidate_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_canon_candidate_entries" ON public.canon_candidate_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_members_insert_canon_candidate_entries" ON public.canon_candidate_entries FOR INSERT TO authenticated WITH CHECK (organization_id IS NOT NULL);
CREATE POLICY "org_members_update_canon_candidate_entries" ON public.canon_candidate_entries FOR UPDATE TO authenticated USING (organization_id IS NOT NULL);

-- 7. Canon Source Sync Runs
CREATE TABLE public.canon_source_sync_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  source_id UUID REFERENCES public.canon_sources(id) ON DELETE CASCADE,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  candidates_found INT NOT NULL DEFAULT 0,
  candidates_accepted INT NOT NULL DEFAULT 0,
  candidates_rejected INT NOT NULL DEFAULT 0,
  sync_notes TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_source_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_canon_source_sync_runs" ON public.canon_source_sync_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_members_insert_canon_source_sync_runs" ON public.canon_source_sync_runs FOR INSERT TO authenticated WITH CHECK (organization_id IS NOT NULL);
CREATE POLICY "org_members_update_canon_source_sync_runs" ON public.canon_source_sync_runs FOR UPDATE TO authenticated USING (organization_id IS NOT NULL);
