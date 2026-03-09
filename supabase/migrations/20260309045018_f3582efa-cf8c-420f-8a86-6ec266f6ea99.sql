-- Sprint 95: Institutional Memory Consolidation
-- Block T: Governed Intelligence OS

-- =====================================================
-- 1. INSTITUTIONAL MEMORIES - Core memory records
-- =====================================================
CREATE TABLE public.institutional_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  
  -- Identity
  memory_key TEXT NOT NULL DEFAULT '',
  memory_title TEXT NOT NULL DEFAULT 'Untitled Memory',
  memory_description TEXT NOT NULL DEFAULT '',
  
  -- Classification
  memory_type TEXT NOT NULL DEFAULT 'operational_lesson',
  memory_scope TEXT NOT NULL DEFAULT 'workspace',
  
  -- Confidence & Recurrence
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  recurrence_count INTEGER NOT NULL DEFAULT 1,
  reuse_potential TEXT NOT NULL DEFAULT 'unknown',
  
  -- Content
  memory_payload JSONB NOT NULL DEFAULT '{}',
  contributing_signals JSONB NOT NULL DEFAULT '[]',
  uncertainty_notes TEXT,
  
  -- Lifecycle
  lifecycle_status TEXT NOT NULL DEFAULT 'draft',
  review_status TEXT NOT NULL DEFAULT 'pending',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by TEXT,
  
  CONSTRAINT institutional_memories_org_key UNIQUE (organization_id, memory_key)
);

-- Enable RLS
ALTER TABLE public.institutional_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view org institutional memories"
  ON public.institutional_memories FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage org institutional memories"
  ON public.institutional_memories FOR ALL
  TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_institutional_memory()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.memory_type NOT IN (
    'operational_lesson', 'governance_lesson', 'routing_lesson',
    'capability_lesson', 'delivery_lesson', 'benchmark_lesson',
    'adoption_lesson', 'failure_pattern', 'recovery_memory',
    'guidance_pattern', 'coordination_lesson'
  ) THEN
    RAISE EXCEPTION 'Invalid memory_type: %', NEW.memory_type;
  END IF;
  
  IF NEW.memory_scope NOT IN ('workspace', 'organization', 'platform', 'bounded_cross_context') THEN
    RAISE EXCEPTION 'Invalid memory_scope: %', NEW.memory_scope;
  END IF;
  
  IF NEW.reuse_potential NOT IN ('unknown', 'low', 'medium', 'high', 'canonical') THEN
    RAISE EXCEPTION 'Invalid reuse_potential: %', NEW.reuse_potential;
  END IF;
  
  IF NEW.lifecycle_status NOT IN ('draft', 'candidate', 'active', 'watch', 'deprecated', 'archived') THEN
    RAISE EXCEPTION 'Invalid lifecycle_status: %', NEW.lifecycle_status;
  END IF;
  
  IF NEW.review_status NOT IN ('pending', 'under_review', 'approved', 'rejected', 'deferred') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_institutional_memory_trigger
  BEFORE INSERT OR UPDATE ON public.institutional_memories
  FOR EACH ROW EXECUTE FUNCTION public.validate_institutional_memory();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_institutional_memories_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_institutional_memories_updated_at_trigger
  BEFORE UPDATE ON public.institutional_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_institutional_memories_updated_at();

-- Indexes
CREATE INDEX idx_institutional_memories_org ON public.institutional_memories(organization_id);
CREATE INDEX idx_institutional_memories_type ON public.institutional_memories(memory_type);
CREATE INDEX idx_institutional_memories_scope ON public.institutional_memories(memory_scope);
CREATE INDEX idx_institutional_memories_lifecycle ON public.institutional_memories(lifecycle_status);
CREATE INDEX idx_institutional_memories_confidence ON public.institutional_memories(confidence_score DESC);

-- =====================================================
-- 2. INSTITUTIONAL MEMORY SOURCES - Lineage tracking
-- =====================================================
CREATE TABLE public.institutional_memory_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.institutional_memories(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Source reference
  source_type TEXT NOT NULL DEFAULT 'unknown',
  source_table TEXT NOT NULL DEFAULT '',
  source_id UUID,
  source_key TEXT,
  
  -- Contribution
  contribution_weight NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  contribution_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.institutional_memory_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org memory sources"
  ON public.institutional_memory_sources FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage org memory sources"
  ON public.institutional_memory_sources FOR ALL
  TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_memory_source()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.source_type NOT IN (
    'evidence_record', 'governance_decision', 'routing_outcome',
    'benchmark_result', 'adoption_event', 'post_deploy_feedback',
    'copilot_pattern', 'convergence_memory', 'engineering_memory',
    'agent_memory', 'platform_insight', 'calibration_signal',
    'repair_outcome', 'validation_outcome', 'unknown'
  ) THEN
    RAISE EXCEPTION 'Invalid source_type: %', NEW.source_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_memory_source_trigger
  BEFORE INSERT OR UPDATE ON public.institutional_memory_sources
  FOR EACH ROW EXECUTE FUNCTION public.validate_memory_source();

CREATE INDEX idx_memory_sources_memory ON public.institutional_memory_sources(memory_id);
CREATE INDEX idx_memory_sources_type ON public.institutional_memory_sources(source_type);

-- =====================================================
-- 3. INSTITUTIONAL MEMORY REVIEWS - Review workflow
-- =====================================================
CREATE TABLE public.institutional_memory_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.institutional_memories(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Review
  review_type TEXT NOT NULL DEFAULT 'initial_review',
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  
  -- Reviewer
  reviewer_ref JSONB,
  
  -- Decisions
  confidence_adjustment NUMERIC(4,3),
  reuse_recommendation TEXT,
  lifecycle_recommendation TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.institutional_memory_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org memory reviews"
  ON public.institutional_memory_reviews FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage org memory reviews"
  ON public.institutional_memory_reviews FOR ALL
  TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_memory_review()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.review_type NOT IN ('initial_review', 'reuse_assessment', 'confidence_calibration', 'deprecation_review', 'promotion_review') THEN
    RAISE EXCEPTION 'Invalid review_type: %', NEW.review_type;
  END IF;
  IF NEW.review_status NOT IN ('pending', 'in_progress', 'approved', 'rejected', 'deferred') THEN
    RAISE EXCEPTION 'Invalid review_status: %', NEW.review_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_memory_review_trigger
  BEFORE INSERT OR UPDATE ON public.institutional_memory_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_memory_review();

CREATE INDEX idx_memory_reviews_memory ON public.institutional_memory_reviews(memory_id);
CREATE INDEX idx_memory_reviews_status ON public.institutional_memory_reviews(review_status);

-- =====================================================
-- 4. INSTITUTIONAL MEMORY LINEAGE - Graph relationships
-- =====================================================
CREATE TABLE public.institutional_memory_lineage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Relationship
  from_memory_id UUID NOT NULL REFERENCES public.institutional_memories(id) ON DELETE CASCADE,
  to_memory_id UUID NOT NULL REFERENCES public.institutional_memories(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'derived_from',
  
  -- Metadata
  relationship_strength NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  relationship_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT institutional_memory_lineage_unique UNIQUE (from_memory_id, to_memory_id, relationship_type)
);

ALTER TABLE public.institutional_memory_lineage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org memory lineage"
  ON public.institutional_memory_lineage FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage org memory lineage"
  ON public.institutional_memory_lineage FOR ALL
  TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_memory_lineage()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.relationship_type NOT IN (
    'derived_from', 'supersedes', 'refines', 'contradicts',
    'supports', 'extends', 'consolidates', 'related_to'
  ) THEN
    RAISE EXCEPTION 'Invalid relationship_type: %', NEW.relationship_type;
  END IF;
  
  IF NEW.from_memory_id = NEW.to_memory_id THEN
    RAISE EXCEPTION 'Memory cannot reference itself in lineage';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_memory_lineage_trigger
  BEFORE INSERT OR UPDATE ON public.institutional_memory_lineage
  FOR EACH ROW EXECUTE FUNCTION public.validate_memory_lineage();

CREATE INDEX idx_memory_lineage_from ON public.institutional_memory_lineage(from_memory_id);
CREATE INDEX idx_memory_lineage_to ON public.institutional_memory_lineage(to_memory_id);
CREATE INDEX idx_memory_lineage_type ON public.institutional_memory_lineage(relationship_type);