
-- Sprint 122: Compounding Advantage & Moat Orchestrator

CREATE TABLE public.compounding_advantage_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  stack_scope TEXT NOT NULL DEFAULT '',
  domain_scope TEXT NOT NULL DEFAULT '',
  workflow_scope TEXT NOT NULL DEFAULT '',
  compounding_score NUMERIC NOT NULL DEFAULT 0,
  uniqueness_score NUMERIC NOT NULL DEFAULT 0,
  reuse_density_score NUMERIC NOT NULL DEFAULT 0,
  failure_resilience_score NUMERIC NOT NULL DEFAULT 0,
  doctrine_stability_score NUMERIC NOT NULL DEFAULT 0,
  autonomy_maturity_score NUMERIC NOT NULL DEFAULT 0,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.capability_moat_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL DEFAULT '',
  moat_status TEXT NOT NULL DEFAULT 'candidate',
  compounding_score NUMERIC NOT NULL DEFAULT 0,
  uniqueness_score NUMERIC NOT NULL DEFAULT 0,
  reuse_density_score NUMERIC NOT NULL DEFAULT 0,
  failure_resilience_score NUMERIC NOT NULL DEFAULT 0,
  recommended_productization TEXT NOT NULL DEFAULT '',
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.doctrine_asset_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  pack_name TEXT NOT NULL DEFAULT '',
  domain_scope TEXT NOT NULL DEFAULT '',
  contents JSONB NOT NULL DEFAULT '{}',
  doctrine_entries JSONB NOT NULL DEFAULT '[]',
  canon_entries JSONB NOT NULL DEFAULT '[]',
  autonomy_config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.advantage_lineage_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  moat_domain_id UUID REFERENCES public.capability_moat_domains(id) ON DELETE CASCADE,
  lineage_type TEXT NOT NULL DEFAULT '',
  source_ref TEXT NOT NULL DEFAULT '',
  target_ref TEXT NOT NULL DEFAULT '',
  contribution_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stack_strength_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  stack_layer TEXT NOT NULL DEFAULT '',
  strength_score NUMERIC NOT NULL DEFAULT 0,
  maturity_level INTEGER NOT NULL DEFAULT 0,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_advantage_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cluster_name TEXT NOT NULL DEFAULT '',
  domains JSONB NOT NULL DEFAULT '[]',
  aggregate_score NUMERIC NOT NULL DEFAULT 0,
  tenant_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.weak_compounding_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL DEFAULT '',
  weakness_type TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'low',
  description TEXT NOT NULL DEFAULT '',
  recommended_action TEXT NOT NULL DEFAULT '',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.moat_review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  moat_domain_id UUID REFERENCES public.capability_moat_domains(id) ON DELETE CASCADE,
  decision TEXT NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by TEXT,
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.compounding_advantage_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capability_moat_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctrine_asset_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advantage_lineage_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stack_strength_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_advantage_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weak_compounding_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moat_review_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage compounding_advantage_scores" ON public.compounding_advantage_scores FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members manage capability_moat_domains" ON public.capability_moat_domains FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members manage doctrine_asset_packs" ON public.doctrine_asset_packs FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members manage advantage_lineage_maps" ON public.advantage_lineage_maps FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members manage stack_strength_profiles" ON public.stack_strength_profiles FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members manage tenant_advantage_clusters" ON public.tenant_advantage_clusters FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members manage weak_compounding_zones" ON public.weak_compounding_zones FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members manage moat_review_decisions" ON public.moat_review_decisions FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_compounding_scores_org ON public.compounding_advantage_scores(organization_id);
CREATE INDEX idx_moat_domains_org ON public.capability_moat_domains(organization_id);
CREATE INDEX idx_doctrine_packs_org ON public.doctrine_asset_packs(organization_id);
CREATE INDEX idx_advantage_lineage_org ON public.advantage_lineage_maps(organization_id);
CREATE INDEX idx_stack_strength_org ON public.stack_strength_profiles(organization_id);
CREATE INDEX idx_tenant_clusters_org ON public.tenant_advantage_clusters(organization_id);
CREATE INDEX idx_weak_zones_org ON public.weak_compounding_zones(organization_id);
CREATE INDEX idx_moat_reviews_org ON public.moat_review_decisions(organization_id);
