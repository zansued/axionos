
-- Sprint 96: Doctrine & Playbook Synthesis
-- Block T: Governed Intelligence OS

-- ─── Doctrine Types ───────────────────────────────────────────────────
CREATE TYPE public.doctrine_type AS ENUM (
  'governance_playbook',
  'routing_playbook',
  'capability_governance_playbook',
  'benchmark_playbook',
  'adoption_intervention_playbook',
  'post_deploy_response_playbook',
  'delivery_quality_playbook',
  'mentor_recommendation_playbook'
);

CREATE TYPE public.doctrine_lifecycle AS ENUM (
  'draft',
  'candidate',
  'active',
  'deprecated',
  'archived'
);

CREATE TYPE public.doctrine_strength AS ENUM (
  'weak_suggestion',
  'moderate_recommendation',
  'strong_recommendation',
  'canonical_doctrine'
);

-- ─── institutional_doctrines ──────────────────────────────────────────
CREATE TABLE public.institutional_doctrines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  doctrine_key TEXT NOT NULL DEFAULT '',
  doctrine_title TEXT NOT NULL DEFAULT '',
  doctrine_description TEXT NOT NULL DEFAULT '',
  doctrine_type public.doctrine_type NOT NULL DEFAULT 'governance_playbook',
  doctrine_scope TEXT NOT NULL DEFAULT 'workspace',
  target_role TEXT NOT NULL DEFAULT 'operator',
  target_surface TEXT NOT NULL DEFAULT 'workspace_governance',
  recommendation_strength public.doctrine_strength NOT NULL DEFAULT 'moderate_recommendation',
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  contributing_memory_count INTEGER NOT NULL DEFAULT 0,
  applicability_summary TEXT NOT NULL DEFAULT '',
  exceptions_caveats TEXT,
  lifecycle_status public.doctrine_lifecycle NOT NULL DEFAULT 'draft',
  review_status TEXT NOT NULL DEFAULT 'pending',
  synthesis_metadata JSONB NOT NULL DEFAULT '{}',
  audit_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.institutional_doctrines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view doctrines"
  ON public.institutional_doctrines FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage doctrines"
  ON public.institutional_doctrines FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ─── doctrine_memory_links ────────────────────────────────────────────
CREATE TABLE public.doctrine_memory_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  doctrine_id UUID NOT NULL REFERENCES public.institutional_doctrines(id) ON DELETE CASCADE,
  memory_id UUID NOT NULL REFERENCES public.institutional_memories(id) ON DELETE CASCADE,
  contribution_type TEXT NOT NULL DEFAULT 'supporting',
  contribution_weight NUMERIC NOT NULL DEFAULT 0.5,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctrine_memory_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view doctrine memory links"
  ON public.doctrine_memory_links FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage doctrine memory links"
  ON public.doctrine_memory_links FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ─── doctrine_reviews ─────────────────────────────────────────────────
CREATE TABLE public.doctrine_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  doctrine_id UUID NOT NULL REFERENCES public.institutional_doctrines(id) ON DELETE CASCADE,
  reviewer_id UUID,
  review_action TEXT NOT NULL DEFAULT 'comment',
  review_notes TEXT NOT NULL DEFAULT '',
  confidence_adjustment NUMERIC,
  strength_recommendation public.doctrine_strength,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctrine_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view doctrine reviews"
  ON public.doctrine_reviews FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage doctrine reviews"
  ON public.doctrine_reviews FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ─── doctrine_applicability_rules ─────────────────────────────────────
CREATE TABLE public.doctrine_applicability_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  doctrine_id UUID NOT NULL REFERENCES public.institutional_doctrines(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL DEFAULT '',
  rule_description TEXT NOT NULL DEFAULT '',
  condition_type TEXT NOT NULL DEFAULT 'stage_match',
  condition_payload JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctrine_applicability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view doctrine applicability rules"
  ON public.doctrine_applicability_rules FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage doctrine applicability rules"
  ON public.doctrine_applicability_rules FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Indexes
CREATE INDEX idx_doctrines_org ON public.institutional_doctrines(organization_id);
CREATE INDEX idx_doctrines_lifecycle ON public.institutional_doctrines(lifecycle_status);
CREATE INDEX idx_doctrines_type ON public.institutional_doctrines(doctrine_type);
CREATE INDEX idx_doctrines_strength ON public.institutional_doctrines(recommendation_strength);
CREATE INDEX idx_doctrine_memory_links_doctrine ON public.doctrine_memory_links(doctrine_id);
CREATE INDEX idx_doctrine_memory_links_memory ON public.doctrine_memory_links(memory_id);
CREATE INDEX idx_doctrine_reviews_doctrine ON public.doctrine_reviews(doctrine_id);
CREATE INDEX idx_doctrine_applicability_doctrine ON public.doctrine_applicability_rules(doctrine_id);
