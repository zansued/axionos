
-- Sprint 115: Canon Steward & Knowledge Governance Engine

CREATE TYPE public.canon_entry_type AS ENUM ('pattern', 'template', 'anti_pattern', 'architectural_guideline', 'implementation_recipe', 'failure_memory', 'external_knowledge');
CREATE TYPE public.canon_lifecycle_status AS ENUM ('draft', 'proposed', 'approved', 'experimental', 'contested', 'deprecated', 'archived', 'superseded');
CREATE TYPE public.canon_approval_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'needs_revision');

-- 1. canon_categories
CREATE TABLE public.canon_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  parent_category_id UUID REFERENCES public.canon_categories(id),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);
ALTER TABLE public.canon_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_canon_categories" ON public.canon_categories FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_canon_categories" ON public.canon_categories FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_canon_categories" ON public.canon_categories FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 2. canon_entries
CREATE TABLE public.canon_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  canon_type canon_entry_type NOT NULL DEFAULT 'pattern',
  category_id UUID REFERENCES public.canon_categories(id),
  stack_scope TEXT NOT NULL DEFAULT 'general',
  layer_scope TEXT NOT NULL DEFAULT 'any',
  problem_scope TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  implementation_guidance TEXT NOT NULL DEFAULT '',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  approval_status canon_approval_status NOT NULL DEFAULT 'pending',
  lifecycle_status canon_lifecycle_status NOT NULL DEFAULT 'draft',
  stewardship_owner TEXT,
  source_type TEXT NOT NULL DEFAULT 'internal',
  source_reference TEXT NOT NULL DEFAULT '',
  superseded_by UUID REFERENCES public.canon_entries(id),
  deprecation_reason TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  reviewed_by TEXT,
  approved_by TEXT,
  current_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);
ALTER TABLE public.canon_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_canon_entries" ON public.canon_entries FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_canon_entries" ON public.canon_entries FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_canon_entries" ON public.canon_entries FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_canon_entries_org ON public.canon_entries(organization_id, lifecycle_status, canon_type);
CREATE INDEX idx_canon_entries_category ON public.canon_entries(category_id);

-- 3. canon_entry_versions
CREATE TABLE public.canon_entry_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  implementation_guidance TEXT NOT NULL DEFAULT '',
  change_description TEXT NOT NULL DEFAULT '',
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_entry_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_canon_versions" ON public.canon_entry_versions FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_canon_versions" ON public.canon_entry_versions FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_canon_versions_entry ON public.canon_entry_versions(entry_id, version_number DESC);

-- 4. canon_entry_reviews
CREATE TABLE public.canon_entry_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reviewer_id TEXT,
  review_type TEXT NOT NULL DEFAULT 'standard',
  verdict TEXT NOT NULL DEFAULT 'pending',
  confidence_assessment NUMERIC NOT NULL DEFAULT 0,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_entry_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_canon_reviews" ON public.canon_entry_reviews FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_canon_reviews" ON public.canon_entry_reviews FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_canon_reviews_entry ON public.canon_entry_reviews(entry_id);

-- 5. canon_entry_status_history
CREATE TABLE public.canon_entry_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_entry_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_canon_status_history" ON public.canon_entry_status_history FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_canon_status_history" ON public.canon_entry_status_history FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 6. canon_stewards
CREATE TABLE public.canon_stewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  steward_name TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'general',
  category_id UUID REFERENCES public.canon_categories(id),
  assigned_entries_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_stewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_canon_stewards" ON public.canon_stewards FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_canon_stewards" ON public.canon_stewards FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_update_canon_stewards" ON public.canon_stewards FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 7. canon_confidence_signals
CREATE TABLE public.canon_confidence_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL DEFAULT 'unknown',
  signal_value NUMERIC NOT NULL DEFAULT 0,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_confidence_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_canon_confidence" ON public.canon_confidence_signals FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_canon_confidence" ON public.canon_confidence_signals FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX idx_canon_confidence_entry ON public.canon_confidence_signals(entry_id);

-- 8. canon_deprecations
CREATE TABLE public.canon_deprecations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  deprecated_by TEXT,
  replacement_entry_id UUID REFERENCES public.canon_entries(id),
  impact_assessment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_deprecations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_canon_deprecations" ON public.canon_deprecations FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_canon_deprecations" ON public.canon_deprecations FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 9. canon_supersession_links
CREATE TABLE public.canon_supersession_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  predecessor_entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
  successor_entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
  supersession_type TEXT NOT NULL DEFAULT 'full',
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(predecessor_entry_id, successor_entry_id)
);
ALTER TABLE public.canon_supersession_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select_canon_supersession" ON public.canon_supersession_links FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_member_insert_canon_supersession" ON public.canon_supersession_links FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
