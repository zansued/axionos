
-- Fix: Replace open org_access policies (USING true, TO public) with org-scoped policies on 13 security/red-team tables

-- 1. red_team_scenarios
DROP POLICY IF EXISTS "org_access" ON public.red_team_scenarios;
CREATE POLICY "org_member_isolation" ON public.red_team_scenarios
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 2. red_team_simulation_runs
DROP POLICY IF EXISTS "org_access" ON public.red_team_simulation_runs;
CREATE POLICY "org_member_isolation" ON public.red_team_simulation_runs
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 3. red_team_exercises
DROP POLICY IF EXISTS "org_access" ON public.red_team_exercises;
CREATE POLICY "org_member_isolation" ON public.red_team_exercises
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. red_team_review_queue
DROP POLICY IF EXISTS "org_access" ON public.red_team_review_queue;
CREATE POLICY "org_member_isolation" ON public.red_team_review_queue
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 5. red_team_findings
DROP POLICY IF EXISTS "org_access" ON public.red_team_findings;
CREATE POLICY "org_member_isolation" ON public.red_team_findings
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 6. red_team_fragility_signals
DROP POLICY IF EXISTS "org_access" ON public.red_team_fragility_signals;
CREATE POLICY "org_member_isolation" ON public.red_team_fragility_signals
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 7. red_team_boundary_breaches
DROP POLICY IF EXISTS "org_access" ON public.red_team_boundary_breaches;
CREATE POLICY "org_member_isolation" ON public.red_team_boundary_breaches
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 8. security_canon_candidates
DROP POLICY IF EXISTS "org_access" ON public.security_canon_candidates;
CREATE POLICY "org_member_isolation" ON public.security_canon_candidates
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 9. security_pattern_entries
DROP POLICY IF EXISTS "org_access" ON public.security_pattern_entries;
CREATE POLICY "org_member_isolation" ON public.security_pattern_entries
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 10. security_canon_lineage
DROP POLICY IF EXISTS "org_access" ON public.security_canon_lineage;
CREATE POLICY "org_member_isolation" ON public.security_canon_lineage
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 11. security_anti_patterns
DROP POLICY IF EXISTS "org_access" ON public.security_anti_patterns;
CREATE POLICY "org_member_isolation" ON public.security_anti_patterns
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 12. secure_development_checklists
DROP POLICY IF EXISTS "org_access" ON public.secure_development_checklists;
CREATE POLICY "org_member_isolation" ON public.secure_development_checklists
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 13. security_validation_rules
DROP POLICY IF EXISTS "org_access" ON public.security_validation_rules;
CREATE POLICY "org_member_isolation" ON public.security_validation_rules
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
