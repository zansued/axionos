-- Fix cross-tenant data exposure: replace broken org_isolation policies
-- that use always-true condition with proper is_org_member checks.

-- 1. tenant_operating_profiles
DROP POLICY IF EXISTS "org_isolation" ON public.tenant_operating_profiles;
CREATE POLICY "org_member_isolation" ON public.tenant_operating_profiles
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 2. tenant_doctrine_signals
DROP POLICY IF EXISTS "org_isolation" ON public.tenant_doctrine_signals;
CREATE POLICY "org_member_isolation" ON public.tenant_doctrine_signals
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 3. doctrine_conflict_cases
DROP POLICY IF EXISTS "org_isolation" ON public.doctrine_conflict_cases;
CREATE POLICY "org_member_isolation" ON public.doctrine_conflict_cases
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. runtime_preference_patterns
DROP POLICY IF EXISTS "org_isolation" ON public.runtime_preference_patterns;
CREATE POLICY "org_member_isolation" ON public.runtime_preference_patterns
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 5. doctrine_adjustment_events
DROP POLICY IF EXISTS "org_isolation" ON public.doctrine_adjustment_events;
CREATE POLICY "org_member_isolation" ON public.doctrine_adjustment_events
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 6. escalation_posture_profiles
DROP POLICY IF EXISTS "org_isolation" ON public.escalation_posture_profiles;
CREATE POLICY "org_member_isolation" ON public.escalation_posture_profiles
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 7. rollout_risk_profiles
DROP POLICY IF EXISTS "org_isolation" ON public.rollout_risk_profiles;
CREATE POLICY "org_member_isolation" ON public.rollout_risk_profiles
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 8. tenant_doctrine_reviews
DROP POLICY IF EXISTS "org_isolation" ON public.tenant_doctrine_reviews;
CREATE POLICY "org_member_isolation" ON public.tenant_doctrine_reviews
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));