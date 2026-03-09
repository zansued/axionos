
-- Sprint 103: Institutional Memory Constitution

-- institutional_memory_constitutions
CREATE TABLE public.institutional_memory_constitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constitution_code TEXT NOT NULL DEFAULT '',
  constitution_name TEXT NOT NULL DEFAULT '',
  constitution_scope TEXT NOT NULL DEFAULT '',
  constitution_status TEXT NOT NULL DEFAULT 'draft',
  constitutional_principles TEXT NOT NULL DEFAULT '',
  default_retention_policy JSONB NOT NULL DEFAULT '{}',
  default_reconstruction_policy JSONB NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL DEFAULT '',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_constitutions_org ON public.institutional_memory_constitutions(organization_id);
ALTER TABLE public.institutional_memory_constitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage memory_constitutions" ON public.institutional_memory_constitutions FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- memory_asset_classes
CREATE TABLE public.memory_asset_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code TEXT NOT NULL DEFAULT '',
  class_name TEXT NOT NULL DEFAULT '',
  class_type TEXT NOT NULL DEFAULT 'operational',
  description TEXT NOT NULL DEFAULT '',
  retention_level TEXT NOT NULL DEFAULT 'bounded',
  reconstruction_required BOOLEAN NOT NULL DEFAULT false,
  deletion_requires_review BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_asset_classes_org ON public.memory_asset_classes(organization_id);
ALTER TABLE public.memory_asset_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage memory_asset_classes" ON public.memory_asset_classes FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- institutional_memory_assets
CREATE TABLE public.institutional_memory_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_code TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  memory_class_id UUID REFERENCES public.memory_asset_classes(id),
  constitution_id UUID REFERENCES public.institutional_memory_constitutions(id),
  source_type TEXT NOT NULL DEFAULT '',
  source_ref TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  memory_payload JSONB NOT NULL DEFAULT '{}',
  sensitivity_level TEXT NOT NULL DEFAULT 'standard',
  retention_deadline TIMESTAMPTZ,
  reconstruction_priority TEXT NOT NULL DEFAULT 'medium',
  precedent_weight NUMERIC NOT NULL DEFAULT 0,
  current_status TEXT NOT NULL DEFAULT 'active',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_assets_org ON public.institutional_memory_assets(organization_id);
CREATE INDEX idx_memory_assets_class ON public.institutional_memory_assets(memory_class_id);
CREATE INDEX idx_memory_assets_status ON public.institutional_memory_assets(current_status);
ALTER TABLE public.institutional_memory_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage memory_assets" ON public.institutional_memory_assets FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- memory_retention_policies
CREATE TABLE public.memory_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constitution_id UUID REFERENCES public.institutional_memory_constitutions(id),
  memory_class_id UUID REFERENCES public.memory_asset_classes(id),
  policy_name TEXT NOT NULL DEFAULT '',
  retention_rule_text TEXT NOT NULL DEFAULT '',
  deletion_rule_text TEXT NOT NULL DEFAULT '',
  review_cycle_days INTEGER NOT NULL DEFAULT 90,
  requires_human_review BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_retention_policies_org ON public.memory_retention_policies(organization_id);
ALTER TABLE public.memory_retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage memory_retention_policies" ON public.memory_retention_policies FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- memory_reconstruction_paths
CREATE TABLE public.memory_reconstruction_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_asset_id UUID NOT NULL REFERENCES public.institutional_memory_assets(id) ON DELETE CASCADE,
  reconstruction_type TEXT NOT NULL DEFAULT '',
  reconstruction_sources JSONB NOT NULL DEFAULT '[]',
  recovery_sequence JSONB NOT NULL DEFAULT '[]',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  path_status TEXT NOT NULL DEFAULT 'draft',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_reconstruction_paths_org ON public.memory_reconstruction_paths(organization_id);
ALTER TABLE public.memory_reconstruction_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage memory_reconstruction_paths" ON public.memory_reconstruction_paths FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- memory_loss_events
CREATE TABLE public.memory_loss_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_asset_id UUID REFERENCES public.institutional_memory_assets(id) ON DELETE SET NULL,
  loss_type TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  event_summary TEXT NOT NULL DEFAULT '',
  recoverability_level TEXT NOT NULL DEFAULT 'unknown',
  event_payload JSONB NOT NULL DEFAULT '{}',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_memory_loss_events_org ON public.memory_loss_events(organization_id);
ALTER TABLE public.memory_loss_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage memory_loss_events" ON public.memory_loss_events FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
