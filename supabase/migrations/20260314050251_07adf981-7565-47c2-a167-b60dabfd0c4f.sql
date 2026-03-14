
-- Source Discovery Agent schema

-- Discovery run tracking
CREATE TABLE public.source_discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  discovery_type TEXT NOT NULL DEFAULT 'topic_search',
  query_topic TEXT NOT NULL DEFAULT '',
  query_params JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  candidates_found INTEGER NOT NULL DEFAULT 0,
  candidates_approved INTEGER NOT NULL DEFAULT 0,
  candidates_rejected INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discovery candidates with trust scoring
CREATE TABLE public.source_discovery_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  run_id UUID REFERENCES public.source_discovery_runs(id),
  source_url TEXT NOT NULL DEFAULT '',
  source_name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'documentation',
  discovery_method TEXT NOT NULL DEFAULT 'ai_search',
  
  -- Trust scoring signals
  official_domain_match BOOLEAN NOT NULL DEFAULT false,
  official_org_match BOOLEAN NOT NULL DEFAULT false,
  github_verified_org BOOLEAN NOT NULL DEFAULT false,
  repo_stars INTEGER,
  repo_forks INTEGER,
  repo_last_activity TIMESTAMPTZ,
  docs_quality_score NUMERIC NOT NULL DEFAULT 0,
  architecture_relevance_score NUMERIC NOT NULL DEFAULT 0,
  noise_risk_score NUMERIC NOT NULL DEFAULT 0,
  freshness_score NUMERIC NOT NULL DEFAULT 0,
  
  -- Composite trust score
  composite_trust_score NUMERIC NOT NULL DEFAULT 0,
  
  -- Pipeline state
  pipeline_stage TEXT NOT NULL DEFAULT 'discovered',
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Link to canon_sources if approved and ingested
  promoted_source_id UUID REFERENCES public.canon_sources(id),
  
  -- Deduplication
  url_hash TEXT NOT NULL DEFAULT '',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blocked domains for guardrails
CREATE TABLE public.source_discovery_blocked_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  domain_pattern TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  blocked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sdr_org_status ON public.source_discovery_runs(organization_id, status);
CREATE INDEX idx_sdc_org_stage ON public.source_discovery_candidates(organization_id, pipeline_stage);
CREATE INDEX idx_sdc_org_review ON public.source_discovery_candidates(organization_id, review_status);
CREATE INDEX idx_sdc_url_hash ON public.source_discovery_candidates(organization_id, url_hash);
CREATE INDEX idx_sdbd_org ON public.source_discovery_blocked_domains(organization_id);

-- RLS
ALTER TABLE public.source_discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_discovery_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_discovery_blocked_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage discovery runs for their org"
  ON public.source_discovery_runs FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage discovery candidates for their org"
  ON public.source_discovery_candidates FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage blocked domains for their org"
  ON public.source_discovery_blocked_domains FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
