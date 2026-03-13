
-- SF-1: Minimum Viable Skills Schema

-- 1. skill_bundles — groups skills by source/initiative/domain
CREATE TABLE public.skill_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  bundle_name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  skill_type text NOT NULL DEFAULT 'general',
  domain text DEFAULT 'unknown',
  source_type text DEFAULT 'manual',
  confidence numeric DEFAULT 0.5,
  status text DEFAULT 'draft',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.skill_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skill_bundles_select" ON public.skill_bundles FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "skill_bundles_insert" ON public.skill_bundles FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "skill_bundles_update" ON public.skill_bundles FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "skill_bundles_delete" ON public.skill_bundles FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- 2. engineering_skills — granular skill entities
CREATE TABLE public.engineering_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bundle_id uuid REFERENCES public.skill_bundles(id) ON DELETE SET NULL,
  canon_entry_id uuid REFERENCES public.canon_entries(id) ON DELETE SET NULL,
  skill_name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  domain text DEFAULT 'unknown',
  confidence numeric DEFAULT 0.5,
  lifecycle_status text DEFAULT 'candidate',
  extraction_method text DEFAULT 'manual',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.engineering_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_skills_select" ON public.engineering_skills FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "eng_skills_insert" ON public.engineering_skills FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "eng_skills_update" ON public.engineering_skills FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "eng_skills_delete" ON public.engineering_skills FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- 3. skill_capabilities — maps skills to agent capability keys
CREATE TABLE public.skill_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engineering_skill_id uuid NOT NULL REFERENCES public.engineering_skills(id) ON DELETE CASCADE,
  capability_key text NOT NULL DEFAULT '',
  capability_description text DEFAULT '',
  strength numeric DEFAULT 0.5,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.skill_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skill_caps_select" ON public.skill_capabilities FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "skill_caps_insert" ON public.skill_capabilities FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "skill_caps_update" ON public.skill_capabilities FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "skill_caps_delete" ON public.skill_capabilities FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- 4. distilled_outputs — micro-skill extractions for task hints
CREATE TABLE public.distilled_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  skill_bundle_id uuid REFERENCES public.skill_bundles(id) ON DELETE SET NULL,
  engineering_skill_id uuid REFERENCES public.engineering_skills(id) ON DELETE SET NULL,
  distillation_type text DEFAULT 'summary',
  content text DEFAULT '',
  confidence_score numeric DEFAULT 0.5,
  status text DEFAULT 'draft',
  source_refs jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.distilled_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "distilled_select" ON public.distilled_outputs FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "distilled_insert" ON public.distilled_outputs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "distilled_update" ON public.distilled_outputs FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "distilled_delete" ON public.distilled_outputs FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
