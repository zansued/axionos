
-- Sprint 140: Canon Structuring & Stewardship Workflow

-- 1. Extend canon_entries with structuring fields
ALTER TABLE public.canon_entries
  ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtopic TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS practice_type TEXT NOT NULL DEFAULT 'best_practice',
  ADD COLUMN IF NOT EXISTS structured_guidance JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS code_snippet TEXT,
  ADD COLUMN IF NOT EXISTS anti_pattern_flag BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applicability_scope TEXT NOT NULL DEFAULT 'general';

-- 2. Canon Entry Conflicts
CREATE TABLE public.canon_entry_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  entry_a_id UUID REFERENCES public.canon_entries(id) ON DELETE CASCADE NOT NULL,
  entry_b_id UUID REFERENCES public.canon_entries(id) ON DELETE CASCADE NOT NULL,
  conflict_type TEXT NOT NULL DEFAULT 'overlap',
  conflict_description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'low',
  resolution_status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT NOT NULL DEFAULT '',
  resolved_by TEXT,
  detected_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_entry_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_canon_entry_conflicts" ON public.canon_entry_conflicts FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_canon_entry_conflicts" ON public.canon_entry_conflicts FOR INSERT TO authenticated WITH CHECK (organization_id IS NOT NULL);
CREATE POLICY "update_canon_entry_conflicts" ON public.canon_entry_conflicts FOR UPDATE TO authenticated USING (organization_id IS NOT NULL);

-- 3. Canon Entry Domains (mapping entries to domains)
CREATE TABLE public.canon_entry_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  entry_id UUID REFERENCES public.canon_entries(id) ON DELETE CASCADE NOT NULL,
  domain_key TEXT NOT NULL DEFAULT '',
  domain_label TEXT NOT NULL DEFAULT '',
  relevance_score NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_entry_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_canon_entry_domains" ON public.canon_entry_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_canon_entry_domains" ON public.canon_entry_domains FOR INSERT TO authenticated WITH CHECK (organization_id IS NOT NULL);

-- 4. Canon Entry Usage Constraints
CREATE TABLE public.canon_entry_usage_constraints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  entry_id UUID REFERENCES public.canon_entries(id) ON DELETE CASCADE NOT NULL,
  constraint_type TEXT NOT NULL DEFAULT 'scope_limitation',
  constraint_description TEXT NOT NULL DEFAULT '',
  enforcement_level TEXT NOT NULL DEFAULT 'advisory',
  applicable_stacks JSONB NOT NULL DEFAULT '[]'::jsonb,
  applicable_layers JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_entry_usage_constraints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_canon_entry_usage_constraints" ON public.canon_entry_usage_constraints FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_canon_entry_usage_constraints" ON public.canon_entry_usage_constraints FOR INSERT TO authenticated WITH CHECK (organization_id IS NOT NULL);
CREATE POLICY "update_canon_entry_usage_constraints" ON public.canon_entry_usage_constraints FOR UPDATE TO authenticated USING (organization_id IS NOT NULL);
