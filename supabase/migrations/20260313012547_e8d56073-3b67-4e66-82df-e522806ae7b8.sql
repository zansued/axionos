
-- SF-3: Skill Reviews & Governance

CREATE TABLE public.skill_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engineering_skill_id uuid REFERENCES public.engineering_skills(id) ON DELETE CASCADE,
  bundle_id uuid REFERENCES public.skill_bundles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  verdict text NOT NULL DEFAULT 'pending',
  specificity_score numeric DEFAULT 0,
  applicability_score numeric DEFAULT 0,
  reusability_score numeric DEFAULT 0,
  confidence_assessment numeric DEFAULT 0,
  overall_score numeric DEFAULT 0,
  notes text DEFAULT '',
  review_type text DEFAULT 'manual',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT skill_reviews_verdict_check CHECK (verdict IN ('pending', 'approved', 'rejected', 'needs_refinement'))
);

ALTER TABLE public.skill_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_reviews_select" ON public.skill_reviews FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "skill_reviews_insert" ON public.skill_reviews FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "skill_reviews_update" ON public.skill_reviews FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "skill_reviews_delete" ON public.skill_reviews FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
